import { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage, ipcMain, dialog } from 'electron'
import path from 'node:path'
import Parser from 'rss-parser'
import Store from 'electron-store'
import { getDatabase, closeDatabase, seedDefaultData } from './database'
import { runMigration } from './migration'
import { notesApi } from './api/notesApi'
import { todosApi } from './api/todosApi'
import { newsApi } from './api/newsApi'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

// 窗口显示/隐藏状态
let isWindowVisible = false

// 初始化 electron-store（保持兼容性）
const store = new Store({
  name: 'moyu-data',
  defaults: {
    shortcuts: {
      toggleWindow: 'CommandOrControl+Alt+M'
    },
    notes: [],
    todos: [],
    rssFeeds: {},
    favorites: []
  }
})

// RSS 存储（使用 electron-store）
const parser = new Parser()

// 获取 RSS feeds
const getRSSFeeds = () => {
  return store.get('rssFeeds') as Record<string, any>
}

// 保存 RSS feeds
const saveRSSFeeds = (feeds: Record<string, any>) => {
  store.set('rssFeeds', feeds)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    transparent: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    },
    icon: path.join(__dirname, '../../resources/icon.png')
  })

  // 开发模式下加载 Vite 开发服务器
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
  if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
    console.log('Loading Vite dev server:', devServerUrl)
    mainWindow.loadURL(devServerUrl)
    mainWindow.webContents.openDevTools()
  } else {
    console.log('VITE_DEV_SERVER_URL not set, loading from file')
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('ready-to-show', () => {
    if (!isWindowVisible) {
      mainWindow?.hide()
    } else {
      mainWindow?.show()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 阻止窗口关闭，改为隐藏到托盘
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
}

// 创建系统托盘
function createTray() {
  // 创建托盘图标（使用简单的 SVG 图标）
  const iconPath = path.join(__dirname, '../../resources/icon.png')
  try {
    tray = new Tray(iconPath)
  } catch (error) {
    // 如果图标文件不存在，使用默认图标
    console.warn('Failed to load tray icon, using default icon:', error)
    // 在实际应用中，你应该创建一个实际的 PNG 图标文件
    // 这里我们使用一个空对象作为占位符
    tray = new Tray(nativeImage.createEmpty())
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示/隐藏窗口',
      click: () => {
        toggleWindow()
      }
    },
    {
      label: '关于',
      click: () => {
        mainWindow?.show()
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip('摸鱼软件')
  tray.setContextMenu(contextMenu)

  // 双击托盘图标显示/隐藏窗口
  tray.on('double-click', () => {
    toggleWindow()
  })
}

// 切换窗口显示/隐藏
function toggleWindow() {
  if (mainWindow) {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
      isWindowVisible = false
    } else {
      mainWindow.show()
      mainWindow.focus()
      isWindowVisible = true
    }
  }
}

// 注册全局快捷键
function registerGlobalShortcuts() {
  const shortcuts = getShortcuts()
  
  // 注册显示/隐藏窗口快捷键
  globalShortcut.register(shortcuts.toggleWindow, () => {
    toggleWindow()
  })

  console.log('全局快捷键已注册：')
  console.log(`  ${shortcuts.toggleWindow}: 显示/隐藏窗口`)
}

// 应用启动
app.whenReady().then(() => {
  // 初始化数据库
  const db = getDatabase()
  seedDefaultData(db)
  
  // 运行数据迁移（从 JSON 到 SQLite）
  runMigration()
  
  createWindow()
  createTray()
  registerGlobalShortcuts()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 应用退出前清理
app.on('will-quit', () => {
  // 注销所有全局快捷键
  globalShortcut.unregisterAll()
  
  // 关闭数据库连接
  closeDatabase()
})

// 所有窗口关闭后退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC 处理程序 - RSS 相关
ipcMain.handle('rss:addFeed', async (_event, url: string) => {
  try {
    const feed = await parser.parseURL(url)
    const feedData = {
      url,
      title: feed.title || 'Unknown Feed',
      description: feed.description || '',
      items: feed.items.map((item) => ({
        title: item.title || 'No Title',
        link: item.link || '',
        pubDate: item.pubDate || new Date().toISOString(),
        content: item.content || item.contentSnippet || '',
        contentSnippet: item.contentSnippet || '',
        guid: item.guid || item.link || ''
      }))
    }

    const feeds = getRSSFeeds()
    feeds[url] = feedData
    saveRSSFeeds(feeds)
    
    return { success: true, feed: feedData }
  } catch (error) {
    console.error('Failed to parse RSS feed:', error)
    return { success: false, error: 'Failed to parse RSS feed' }
  }
})

ipcMain.handle('rss:removeFeed', async (_event, url: string) => {
  try {
    const feeds = getRSSFeeds()
    delete feeds[url]
    saveRSSFeeds(feeds)
    return { success: true }
  } catch (error) {
    console.error('Failed to remove RSS feed:', error)
    return { success: false, error: 'Failed to remove RSS feed' }
  }
})

ipcMain.handle('rss:refreshFeed', async (_event, url: string) => {
  try {
    const feed = await parser.parseURL(url)
    const feedData = {
      url,
      title: feed.title || 'Unknown Feed',
      description: feed.description || '',
      items: feed.items.map((item) => ({
        title: item.title || 'No Title',
        link: item.link || '',
        pubDate: item.pubDate || new Date().toISOString(),
        content: item.content || item.contentSnippet || '',
        contentSnippet: item.contentSnippet || '',
        guid: item.guid || item.link || ''
      }))
    }

    const feeds = getRSSFeeds()
    feeds[url] = feedData
    saveRSSFeeds(feeds)
    
    return { success: true, feed: feedData }
  } catch (error) {
    console.error('Failed to refresh RSS feed:', error)
    return { success: false, error: 'Failed to refresh RSS feed' }
  }
})

ipcMain.handle('rss:getFeeds', async () => {
  try {
    const feeds = Object.values(getRSSFeeds())
    return { success: true, feeds }
  } catch (error) {
    console.error('Failed to get RSS feeds:', error)
    return { success: false, error: 'Failed to get RSS feeds' }
  }
})

ipcMain.handle('rss:getFeed', async (_event, url: string) => {
  try {
    const feeds = getRSSFeeds()
    const feed = feeds[url]
    if (feed) {
      return { success: true, feed }
    } else {
      return { success: false, error: 'Feed not found' }
    }
  } catch (error) {
    console.error('Failed to get RSS feed:', error)
    return { success: false, error: 'Failed to get RSS feed' }
  }
})

// 快捷键管理
const getShortcuts = () => {
  return store.get('shortcuts') as { toggleWindow: string }
}

const setShortcuts = (shortcuts: any) => {
  store.set('shortcuts', shortcuts)
}

ipcMain.handle('shortcuts:get', async () => {
  return getShortcuts()
})

ipcMain.handle('shortcuts:set', async (_event, shortcuts) => {
  try {
    // 注销旧快捷键
    globalShortcut.unregisterAll()
    
    // 注册新快捷键
    globalShortcut.register(shortcuts.toggleWindow, () => {
      toggleWindow()
    })
    
    setShortcuts(shortcuts)
    console.log('快捷键已更新:', shortcuts)
    
    // 通知渲染进程快捷键已更新
    mainWindow?.webContents.send('shortcuts:changed', shortcuts)
    
    return { success: true }
  } catch (error) {
    console.error('Failed to update shortcuts:', error)
    return { success: false, error: 'Failed to update shortcuts' }
  }
})

// 窗口控制 IPC
ipcMain.on('toggle-window', () => {
  toggleWindow()
})

ipcMain.on('minimize-window', () => {
  mainWindow?.minimize()
})

ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  }
})

ipcMain.on('close-window', () => {
  mainWindow?.close()
})

// 数据存储 IPC
ipcMain.handle('store:get', async (_event, key: string) => {
  try {
    const value = store.get(key)
    return { success: true, value }
  } catch (error) {
    console.error('Failed to get store value:', error)
    return { success: false, error: 'Failed to get store value' }
  }
})

ipcMain.handle('store:set', async (_event, key: string, value: any) => {
  try {
    store.set(key, value)
    return { success: true }
  } catch (error) {
    console.error('Failed to set store value:', error)
    return { success: false, error: 'Failed to set store value' }
  }
})

ipcMain.handle('store:getDataPath', async () => {
  try {
    return { success: true, path: store.path }
  } catch (error) {
    console.error('Failed to get data path:', error)
    return { success: false, error: 'Failed to get data path' }
  }
})

ipcMain.handle('store:setDataPath', async (_event, newPath: string) => {
  try {
    // 备份当前数据
    const currentData = store.store
    
    // 创建新的 store 实例
    const newStore = new Store({
      name: 'moyu-data',
      cwd: newPath
    })
    
    // 迁移数据
    Object.keys(currentData).forEach(key => {
      newStore.set(key, currentData[key])
    })
    
    // 更新全局 store 引用
    // 注意：这里需要重新初始化 store，但由于 electron-store 的限制，
    // 实际上我们需要重启应用来完全切换存储路径
    return { 
      success: true, 
      message: '数据已迁移，请重启应用以使用新的存储路径',
      requiresRestart: true
    }
  } catch (error) {
    console.error('Failed to set data path:', error)
    return { success: false, error: 'Failed to set data path' }
  }
})

ipcMain.handle('dialog:selectDirectory', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    })
    
    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, path: result.filePaths[0] }
    }
    
    return { success: false, canceled: true }
  } catch (error) {
    console.error('Failed to select directory:', error)
    return { success: false, error: 'Failed to select directory' }
  }
})

// 全屏窗口控制
ipcMain.on('fullscreen-window', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen())
  }
})

ipcMain.handle('is-fullscreen', async () => {
  try {
    return { success: true, isFullscreen: mainWindow?.isFullScreen() || false }
  } catch (error) {
    console.error('Failed to check fullscreen status:', error)
    return { success: false, error: 'Failed to check fullscreen status' }
  }
})

// 国内新闻源聚合
const domesticNewsSources = [
  // 技术博客
  { name: '阮一峰的网络日志', url: 'https://www.ruanyifeng.com/blog/atom.xml', category: 'tech' },
  { name: '掘金前端', url: 'https://juejin.cn/rss/frontend', category: 'tech' },
  { name: 'InfoQ', url: 'https://www.infoq.cn/feed', category: 'tech' },
  { name: 'SegmentFault', url: 'https://segmentfault.com/feeds', category: 'tech' },
  // 主流媒体
  { name: '腾讯科技', url: 'https://tech.qq.com/rss/tech.xml', category: 'news' },
  { name: '新浪科技', url: 'https://tech.sina.com.cn/rss/roll.xml', category: 'news' },
  { name: '网易科技', url: 'https://tech.163.com/special/00094JVL/tech_datalist.xml', category: 'news' },
  { name: '36氪', url: 'https://36kr.com/feed', category: 'startup' },
]

ipcMain.handle('news:getDomesticNews', async (_event, category?: string) => {
  try {
    const allNews: any[] = []
    
    // 过滤新闻源
    const sources = category 
      ? domesticNewsSources.filter(s => s.category === category)
      : domesticNewsSources
    
    // 并发获取所有新闻源
    const newsPromises = sources.map(async (source) => {
      try {
        const feed = await parser.parseURL(source.url)
        return feed.items?.map((item, index) => ({
          id: `${source.name}-${index}`,
          title: item.title || 'No Title',
          description: item.contentSnippet || item.content || '',
          url: item.link || '',
          publishedAt: item.pubDate || new Date().toISOString(),
          source: source.name,
          category: source.category,
          image: extractImage(item.content || item.contentSnippet || '')
        })) || []
      } catch (error) {
        console.error(`Failed to parse ${source.name}:`, error)
        return []
      }
    })
    
    const newsArrays = await Promise.all(newsPromises)
    allNews.push(...newsArrays.flat())
    
    // 按发布时间排序
    allNews.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    
    // 限制返回数量（最多50条）
    return { success: true, news: allNews.slice(0, 50) }
  } catch (error) {
    console.error('Failed to get domestic news:', error)
    return { success: false, error: 'Failed to get domestic news' }
  }
})

// 从 HTML 内容中提取图片 URL
function extractImage(html: string): string | undefined {
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  return imgMatch ? imgMatch[1] : undefined
}

// ==================== 笔记 IPC 处理器 ====================

ipcMain.handle('notes:getAll', () => {
  try {
    return { success: true, notes: notesApi.getAll() }
  } catch (error) {
    console.error('Failed to get notes:', error)
    return { success: false, error: 'Failed to get notes' }
  }
})

// ==================== 数据库路径 IPC 处理器 ====================

ipcMain.handle('database:getPath', () => {
  try {
    const dbPath = path.join(app.getPath('userData'), 'moyu.db')
    return { success: true, path: dbPath }
  } catch (error) {
    console.error('Failed to get database path:', error)
    return { success: false, error: 'Failed to get database path' }
  }
})

ipcMain.handle('notes:getById', (_event, id: number) => {
  try {
    const note = notesApi.getById(id)
    if (note) {
      return { success: true, note }
    } else {
      return { success: false, error: 'Note not found' }
    }
  } catch (error) {
    console.error('Failed to get note:', error)
    return { success: false, error: 'Failed to get note' }
  }
})

ipcMain.handle('notes:search', (_event, query: string) => {
  try {
    return { success: true, notes: notesApi.search(query) }
  } catch (error) {
    console.error('Failed to search notes:', error)
    return { success: false, error: 'Failed to search notes' }
  }
})

ipcMain.handle('notes:create', (_event, note: any) => {
  try {
    const id = notesApi.create(note)
    return { success: true, id }
  } catch (error) {
    console.error('Failed to create note:', error)
    return { success: false, error: 'Failed to create note' }
  }
})

ipcMain.handle('notes:update', (_event, id: number, note: any) => {
  try {
    const success = notesApi.update(id, note)
    if (success) {
      return { success: true }
    } else {
      return { success: false, error: 'Failed to update note' }
    }
  } catch (error) {
    console.error('Failed to update note:', error)
    return { success: false, error: 'Failed to update note' }
  }
})

ipcMain.handle('notes:delete', (_event, id: number) => {
  try {
    const success = notesApi.delete(id)
    if (success) {
      return { success: true }
    } else {
      return { success: false, error: 'Failed to delete note' }
    }
  } catch (error) {
    console.error('Failed to delete note:', error)
    return { success: false, error: 'Failed to delete note' }
  }
})

ipcMain.handle('notes:count', () => {
  try {
    return { success: true, count: notesApi.count() }
  } catch (error) {
    console.error('Failed to count notes:', error)
    return { success: false, error: 'Failed to count notes' }
  }
})

// ==================== 待办事项 IPC 处理器 ====================

ipcMain.handle('todos:getAll', () => {
  try {
    return { success: true, todos: todosApi.getAll() }
  } catch (error) {
    console.error('Failed to get todos:', error)
    return { success: false, error: 'Failed to get todos' }
  }
})

ipcMain.handle('todos:getById', (_event, id: number) => {
  try {
    const todo = todosApi.getById(id)
    if (todo) {
      return { success: true, todo }
    } else {
      return { success: false, error: 'Todo not found' }
    }
  } catch (error) {
    console.error('Failed to get todo:', error)
    return { success: false, error: 'Failed to get todo' }
  }
})

ipcMain.handle('todos:create', (_event, todo: any) => {
  try {
    const id = todosApi.create(todo)
    return { success: true, id }
  } catch (error) {
    console.error('Failed to create todo:', error)
    return { success: false, error: 'Failed to create todo' }
  }
})

ipcMain.handle('todos:update', (_event, id: number, todo: any) => {
  try {
    const success = todosApi.update(id, todo)
    if (success) {
      return { success: true }
    } else {
      return { success: false, error: 'Failed to update todo' }
    }
  } catch (error) {
    console.error('Failed to update todo:', error)
    return { success: false, error: 'Failed to update todo' }
  }
})

ipcMain.handle('todos:toggle', (_event, id: number) => {
  try {
    const success = todosApi.toggle(id)
    if (success) {
      return { success: true }
    } else {
      return { success: false, error: 'Failed to toggle todo' }
    }
  } catch (error) {
    console.error('Failed to toggle todo:', error)
    return { success: false, error: 'Failed to toggle todo' }
  }
})

ipcMain.handle('todos:delete', (_event, id: number) => {
  try {
    const success = todosApi.delete(id)
    if (success) {
      return { success: true }
    } else {
      return { success: false, error: 'Failed to delete todo' }
    }
  } catch (error) {
    console.error('Failed to delete todo:', error)
    return { success: false, error: 'Failed to delete todo' }
  }
})

ipcMain.handle('todos:clearCompleted', () => {
  try {
    const count = todosApi.clearCompleted()
    return { success: true, count }
  } catch (error) {
    console.error('Failed to clear completed todos:', error)
    return { success: false, error: 'Failed to clear completed todos' }
  }
})

ipcMain.handle('todos:getStats', () => {
  try {
    return { success: true, stats: todosApi.getStats() }
  } catch (error) {
    console.error('Failed to get todo stats:', error)
    return { success: false, error: 'Failed to get todo stats' }
  }
})

// ==================== 新闻分类 IPC 处理器 ====================

ipcMain.handle('newsCategories:getAll', () => {
  try {
    return { success: true, categories: newsApi.getAllCategories() }
  } catch (error) {
    console.error('Failed to get categories:', error)
    return { success: false, error: 'Failed to get categories' }
  }
})

ipcMain.handle('newsCategories:getById', (_event, id: number) => {
  try {
    const category = newsApi.getCategoryById(id)
    if (category) {
      return { success: true, category }
    } else {
      return { success: false, error: 'Category not found' }
    }
  } catch (error) {
    console.error('Failed to get category:', error)
    return { success: false, error: 'Failed to get category' }
  }
})

ipcMain.handle('newsCategories:create', (_event, category: any) => {
  try {
    const id = newsApi.createCategory(category)
    return { success: true, id }
  } catch (error) {
    console.error('Failed to create category:', error)
    return { success: false, error: 'Failed to create category' }
  }
})

ipcMain.handle('newsCategories:update', (_event, id: number, category: any) => {
  try {
    const success = newsApi.updateCategory(id, category)
    if (success) {
      return { success: true }
    } else {
      return { success: false, error: 'Failed to update category' }
    }
  } catch (error) {
    console.error('Failed to update category:', error)
    return { success: false, error: 'Failed to update category' }
  }
})

ipcMain.handle('newsCategories:delete', (_event, id: number) => {
  try {
    const success = newsApi.deleteCategory(id)
    if (success) {
      return { success: true }
    } else {
      return { success: false, error: 'Failed to delete category' }
    }
  } catch (error) {
    console.error('Failed to delete category:', error)
    return { success: false, error: 'Failed to delete category' }
  }
})

// ==================== 新闻源 IPC 处理器 ====================

ipcMain.handle('newsSources:getAll', () => {
  try {
    return { success: true, sources: newsApi.getAllSources() }
  } catch (error) {
    console.error('Failed to get sources:', error)
    return { success: false, error: 'Failed to get sources' }
  }
})

ipcMain.handle('newsSources:getActive', () => {
  try {
    return { success: true, sources: newsApi.getActiveSources() }
  } catch (error) {
    console.error('Failed to get active sources:', error)
    return { success: false, error: 'Failed to get active sources' }
  }
})

ipcMain.handle('newsSources:getById', (_event, id: number) => {
  try {
    const source = newsApi.getSourceById(id)
    if (source) {
      return { success: true, source }
    } else {
      return { success: false, error: 'Source not found' }
    }
  } catch (error) {
    console.error('Failed to get source:', error)
    return { success: false, error: 'Failed to get source' }
  }
})

ipcMain.handle('newsSources:getByUrl', (_event, url: string) => {
  try {
    const source = newsApi.getSourceByUrl(url)
    if (source) {
      return { success: true, source }
    } else {
      return { success: false, error: 'Source not found' }
    }
  } catch (error) {
    console.error('Failed to get source by URL:', error)
    return { success: false, error: 'Failed to get source by URL' }
  }
})

ipcMain.handle('newsSources:create', (_event, source: any) => {
  try {
    const id = newsApi.createSource(source)
    return { success: true, id }
  } catch (error) {
    console.error('Failed to create source:', error)
    return { success: false, error: 'Failed to create source' }
  }
})

ipcMain.handle('newsSources:update', (_event, id: number, source: any) => {
  try {
    const success = newsApi.updateSource(id, source)
    if (success) {
      return { success: true }
    } else {
      return { success: false, error: 'Failed to update source' }
    }
  } catch (error) {
    console.error('Failed to update source:', error)
    return { success: false, error: 'Failed to update source' }
  }
})

ipcMain.handle('newsSources:delete', (_event, id: number) => {
  try {
    const success = newsApi.deleteSource(id)
    if (success) {
      return { success: true }
    } else {
      return { success: false, error: 'Failed to delete source' }
    }
  } catch (error) {
    console.error('Failed to delete source:', error)
    return { success: false, error: 'Failed to delete source' }
  }
})

// ==================== 新闻条目 IPC 处理器 ====================

ipcMain.handle('newsItems:getNewsItems', (_event, limit?: number, offset?: number, categoryId?: number) => {
  try {
    return { success: true, items: newsApi.getNewsItems(limit || 50, offset || 0, categoryId) }
  } catch (error) {
    console.error('Failed to get news items:', error)
    return { success: false, error: 'Failed to get news items' }
  }
})

ipcMain.handle('newsItems:getRecent', (_event, limit?: number) => {
  try {
    return { success: true, items: newsApi.getRecentNewsItems(limit || 50) }
  } catch (error) {
    console.error('Failed to get recent news:', error)
    return { success: false, error: 'Failed to get recent news' }
  }
})

ipcMain.handle('newsItems:getById', (_event, id: number) => {
  try {
    const item = newsApi.getNewsItemById(id)
    if (item) {
      return { success: true, item }
    } else {
      return { success: false, error: 'News item not found' }
    }
  } catch (error) {
    console.error('Failed to get news item:', error)
    return { success: false, error: 'Failed to get news item' }
  }
})

ipcMain.handle('newsItems:getBySourceId', (_event, sourceId: number, limit?: number) => {
  try {
    return { success: true, items: newsApi.getNewsItemsBySourceId(sourceId, limit || 50) }
  } catch (error) {
    console.error('Failed to get news items by source:', error)
    return { success: false, error: 'Failed to get news items by source' }
  }
})

ipcMain.handle('newsItems:create', (_event, item: any) => {
  try {
    const id = newsApi.createNewsItem(item)
    return { success: true, id }
  } catch (error) {
    console.error('Failed to create news item:', error)
    return { success: false, error: 'Failed to create news item' }
  }
})

ipcMain.handle('newsItems:update', (_event, id: number, item: any) => {
  try {
    const success = newsApi.updateNewsItem(id, item)
    if (success) {
      return { success: true }
    } else {
      return { success: false, error: 'Failed to update news item' }
    }
  } catch (error) {
    console.error('Failed to update news item:', error)
    return { success: false, error: 'Failed to update news item' }
  }
})

ipcMain.handle('newsItems:updateContent', (_event, id: number, content: string) => {
  try {
    const success = newsApi.updateNewsItemContent(id, content)
    if (success) {
      return { success: true }
    } else {
      return { success: false, error: 'Failed to update news item content' }
    }
  } catch (error) {
    console.error('Failed to update news item content:', error)
    return { success: false, error: 'Failed to update news item content' }
  }
})

ipcMain.handle('newsItems:markAsRead', (_event, id: number) => {
  try {
    const success = newsApi.markAsRead(id)
    if (success) {
      return { success: true }
    } else {
      return { success: false, error: 'Failed to mark as read' }
    }
  } catch (error) {
    console.error('Failed to mark as read:', error)
    return { success: false, error: 'Failed to mark as read' }
  }
})

ipcMain.handle('newsItems:markMultipleAsRead', (_event, ids: number[]) => {
  try {
    const count = newsApi.markMultipleAsRead(ids)
    return { success: true, count }
  } catch (error) {
    console.error('Failed to mark multiple as read:', error)
    return { success: false, error: 'Failed to mark multiple as read' }
  }
})

ipcMain.handle('newsItems:delete', (_event, id: number) => {
  try {
    const success = newsApi.deleteNewsItem(id)
    if (success) {
      return { success: true }
    } else {
      return { success: false, error: 'Failed to delete news item' }
    }
  } catch (error) {
    console.error('Failed to delete news item:', error)
    return { success: false, error: 'Failed to delete news item' }
  }
})

ipcMain.handle('newsItems:cleanOldNews', (_event, days?: number) => {
  try {
    const count = newsApi.cleanOldNews(days || 30)
    return { success: true, count }
  } catch (error) {
    console.error('Failed to clean old news:', error)
    return { success: false, error: 'Failed to clean old news' }
  }
})

// ==================== 收藏 IPC 处理器 ====================

ipcMain.handle('favorites:getAll', (_event, limit?: number) => {
  try {
    return { success: true, favorites: newsApi.getAllFavorites(limit || 50) }
  } catch (error) {
    console.error('Failed to get favorites:', error)
    return { success: false, error: 'Failed to get favorites' }
  }
})

ipcMain.handle('favorites:add', (_event, itemId: number) => {
  try {
    const success = newsApi.addFavorite(itemId)
    if (success) {
      return { success: true }
    } else {
      return { success: false, error: 'Failed to add favorite' }
    }
  } catch (error) {
    console.error('Failed to add favorite:', error)
    return { success: false, error: 'Failed to add favorite' }
  }
})

ipcMain.handle('favorites:remove', (_event, itemId: number) => {
  try {
    const success = newsApi.removeFavorite(itemId)
    if (success) {
      return { success: true }
    } else {
      return { success: false, error: 'Failed to remove favorite' }
    }
  } catch (error) {
    console.error('Failed to remove favorite:', error)
    return { success: false, error: 'Failed to remove favorite' }
  }
})

ipcMain.handle('favorites:isFavorite', (_event, itemId: number) => {
  try {
    const isFav = newsApi.isFavorite(itemId)
    return { success: true, isFavorite: isFav }
  } catch (error) {
    console.error('Failed to check favorite:', error)
    return { success: false, error: 'Failed to check favorite' }
  }
})