import { app } from 'electron';
import Store from 'electron-store';
import { WebDAVConfig } from './webdavSyncService';

interface ScheduledSyncStatus {
  isRunning: boolean;
  nextSyncTime?: number;
  error?: string;
}

class ScheduledSyncService {
  private static instance: ScheduledSyncService;
  private timer: NodeJS.Timeout | null = null;
  private currentConfig: WebDAVConfig | null = null;
  private syncInProgress = false;
  private callbacks: Set<(status: ScheduledSyncStatus) => void> = new Set();

  private constructor() {}

  static getInstance(): ScheduledSyncService {
    if (!ScheduledSyncService.instance) {
      ScheduledSyncService.instance = new ScheduledSyncService();
    }
    return ScheduledSyncService.instance;
  }

  private notify(status: ScheduledSyncStatus): void {
    this.callbacks.forEach(cb => cb(status));
  }

  onStatusChange(callback: (status: ScheduledSyncStatus) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  async startScheduledSync(config: WebDAVConfig): Promise<void> {
    this.stopScheduledSync();
    this.currentConfig = config;

    console.log('[ScheduledSync] 收到配置:', {
      syncMode: config.syncMode,
      serverUrl: config.serverUrl,
      username: config.username,
      enableSyncConfig: config.enableSyncConfig,
      enableSyncDatabase: config.enableSyncDatabase,
      enableSyncRecordings: config.enableSyncRecordings,
    });

    if (config.syncMode !== 'scheduled') {
      console.log('[ScheduledSync] 模式不是 scheduled');
      return;
    }

    console.log('[ScheduledSync] 启动定时同步，间隔:', config.scheduledSyncInterval, '分钟');

    const nextSyncTime = this.calculateNextSyncTime(config.scheduledSyncInterval);
    const now = Date.now();

    if (now >= nextSyncTime) {
      console.log('[ScheduledSync] 立即执行同步');
      await this.performSync();
    }

    this.scheduleNextSync(nextSyncTime);
  }

  stopScheduledSync(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      console.log('[ScheduledSync] 定时同步已停止');
    }
  }

  private calculateNextSyncTime(intervalMinutes: number): number {
    // 1 = 5秒（调试模式）
    if (intervalMinutes === 1) {
      return Date.now() + 5000;
    }
    return Date.now() + intervalMinutes * 60000;
  }

  private scheduleNextSync(nextSyncTime: number): void {
    const now = Date.now();
    const delay = Math.max(500, nextSyncTime - now);

    this.notify({
      isRunning: false,
      nextSyncTime
    });

    console.log('[ScheduledSync] 安排下次同步，延迟:', delay, 'ms');
    console.log('[ScheduledSync] 下次同步时间:', new Date(nextSyncTime).toLocaleString());

    this.timer = setTimeout(() => {
      this.performSync();
    }, delay);
  }

  private async performSync(): Promise<void> {
    if (this.syncInProgress) {
      console.log('[ScheduledSync] 已有同步任务，跳过');
      return;
    }

    this.syncInProgress = true;

    try {
      const webdavModule = await import('./webdavSyncService');
      const { syncAll } = webdavModule;

      console.log('[ScheduledSync] 执行定时同步...');
      await syncAll();

      if (this.currentConfig) {
        const store = new Store({ name: "moyu-data" });
        const config = store.get("webdav.config") as WebDAVConfig;
        if (config) {
          config.lastSyncTime = Date.now();
          config.nextSyncTime = this.calculateNextSyncTime(config.scheduledSyncInterval);
          store.set("webdav.config", config);
          this.currentConfig = config;
          console.log('[ScheduledSync] 配置已更新');
          console.log('[ScheduledSync] 下次同步时间:', new Date(config.nextSyncTime).toLocaleString());
          // 安排下一次同步
          this.scheduleNextSync(config.nextSyncTime);
        }
      }
    } catch (error) {
      console.error('[ScheduledSync] 定时同步失败:', error);
      this.notify({
        isRunning: false,
        error: `同步失败: ${error}`
      });
    } finally {
      this.syncInProgress = false;
    }
  }
}

export default ScheduledSyncService.getInstance();
