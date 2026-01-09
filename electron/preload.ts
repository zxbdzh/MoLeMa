const { contextBridge, ipcRenderer } = require('electron')

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  toggleWindow: () => ipcRenderer.send('toggle-window'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  fullscreenWindow: () => ipcRenderer.send('fullscreen-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  isFullscreen: () => ipcRenderer.invoke('is-fullscreen'),

  // RSS 相关
  rss: {
    addFeed: (url: string) => ipcRenderer.invoke('rss:addFeed', url),
    removeFeed: (url: string) => ipcRenderer.invoke('rss:removeFeed', url),
    refreshFeed: (url: string) => ipcRenderer.invoke('rss:refreshFeed', url),
    getFeeds: () => ipcRenderer.invoke('rss:getFeeds'),
    getFeed: (url: string) => ipcRenderer.invoke('rss:getFeed', url)
  },

  // 快捷键相关
  shortcuts: {
    get: () => ipcRenderer.invoke('shortcuts:get'),
    set: (shortcuts: any) => ipcRenderer.invoke('shortcuts:set', shortcuts),
    onChanged: (callback: (shortcuts: any) => void) => {
      const listener = (_event: any, shortcuts: any) => callback(shortcuts)
      ipcRenderer.on('shortcuts:changed', listener)
      return () => ipcRenderer.removeListener('shortcuts:changed', listener)
    }
  },

  // 数据存储（保持兼容性）
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('store:set', key, value),
    getDataPath: () => ipcRenderer.invoke('store:getDataPath'),
    setDataPath: (path: string) => ipcRenderer.invoke('store:setDataPath', path)
  },

  // 数据库 API
  database: {
    getPath: () => ipcRenderer.invoke('database:getPath')
  },

  // 笔记 API
  notes: {
    getAll: () => ipcRenderer.invoke('notes:getAll'),
    getById: (id: number) => ipcRenderer.invoke('notes:getById', id),
    search: (query: string) => ipcRenderer.invoke('notes:search', query),
    create: (note: any) => ipcRenderer.invoke('notes:create', note),
    update: (id: number, note: any) => ipcRenderer.invoke('notes:update', id, note),
    delete: (id: number) => ipcRenderer.invoke('notes:delete', id),
    count: () => ipcRenderer.invoke('notes:count')
  },

  // 待办事项 API
  todos: {
    getAll: () => ipcRenderer.invoke('todos:getAll'),
    getById: (id: number) => ipcRenderer.invoke('todos:getById', id),
    create: (todo: any) => ipcRenderer.invoke('todos:create', todo),
    update: (id: number, todo: any) => ipcRenderer.invoke('todos:update', id, todo),
    toggle: (id: number) => ipcRenderer.invoke('todos:toggle', id),
    delete: (id: number) => ipcRenderer.invoke('todos:delete', id),
    clearCompleted: () => ipcRenderer.invoke('todos:clearCompleted'),
    getStats: () => ipcRenderer.invoke('todos:getStats')
  },

  // 新闻分类 API
  newsCategories: {
    getAll: () => ipcRenderer.invoke('newsCategories:getAll'),
    getById: (id: number) => ipcRenderer.invoke('newsCategories:getById', id),
    create: (category: any) => ipcRenderer.invoke('newsCategories:create', category),
    update: (id: number, category: any) => ipcRenderer.invoke('newsCategories:update', id, category),
    delete: (id: number) => ipcRenderer.invoke('newsCategories:delete', id)
  },

  // 新闻源 API
  newsSources: {
    getAll: () => ipcRenderer.invoke('newsSources:getAll'),
    getActive: () => ipcRenderer.invoke('newsSources:getActive'),
    getById: (id: number) => ipcRenderer.invoke('newsSources:getById', id),
    getByUrl: (url: string) => ipcRenderer.invoke('newsSources:getByUrl', url),
    create: (source: any) => ipcRenderer.invoke('newsSources:create', source),
    update: (id: number, source: any) => ipcRenderer.invoke('newsSources:update', id, source),
    delete: (id: number) => ipcRenderer.invoke('newsSources:delete', id)
  },

  // 新闻条目 API
  newsItems: {
    getNewsItems: (limit?: number, offset?: number, categoryId?: number) => 
      ipcRenderer.invoke('newsItems:getNewsItems', limit, offset, categoryId),
    getRecent: (limit?: number) => ipcRenderer.invoke('newsItems:getRecent', limit),
    getById: (id: number) => ipcRenderer.invoke('newsItems:getById', id),
    getBySourceId: (sourceId: number, limit?: number) => 
      ipcRenderer.invoke('newsItems:getBySourceId', sourceId, limit),
    create: (item: any) => ipcRenderer.invoke('newsItems:create', item),
    update: (id: number, item: any) => ipcRenderer.invoke('newsItems:update', id, item),
    updateContent: (id: number, content: string) => 
      ipcRenderer.invoke('newsItems:updateContent', id, content),
    markAsRead: (id: number) => ipcRenderer.invoke('newsItems:markAsRead', id),
    markMultipleAsRead: (ids: number[]) => ipcRenderer.invoke('newsItems:markMultipleAsRead', ids),
    delete: (id: number) => ipcRenderer.invoke('newsItems:delete', id),
    cleanOldNews: (days?: number) => ipcRenderer.invoke('newsItems:cleanOldNews', days)
  },

  // 收藏 API
  favorites: {
    getAll: (limit?: number) => ipcRenderer.invoke('favorites:getAll', limit),
    add: (itemId: number) => ipcRenderer.invoke('favorites:add', itemId),
    remove: (itemId: number) => ipcRenderer.invoke('favorites:remove', itemId),
    isFavorite: (itemId: number) => ipcRenderer.invoke('favorites:isFavorite', itemId)
  },

  // 新闻（保持兼容性，内部使用新 API）
  news: {
    getDomesticNews: (category?: string) => ipcRenderer.invoke('news:getDomesticNews', category)
  },

  // 对话框
  dialog: {
    selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory')
  },

  // 平台信息
  platform: process.platform,

  // 版本信息
  versions: process.versions
})

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
 */

/**
 * @typedef {Object} Window
 * @property {ElectronAPI} electronAPI
 */