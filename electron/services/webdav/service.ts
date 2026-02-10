import { BrowserWindow, app } from 'electron';
import { webdavClient } from './client';
import { syncEngine } from './syncEngine';
import { WebDAVConfig, SyncLog, SyncStatus } from '@shared/types/electron';
import Store from 'electron-store';
import { join, basename } from 'path';
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
    const log: SyncLog = {
      timestamp: Date.now(),
      level,
      message
    };
    this.syncLogs.push(log);
    if (this.syncLogs.length > 200) this.syncLogs.shift();
    
    console.log(`[WebDAV] ${level.toUpperCase()}: ${message}`);
    
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('webdav:logUpdate', this.syncLogs);
    }
  }

  private updateStatus(status: Partial<SyncStatus>) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('webdav:statusChange', status);
    }
  }

  async initialize() {
    const defaultConfig: WebDAVConfig = {
      serverUrl: '',
      username: '',
      password: '',
      remoteConfigPath: '/MoLeMa-config/',
      remoteRecordingPath: '/MoLeMa-recordings/',
      enableSyncConfig: true,
      enableSyncDatabase: true,
      enableSyncRecordings: true,
      lastSyncTime: 0,
    };

    const savedConfig = store.get('webdav.config') as WebDAVConfig;
    this.config = { ...defaultConfig, ...savedConfig };
    
    if (!this.config.remoteConfigPath.endsWith('/')) this.config.remoteConfigPath += '/';
    if (!this.config.remoteRecordingPath.endsWith('/')) this.config.remoteRecordingPath += '/';

    if (this.config.serverUrl) {
      webdavClient.initialize(this.config);
      syncEngine.setConfig(this.config);
      this.addLog('WebDAV 服务初始化完成（手动模式）');
    }
  }

  async updateConfig(newConfig: WebDAVConfig) {
    if (newConfig.remoteConfigPath && !newConfig.remoteConfigPath.endsWith('/')) {
        newConfig.remoteConfigPath += '/';
    }
    if (newConfig.remoteRecordingPath && !newConfig.remoteRecordingPath.endsWith('/')) {
        newConfig.remoteRecordingPath += '/';
    }

    this.config = newConfig;
    store.set('webdav.config', newConfig);
    webdavClient.initialize(newConfig);
    syncEngine.setConfig(newConfig);
    this.addLog('WebDAV 配置已更新');
  }

  /**
   * 上传：删除远端，重新创建并上传
   */
  async uploadAll() {
    if (this.isSyncing || !this.config || !this.config.serverUrl) return;
    
    this.isSyncing = true;
    this.updateStatus({ isSyncing: true });
    this.addLog('开始同步：上传本地数据并覆盖云端...');

    try {
      const userDataPath = app.getPath('userData');
      const recordingsPath = store.get("recordings.savePath") as string || app.getPath('documents');

      // 1. 同步配置和数据库
      if (this.config.enableSyncConfig || this.config.enableSyncDatabase) {
        this.addLog('正在清理远端配置目录...');
        await webdavClient.deleteFile(this.config.remoteConfigPath);
        await webdavClient.ensureDirectory(this.config.remoteConfigPath);

        if (this.config.enableSyncConfig) {
          const localPath = join(userDataPath, 'moyu-data.json');
          if (existsSync(localPath)) {
            this.addLog('上传配置文件...');
            await syncEngine.upload(localPath, this.config.remoteConfigPath + 'moyu-data.json');
          }
        }
        if (this.config.enableSyncDatabase) {
          const localPath = join(userDataPath, 'moyu.db');
          if (existsSync(localPath)) {
            this.addLog('上传数据库...');
            await syncEngine.upload(localPath, this.config.remoteConfigPath + 'moyu.db');
          }
        }
      }

      // 2. 同步录音文件
      if (this.config.enableSyncRecordings && existsSync(recordingsPath)) {
        this.addLog('正在清理远端录音目录...');
        await webdavClient.deleteFile(this.config.remoteRecordingPath);
        await webdavClient.ensureDirectory(this.config.remoteRecordingPath);

        const audioExtensions = ['.wav', '.mp3', '.m4a', '.webm', '.ogg'];
        const localFiles = readdirSync(recordingsPath).filter(f => audioExtensions.some(ext => f.toLowerCase().endsWith(ext)));
        
        for (const file of localFiles) {
          this.addLog(`上传录音: ${file}`);
          await syncEngine.upload(join(recordingsPath, file), this.config.remoteRecordingPath + file);
        }
      }

      this.config.lastSyncTime = Date.now();
      store.set('webdav.config', this.config);
      this.addLog('上传成功，云端数据已与本地同步');
      this.updateStatus({ isSyncing: false, lastSyncTime: this.config.lastSyncTime });
    } catch (error: any) {
      this.addLog(`上传失败: ${error.message || error}`, 'error');
      this.updateStatus({ isSyncing: false });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * 下载：获取云端数据并覆盖本地
   */
  async downloadAll() {
    if (this.isSyncing || !this.config || !this.config.serverUrl) return;
    
    this.isSyncing = true;
    this.updateStatus({ isSyncing: true });
    this.addLog('开始同步：从云端下载并覆盖本地数据...');

    try {
      const userDataPath = app.getPath('userData');
      const recordingsPath = store.get("recordings.savePath") as string || app.getPath('documents');

      // 1. 下载配置和数据库
      if (this.config.enableSyncConfig) {
        const remotePath = this.config.remoteConfigPath + 'moyu-data.json';
        if (await webdavClient.exists(remotePath)) {
          this.addLog('下载配置文件...');
          await syncEngine.download(remotePath, join(userDataPath, 'moyu-data.json'));
        }
      }
      if (this.config.enableSyncDatabase) {
        const remotePath = this.config.remoteConfigPath + 'moyu.db';
        if (await webdavClient.exists(remotePath)) {
          this.addLog('下载数据库...');
          await syncEngine.download(remotePath, join(userDataPath, 'moyu.db'));
        }
      }

      // 2. 下载录音文件
      if (this.config.enableSyncRecordings) {
        this.addLog('正在扫描云端录音...');
        const remoteFiles = await syncEngine.getRemoteFiles();
        for (const remote of remoteFiles) {
          if (remote.type === 'recording') {
            this.addLog(`下载录音: ${remote.name}`);
            await syncEngine.download(remote.path, join(recordingsPath, remote.name));
          }
        }
      }

      this.config.lastSyncTime = Date.now();
      store.set('webdav.config', this.config);
      this.addLog('下载成功，本地数据已更新');
      this.updateStatus({ isSyncing: false, lastSyncTime: this.config.lastSyncTime });
    } catch (error: any) {
      this.addLog(`下载失败: ${error.message || error}`, 'error');
      this.updateStatus({ isSyncing: false });
    } finally {
      this.isSyncing = false;
    }
  }

  clearLogs() {
    this.syncLogs = [];
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('webdav:logUpdate', this.syncLogs);
    }
  }

  getLogs() {
    return this.syncLogs;
  }
}

export const webdavService = new WebDAVService();
