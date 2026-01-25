const { contextBridge, ipcRenderer } = require("electron");

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld("electronAPI", {
  // 窗口控制
  toggleWindow: () => ipcRenderer.send("toggle-window"),
  minimizeWindow: () => ipcRenderer.send("minimize-window"),
  maximizeWindow: () => ipcRenderer.send("maximize-window"),
  fullscreenWindow: () => ipcRenderer.send("fullscreen-window"),
  closeWindow: () => ipcRenderer.send("close-window"),
  isFullscreen: () => ipcRenderer.invoke("is-fullscreen"),

  // RSS 相关
  rss: {
    addFeed: (url: string) => ipcRenderer.invoke("rss:addFeed", url),
    removeFeed: (url: string) => ipcRenderer.invoke("rss:removeFeed", url),
    refreshFeed: (url: string) => ipcRenderer.invoke("rss:refreshFeed", url),
    getFeeds: () => ipcRenderer.invoke("rss:getFeeds"),
    getFeed: (url: string) => ipcRenderer.invoke("rss:getFeed", url),
  },

  // 快捷键相关
  shortcuts: {
    get: () => ipcRenderer.invoke("shortcuts:get"),
    set: (shortcuts: any) => ipcRenderer.invoke("shortcuts:set", shortcuts),
    onChanged: (callback: (shortcuts: any) => void) => {
      const listener = (_event: any, shortcuts: any) => callback(shortcuts);
      ipcRenderer.on("shortcuts:changed", listener);
      return () => ipcRenderer.removeListener("shortcuts:changed", listener);
    },
  },

  // 数据存储（保持兼容性）
  store: {
    get: (key: string) => ipcRenderer.invoke("store:get", key),
    set: (key: string, value: any) =>
      ipcRenderer.invoke("store:set", key, value),
    getDataPath: () => ipcRenderer.invoke("store:getDataPath"),
    setDataPath: (path: string) =>
      ipcRenderer.invoke("store:setDataPath", path),
    getCloseBehavior: () => ipcRenderer.invoke("store:get", "closeBehavior"),
    setCloseBehavior: (value: "minimize" | "quit") =>
      ipcRenderer.invoke("store:set", "closeBehavior", value),
  },

  // 数据库 API
  database: {
    getPath: () => ipcRenderer.invoke("database:getPath"),
    setPath: (path: string) => ipcRenderer.invoke("database:setPath", path),
    setDirectory: (directoryPath: string) =>
      ipcRenderer.invoke("database:setDirectory", directoryPath),
  },

  // 笔记 API
  notes: {
    getAll: () => ipcRenderer.invoke("notes:getAll"),
    getById: (id: number) => ipcRenderer.invoke("notes:getById", id),
    search: (query: string) => ipcRenderer.invoke("notes:search", query),
    create: (note: any) => ipcRenderer.invoke("notes:create", note),
    update: (id: number, note: any) =>
      ipcRenderer.invoke("notes:update", id, note),
    delete: (id: number) => ipcRenderer.invoke("notes:delete", id),
    count: () => ipcRenderer.invoke("notes:count"),
  },

  // 待办事项 API
  todos: {
    getAll: () => ipcRenderer.invoke("todos:getAll"),
    getById: (id: number) => ipcRenderer.invoke("todos:getById", id),
    create: (todo: any) => ipcRenderer.invoke("todos:create", todo),
    update: (id: number, todo: any) =>
      ipcRenderer.invoke("todos:update", id, todo),
    toggle: (id: number) => ipcRenderer.invoke("todos:toggle", id),
    delete: (id: number) => ipcRenderer.invoke("todos:delete", id),
    clearCompleted: () => ipcRenderer.invoke("todos:clearCompleted"),
    getStats: () => ipcRenderer.invoke("todos:getStats"),
    updateOrder: (orderedIds: number[]) =>
      ipcRenderer.invoke("todos:updateOrder", orderedIds),
    getCompletionStats: () => ipcRenderer.invoke("todos:getCompletionStats"),
    getPaginated: (page?: number, pageSize?: number) =>
      ipcRenderer.invoke("todos:getPaginated", page, pageSize),
    getPending: (page?: number, pageSize?: number) =>
      ipcRenderer.invoke("todos:getPending", page, pageSize),
    getCompleted: (page?: number, pageSize?: number) =>
      ipcRenderer.invoke("todos:getCompleted", page, pageSize),
  },

  // 新闻分类 API
  newsCategories: {
    getAll: () => ipcRenderer.invoke("newsCategories:getAll"),
    getById: (id: number) => ipcRenderer.invoke("newsCategories:getById", id),
    create: (category: any) =>
      ipcRenderer.invoke("newsCategories:create", category),
    update: (id: number, category: any) =>
      ipcRenderer.invoke("newsCategories:update", id, category),
    delete: (id: number) => ipcRenderer.invoke("newsCategories:delete", id),
  },

  // 新闻源 API
  newsSources: {
    getAll: () => ipcRenderer.invoke("newsSources:getAll"),
    getActive: () => ipcRenderer.invoke("newsSources:getActive"),
    getById: (id: number) => ipcRenderer.invoke("newsSources:getById", id),
    getByUrl: (url: string) => ipcRenderer.invoke("newsSources:getByUrl", url),
    create: (source: any) => ipcRenderer.invoke("newsSources:create", source),
    update: (id: number, source: any) =>
      ipcRenderer.invoke("newsSources:update", id, source),
    delete: (id: number) => ipcRenderer.invoke("newsSources:delete", id),
    test: (url: string) => ipcRenderer.invoke("newsSources:test", url),
  },

  // 新闻条目 API
  newsItems: {
    getNewsItems: (limit?: number, offset?: number, categoryId?: number) =>
      ipcRenderer.invoke("newsItems:getNewsItems", limit, offset, categoryId),
    getRecent: (limit?: number) =>
      ipcRenderer.invoke("newsItems:getRecent", limit),
    getById: (id: number) => ipcRenderer.invoke("newsItems:getById", id),
    getBySourceId: (sourceId: number, limit?: number) =>
      ipcRenderer.invoke("newsItems:getBySourceId", sourceId, limit),
    create: (item: any) => ipcRenderer.invoke("newsItems:create", item),
    update: (id: number, item: any) =>
      ipcRenderer.invoke("newsItems:update", id, item),
    updateContent: (id: number, content: string) =>
      ipcRenderer.invoke("newsItems:updateContent", id, content),
    markAsRead: (id: number) => ipcRenderer.invoke("newsItems:markAsRead", id),
    markMultipleAsRead: (ids: number[]) =>
      ipcRenderer.invoke("newsItems:markMultipleAsRead", ids),
    delete: (id: number) => ipcRenderer.invoke("newsItems:delete", id),
    cleanOldNews: (days?: number) =>
      ipcRenderer.invoke("newsItems:cleanOldNews", days),
  },

  // 收藏 API
  favorites: {
    getAll: (limit?: number) => ipcRenderer.invoke("favorites:getAll", limit),
    add: (itemId: number) => ipcRenderer.invoke("favorites:add", itemId),
    remove: (itemId: number) => ipcRenderer.invoke("favorites:remove", itemId),
    isFavorite: (itemId: number) =>
      ipcRenderer.invoke("favorites:isFavorite", itemId),
  },

  // 新闻（保持兼容性，内部使用新 API）
  news: {
    getDomesticNews: (category?: string) =>
      ipcRenderer.invoke("news:getDomesticNews", category),
  },

  // 对话框
  dialog: {
    selectDirectory: () => ipcRenderer.invoke("dialog:selectDirectory"),
    selectDatabaseFile: () => ipcRenderer.invoke("dialog:selectDatabaseFile"),
  },

  // 代理 API
  proxy: {
    get: () => ipcRenderer.invoke("proxy:get"),
    set: (url: string | null) => ipcRenderer.invoke("proxy:set", url),
    test: (url: string) => ipcRenderer.invoke("proxy:test", url),
  },

  // 网页收藏 API
  webPages: {
    getAll: () => ipcRenderer.invoke("webPages:getAll"),
    getById: (id: number) => ipcRenderer.invoke("webPages:getById", id),
    getByUrl: (url: string) => ipcRenderer.invoke("webPages:getByUrl", url),
    create: (webPage: any) => ipcRenderer.invoke("webPages:create", webPage),
    update: (id: number, webPage: any) =>
      ipcRenderer.invoke("webPages:update", id, webPage),
    delete: (id: number) => ipcRenderer.invoke("webPages:delete", id),
    toggleFavorite: (id: number) =>
      ipcRenderer.invoke("webPages:toggleFavorite", id),
    getFavorites: () => ipcRenderer.invoke("webPages:getFavorites"),
    test: (url: string) => ipcRenderer.invoke("webPages:test", url),
    categories: {
      getAll: () => ipcRenderer.invoke("webPagesCategories:getAll"),
      getById: (id: number) =>
        ipcRenderer.invoke("webPagesCategories:getById", id),
      create: (category: any) =>
        ipcRenderer.invoke("webPagesCategories:create", category),
      update: (id: number, category: any) =>
        ipcRenderer.invoke("webPagesCategories:update", id, category),
      delete: (id: number) =>
        ipcRenderer.invoke("webPagesCategories:delete", id),
      getWebPageCount: (categoryId: number) =>
        ipcRenderer.invoke("webPagesCategories:getWebPageCount", categoryId),
    },
  },

  // 平台信息
  platform: process.platform,

  // 版本信息
  versions: process.versions,

  // BrowserView API
  browserView: {
    create: (id: string, options?: any) =>
      ipcRenderer.invoke("browserView:create", id, options),
    loadURL: (id: string, url: string) =>
      ipcRenderer.invoke("browserView:loadURL", id, url),
    goBack: (id: string) => ipcRenderer.invoke("browserView:goBack", id),
    goForward: (id: string) => ipcRenderer.invoke("browserView:goForward", id),
    reload: (id: string) => ipcRenderer.invoke("browserView:reload", id),
    stop: (id: string) => ipcRenderer.invoke("browserView:stop", id),
    getURL: (id: string) => ipcRenderer.invoke("browserView:getURL", id),
    getTitle: (id: string) => ipcRenderer.invoke("browserView:getTitle", id),
    canGoBack: (id: string) => ipcRenderer.invoke("browserView:canGoBack", id),
    canGoForward: (id: string) =>
      ipcRenderer.invoke("browserView:canGoForward", id),
    setBounds: (id: string, bounds: Electron.Rectangle) =>
      ipcRenderer.invoke("browserView:setBounds", id, bounds),
    destroy: (id: string) => ipcRenderer.invoke("browserView:destroy", id),
    executeJavaScript: (id: string, code: string) =>
      ipcRenderer.invoke("browserView:executeJavaScript", id, code),
  },

  // 统计 API
  stats: {
    startFeatureUsage: (featureId: string) =>
      ipcRenderer.invoke("stats:startFeatureUsage", featureId),
    endFeatureUsage: (featureId: string) =>
      ipcRenderer.invoke("stats:endFeatureUsage", featureId),
    getAppUsage: (dimension?: string) =>
      ipcRenderer.invoke("stats:getAppUsage", dimension),
    getFeatureUsage: (featureId?: string, dimension?: string) =>
      ipcRenderer.invoke("stats:getFeatureUsage", featureId, dimension),
    getHistoryTrend: (dimension?: string, days?: number) =>
      ipcRenderer.invoke("stats:getHistoryTrend", dimension, days),
  },

  // 窗口状态 API
  window: {
    isFocused: () => ipcRenderer.invoke("window:isFocused"),
    onFocusChanged: (callback: (isFocused: boolean) => void) => {
      // 监听来自渲染进程的自定义事件
      const listener = (_event: any, isFocused: boolean) => callback(isFocused);
      ipcRenderer.on("window:focus-changed", listener);
      return () => ipcRenderer.removeListener("window:focus-changed", listener);
    },
  },

  // 自动更新 API
  updater: {
    checkForUpdates: () => ipcRenderer.invoke("updater:checkForUpdates"),
    downloadUpdate: () => ipcRenderer.invoke("updater:downloadUpdate"),
    quitAndInstall: () => ipcRenderer.invoke("updater:quitAndInstall"),
    onAvailable: (callback: (info: { version: string; releaseNotes: string }) => void) => {
      const listener = (_event: any, info: any) => callback(info);
      ipcRenderer.on("update:available", listener);
      return () => ipcRenderer.removeListener("update:available", listener);
    },
    onNotAvailable: (callback: (info: { version: string }) => void) => {
      const listener = (_event: any, info: any) => callback(info);
      ipcRenderer.on("update:not-available", listener);
      return () => ipcRenderer.removeListener("update:not-available", listener);
    },
    onError: (callback: (error: { message: string }) => void) => {
      const listener = (_event: any, error: any) => callback(error);
      ipcRenderer.on("update:error", listener);
      return () => ipcRenderer.removeListener("update:error", listener);
    },
    onProgress: (callback: (progress: { percent: number; transferred: number; total: number; bytesPerSecond: number }) => void) => {
      const listener = (_event: any, progress: any) => callback(progress);
      ipcRenderer.on("update:progress", listener);
      return () => ipcRenderer.removeListener("update:progress", listener);
    },
    onDownloaded: (callback: (info: { version: string }) => void) => {
      const listener = (_event: any, info: any) => callback(info);
      ipcRenderer.on("update:downloaded", listener);
      return () => ipcRenderer.removeListener("update:downloaded", listener);
    },
  },

  // 自动更新设置 API
  autoUpdate: {
    getEnabled: () => ipcRenderer.invoke("autoUpdate:getEnabled"),
    setEnabled: (enabled: boolean) => ipcRenderer.invoke("autoUpdate:setEnabled", enabled),
  },
});

// 类型声明（仅用于开发时的类型提示，不会被编译到最终代码中）
/**
 * @typedef {Object} ElectronAPI
 * @property {() => void} toggleWindow
 * @property {() => void} minimizeWindow
 * @property {() => void} maximizeWindow
 * @property {() => void} closeWindow
 * @property {Object} rss
 * @property {(url: string) => Promise<any>} rss.addFeed
 * @property {(url: string) => Promise<any>} rss.removeFeed
 * @property {(url: string) => Promise<any>} rss.refreshFeed
 * @property {() => Promise<any>} rss.getFeeds
 * @property {(url: string) => Promise<any>} rss.getFeed
 * @property {Object} shortcuts
 * @property {() => Promise<any>} shortcuts.get
 * @property {(shortcuts: any) => Promise<any>} shortcuts.set
 * @property {string} platform
 * @property {NodeJS.ProcessVersions} versions
 * @property {Object} browserView
 * @property {(id: string, options?: any) => Promise<any>} browserView.create
 * @property {(id: string, url: string) => Promise<any>} browserView.loadURL
 * @property {(id: string) => Promise<any>} browserView.goBack
 * @property {(id: string) => Promise<any>} browserView.goForward
 * @property {(id: string) => Promise<any>} browserView.reload
 * @property {(id: string) => Promise<any>} browserView.stop
 * @property {(id: string) => Promise<any>} browserView.getURL
 * @property {(id: string) => Promise<any>} browserView.getTitle
 * @property {(id: string) => Promise<any>} browserView.canGoBack
 * @property {(id: string) => Promise<any>} browserView.canGoForward
 * @property {(id: string, bounds: Electron.Rectangle) => Promise<any>} browserView.setBounds
 * @property {(id: string) => Promise<any>} browserView.destroy
 * @property {(id: string, code: string) => Promise<any>} browserView.executeJavaScript
 */

/**
 * @typedef {Object} Window
 * @property {ElectronAPI} electronAPI
 */
