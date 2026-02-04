import chokidar from 'chokidar';
import { app } from 'electron';
import { join, basename } from 'path';
import { debounce } from 'lodash-es';
import webdavSyncService from './webdavSyncService';
import { getMainWindow } from '../modules/windowManager';

class FileWatcherService {
  private static instance: FileWatcherService;
  private configWatcher: chokidar.FSWatcher | null = null;
  private recordingsWatcher: chokidar.FSWatcher | null = null;
  private isWatching = false;

  private constructor() {}

  static getInstance(): FileWatcherService {
    if (!FileWatcherService.instance) {
      FileWatcherService.instance = new FileWatcherService();
    }
    return FileWatcherService.instance;
  }

  private syncConfigDebounced = debounce(async (filePath: string) => {
    console.log(`>>> FileWatcher: 配置文件变化（防抖），${filePath}`);
    await webdavSyncService.syncConfig();
    await webdavSyncService.syncDatabase();
  }, 5000);

  private syncRecordingDebounced = debounce(async (filePath: string) => {
    console.log(`>>> FileWatcher: 录音文件变化（防抖），${filePath}`);
    await webdavSyncService.syncRecordings();
  }, 10000);

  startWatching(): void {
    if (this.isWatching) {
      console.log('>>> FileWatcher: 文件监听已在运行，跳过');
      return;
    }

    this.isWatching = true;
    console.log('>>> FileWatcher: 文件监听启动，isWatching:', this.isWatching);

    const userDataPath = app.getPath('userData');
    console.log('>>> FileWatcher: 监听配置文件:', userDataPath);

    // 只监听配置文件，不监听数据库
    this.configWatcher = chokidar.watch(
      [join(userDataPath, 'moyu-data.json')],
      {
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 3000,
          pollInterval: 1000,
        },
      }
    );

    this.configWatcher.on('change', (filePath) => {
      console.log(`>>> FileWatcher: 配置文件变化: ${filePath}`);
      this.syncConfigDebounced(filePath);
    });

    console.log('>>> FileWatcher: 配置文件监听已启动');

    // 获取录音保存路径
    const recordingsPath = process.env.RECORDING_PATH || app.getPath('documents');
    console.log('>>> FileWatcher: 监听录音目录:', recordingsPath);

    // 使用 glob 模式监听所有音频文件
    const audioExtensions = ['*.wav', '*.mp3', '*.m4a', '*.webm', '*.ogg'];
    const patterns = audioExtensions.map(ext => join(recordingsPath, '**', ext));
    console.log('>>> FileWatcher: 监听音频文件模式:', patterns);

    this.recordingsWatcher = chokidar.watch(patterns, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 3000,
        pollInterval: 1000,
      },
    }) as any;

    const audioExts = ['.wav', '.mp3', '.m4a', '.webm', '.ogg'];

    this.recordingsWatcher
      .on('add', (filePath) => {
        const fileName = basename(filePath).toLowerCase();
        if (audioExts.some(ext => fileName.endsWith(ext))) {
          console.log(`>>> FileWatcher: 录音文件添加: ${filePath}`);
          this.syncRecordingDebounced(filePath);
        }
      })
      .on('change', (filePath) => {
        const fileName = basename(filePath).toLowerCase();
        if (audioExts.some(ext => fileName.endsWith(ext))) {
          console.log(`>>> FileWatcher: 录音文件变化: ${filePath}`);
          this.syncRecordingDebounced(filePath);
        }
      })
      .on('unlink', (filePath) => {
        const fileName = basename(filePath).toLowerCase();
        if (audioExts.some(ext => fileName.endsWith(ext))) {
          console.log(`>>> FileWatcher: 录音文件删除: ${filePath}`);
        }
      });

    console.log('>>> FileWatcher: 录音文件监听已启动');

    // 延迟 200ms 后通知 UI 监听器已启动
    const mainWindow = getMainWindow();
    if (mainWindow) {
      setTimeout(() => {
        console.log('>>> FileWatcher: 发送监听器启动通知');
        mainWindow.webContents.send('webdav:watchingStatusChanged', {
          isWatching: true,
          message: '监听已启动'
        });
      }, 200);
    }
  }

  stopWatching(): void {
    if (!this.isWatching) {
      console.log('>>> FileWatcher: 文件监听未运行，跳过停止');
      return;
    }

    console.log('>>> FileWatcher: 开始停止文件监听...');
    this.isWatching = false;

    if (this.configWatcher) {
      this.configWatcher.close();
      this.configWatcher = null;
      console.log('>>> FileWatcher: 配置文件监听器已关闭');
    }

    if (this.recordingsWatcher) {
      this.recordingsWatcher.close();
      this.recordingsWatcher = null;
      console.log('>>> FileWatcher: 录音文件监听器已关闭');
    }

    // 立即通知 UI
    const mainWindow = getMainWindow();
    if (mainWindow) {
      console.log('>>> FileWatcher: 发送监听器停止通知');
      mainWindow.webContents.send('webdav:watchingStatusChanged', {
        isWatching: false,
        message: '监听已停止'
      });
    }

    console.log('>>> FileWatcher: 文件监听已停止，isWatching:', this.isWatching);
  }

  isWatchingActive(): boolean {
    return this.isWatching;
  }
}

export default FileWatcherService.getInstance();
