export interface TodoCompletionStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  thisYear: number;
  total: number;
}

export interface ConflictItem {
  localPath: string;
  remotePath: string;
  localMtime: number;
  remoteMtime: number;
  size: number;
  type: 'config' | 'database' | 'recording';
}

export interface RemoteFile {
  path: string;
  name: string;
  size: number;
  mtime: number;
  type: 'config' | 'database' | 'recording';
}

export interface DownloadOptions {
  overwrite: string[];
  skip: string[];
  rename: string[];
}

export interface SyncLog {
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: number;
  nextSyncTime?: number;
  progress?: {
    total: number;
    current: number;
    fileName: string;
  };
}

export interface WebDAVConfig {
  serverUrl: string;
  username: string;
  password: string;
  remoteConfigPath: string;
  remoteRecordingPath: string;
  enableSyncConfig: boolean;
  enableSyncDatabase: boolean;
  enableSyncRecordings: boolean;
  syncMode: 'manual' | 'realtime' | 'scheduled';
  debounceTime: number;
  lastSyncTime: number;
}

export interface ElectronAPI {
  // 窗口控制
  toggleWindow: () => void;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  fullscreenWindow: () => void;
  closeWindow: () => void;
  isFullscreen: () => Promise<{ success: boolean; isFullscreen?: boolean }>;

  // RSS 相关
  rss: {
    addFeed: (url: string) => Promise<any>;
    removeFeed: (url: string) => Promise<any>;
    refreshFeed: (url: string) => Promise<any>;
    getFeeds: () => Promise<any>;
    getFeed: (url: string) => Promise<any>;
  };

  // 快捷键相关
  shortcuts: {
    get: () => Promise<any>;
    set: (shortcuts: any) => Promise<any>;
    onChanged: (callback: (shortcuts: any) => void) => () => void;
  };

  // 数据存储
  store: {
    get: (key: string) => Promise<{ success: boolean; value?: any }>;
    set: (key: string, value: any) => Promise<{ success: boolean }>;
    getDataPath: () => Promise<{ success: boolean; path?: string }>;
    setDataPath: (
      path: string,
    ) => Promise<{
      success: boolean;
      message?: string;
      requiresRestart?: boolean;
    }>;
    getCloseBehavior: () => Promise<{
      success: boolean;
      value?: "minimize" | "quit";
    }>;
    setCloseBehavior: (
      value: "minimize" | "quit",
    ) => Promise<{ success: boolean }>;
  };

  // 数据库 API
  database: {
    getPath: () => Promise<{ success: boolean; path?: string }>;
    setPath: (
      path: string,
    ) => Promise<{
      success: boolean;
      message?: string;
      requiresRestart?: boolean;
      migratedRecords?: any;
    }>;
  };

  // 笔记 API
  notes: {
    getAll: () => Promise<{ success: boolean; notes?: any[] }>;
    getById: (id: number) => Promise<{ success: boolean; note?: any }>;
    search: (query: string) => Promise<{ success: boolean; notes?: any[] }>;
    create: (note: any) => Promise<{ success: boolean; id?: number }>;
    update: (id: number, note: any) => Promise<{ success: boolean }>;
    delete: (id: number) => Promise<{ success: boolean }>;
    count: () => Promise<{ success: boolean; count?: number }>;
  };

  // 待办事项 API
  todos: {
    getAll: () => Promise<{ success: boolean; todos?: any[] }>;
    getById: (id: number) => Promise<{ success: boolean; todo?: any }>;
    create: (todo: any) => Promise<{ success: boolean; id?: number }>;
    update: (id: number, todo: any) => Promise<{ success: boolean }>;
    toggle: (id: number) => Promise<{ success: boolean }>;
    delete: (id: number) => Promise<{ success: boolean }>;
    clearCompleted: () => Promise<{ success: boolean; count?: number }>;
    getStats: () => Promise<{ success: boolean; stats?: any }>;
    updateOrder: (orderedIds: number[]) => Promise<{ success: boolean }>;
    getCompletionStats: () => Promise<{
      success: boolean;
      stats?: TodoCompletionStats;
    }>;
    getPaginated: (
      page?: number,
      pageSize?: number,
    ) => Promise<{
      success: boolean;
      todos?: any[];
      total?: number;
      totalPages?: number;
      currentPage?: number;
    }>;
    getPending: (
      page?: number,
      pageSize?: number,
    ) => Promise<{
      success: boolean;
      todos?: any[];
      total?: number;
      totalPages?: number;
      currentPage?: number;
    }>;
    getCompleted: (
      page?: number,
      pageSize?: number,
    ) => Promise<{
      success: boolean;
      todos?: any[];
      total?: number;
      totalPages?: number;
      currentPage?: number;
    }>;
  };

  // 新闻分类 API
  newsCategories: {
    getAll: () => Promise<{ success: boolean; categories?: any[] }>;
    getById: (id: number) => Promise<{ success: boolean; category?: any }>;
    create: (category: any) => Promise<{ success: boolean; id?: number }>;
    update: (id: number, category: any) => Promise<{ success: boolean }>;
    delete: (id: number) => Promise<{ success: boolean }>;
  };

  // 新闻源 API
  newsSources: {
    getAll: () => Promise<{ success: boolean; sources?: any[] }>;
    getActive: () => Promise<{ success: boolean; sources?: any[] }>;
    getById: (id: number) => Promise<{ success: boolean; source?: any }>;
    getByUrl: (url: string) => Promise<{ success: boolean; source?: any }>;
    create: (source: any) => Promise<{ success: boolean; id?: number }>;
    update: (id: number, source: any) => Promise<{ success: boolean }>;
    delete: (id: number) => Promise<{ success: boolean }>;
  };

  // 新闻条目 API
  newsItems: {
    getNewsItems: (
      limit?: number,
      offset?: number,
      categoryId?: number,
    ) => Promise<{ success: boolean; items?: any[] }>;
    getRecent: (limit?: number) => Promise<{ success: boolean; items?: any[] }>;
    getById: (id: number) => Promise<{ success: boolean; item?: any }>;
    getBySourceId: (
      sourceId: number,
      limit?: number,
    ) => Promise<{ success: boolean; items?: any[] }>;
    create: (item: any) => Promise<{ success: boolean; id?: number }>;
    update: (id: number, item: any) => Promise<{ success: boolean }>;
    updateContent: (
      id: number,
      content: string,
    ) => Promise<{ success: boolean }>;
    markAsRead: (id: number) => Promise<{ success: boolean }>;
    markMultipleAsRead: (
      ids: number[],
    ) => Promise<{ success: boolean; count?: number }>;
    delete: (id: number) => Promise<{ success: boolean }>;
    cleanOldNews: (
      days?: number,
    ) => Promise<{ success: boolean; count?: number }>;
  };

  // 收藏 API
  favorites: {
    getAll: (
      limit?: number,
    ) => Promise<{ success: boolean; favorites?: any[] }>;
    add: (itemId: number) => Promise<{ success: boolean }>;
    remove: (itemId: number) => Promise<{ success: boolean }>;
    isFavorite: (
      itemId: number,
    ) => Promise<{ success: boolean; isFavorite?: boolean }>;
  };

  // 新闻（保持兼容性）
  news: {
    getDomesticNews: (category?: string) => Promise<any>;
  };

  // 网页收藏 API
  webPages: {
    getAll: () => Promise<{ success: boolean; webPages?: any[] }>;
    getById: (id: number) => Promise<{ success: boolean; webPage?: any }>;
    getByUrl: (url: string) => Promise<{ success: boolean; webPage?: any }>;
    create: (webPage: any) => Promise<{ success: boolean; id?: number }>;
    update: (id: number, webPage: any) => Promise<{ success: boolean }>;
    delete: (id: number) => Promise<{ success: boolean }>;
    categories: {
      getAll: () => Promise<{ success: boolean; categories?: any[] }>;
      getById: (id: number) => Promise<{ success: boolean; category?: any }>;
      create: (category: any) => Promise<{ success: boolean; id?: number }>;
      update: (id: number, category: any) => Promise<{ success: boolean }>;
      delete: (
        id: number,
      ) => Promise<{ success: boolean; error?: string; webPageCount?: number }>;
      getWebPageCount: (
        id: number,
      ) => Promise<{ success: boolean; count?: number }>;
    };
  };

  // 录音 API
  recordings: {
    getAll: (limit?: number, offset?: number) => Promise<{ success: boolean; recordings?: any[] }>;
    getById: (id: number) => Promise<{ success: boolean; recording?: any }>;
    create: (recording: any) => Promise<{ success: boolean; id?: number }>;
    update: (id: number, recording: any) => Promise<{ success: boolean }>;
    delete: (id: number) => Promise<{ success: boolean }>;
    count: () => Promise<{ success: boolean; count?: number }>;
    getStats: () => Promise<{ success: boolean; stats?: any }>;
    scanDirectory: () => Promise<{ success: boolean; files?: any[] }>;
    deleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    saveFile: (fileName: string, fileData: ArrayBuffer, savePath: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    getSavePath: () => Promise<{ success: boolean; savePath?: string }>;
    setSavePath: (savePath: string) => Promise<{ success: boolean }>;
    getNamingPattern: () => Promise<{ success: boolean; pattern?: string }>;
    setNamingPattern: (pattern: string) => Promise<{ success: boolean }>;
    generateFileName: (prefix?: string) => Promise<{ success: boolean; fileName?: string }>;
    getDefaultDevice: () => Promise<{ success: boolean; deviceId?: string }>;
    setDefaultDevice: (deviceId: string) => Promise<{ success: boolean }>;
    getMicVolume: () => Promise<{ success: boolean; volume?: number }>;
    setMicVolume: (volume: number) => Promise<{ success: boolean }>;
    onToggle: (callback: () => void) => () => void;
  };

  // Shell API
  shell: {
    openPath: (path: string) => Promise<{ success: boolean; error?: string }>;
    showItemInFolder: (path: string) => Promise<{ success: boolean; error?: string }>;
  };

  // Clipboard API
  clipboard: {
    readText: () => string;
    writeText: (text: string) => void;
    readHTML: () => string;
    writeHTML: (html: string) => void;
    clear: () => void;
  };

  // 对话框
  dialog: {
    selectDirectory: () => Promise<{
      success: boolean;
      path?: string;
      canceled?: boolean;
    }>;
    selectDatabaseFile: () => Promise<{
      success: boolean;
      path?: string;
      canceled?: boolean;
    }>;
  };

  // 代理 API
  proxy: {
    get: () => Promise<{
      success: boolean;
      config?: { enabled: boolean; url?: string };
    }>;
    set: (url: string | null) => Promise<{ success: boolean }>;
    test: (
      url: string,
    ) => Promise<{ success: boolean; message?: string; error?: string }>;
  };

  // 统计 API
  stats: {
    startFeatureUsage: (featureId: string) => Promise<{ success: boolean }>;
    endFeatureUsage: (featureId: string) => Promise<{ success: boolean }>;
    getAppUsage: (dimension?: string) => Promise<{
      success: boolean;
      stats?: {
        today: number;
        thisWeek: number;
        thisMonth: number;
        thisYear: number;
        total: number;
        sessions: number;
      };
    }>;
    getFeatureUsage: (
      featureId?: string,
      dimension?: string,
    ) => Promise<{
      success: boolean;
      stats?: Array<{
        featureId: string;
        featureName: string;
        duration: number;
        count: number;
        todayDuration: number;
        todayCount: number;
        thisWeekDuration: number;
        thisWeekCount: number;
        thisMonthDuration: number;
        thisMonthCount: number;
      }>;
    }>;
    getHistoryTrend: (
      dimension?: string,
      days?: number,
    ) => Promise<{
      success: boolean;
      data?: Array<{
        date: string;
        duration: number;
        sessions: number;
      }>;
    }>;
  };

  // 窗口状态 API
  window: {
    isFocused: () => Promise<{ success: boolean; isFocused: boolean }>;
    onFocusChanged: (callback: (isFocused: boolean) => void) => () => void;
  };

  // 自动更新 API
  updater: {
    checkForUpdates: () => Promise<{
      success: boolean;
      error?: string;
    }>;
    downloadUpdate: () => Promise<{
      success: boolean;
      error?: string;
    }>;
    quitAndInstall: () => Promise<{
      success: boolean;
      error?: string;
    }>;
    onAvailable: (callback: (info: { version: string; releaseNotes: string }) => void) => () => void;
    onNotAvailable: (callback: (info?: { version: string }) => void) => () => void;
    onError: (callback: (error: { message: string }) => void) => () => void;
    onProgress: (callback: (progress: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => void) => () => void;
    onDownloaded: (callback: (info: { version: string }) => void) => () => void;
  };

  // 自动更新设置 API
  autoUpdate: {
    getEnabled: () => Promise<{ success: boolean; enabled?: boolean; error?: string }>;
    setEnabled: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  };

  // 开机自启设置 API
  autoLaunch: {
    getEnabled: () => Promise<{ success: boolean; enabled?: boolean }>;
    setEnabled: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  };

  // WebDAV API
  webdav: {
    getConfig: () => Promise<{
      success: boolean;
      config?: WebDAVConfig;
    }>;
    setConfig: (config: WebDAVConfig) => Promise<{ success: boolean }>;
    testConnection: () => Promise<{ success: boolean }>;
    syncAll: () => Promise<{ success: boolean }>;
    getSyncLogs: () => Promise<{ success: boolean; logs?: string[] }>;
    isWatching: () => Promise<{ success: boolean; isWatching?: boolean }>;
    startScheduledSync: () => Promise<{ success: boolean }>;
    stopScheduledSync: () => Promise<{ success: boolean }>;
    listRemoteFiles: () => Promise<{ success: boolean; files?: RemoteFile[] }>;
    checkConflicts: () => Promise<{ success: boolean; conflicts?: ConflictItem[] }>;
    downloadAll: (options: DownloadOptions) => Promise<{ success: boolean }>;
    onLogUpdate: (callback: (logs: string[]) => void) => () => void;
    onStatusChange: (callback: (status: any) => void) => () => void;
    onWatchingStatusChange: (callback: (status: { isWatching: boolean; message: string }) => void) => () => void;
    onScheduledSyncStatusChange: (callback: (status: { isRunning: boolean; nextSyncTime?: number; error?: string }) => void) => () => void;
  };

  // 平台信息
  platform: string;

  // 版本信息
  versions: NodeJS.ProcessVersions;
}
