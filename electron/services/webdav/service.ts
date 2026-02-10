import { BrowserWindow, app } from 'electron';
import { webdavClient } from './client';
import { syncEngine } from './syncEngine';
import { WebDAVConfig, SyncLog, SyncStatus } from '@shared/types/electron';
import Store from 'electron-store';
import { join, basename } from 'path';
import { existsSync, readdirSync } from 'fs';
import chokidar from 'chokidar';

const store = new Store({ name: "moyu-data" });

export class WebDAVService {
  private mainWindow: BrowserWindow | null = null;
  public config: WebDAVConfig | null = null;
  private isSyncing = false;
  private syncLogs: SyncLog[] = [];
  private watcher: chokidar.FSWatcher | null = null;

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
      // 保持与旧 API 兼容的同时发送新格式
      this.mainWindow.webContents.send('webdav:logUpdate', this.syncLogs);
      this.mainWindow.webContents.send('webdav:newLog', log);
    }
  }

  private updateStatus(status: Partial<SyncStatus>) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('webdav:statusChange', status);
    }
  }

  async initialize() {
    const savedConfig = store.get('webdav.config') as WebDAVConfig;
    if (savedConfig) {
      this.config = savedConfig;
      webdavClient.initialize(this.config);
      syncEngine.setConfig(this.config);
      this.addLog('WebDAV 服务初始化完成');
      
      if (this.config.syncMode === 'realtime') {
        this.startRealtimeSync();
      }
    }
  }

  async updateConfig(newConfig: WebDAVConfig) {
    this.config = newConfig;
    store.set('webdav.config', newConfig);
    webdavClient.initialize(newConfig);
    syncEngine.setConfig(newConfig);
    this.addLog('WebDAV 配置已更新并保存');
    
    this.stopRealtimeSync();

    if (newConfig.syncMode === 'realtime') {
      this.startRealtimeSync();
    }
  }

  async syncAll() {
    if (this.isSyncing || !this.config) {
        if (this.isSyncing) this.addLog('已有同步任务在进行中，请稍候', 'warn');
        return;
    }
    
    this.isSyncing = true;
    this.updateStatus({ isSyncing: true });
    this.addLog('开始全量同步...');

    try {
      const userDataPath = app.getPath('userData');
      const recordingsPath = store.get("recordings.savePath") as string || app.getPath('documents');

      // 1. Config and Database
      if (this.config.enableSyncConfig) {
        this.addLog('正在同步配置文件...');
        await syncEngine.syncFile(join(userDataPath, 'moyu-data.json'), this.config.remoteConfigPath + 'moyu-data.json');
      }
      if (this.config.enableSyncDatabase) {
        this.addLog('正在同步数据库...');
        await syncEngine.syncFile(join(userDataPath, 'moyu.db'), this.config.remoteConfigPath + 'moyu.db');
      }

      // 2. Recordings
      if (this.config.enableSyncRecordings && existsSync(recordingsPath)) {
        this.addLog('正在同步录音文件...');
        const audioExtensions = ['.wav', '.mp3', '.m4a', '.webm', '.ogg'];
        const localFiles = readdirSync(recordingsPath).filter(f => audioExtensions.some(ext => f.toLowerCase().endsWith(ext)));
        
        for (const file of localFiles) {
          await syncEngine.syncFile(join(recordingsPath, file), this.config.remoteRecordingPath + file);
        }
        
        const remoteFiles = await syncEngine.getRemoteFiles();
        for (const remote of remoteFiles) {
          if (remote.type === 'recording' && !localFiles.includes(remote.name)) {
             await syncEngine.download(remote.path, join(recordingsPath, remote.name));
          }
        }
      }

      this.config.lastSyncTime = Date.now();
      store.set('webdav.config', this.config);
      this.addLog('全量同步成功完成');
      this.updateStatus({ isSyncing: false, lastSyncTime: this.config.lastSyncTime });
    } catch (error) {
      this.addLog(`同步失败: ${error}`, 'error');
      this.updateStatus({ isSyncing: false });
    } finally {
      this.isSyncing = false;
    }
  }

  startRealtimeSync() {
    this.stopRealtimeSync();
    if (!this.config || this.config.syncMode !== 'realtime') return;

    const userDataPath = app.getPath('userData');
    const recordingsPath = store.get("recordings.savePath") as string || app.getPath('documents');
    
    const watchPaths = [];
    if (this.config.enableSyncConfig) watchPaths.push(join(userDataPath, 'moyu-data.json'));
    if (this.config.enableSyncDatabase) watchPaths.push(join(userDataPath, 'moyu.db'));
    if (this.config.enableSyncRecordings && existsSync(recordingsPath)) watchPaths.push(recordingsPath);

    if (watchPaths.length === 0) return;

    this.watcher = chokidar.watch(watchPaths, {
      ignoreInitial: true,
      persistent: true,
      depth: 0
    });

    this.watcher.on('change', (path) => {
      this.addLog(`检测到本地文件变动: ${basename(path)}，准备上传...`);
      this.handleFileChange(path);
    });

    this.addLog('实时监控已启动');
  }

  private async handleFileChange(path: string) {
    if (!this.config || this.isSyncing) return;
    const fileName = basename(path);
    let remotePath = '';

    if (fileName === 'moyu-data.json' || fileName === 'moyu.db') {
      remotePath = this.config.remoteConfigPath + fileName;
    } else {
      remotePath = this.config.remoteRecordingPath + fileName;
    }

    const result = await syncEngine.upload(path, remotePath);
    if (result) {
        this.addLog(`变动文件上传成功: ${fileName}`);
        this.config.lastSyncTime = Date.now();
        store.set('webdav.config', this.config);
        this.updateStatus({ lastSyncTime: this.config.lastSyncTime });
    }
  }

  stopRealtimeSync() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.addLog('实时监控已停止');
    }
  }

  getLogs() {
      return this.syncLogs;
  }
}

export const webdavService = new WebDAVService();