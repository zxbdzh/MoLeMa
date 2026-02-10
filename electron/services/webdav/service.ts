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
    const defaultConfig: WebDAVConfig = {
      serverUrl: '',
      username: '',
      password: '',
      remoteConfigPath: '/MoLeMa-config/',
      remoteRecordingPath: '/MoLeMa-recordings/',
      enableSyncConfig: true,
      enableSyncDatabase: true,
      enableSyncRecordings: true,
      syncMode: 'manual',
      debounceTime: 5,
      lastSyncTime: 0,
    };

    const savedConfig = store.get('webdav.config') as WebDAVConfig;
    this.config = { ...defaultConfig, ...savedConfig };
    
    // Normalize paths
    if (!this.config.remoteConfigPath.endsWith('/')) this.config.remoteConfigPath += '/';
    if (!this.config.remoteRecordingPath.endsWith('/')) this.config.remoteRecordingPath += '/';

    if (this.config.serverUrl) {
      webdavClient.initialize(this.config);
      syncEngine.setConfig(this.config);
      this.addLog('WebDAV 服务初始化完成');
      
      if (this.config.syncMode === 'realtime') {
        this.startRealtimeSync();
      }
    }
  }

  async updateConfig(newConfig: WebDAVConfig) {
    // Normalize paths
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
    this.addLog('WebDAV 配置已更新并保存');
    
    this.stopRealtimeSync();

    if (newConfig.syncMode === 'realtime') {
      this.startRealtimeSync();
    }
  }

  async syncAll() {
    if (this.isSyncing || !this.config || !this.config.serverUrl) {
        if (this.isSyncing) this.addLog('已有同步任务在进行中，请稍候', 'warn');
        if (!this.config?.serverUrl) this.addLog('未配置服务器地址，无法同步', 'error');
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
        const localConfigPath = join(userDataPath, 'moyu-data.json');
        if (existsSync(localConfigPath)) {
            this.addLog('正在同步配置文件...');
            await syncEngine.syncFile(localConfigPath, this.config.remoteConfigPath + 'moyu-data.json');
        }
      }
      if (this.config.enableSyncDatabase) {
        const localDbPath = join(userDataPath, 'moyu.db');
        if (existsSync(localDbPath)) {
            this.addLog('正在同步数据库...');
            await syncEngine.syncFile(localDbPath, this.config.remoteConfigPath + 'moyu.db');
        }
      }

      // 2. Recordings
      if (this.config.enableSyncRecordings && existsSync(recordingsPath)) {
        this.addLog('正在同步录音文件...');
        const audioExtensions = ['.wav', '.mp3', '.m4a', '.webm', '.ogg'];
        const localFiles = readdirSync(recordingsPath).filter(f => audioExtensions.some(ext => f.toLowerCase().endsWith(ext)));
        
        for (const file of localFiles) {
          await syncEngine.syncFile(join(recordingsPath, file), this.config.remoteRecordingPath + file);
        }
        
        this.addLog('检查远端文件是否有更新...');
        const remoteFiles = await syncEngine.getRemoteFiles();
        for (const remote of remoteFiles) {
          if (remote.type === 'recording' && !localFiles.includes(remote.name)) {
             this.addLog(`下载远端新增录音: ${remote.name}`);
             await syncEngine.download(remote.path, join(recordingsPath, remote.name));
          }
        }
      }

      this.config.lastSyncTime = Date.now();
      store.set('webdav.config', this.config);
      this.addLog('全量同步成功完成');
      this.updateStatus({ isSyncing: false, lastSyncTime: this.config.lastSyncTime });
    } catch (error: any) {
      this.addLog(`同步失败: ${error.message || error}`, 'error');
      this.updateStatus({ isSyncing: false });
    } finally {
      this.isSyncing = false;
    }
  }

  clearLogs() {
    this.syncLogs = [];
    this.addLog('同步日志已清除');
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('webdav:logUpdate', this.syncLogs);
    }
  }

  async forceSync(direction: 'upload' | 'download') {
    if (this.isSyncing || !this.config || !this.config.serverUrl) {
        if (this.isSyncing) this.addLog('已有同步任务在进行中', 'warn');
        return;
    }

    this.isSyncing = true;
    this.updateStatus({ isSyncing: true });
    const strategy = direction === 'upload' ? 'force-upload' : 'force-download';
    this.addLog(`开始强制同步 (${direction === 'upload' ? '覆盖远程' : '覆盖本地'})...`);

    try {
        const userDataPath = app.getPath('userData');
        const recordingsPath = store.get("recordings.savePath") as string || app.getPath('documents');

        // 1. Config and Database
        if (this.config.enableSyncConfig) {
            const localPath = join(userDataPath, 'moyu-data.json');
            const remotePath = this.config.remoteConfigPath + 'moyu-data.json';
            await syncEngine.syncFile(localPath, remotePath, strategy);
        }
        if (this.config.enableSyncDatabase) {
            const localPath = join(userDataPath, 'moyu.db');
            const remotePath = this.config.remoteConfigPath + 'moyu.db';
            await syncEngine.syncFile(localPath, remotePath, strategy);
        }

        // 2. Recordings
        if (this.config.enableSyncRecordings && existsSync(recordingsPath)) {
            const audioExtensions = ['.wav', '.mp3', '.m4a', '.webm', '.ogg'];
            if (direction === 'upload') {
                const localFiles = readdirSync(recordingsPath).filter(f => audioExtensions.some(ext => f.toLowerCase().endsWith(ext)));
                for (const file of localFiles) {
                    await syncEngine.syncFile(join(recordingsPath, file), this.config.remoteRecordingPath + file, 'force-upload');
                }
            } else {
                const remoteFiles = await syncEngine.getRemoteFiles();
                for (const remote of remoteFiles) {
                    if (remote.type === 'recording') {
                        await syncEngine.download(remote.path, join(recordingsPath, remote.name));
                    }
                }
            }
        }

        this.config.lastSyncTime = Date.now();
        store.set('webdav.config', this.config);
        this.addLog(`强制同步 (${direction}) 成功完成`);
        this.updateStatus({ isSyncing: false, lastSyncTime: this.config.lastSyncTime });
    } catch (error: any) {
        this.addLog(`强制同步失败: ${error.message || error}`, 'error');
        this.updateStatus({ isSyncing: false });
    } finally {
        this.isSyncing = false;
    }
  }

  startRealtimeSync() {
    this.stopRealtimeSync();
    if (!this.config || this.config.syncMode !== 'realtime' || !this.config.serverUrl) return;

    const userDataPath = app.getPath('userData');
    const recordingsPath = store.get("recordings.savePath") as string || app.getPath('documents');
    
    const watchPaths = [];
    if (this.config.enableSyncConfig) watchPaths.push(join(userDataPath, 'moyu-data.json'));
    if (this.config.enableSyncDatabase) watchPaths.push(join(userDataPath, 'moyu.db'));
    if (this.config.enableSyncRecordings && existsSync(recordingsPath)) watchPaths.push(recordingsPath);

    if (watchPaths.length === 0) {
        this.addLog('实时监控未启动：没有需要监控的路径', 'warn');
        return;
    }

    this.addLog(`正在启动实时监控，监控路径: ${watchPaths.length} 个`);

    this.watcher = chokidar.watch(watchPaths, {
      ignoreInitial: true,
      persistent: true,
      depth: 0,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      }
    });

    this.watcher.on('add', (path) => {
        if (path.includes(recordingsPath)) {
            this.addLog(`检测到新文件: ${basename(path)}，准备同步...`);
            this.handleFileChange(path);
        }
    });

    this.watcher.on('change', (path) => {
      this.addLog(`检测到文件变动: ${basename(path)}，准备同步...`);
      this.handleFileChange(path);
    });

    this.watcher.on('error', (error) => {
        this.addLog(`监控出错: ${error}`, 'error');
    });

    this.addLog('实时监控已成功启动');
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

    // 使用 syncFile 代替 upload，以正确处理时间戳和增量逻辑
    const result = await syncEngine.syncFile(path, remotePath, 'upload-newer');
    if (result === 'uploaded') {
        this.addLog(`文件已自动同步到云端: ${fileName}`);
        this.config.lastSyncTime = Date.now();
        store.set('webdav.config', this.config);
        this.updateStatus({ lastSyncTime: this.config.lastSyncTime });
    } else if (result === 'skipped') {
        this.addLog(`文件内容无变动，跳过同步: ${fileName}`, 'debug');
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