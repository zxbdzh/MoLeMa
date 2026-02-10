import { BrowserWindow, app } from 'electron';
import { webdavClient } from './client';
import { syncEngine } from './syncEngine';
import { WebDAVConfig, SyncLog, SyncStatus } from '@shared/types/electron';
import { SYNC_CONSTANTS } from '@shared/constants/sync';
import Store from 'electron-store';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';

const store = new Store({ name: "moyu-data" });

export class WebDAVService {
  private mainWindow: BrowserWindow | null = null;
  public config: WebDAVConfig | null = null;
  private isSyncing = false;
  private syncLogs: SyncLog[] = [];

  setMainWindow(window: BrowserWindow | null) {
    this.mainWindow = window;
  }

  private addLog(message: string, level: SyncLog['level'] = 'info') {
    const log: SyncLog = { timestamp: Date.now(), level, message };
    this.syncLogs.push(log);
    if (this.syncLogs.length > 200) this.syncLogs.shift();
    console.log(`[WebDAV] ${level.toUpperCase()}: ${message}`);
    this.mainWindow?.webContents.send('webdav:logUpdate', this.syncLogs);
  }

  private updateStatus(status: Partial<SyncStatus>) {
    this.mainWindow?.webContents.send('webdav:statusChange', status);
  }

  async initialize() {
    const defaultConfig: WebDAVConfig = {
      serverUrl: '',
      username: '',
      password: '',
      remoteConfigPath: SYNC_CONSTANTS.DEFAULT_REMOTE.CONFIG_DIR,
      remoteRecordingPath: SYNC_CONSTANTS.DEFAULT_REMOTE.RECORDING_DIR,
      enableSyncConfig: true,
      enableSyncDatabase: true,
      enableSyncRecordings: true,
      lastSyncTime: 0,
    };

    const savedConfig = store.get('webdav.config') as WebDAVConfig;
    this.config = { ...defaultConfig, ...savedConfig };
    
    this.ensureSlashPaths();

    if (this.config.serverUrl) {
      webdavClient.initialize(this.config);
      syncEngine.setConfig(this.config);
      this.addLog('WebDAV 服务初始化完成');
    }
  }

  private ensureSlashPaths() {
    if (this.config) {
      if (!this.config.remoteConfigPath.endsWith('/')) this.config.remoteConfigPath += '/';
      if (!this.config.remoteRecordingPath.endsWith('/')) this.config.remoteRecordingPath += '/';
    }
  }

  async updateConfig(newConfig: WebDAVConfig) {
    this.config = newConfig;
    this.ensureSlashPaths();
    store.set('webdav.config', this.config);
    webdavClient.initialize(this.config);
    syncEngine.setConfig(this.config);
    this.addLog('WebDAV 配置已更新');
  }

  private getPaths() {
    return {
      userData: app.getPath('userData'),
      recordings: store.get("recordings.savePath") as string || app.getPath('documents')
    };
  }

  async uploadAll() {
    if (this.isSyncing || !this.config?.serverUrl) return;
    
    this.isSyncing = true;
    this.updateStatus({ isSyncing: true });
    this.addLog('开始同步：上传本地数据至云端...');

    try {
      const { userData, recordings } = this.getPaths();

      // 1. 同步配置和数据库
      if (this.config.enableSyncConfig || this.config.enableSyncDatabase) {
        await webdavClient.deleteFile(this.config.remoteConfigPath);
        await webdavClient.ensureDirectory(this.config.remoteConfigPath);

        const filesToUpload = [];
        if (this.config.enableSyncConfig) filesToUpload.push(SYNC_CONSTANTS.FILE_NAMES.CONFIG);
        if (this.config.enableSyncDatabase) filesToUpload.push(SYNC_CONSTANTS.FILE_NAMES.DATABASE);

        for (const filename of filesToUpload) {
          const local = join(userData, filename);
          if (existsSync(local)) {
            this.addLog(`上传: ${filename}`);
            await syncEngine.upload(local, this.config.remoteConfigPath + filename);
          }
        }
      }

      // 2. 同步录音
      if (this.config.enableSyncRecordings && existsSync(recordings)) {
        await webdavClient.deleteFile(this.config.remoteRecordingPath);
        await webdavClient.ensureDirectory(this.config.remoteRecordingPath);

        const localFiles = readdirSync(recordings).filter(f => 
          SYNC_CONSTANTS.AUDIO_EXTENSIONS.some(ext => f.toLowerCase().endsWith(ext))
        );
        
        for (const file of localFiles) {
          this.addLog(`上传录音: ${file}`);
          await syncEngine.upload(join(recordings, file), this.config.remoteRecordingPath + file);
        }
      }

      this.config.lastSyncTime = Date.now();
      store.set('webdav.config', this.config);
      this.addLog('上传成功');
      this.updateStatus({ isSyncing: false, lastSyncTime: this.config.lastSyncTime });
    } catch (error: any) {
      this.addLog(`上传失败: ${error.message || error}`, 'error');
      this.updateStatus({ isSyncing: false });
    } finally {
      this.isSyncing = false;
    }
  }

  async downloadAll() {
    if (this.isSyncing || !this.config?.serverUrl) return;
    
    this.isSyncing = true;
    this.updateStatus({ isSyncing: true });
    this.addLog('开始同步：从云端下载并覆盖本地数据...');

    try {
      const { userData, recordings } = this.getPaths();

      if (this.config.enableSyncConfig) {
        const file = SYNC_CONSTANTS.FILE_NAMES.CONFIG;
        await this.safeDownload(this.config.remoteConfigPath + file, join(userData, file), `下载配置: ${file}`);
      }
      if (this.config.enableSyncDatabase) {
        const file = SYNC_CONSTANTS.FILE_NAMES.DATABASE;
        await this.safeDownload(this.config.remoteConfigPath + file, join(userData, file), `下载数据库: ${file}`);
      }

      if (this.config.enableSyncRecordings) {
        const remoteFiles = await syncEngine.getRemoteFiles();
        for (const remote of remoteFiles) {
          if (remote.type === 'recording') {
            this.addLog(`下载录音: ${remote.name}`);
            await syncEngine.download(remote.path, join(recordings, remote.name));
          }
        }
      }

      this.config.lastSyncTime = Date.now();
      store.set('webdav.config', this.config);
      this.addLog('下载成功');
      this.updateStatus({ isSyncing: false, lastSyncTime: this.config.lastSyncTime });
    } catch (error: any) {
      this.addLog(`下载失败: ${error.message || error}`, 'error');
      this.updateStatus({ isSyncing: false });
    } finally {
      this.isSyncing = false;
    }
  }

  private async safeDownload(remote: string, local: string, logMsg: string) {
    if (await webdavClient.exists(remote)) {
      this.addLog(logMsg);
      await syncEngine.download(remote, local);
    }
  }

  clearLogs() {
    this.syncLogs = [];
    this.mainWindow?.webContents.send('webdav:logUpdate', this.syncLogs);
  }

  getLogs() {
    return this.syncLogs;
  }
}

export const webdavService = new WebDAVService();