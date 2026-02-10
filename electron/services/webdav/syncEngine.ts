import { createHash } from 'crypto';
import { readFileSync, statSync, existsSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, basename, dirname } from 'path';
import { webdavClient } from './client';
import { ConflictItem, RemoteFile, WebDAVConfig } from '@shared/types/electron';
import { app } from 'electron';
import Store from 'electron-store';

const store = new Store({ name: "moyu-data" });

export class SyncEngine {
  private config: WebDAVConfig | null = null;

  setConfig(config: WebDAVConfig) {
    this.config = config;
  }

  private calculateMD5(filePath: string): string {
    if (!existsSync(filePath)) return '';
    const buffer = readFileSync(filePath);
    return createHash('md5').update(buffer).digest('hex');
  }

  async getRemoteFiles(): Promise<RemoteFile[]> {
    if (!this.config) return [];
    const files: RemoteFile[] = [];
    const audioExtensions = ['.wav', '.mp3', '.m4a', '.webm', '.ogg'];

    try {
        // 1. Config & DB
        if (this.config.enableSyncConfig || this.config.enableSyncDatabase) {
          const configContents = await webdavClient.getDirectoryContents(this.config.remoteConfigPath);
          for (const item of configContents) {
            if (item.type === 'file' && (item.basename === 'moyu-data.json' || item.basename === 'moyu.db')) {
              files.push(this.mapToFileStat(item, item.basename === 'moyu.db' ? 'database' : 'config'));
            }
          }
        }

        // 2. Recordings
        if (this.config.enableSyncRecordings) {
          const recordingContents = await webdavClient.getDirectoryContents(this.config.remoteRecordingPath);
          for (const item of recordingContents) {
            if (item.type === 'file' && audioExtensions.some(ext => item.basename.toLowerCase().endsWith(ext))) {
              files.push(this.mapToFileStat(item, 'recording'));
            }
          }
        }
    } catch (error) {
        console.error('[SyncEngine] Failed to get remote files:', error);
    }

    return files;
  }

  private mapToFileStat(item: any, type: 'config' | 'database' | 'recording'): RemoteFile {
    return {
      path: item.filename,
      name: item.basename,
      size: item.size || 0,
      mtime: item.lastmod ? new Date(item.lastmod).getTime() : 0,
      type
    };
  }

  async upload(localPath: string, remotePath: string): Promise<boolean> {
    try {
      if (!existsSync(localPath)) {
          console.error(`[SyncEngine] Local file does not exist: ${localPath}`);
          return false;
      }
      const buffer = readFileSync(localPath);
      await webdavClient.putFileContents(remotePath, buffer);
      return true;
    } catch (error) {
      console.error(`[SyncEngine] Upload failed: ${localPath} -> ${remotePath}`, error);
      return false;
    }
  }

  async download(remotePath: string, localPath: string): Promise<boolean> {
    try {
      const buffer = await webdavClient.getFileContents(remotePath);
      const dir = dirname(localPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(localPath, buffer);
      return true;
    } catch (error) {
      console.error(`[SyncEngine] Download failed: ${remotePath} -> ${localPath}`, error);
      return false;
    }
  }

  async syncFile(localPath: string, remotePath: string, strategy: 'upload-newer' | 'download-newer' | 'force-upload' | 'force-download' = 'upload-newer'): Promise<'uploaded' | 'downloaded' | 'skipped' | 'error'> {
    try {
        const localExists = existsSync(localPath);
        const remoteStat = await webdavClient.stat(remotePath);
        const remoteExists = !!remoteStat;

        if (!localExists && !remoteExists) return 'skipped';

        if (strategy === 'force-upload') {
          if (!localExists) return 'error';
          return (await this.upload(localPath, remotePath)) ? 'uploaded' : 'error';
        }

        if (strategy === 'force-download') {
          if (!remoteExists) return 'error';
          return (await this.download(remotePath, localPath)) ? 'downloaded' : 'error';
        }

        const localMtime = localExists ? statSync(localPath).mtimeMs : 0;
        const remoteMtime = remoteExists ? new Date(remoteStat.lastmod).getTime() : 0;

        // Use a 2-second threshold for mtime comparison due to filesystem differences
        const MTIME_THRESHOLD = 2000;

        if (localExists && (!remoteExists || localMtime > remoteMtime + MTIME_THRESHOLD)) {
          console.log(`[SyncEngine] Uploading newer local file: ${basename(localPath)}`);
          return (await this.upload(localPath, remotePath)) ? 'uploaded' : 'error';
        }

        if (remoteExists && (!localExists || remoteMtime > localMtime + MTIME_THRESHOLD)) {
          console.log(`[SyncEngine] Downloading newer remote file: ${basename(localPath)}`);
          return (await this.download(remotePath, localPath)) ? 'downloaded' : 'error';
        }

        return 'skipped';
    } catch (error) {
        console.error(`[SyncEngine] syncFile failed for ${localPath}:`, error);
        return 'error';
    }
  }
}

export const syncEngine = new SyncEngine();
