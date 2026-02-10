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
  private config: WebDAVConfig | null = null;
  private isSyncing = false;
  private syncLogs: SyncLog[] = [];
  private watcher: chokidar.FSWatcher | null = null;
  private syncTimer: NodeJS.Timeout | null = null;

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
      this.mainWindow.webContents.send('webdav:log-update', log);
    }
  }

  private updateStatus(status: Partial<SyncStatus>) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('webdav:status-update', status);
    }
  }

  async initialize() {
    const savedConfig = store.get('webdav.config') as WebDAVConfig;
    if (savedConfig) {
      this.config = savedConfig;
      webdavClient.initialize(this.config);
      syncEngine.setConfig(this.config);
      this.addLog('WebDAV Service initialized with saved config');
      
      if (this.config.syncMode === 'realtime') {
        this.startRealtimeSync();
      } else if (this.config.syncMode === 'scheduled' && this.config.enableScheduledSync) {
        this.startScheduledSync();
      }
    }
  }

  async updateConfig(newConfig: WebDAVConfig) {
    this.config = newConfig;
    store.set('webdav.config', newConfig);
    webdavClient.initialize(newConfig);
    syncEngine.setConfig(newConfig);
    this.addLog('WebDAV Config updated');
    
    this.stopScheduledSync();
    this.stopRealtimeSync();

    if (newConfig.syncMode === 'realtime') {
      this.startRealtimeSync();
    } else if (newConfig.syncMode === 'scheduled' && newConfig.enableScheduledSync) {
      this.startScheduledSync();
    }
  }

  async syncAll() {
    if (this.isSyncing || !this.config) return;
    this.isSyncing = true;
    this.updateStatus({ isSyncing: true });
    this.addLog('Starting full sync...');

    try {
      const userDataPath = app.getPath('userData');
      const recordingsPath = store.get("recordings.savePath") as string || app.getPath('documents');

      // 1. Config and Database
      if (this.config.enableSyncConfig) {
        await syncEngine.syncFile(join(userDataPath, 'moyu-data.json'), this.config.remoteConfigPath + 'moyu-data.json');
      }
      if (this.config.enableSyncDatabase) {
        await syncEngine.syncFile(join(userDataPath, 'moyu.db'), this.config.remoteConfigPath + 'moyu.db');
      }

      // 2. Recordings
      if (this.config.enableSyncRecordings && existsSync(recordingsPath)) {
        const audioExtensions = ['.wav', '.mp3', '.m4a', '.webm', '.ogg'];
        const localFiles = readdirSync(recordingsPath).filter(f => audioExtensions.some(ext => f.toLowerCase().endsWith(ext)));
        
        // Simple bidirectional sync for recordings
        for (const file of localFiles) {
          await syncEngine.syncFile(join(recordingsPath, file), this.config.remoteRecordingPath + file);
        }
        
        // Also check remote for files not in local
        const remoteFiles = await syncEngine.getRemoteFiles();
        for (const remote of remoteFiles) {
          if (remote.type === 'recording' && !localFiles.includes(remote.name)) {
             await syncEngine.download(remote.path, join(recordingsPath, remote.name));
          }
        }
      }

      this.config.lastSyncTime = Date.now();
      store.set('webdav.config', this.config);
      this.updateStatus({ isSyncing: false, lastSyncTime: this.config.lastSyncTime });
      this.addLog('Full sync completed successfully');
    } catch (error) {
      this.addLog(`Sync failed: ${error}`, 'error');
      this.updateStatus({ isSyncing: false });
    } finally {
      this.isSyncing = false;
    }
  }

  startScheduledSync() {
    this.stopScheduledSync();
    if (!this.config || !this.config.enableScheduledSync) return;

    const interval = (this.config.scheduledSyncInterval || 30) * 60 * 1000;
    this.addLog(`Starting scheduled sync every ${this.config.scheduledSyncInterval} minutes`);
    
    this.syncTimer = setInterval(() => {
      this.syncAll();
    }, interval);

    this.updateStatus({ nextSyncTime: Date.now() + interval });
  }

  stopScheduledSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      this.addLog('Scheduled sync stopped');
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

    this.watcher = chokidar.watch(watchPaths, {
      ignoreInitial: true,
      persistent: true,
      depth: 0
    });

    this.watcher.on('change', (path) => {
      this.addLog(`File changed: ${basename(path)}, triggering upload...`);
      this.handleFileChange(path);
    });

    this.addLog('Realtime sync started (watching for local changes)');
  }

  private async handleFileChange(path: string) {
    if (!this.config) return;
    const fileName = basename(path);
    let remotePath = '';

    if (fileName === 'moyu-data.json' || fileName === 'moyu.db') {
      remotePath = this.config.remoteConfigPath + fileName;
    } else {
      remotePath = this.config.remoteRecordingPath + fileName;
    }

    await syncEngine.upload(path, remotePath);
  }

  stopRealtimeSync() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.addLog('Realtime sync stopped');
    }
  }
}

export const webdavService = new WebDAVService();
