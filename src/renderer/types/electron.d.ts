export interface TodoCompletionStats {
  today: number
  thisWeek: number
  thisMonth: number
  thisYear: number
  total: number
}

export interface ElectronAPI {
  // 窗口控制
  toggleWindow: () => void
  minimizeWindow: () => void
  maximizeWindow: () => void
  fullscreenWindow: () => void
  closeWindow: () => void
  isFullscreen: () => Promise<{ success: boolean; isFullscreen?: boolean }>

  // RSS 相关
  rss: {
    addFeed: (url: string) => Promise<any>
    removeFeed: (url: string) => Promise<any>
    refreshFeed: (url: string) => Promise<any>
    getFeeds: () => Promise<any>
    getFeed: (url: string) => Promise<any>
  }

  // 快捷键相关
  shortcuts: {
    get: () => Promise<any>
    set: (shortcuts: any) => Promise<any>
    onChanged: (callback: (shortcuts: any) => void) => () => void
  }

  // 数据存储
  store: {
    get: (key: string) => Promise<{ success: boolean; value?: any }>
    set: (key: string, value: any) => Promise<{ success: boolean }>
    getDataPath: () => Promise<{ success: boolean; path?: string }>
    setDataPath: (path: string) => Promise<{ success: boolean; message?: string; requiresRestart?: boolean }>
    getCloseBehavior: () => Promise<{ success: boolean; value?: 'minimize' | 'quit' }>
    setCloseBehavior: (value: 'minimize' | 'quit') => Promise<{ success: boolean }>
  }

  // 数据库 API
  database: {
    getPath: () => Promise<{ success: boolean; path?: string }>
    setPath: (path: string) => Promise<{ success: boolean; message?: string; requiresRestart?: boolean; migratedRecords?: any }>
  }

  // 笔记 API
  notes: {
    getAll: () => Promise<{ success: boolean; notes?: any[] }>
    getById: (id: number) => Promise<{ success: boolean; note?: any }>
    search: (query: string) => Promise<{ success: boolean; notes?: any[] }>
    create: (note: any) => Promise<{ success: boolean; id?: number }>
    update: (id: number, note: any) => Promise<{ success: boolean }>
    delete: (id: number) => Promise<{ success: boolean }>
    count: () => Promise<{ success: boolean; count?: number }>
  }

  // 待办事项 API
  todos: {
    getAll: () => Promise<{ success: boolean; todos?: any[] }>
    getById: (id: number) => Promise<{ success: boolean; todo?: any }>
    create: (todo: any) => Promise<{ success: boolean; id?: number }>
    update: (id: number, todo: any) => Promise<{ success: boolean }>
    toggle: (id: number) => Promise<{ success: boolean }>
    delete: (id: number) => Promise<{ success: boolean }>
    clearCompleted: () => Promise<{ success: boolean; count?: number }>
    getStats: () => Promise<{ success: boolean; stats?: any }>
    updateOrder: (orderedIds: number[]) => Promise<{ success: boolean }>
    getCompletionStats: () => Promise<{ success: boolean; stats?: TodoCompletionStats }>
    getPaginated: (page?: number, pageSize?: number) => Promise<{
      success: boolean;
      todos?: any[];
      total?: number;
      totalPages?: number;
      currentPage?: number;
    }>
    getPending: (page?: number, pageSize?: number) => Promise<{
      success: boolean;
      todos?: any[];
      total?: number;
      totalPages?: number;
      currentPage?: number;
    }>
    getCompleted: (page?: number, pageSize?: number) => Promise<{
      success: boolean;
      todos?: any[];
      total?: number;
      totalPages?: number;
      currentPage?: number;
    }>
  }

  // 新闻分类 API
  newsCategories: {
    getAll: () => Promise<{ success: boolean; categories?: any[] }>
    getById: (id: number) => Promise<{ success: boolean; category?: any }>
    create: (category: any) => Promise<{ success: boolean; id?: number }>
    update: (id: number, category: any) => Promise<{ success: boolean }>
    delete: (id: number) => Promise<{ success: boolean }>
  }

  // 新闻源 API
  newsSources: {
    getAll: () => Promise<{ success: boolean; sources?: any[] }>
    getActive: () => Promise<{ success: boolean; sources?: any[] }>
    getById: (id: number) => Promise<{ success: boolean; source?: any }>
    getByUrl: (url: string) => Promise<{ success: boolean; source?: any }>
    create: (source: any) => Promise<{ success: boolean; id?: number }>
    update: (id: number, source: any) => Promise<{ success: boolean }>
    delete: (id: number) => Promise<{ success: boolean }>
  }

  // 新闻条目 API
  newsItems: {
    getNewsItems: (limit?: number, offset?: number, categoryId?: number) => Promise<{ success: boolean; items?: any[] }>
    getRecent: (limit?: number) => Promise<{ success: boolean; items?: any[] }>
    getById: (id: number) => Promise<{ success: boolean; item?: any }>
    getBySourceId: (sourceId: number, limit?: number) => Promise<{ success: boolean; items?: any[] }>
    create: (item: any) => Promise<{ success: boolean; id?: number }>
    update: (id: number, item: any) => Promise<{ success: boolean }>
    updateContent: (id: number, content: string) => Promise<{ success: boolean }>
    markAsRead: (id: number) => Promise<{ success: boolean }>
    markMultipleAsRead: (ids: number[]) => Promise<{ success: boolean; count?: number }>
    delete: (id: number) => Promise<{ success: boolean }>
    cleanOldNews: (days?: number) => Promise<{ success: boolean; count?: number }>
  }

  // 收藏 API
  favorites: {
    getAll: (limit?: number) => Promise<{ success: boolean; favorites?: any[] }>
    add: (itemId: number) => Promise<{ success: boolean }>
    remove: (itemId: number) => Promise<{ success: boolean }>
    isFavorite: (itemId: number) => Promise<{ success: boolean; isFavorite?: boolean }>
  }

  // 新闻（保持兼容性）
  news: {
    getDomesticNews: (category?: string) => Promise<any>
  }

  // 网页收藏 API
  webPages: {
    getAll: () => Promise<{ success: boolean; webPages?: any[] }>
    getById: (id: number) => Promise<{ success: boolean; webPage?: any }>
    getByUrl: (url: string) => Promise<{ success: boolean; webPage?: any }>
    create: (webPage: any) => Promise<{ success: boolean; id?: number }>
    update: (id: number, webPage: any) => Promise<{ success: boolean }>
    delete: (id: number) => Promise<{ success: boolean }>
    categories: {
      getAll: () => Promise<{ success: boolean; categories?: any[] }>
      getById: (id: number) => Promise<{ success: boolean; category?: any }>
      create: (category: any) => Promise<{ success: boolean; id?: number }>
      update: (id: number, category: any) => Promise<{ success: boolean }>
      delete: (id: number) => Promise<{ success: boolean; error?: string; webPageCount?: number }>
      getWebPageCount: (id: number) => Promise<{ success: boolean; count?: number }>
    }
  }

  // 对话框
  dialog: {
    selectDirectory: () => Promise<{ success: boolean; path?: string; canceled?: boolean }>
    selectDatabaseFile: () => Promise<{ success: boolean; path?: string; canceled?: boolean }>
  }

  // 代理 API
  proxy: {
    get: () => Promise<{ success: boolean; config?: { enabled: boolean; url?: string } }>
    set: (url: string | null) => Promise<{ success: boolean }>
    test: (url: string) => Promise<{ success: boolean; message?: string; error?: string }>
  }

  // 统计 API
  stats: {
    startFeatureUsage: (featureId: string) => Promise<{ success: boolean }>
    endFeatureUsage: (featureId: string) => Promise<{ success: boolean }>
    getAppUsage: (dimension?: string) => Promise<{
      success: boolean
      stats?: {
        today: number
        thisWeek: number
        thisMonth: number
        thisYear: number
        total: number
        sessions: number
      }
    }>
    getFeatureUsage: (featureId?: string, dimension?: string) => Promise<{
      success: boolean
      stats?: Array<{
        featureId: string
        featureName: string
        duration: number
        count: number
        todayDuration: number
        todayCount: number
        thisWeekDuration: number
        thisWeekCount: number
        thisMonthDuration: number
        thisMonthCount: number
      }>
    }>
    getHistoryTrend: (dimension?: string, days?: number) => Promise<{
      success: boolean
      data?: Array<{
        date: string
        duration: number
        sessions: number
      }>
    }>
  }

  // 平台信息
  platform: string

  // 版本信息
  versions: NodeJS.ProcessVersions
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
