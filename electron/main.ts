import {
  app,
  BrowserWindow,
  BrowserView,
  globalShortcut,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  dialog,
  session,
} from "electron";
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import path from "node:path";
import fs from "node:fs";
import Parser from "rss-parser";
import Store from "electron-store";
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const packageJson = require('../../package.json');

// 扩展 Electron.App 类型
declare global {
  namespace Electron {
    interface App {
      isQuitting?: boolean;
    }
  }
}
import {
  getDatabase,
  closeDatabase,
  seedDefaultData,
  getCurrentDatabasePath,
  setCustomDatabaseDirectory,
  setCustomDatabasePath,
  migrateDatabaseToNewPath,
  getProxy,
  setProxy,
  getProxyConfig,
} from "./database";
import { runMigration, createUsageStatsTables } from "./migration";
import { notesApi } from "./api/notesApi";
import { todosApi } from "./api/todosApi";
import { newsApi } from "./api/newsApi";
import { webPagesApi } from "./api/webPagesApi";
import { usageStatsApi } from "./api/usageStatsApi";
import { testRSSFeed } from "./services/rssFetcher";
import { testWebsiteNews } from "./services/websiteNewsFetcher";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// 窗口显示/隐藏状态
let isWindowVisible = false;

// 统计相关变量
let currentSessionId: string | null = null;
let sessionStartTime: number | null = null;
let currentFeatureId: string | null = null;
let featureStartTime: number | null = null;

// 窗口状态
let isWindowFocused: boolean = false;

// Store 类型定义
interface StoreData {
  shortcuts: {
    toggleWindow: string;
  };
  closeBehavior: "minimize" | "quit";
  notes: any[];
  todos: any[];
  rssFeeds: Record<string, any>;
  favorites: any[];

  [key: string]: any;
}

// 初始化 electron-store（保持兼容性）
const store = new Store<StoreData>({
  name: "moyu-data",
  defaults: {
    shortcuts: {
      toggleWindow: "CommandOrControl+Alt+M",
    },
    closeBehavior: "minimize", // 可选: 'minimize' (最小化到托盘) 或 'quit' (直接退出)
    notes: [],
    todos: [],
    rssFeeds: {},
    favorites: [],
  },
});

// RSS 存储（使用 electron-store）
const parser = new Parser();

// 获取 RSS feeds
const getRSSFeeds = () => {
  return store.get("rssFeeds") as Record<string, any>;
};

// 保存 RSS feeds
const saveRSSFeeds = (feeds: Record<string, any>) => {
  store.set("rssFeeds", feeds);
};

function createWindow() {
  // 获取图标路径 - 在开发和生产环境下都能正确加载
  const iconPath =
    process.env.NODE_ENV === "development"
      ? path.join(__dirname, "../../build/icon.png")
      : path.join(process.resourcesPath, "build/icon.png");

  // 开发模式下显示边框以便查看左上角图标，生产模式下无边框
  const isDev =
    process.env.NODE_ENV === "development" || process.env.VITE_DEV_SERVER_URL;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false, // 始终无边框
    transparent: false,
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // 禁用 webSecurity 以允许跨域请求
      webviewTag: true, // 启用webview标签
      allowRunningInsecureContent: false,
    },
    icon: iconPath,
  });

  // 开发模式下加载 Vite 开发服务器
  const devServerUrl =
    process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
  if (
    process.env.NODE_ENV === "development" ||
    process.env.VITE_DEV_SERVER_URL
  ) {
    console.log("Loading Vite dev server:", devServerUrl);
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools();
  } else {
    console.log("VITE_DEV_SERVER_URL not set, loading from file");
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("ready-to-show", () => {
    if (!isWindowVisible) {
      mainWindow?.hide();
    } else {
      mainWindow?.show();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // 关闭窗口时真正退出程序
  mainWindow.on("close", () => {
    if (!app.isQuitting) {
      app.isQuitting = true;
      app.quit();
    }
  });

  // 最小化窗口时隐藏到托盘
  mainWindow.on("minimize", () => {
    mainWindow?.hide();
  });

  // 监听窗口失焦事件
  mainWindow.on("blur", () => {
    if (isWindowFocused) {
      isWindowFocused = false;
      pauseFeatureUsage();
      console.log("Window blurred, feature usage paused");
      // 通知渲染进程窗口失焦
      mainWindow?.webContents.send("window:focus-changed", false);
    }
  });

  // 监听窗口获焦事件
  mainWindow.on("focus", () => {
    if (!isWindowFocused) {
      isWindowFocused = true;
      console.log("Window focused, feature usage state:", currentFeatureId);
      // 通知渲染进程窗口获焦
      mainWindow?.webContents.send("window:focus-changed", true);
    }
  });
}

// 创建系统托盘
function createTray() {
  // 创建托盘图标 - 在开发和生产环境下都能正确加载
  const iconPath =
    process.env.NODE_ENV === "development"
      ? path.join(__dirname, "../../build/icon.png")
      : path.join(process.resourcesPath, "build/icon.png");

  try {
    tray = new Tray(iconPath);
  } catch (error) {
    // 如果图标文件不存在，使用默认图标
    console.warn("Failed to load tray icon, using default icon:", error);
    // 在实际应用中，你应该创建一个实际的 PNG 图标文件
    // 这里我们使用一个空对象作为占位符
    tray = new Tray(nativeImage.createEmpty());
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "显示/隐藏窗口",
      click: () => {
        toggleWindow();
      },
    },
    {
      label: "关于",
      click: () => {
        if (mainWindow && !mainWindow.isVisible()) {
          toggleWindow();
        } else {
          mainWindow?.show();
        }
      },
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("摸了吗软件");
  tray.setContextMenu(contextMenu);

  // 双击托盘图标显示/隐藏窗口
  tray.on("double-click", () => {
    toggleWindow();
  });
}

// ==================== 统计辅助函数 ====================

/**
 * 生成唯一的会话ID
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 开始新会话
 */
function startNewSession(): void {
  // 如果已经有活跃会话，不重复创建
  if (currentSessionId) {
    console.log("Session already active:", currentSessionId);
    return;
  }

  currentSessionId = generateSessionId();
  sessionStartTime = Date.now();
  usageStatsApi.startSession(currentSessionId);
  console.log("Session started:", currentSessionId);
}

/**
 * 结束当前会话
 */
function endCurrentSession(): void {
  if (currentSessionId) {
    // 结束当前功能使用（如果有）
    if (currentFeatureId) {
      usageStatsApi.endFeatureUsage(currentFeatureId);
      currentFeatureId = null;
      featureStartTime = null;
    }

    // 结束会话
    usageStatsApi.endSession(currentSessionId);
    console.log("Session ended:", currentSessionId);
    currentSessionId = null;
    sessionStartTime = null;
  }
}

/**
 * 开始功能使用
 */
function startFeatureUsage(featureId: string): void {
  // 结束上一个功能的记录
  if (currentFeatureId && currentFeatureId !== featureId) {
    usageStatsApi.endFeatureUsage(currentFeatureId);
  }

  currentFeatureId = featureId;
  featureStartTime = Date.now();

  if (currentSessionId) {
    usageStatsApi.startFeatureUsage(currentSessionId, featureId);
    console.log("Feature usage started:", featureId);
  }
}

/**
 * 结束功能使用
 */
function endFeatureUsage(featureId: string): void {
  if (currentFeatureId === featureId) {
    usageStatsApi.endFeatureUsage(featureId);
    currentFeatureId = null;
    featureStartTime = null;
    console.log("Feature usage ended:", featureId);
  }
}

/**
 * 暂停功能使用（窗口失焦时调用）
 */
function pauseFeatureUsage(): void {
  if (currentFeatureId) {
    usageStatsApi.endFeatureUsage(currentFeatureId);
    console.log("Feature usage paused:", currentFeatureId);
  }
}

/**
 * 恢复功能使用（窗口获焦时调用）
 */
function resumeFeatureUsage(featureId: string): void {
  if (currentFeatureId !== featureId) {
    // 如果是不同的功能，先结束上一个
    if (currentFeatureId) {
      usageStatsApi.endFeatureUsage(currentFeatureId);
    }
  }

  if (currentSessionId) {
    startFeatureUsage(featureId);
  }
}

// 切换窗口显示/隐藏
function toggleWindow() {
  if (mainWindow) {
    if (mainWindow.isVisible()) {
      // 窗口隐藏，结束当前会话
      endCurrentSession();
      mainWindow.hide();
      isWindowVisible = false;
    } else {
      // 窗口显示，开始新会话
      startNewSession();
      mainWindow.show();
      mainWindow.focus();
      isWindowVisible = true;
      isWindowFocused = true;
    }
  }
}

// 注册全局快捷键
function registerGlobalShortcuts() {
  const shortcuts = getShortcuts();

  // 注册显示/隐藏窗口快捷键
  globalShortcut.register(shortcuts.toggleWindow, () => {
    toggleWindow();
  });

  console.log("全局快捷键已注册");
  console.log(`  ${shortcuts.toggleWindow}: 显示/隐藏窗口`);
}

// ==================== 自动更新功能 ====================

/**
 * 配置自动更新
 */
function setupAutoUpdater() {
  // 设置更新服务器 URL（GitHub Releases）
  // 注意：开发环境下不会检查更新，只有打包后才会
  autoUpdater.setFeedURL({
    provider: "github",
    owner: "zxbdzh",
    repo: "moyu",
  });

  // 监听更新事件
  autoUpdater.on("checking-for-update", () => {
    console.log("检查更新中...");
  });

  autoUpdater.on("update-available", (info) => {
    console.log("发现新版本:", info.version);
    // 发送通知给渲染进程
    mainWindow?.webContents.send("update:available", {
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
    // 显示对话框通知用户
    dialog
      .showMessageBox({
        type: "info",
        title: "发现新版本",
        message: `发现新版本 ${info.version}，正在下载中...`,
        buttons: ["确定"],
      })
      .then(() => {
        // 开始下载更新
        autoUpdater.downloadUpdate();
      });
  });

  autoUpdater.on("update-not-available", (info) => {
    console.log("当前已是最新版本:", info.version);
    mainWindow?.webContents.send("update:not-available", {
      version: info.version,
    });
  });

  autoUpdater.on("error", (err) => {
    console.error("自动更新错误:", err);
    mainWindow?.webContents.send("update:error", {
      message: err.message,
    });
    // 开发环境下错误是正常的，不显示错误对话框
    if (app.isPackaged) {
      dialog.showMessageBox({
        type: "error",
        title: "更新错误",
        message: `更新失败: ${err.message}`,
        buttons: ["确定"],
      });
    }
  });

  autoUpdater.on("download-progress", (progressObj) => {
    let logMessage = `下载进度: ${Math.floor(progressObj.percent)}%`;
    logMessage += ` (${progressObj.transferred}/${progressObj.total} bytes)`;
    logMessage += ` - ${Math.floor(progressObj.bytesPerSecond / 1024)} KB/s`;
    console.log(logMessage);
    mainWindow?.webContents.send("update:progress", {
      percent: progressObj.percent,
      transferred: progressObj.transferred,
      total: progressObj.total,
      bytesPerSecond: progressObj.bytesPerSecond,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log("更新下载完成:", info.version);
    mainWindow?.webContents.send("update:downloaded", {
      version: info.version,
    });
    // 提示用户安装更新
    dialog
      .showMessageBox({
        type: "info",
        title: "更新已就绪",
        message: `版本 ${info.version} 下载完成，是否立即安装并重启应用？`,
        buttons: ["立即安装", "稍后"],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          // 用户选择立即安装
          autoUpdater.quitAndInstall();
        }
      });
  });
}

// ==================== 应用启动 ====================

app.whenReady().then(() => {
  // 设置应用版本信息
  process.versions.app = packageJson.version;

  // 初始化数据库
  const db = getDatabase();
  seedDefaultData(db);

  // 运行数据迁移（从 JSON 到 SQLite）
  runMigration();

  // 创建使用统计表
  createUsageStatsTables();

  // 创建专门用于 webview 的 session
  const webviewSession = session.fromPartition("persist:webview");

  // 配置 webview 代理的函数
  const setupWebviewProxy = () => {
    const proxyConfig = getProxyConfig();
    if (proxyConfig.enabled && proxyConfig.url) {
      console.log("Setting webview proxy:", proxyConfig.url);
      webviewSession.setProxy({
        proxyRules: proxyConfig.url,
      });
    } else {
      webviewSession.setProxy({});
    }
  };

  // 初始化 webview 代理
  setupWebviewProxy();

  createWindow();
  createTray();
  registerGlobalShortcuts();

  // 设置自动更新（仅在打包后生效）
  if (app.isPackaged) {
    setupAutoUpdater();
    // 启动时检查一次更新
    autoUpdater.checkForUpdates();
  } else {
    console.log("开发模式，跳过自动更新检查");
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 应用退出前清理
app.on("will-quit", () => {
  // 结束当前会话
  endCurrentSession();

  // 注销所有全局快捷键
  globalShortcut.unregisterAll();

  // 关闭数据库连接
  closeDatabase();
});

// 所有窗口关闭后退出应用（macOS 除外）
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// IPC 处理程序 - RSS 相关
ipcMain.handle("rss:addFeed", async (_event, url: string) => {
  try {
    // 去除URL前后空格
    const trimmedUrl = url.trim();
    const feed = await parser.parseURL(trimmedUrl);
    const feedData = {
      url: trimmedUrl,
      title: feed.title || "Unknown Feed",
      description: feed.description || "",
      items: feed.items.map((item) => ({
        title: item.title || "No Title",
        link: item.link || "",
        pubDate: item.pubDate || new Date().toISOString(),
        content: item.content || item.contentSnippet || "",
        contentSnippet: item.contentSnippet || "",
        guid: item.guid || item.link || "",
      })),
    };

    const feeds = getRSSFeeds();
    feeds[trimmedUrl] = feedData;
    saveRSSFeeds(feeds);

    return { success: true, feed: feedData };
  } catch (error) {
    console.error("Failed to parse RSS feed:", error);
    return { success: false, error: "Failed to parse RSS feed" };
  }
});

ipcMain.handle("rss:removeFeed", async (_event, url: string) => {
  try {
    // 去除URL前后空格
    const trimmedUrl = url.trim();
    const feeds = getRSSFeeds();
    delete feeds[trimmedUrl];
    saveRSSFeeds(feeds);
    return { success: true };
  } catch (error) {
    console.error("Failed to remove RSS feed:", error);
    return { success: false, error: "Failed to remove RSS feed" };
  }
});

ipcMain.handle("rss:refreshFeed", async (_event, url: string) => {
  try {
    // 去除URL前后空格
    const trimmedUrl = url.trim();
    const feed = await parser.parseURL(trimmedUrl);
    const feedData = {
      url: trimmedUrl,
      title: feed.title || "Unknown Feed",
      description: feed.description || "",
      items: feed.items.map((item) => ({
        title: item.title || "No Title",
        link: item.link || "",
        pubDate: item.pubDate || new Date().toISOString(),
        content: item.content || item.contentSnippet || "",
        contentSnippet: item.contentSnippet || "",
        guid: item.guid || item.link || "",
      })),
    };

    const feeds = getRSSFeeds();
    feeds[trimmedUrl] = feedData;
    saveRSSFeeds(feeds);

    return { success: true, feed: feedData };
  } catch (error) {
    console.error("Failed to refresh RSS feed:", error);
    return { success: false, error: "Failed to refresh RSS feed" };
  }
});

ipcMain.handle("rss:getFeeds", async () => {
  try {
    // 确保返回的feeds URL没有前后空格
    const feeds = Object.values(getRSSFeeds()).map((feed) => ({
      ...feed,
      url: feed.url.trim(),
    }));
    return { success: true, feeds };
  } catch (error) {
    console.error("Failed to get RSS feeds:", error);
    return { success: false, error: "Failed to get RSS feeds" };
  }
});

ipcMain.handle("rss:getFeed", async (_event, url: string) => {
  try {
    // 去除URL前后空格
    const trimmedUrl = url.trim();
    const feeds = getRSSFeeds();
    const feed = feeds[trimmedUrl];
    if (feed) {
      return { success: true, feed: { ...feed, url: trimmedUrl } };
    } else {
      return { success: false, error: "Feed not found" };
    }
  } catch (error) {
    console.error("Failed to get RSS feed:", error);
    return { success: false, error: "Failed to get RSS feed" };
  }
});

// 快捷键管理
const getShortcuts = () => {
  return store.get("shortcuts") as { toggleWindow: string };
};

const setShortcuts = (shortcuts: any) => {
  store.set("shortcuts", shortcuts);
};

ipcMain.handle("shortcuts:get", async () => {
  return getShortcuts();
});

ipcMain.handle("shortcuts:set", async (_event, shortcuts) => {
  try {
    // 注销旧快捷键
    globalShortcut.unregisterAll();

    // 注册新快捷键
    globalShortcut.register(shortcuts.toggleWindow, () => {
      toggleWindow();
    });

    setShortcuts(shortcuts);
    console.log("快捷键已更新:", shortcuts);

    // 通知渲染进程快捷键已更新
    mainWindow?.webContents.send("shortcuts:changed", shortcuts);

    return { success: true };
  } catch (error) {
    console.error("Failed to update shortcuts:", error);
    return { success: false, error: "Failed to update shortcuts" };
  }
});

// 窗口控制 IPC
ipcMain.on("toggle-window", () => {
  toggleWindow();
});

ipcMain.on("minimize-window", () => {
  mainWindow?.minimize();
});

ipcMain.on("maximize-window", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on("close-window", () => {
  mainWindow?.close();
});

// 数据存储 IPC
ipcMain.handle("store:get", async (_event, key: string) => {
  try {
    const value = store.get(key);
    return { success: true, value };
  } catch (error) {
    console.error("Failed to get store value:", error);
    return { success: false, error: "Failed to get store value" };
  }
});

ipcMain.handle("store:set", async (_event, key: string, value: any) => {
  try {
    store.set(key, value);
    return { success: true };
  } catch (error) {
    console.error("Failed to set store value:", error);
    return { success: false, error: "Failed to set store value" };
  }
});

ipcMain.handle("store:getDataPath", async () => {
  try {
    return { success: true, path: store.path };
  } catch (error) {
    console.error("Failed to get data path:", error);
    return { success: false, error: "Failed to get data path" };
  }
});

ipcMain.handle("store:setDataPath", async (_event, newPath: string) => {
  try {
    // 备份当前数据
    const currentData = store.store;

    // 创建新的 store 实例
    const newStore = new Store({
      name: "moyu-data",
      cwd: newPath,
    });

    // 迁移数据
    Object.keys(currentData).forEach((key) => {
      newStore.set(key, currentData[key]);
    });

    // 更新全局 store 引用
    // 注意：这里需要重新初始化 store，但由于 electron-store 的限制，
    // 实际上我们需要重启应用来完全切换存储路径
    return {
      success: true,
      message: "数据已迁移，请重启应用以使用新的存储路径",
      requiresRestart: true,
    };
  } catch (error) {
    console.error("Failed to set data path:", error);
    return { success: false, error: "Failed to set data path" };
  }
});

ipcMain.handle("dialog:selectDirectory", async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ["openDirectory", "createDirectory"],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, path: result.filePaths[0] };
    }

    return { success: false, canceled: true };
  } catch (error) {
    console.error("Failed to select directory:", error);
    return { success: false, error: "Failed to select directory" };
  }
});

ipcMain.handle("dialog:selectDatabaseFile", async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ["openFile"],
      filters: [
        { name: "SQLite Database", extensions: ["db", "sqlite", "sqlite3"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, path: result.filePaths[0] };
    }

    return { success: false, canceled: true };
  } catch (error) {
    console.error("Failed to select database file:", error);
    return { success: false, error: "Failed to select database file" };
  }
});

// 全屏窗口控制
ipcMain.on("fullscreen-window", () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

ipcMain.handle("is-fullscreen", async () => {
  try {
    return { success: true, isFullscreen: mainWindow?.isFullScreen() || false };
  } catch (error) {
    console.error("Failed to check fullscreen status:", error);
    return { success: false, error: "Failed to check fullscreen status" };
  }
});

// 国内新闻源聚合
const domesticNewsSources = [
  // 技术博客
  {
    name: "阮一峰的网络日志",
    url: "https://www.ruanyifeng.com/blog/atom.xml",
    category: "tech",
  },
  { name: "掘金前端", url: "https://juejin.cn/rss/frontend", category: "tech" },
  { name: "InfoQ", url: "https://www.infoq.cn/feed", category: "tech" },
  {
    name: "SegmentFault",
    url: "https://segmentfault.com/feeds",
    category: "tech",
  },
  // 主流媒体
  {
    name: "腾讯科技",
    url: "https://tech.qq.com/rss/tech.xml",
    category: "news",
  },
  {
    name: "新浪科技",
    url: "https://tech.sina.com.cn/rss/roll.xml",
    category: "news",
  },
  {
    name: "网易科技",
    url: "https://tech.163.com/special/00094JVL/tech_datalist.xml",
    category: "news",
  },
  { name: "36氪", url: "https://36kr.com/feed", category: "startup" },
];

ipcMain.handle("news:getDomesticNews", async (_event, category?: string) => {
  try {
    // 从数据库获取新闻项
    // 如果提供了分类ID，需要先获取分类信息
    let categoryId: number | undefined;
    if (category && category !== "all") {
      // 尝试将字符串分类映射到数据库中的分类ID
      const categories = newsApi.getAllCategories();

      // 根据前端分类ID映射到数据库分类名称
      let categoryName: string | undefined;
      switch (category) {
        case "tech":
          categoryName = "科技";
          break;
        case "news":
          categoryName = "资讯"; // 如果数据库中没有资讯分类，可能需要创建或使用财经
          break;
        case "startup":
          categoryName = "创业";
          break;
        case "ai":
          categoryName = "AI";
          break;
        default:
          categoryName = category;
      }

      // 如果特定分类不存在，尝试使用相近的分类
      if (categoryName) {
        for (const cat of categories) {
          if (
            cat.name.includes(categoryName) ||
            categoryName.includes(cat.name)
          ) {
            categoryId = cat.id;
            break;
          }
        }

        // 如果还是没找到，尝试用相近的分类
        if (categoryId === undefined) {
          if (category === "news") {
            // 对于资讯，尝试财经分类
            for (const cat of categories) {
              if (
                cat.name.includes("财经") ||
                cat.name.includes("新闻") ||
                cat.name.includes("资讯")
              ) {
                categoryId = cat.id;
                break;
              }
            }
          } else if (category === "startup") {
            // 对于创业，尝试财经或商业相关分类
            for (const cat of categories) {
              if (
                cat.name.includes("财经") ||
                cat.name.includes("商业") ||
                cat.name.includes("创业")
              ) {
                categoryId = cat.id;
                break;
              }
            }
          } else if (category === "ai") {
            // 对于AI，尝试科技或智能相关分类
            for (const cat of categories) {
              if (
                cat.name.includes("科技") ||
                cat.name.includes("智能") ||
                cat.name.includes("AI")
              ) {
                categoryId = cat.id;
                break;
              }
            }
          }
        }
      }
    }

    // 从数据库获取新闻项
    const newsItems = newsApi.getNewsItems(50, 0, categoryId);

    // 转换数据库格式到前端期望的格式
    const allNews = newsItems.map((item: any) => {
      // 获取新闻源名称
      const sourceName = item.source_name || `Source ${item.source_id}`;

      // 获取分类名称
      let categoryLabel = "news";
      if (item.category_name) {
        if (item.category_name.includes("技术")) categoryLabel = "tech";
        else if (item.category_name.includes("创业")) categoryLabel = "startup";
        else if (item.category_name.includes("AI")) categoryLabel = "ai";
      }

      return {
        id: item.id?.toString() || `db-${item.link}`,
        title: item.title,
        description: item.description || item.content || "",
        url: item.link,
        publishedAt: item.pub_date
          ? new Date(item.pub_date).toISOString()
          : new Date().toISOString(),
        source: sourceName,
        category: categoryLabel,
        image: item.image_url,
      };
    });

    // 按发布时间排序（从新到旧）
    allNews.sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

    // 限制返回数量（最多50条）
    return { success: true, news: allNews.slice(0, 50) };
  } catch (error) {
    console.error("Failed to get domestic news:", error);
    return { success: false, error: "Failed to get domestic news" };
  }
});

// 从 HTML 内容中提取图片 URL
function extractImage(html: string): string | undefined {
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imgMatch ? imgMatch[1] : undefined;
}

// ==================== 笔记 IPC 处理器 =====================

ipcMain.handle("notes:getAll", () => {
  try {
    return { success: true, notes: notesApi.getAll() };
  } catch (error) {
    console.error("Failed to get notes:", error);
    return { success: false, error: "Failed to get notes" };
  }
});

// ==================== 数据库路径 IPC 处理器 =====================

ipcMain.handle("database:getPath", () => {
  try {
    const dbPath = getCurrentDatabasePath();
    return { success: true, path: dbPath };
  } catch (error) {
    console.error("Failed to get database path:", error);
    return { success: false, error: "Failed to get database path" };
  }
});

ipcMain.handle(
  "database:setDirectory",
  async (_event, directoryPath: string) => {
    try {
      console.log("Setting database directory:", directoryPath);

      // 验证目录路径
      if (!fs.existsSync(directoryPath)) {
        return { success: false, error: "指定的目录不存在" };
      }

      // 检查是否是目录
      const stats = fs.statSync(directoryPath);
      if (!stats.isDirectory()) {
        return { success: false, error: "指定的路径不是目录" };
      }

      // 构建新的数据库路径
      const newDbPath = path.join(directoryPath, "moyu.db");

      // 先执行迁移（迁移成功后才更新路径）
      const result = migrateDatabaseToNewPath(newDbPath);

      if (result.success) {
        // 迁移成功，更新路径
        setCustomDatabaseDirectory(directoryPath);

        // 通知用户需要重启应用
        return {
          success: true,
          message: "数据库已成功迁移到新位置，请重启应用以使更改生效",
          migratedRecords: result.migratedRecords,
          requiresRestart: true,
        };
      } else {
        return {
          success: false,
          error: result.error || "数据库迁移失败",
        };
      }
    } catch (error) {
      console.error("Failed to set database directory:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "设置数据库目录失败",
      };
    }
  },
);

ipcMain.handle("database:setPath", async (_event, dbPath: string) => {
  try {
    console.log("Setting database path:", dbPath);

    // 验证文件路径
    const directoryPath = path.dirname(dbPath);

    if (!fs.existsSync(directoryPath)) {
      return { success: false, error: "数据库文件所在的目录不存在" };
    }

    // 执行迁移
    setCustomDatabasePath(dbPath);

    const result = migrateDatabaseToNewPath(dbPath);

    if (result.success) {
      return {
        success: true,
        message: "数据库已成功迁移到新位置，请重启应用以使更改生效",
        migratedRecords: result.migratedRecords,
        requiresRestart: true,
      };
    } else {
      return {
        success: false,
        error: result.error || "数据库迁移失败",
      };
    }
  } catch (error) {
    console.error("Failed to set database path:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "设置数据库路径失败",
    };
  }
});

ipcMain.handle("notes:getById", (_event, id: number) => {
  try {
    const note = notesApi.getById(id);
    if (note) {
      return { success: true, note };
    } else {
      return { success: false, error: "Note not found" };
    }
  } catch (error) {
    console.error("Failed to get note:", error);
    return { success: false, error: "Failed to get note" };
  }
});

ipcMain.handle("notes:search", (_event, query: string) => {
  try {
    return { success: true, notes: notesApi.search(query) };
  } catch (error) {
    console.error("Failed to search notes:", error);
    return { success: false, error: "Failed to search notes" };
  }
});

ipcMain.handle("notes:create", (_event, note: any) => {
  try {
    const id = notesApi.create(note);
    return { success: true, id };
  } catch (error) {
    console.error("Failed to create note:", error);
    return { success: false, error: "Failed to create note" };
  }
});

ipcMain.handle("notes:update", (_event, id: number, note: any) => {
  try {
    const success = notesApi.update(id, note);
    if (success) {
      return { success: true };
    } else {
      return { success: false, error: "Failed to update note" };
    }
  } catch (error) {
    console.error("Failed to update note:", error);
    return { success: false, error: "Failed to update note" };
  }
});

ipcMain.handle("notes:delete", (_event, id: number) => {
  try {
    const success = notesApi.delete(id);
    if (success) {
      return { success: true };
    } else {
      return { success: false, error: "Failed to delete note" };
    }
  } catch (error) {
    console.error("Failed to delete note:", error);
    return { success: false, error: "Failed to delete note" };
  }
});

ipcMain.handle("notes:count", () => {
  try {
    return { success: true, count: notesApi.count() };
  } catch (error) {
    console.error("Failed to count notes:", error);
    return { success: false, error: "Failed to count notes" };
  }
});

// ==================== 待办事项 IPC 处理器 ====================

ipcMain.handle("todos:getAll", () => {
  try {
    return { success: true, todos: todosApi.getAll() };
  } catch (error) {
    console.error("Failed to get todos:", error);
    return { success: false, error: "Failed to get todos" };
  }
});

ipcMain.handle("todos:getById", (_event, id: number) => {
  try {
    const todo = todosApi.getById(id);
    if (todo) {
      return { success: true, todo };
    } else {
      return { success: false, error: "Todo not found" };
    }
  } catch (error) {
    console.error("Failed to get todo:", error);
    return { success: false, error: "Failed to get todo" };
  }
});

ipcMain.handle("todos:create", (_event, todo: any) => {
  try {
    const id = todosApi.create(todo);
    return { success: true, id };
  } catch (error) {
    console.error("Failed to create todo:", error);
    return { success: false, error: "Failed to create todo" };
  }
});

ipcMain.handle("todos:update", (_event, id: number, todo: any) => {
  try {
    const success = todosApi.update(id, todo);
    if (success) {
      return { success: true };
    } else {
      return { success: false, error: "Failed to update todo" };
    }
  } catch (error) {
    console.error("Failed to update todo:", error);
    return { success: false, error: "Failed to update todo" };
  }
});

ipcMain.handle("todos:toggle", (_event, id: number) => {
  try {
    const success = todosApi.toggle(id);
    if (success) {
      return { success: true };
    } else {
      return { success: false, error: "Failed to toggle todo" };
    }
  } catch (error) {
    console.error("Failed to toggle todo:", error);
    return { success: false, error: "Failed to toggle todo" };
  }
});

ipcMain.handle("todos:delete", (_event, id: number) => {
  try {
    const success = todosApi.delete(id);
    if (success) {
      return { success: true };
    } else {
      return { success: false, error: "Failed to delete todo" };
    }
  } catch (error) {
    console.error("Failed to delete todo:", error);
    return { success: false, error: "Failed to delete todo" };
  }
});

ipcMain.handle("todos:clearCompleted", () => {
  try {
    const count = todosApi.clearCompleted();
    return { success: true, count };
  } catch (error) {
    console.error("Failed to clear completed todos:", error);
    return { success: false, error: "Failed to clear completed todos" };
  }
});

ipcMain.handle("todos:getStats", () => {
  try {
    return { success: true, stats: todosApi.getStats() };
  } catch (error) {
    console.error("Failed to get todo stats:", error);
    return { success: false, error: "Failed to get todo stats" };
  }
});

ipcMain.handle("todos:updateOrder", (_event, orderedIds: number[]) => {
  try {
    const result = todosApi.updateOrder(orderedIds);
    return { success: result };
  } catch (error) {
    console.error("Failed to update todo order:", error);
    return { success: false, error: "Failed to update todo order" };
  }
});

// 获取完成统计信息
ipcMain.handle("todos:getCompletionStats", () => {
  try {
    const stats = todosApi.getCompletionStats();
    return { success: true, stats };
  } catch (error) {
    console.error("Failed to get completion stats:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

// 获取分页的待办事项
ipcMain.handle(
  "todos:getPaginated",
  (_event, page: number = 1, pageSize: number = 10) => {
    try {
      const result = todosApi.getPaginatedTodos(page, pageSize);
      return { success: true, ...result };
    } catch (error) {
      console.error("Failed to get paginated todos:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
);

// 获取待完成的待办事项（分页）
ipcMain.handle(
  "todos:getPending",
  (_event, page: number = 1, pageSize: number = 10) => {
    try {
      const result = todosApi.getPendingTodos(page, pageSize);
      return { success: true, ...result };
    } catch (error) {
      console.error("Failed to get pending todos:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
);

// 获取已完成的待办事项（分页）
ipcMain.handle(
  "todos:getCompleted",
  (_event, page: number = 1, pageSize: number = 10) => {
    try {
      const result = todosApi.getCompletedTodos(page, pageSize);
      return { success: true, ...result };
    } catch (error) {
      console.error("Failed to get completed todos:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
);

// ==================== 新闻分类 IPC 处理器 ====================

ipcMain.handle("newsCategories:getAll", () => {
  try {
    return { success: true, categories: newsApi.getAllCategories() };
  } catch (error) {
    console.error("Failed to get categories:", error);
    return { success: false, error: "Failed to get categories" };
  }
});

ipcMain.handle("newsCategories:getById", (_event, id: number) => {
  try {
    const category = newsApi.getCategoryById(id);
    if (category) {
      return { success: true, category };
    } else {
      return { success: false, error: "Category not found" };
    }
  } catch (error) {
    console.error("Failed to get category:", error);
    return { success: false, error: "Failed to get category" };
  }
});

ipcMain.handle("newsCategories:create", (_event, category: any) => {
  try {
    const id = newsApi.createCategory(category);
    return { success: true, id };
  } catch (error) {
    console.error("Failed to create category:", error);
    return { success: false, error: "Failed to create category" };
  }
});

ipcMain.handle("newsCategories:update", (_event, id: number, category: any) => {
  try {
    const success = newsApi.updateCategory(id, category);
    if (success) {
      return { success: true };
    } else {
      return { success: false, error: "Failed to update category" };
    }
  } catch (error) {
    console.error("Failed to update category:", error);
    return { success: false, error: "Failed to update category" };
  }
});

ipcMain.handle("newsCategories:delete", (_event, id: number) => {
  try {
    const success = newsApi.deleteCategory(id);
    if (success) {
      return { success: true };
    } else {
      return { success: false, error: "Failed to delete category" };
    }
  } catch (error) {
    console.error("Failed to delete category:", error);
    return { success: false, error: "Failed to delete category" };
  }
});

// ==================== 新闻源 IPC 处理器 ====================

ipcMain.handle("newsSources:getAll", () => {
  try {
    return { success: true, sources: newsApi.getAllSources() };
  } catch (error) {
    console.error("Failed to get sources:", error);
    return { success: false, error: "Failed to get sources" };
  }
});

ipcMain.handle("newsSources:getActive", () => {
  try {
    return { success: true, sources: newsApi.getActiveSources() };
  } catch (error) {
    console.error("Failed to get active sources:", error);
    return { success: false, error: "Failed to get active sources" };
  }
});

ipcMain.handle("newsSources:getById", (_event, id: number) => {
  try {
    const source = newsApi.getSourceById(id);
    if (source) {
      return { success: true, source };
    } else {
      return { success: false, error: "Source not found" };
    }
  } catch (error) {
    console.error("Failed to get source:", error);
    return { success: false, error: "Failed to get source" };
  }
});

ipcMain.handle("newsSources:getByUrl", (_event, url: string) => {
  try {
    const source = newsApi.getSourceByUrl(url);
    if (source) {
      return { success: true, source };
    } else {
      return { success: false, error: "Source not found" };
    }
  } catch (error) {
    console.error("Failed to get source by URL:", error);
    return { success: false, error: "Failed to get source by URL" };
  }
});

ipcMain.handle("newsSources:create", (_event, source: any) => {
  try {
    const id = newsApi.createSource(source);
    return { success: true, id };
  } catch (error) {
    console.error("Failed to create source:", error);
    return { success: false, error: "Failed to create source" };
  }
});

ipcMain.handle("newsSources:update", (_event, id: number, source: any) => {
  try {
    const success = newsApi.updateSource(id, source);
    if (success) {
      return { success: true };
    } else {
      return { success: false, error: "Failed to update source" };
    }
  } catch (error) {
    console.error("Failed to update source:", error);
    return { success: false, error: "Failed to update source" };
  }
});

ipcMain.handle("newsSources:delete", (_event, id: number) => {
  try {
    const success = newsApi.deleteSource(id);
    if (success) {
      return { success: true };
    } else {
      return { success: false, error: "Failed to delete source" };
    }
  } catch (error) {
    console.error("Failed to delete source:", error);
    return { success: false, error: "Failed to delete source" };
  }
});

// ==================== 新闻条目 IPC 处理器 ====================

ipcMain.handle(
  "newsItems:getNewsItems",
  (_event, limit?: number, offset?: number, categoryId?: number) => {
    try {
      return {
        success: true,
        items: newsApi.getNewsItems(limit || 50, offset || 0, categoryId),
      };
    } catch (error) {
      console.error("Failed to get news items:", error);
      return { success: false, error: "Failed to get news items" };
    }
  },
);

ipcMain.handle("newsItems:getRecent", (_event, limit?: number) => {
  try {
    return { success: true, items: newsApi.getRecentNewsItems(limit || 50) };
  } catch (error) {
    console.error("Failed to get recent news:", error);
    return { success: false, error: "Failed to get recent news" };
  }
});

ipcMain.handle("newsItems:getById", (_event, id: number) => {
  try {
    const item = newsApi.getNewsItemById(id);
    if (item) {
      return { success: true, item };
    } else {
      return { success: false, error: "News item not found" };
    }
  } catch (error) {
    console.error("Failed to get news item:", error);
    return { success: false, error: "Failed to get news item" };
  }
});

ipcMain.handle(
  "newsItems:getBySourceId",
  (_event, sourceId: number, limit?: number) => {
    try {
      return {
        success: true,
        items: newsApi.getNewsItemsBySourceId(sourceId, limit || 50),
      };
    } catch (error) {
      console.error("Failed to get news items by source:", error);
      return { success: false, error: "Failed to get news items by source" };
    }
  },
);

ipcMain.handle("newsItems:create", (_event, item: any) => {
  try {
    const id = newsApi.createNewsItem(item);
    return { success: true, id };
  } catch (error) {
    console.error("Failed to create news item:", error);
    return { success: false, error: "Failed to create news item" };
  }
});

ipcMain.handle("newsItems:update", (_event, id: number, item: any) => {
  try {
    const success = newsApi.updateNewsItem(id, item);
    if (success) {
      return { success: true };
    } else {
      return { success: false, error: "Failed to update news item" };
    }
  } catch (error) {
    console.error("Failed to update news item:", error);
    return { success: false, error: "Failed to update news item" };
  }
});

ipcMain.handle(
  "newsItems:updateContent",
  (_event, id: number, content: string) => {
    try {
      const success = newsApi.updateNewsItemContent(id, content);
      if (success) {
        return { success: true };
      } else {
        return { success: false, error: "Failed to update news item content" };
      }
    } catch (error) {
      console.error("Failed to update news item content:", error);
      return { success: false, error: "Failed to update news item content" };
    }
  },
);

ipcMain.handle("newsItems:markAsRead", (_event, id: number) => {
  try {
    const success = newsApi.markAsRead(id);
    if (success) {
      return { success: true };
    } else {
      return { success: false, error: "Failed to mark as read" };
    }
  } catch (error) {
    console.error("Failed to mark as read:", error);
    return { success: false, error: "Failed to mark as read" };
  }
});

ipcMain.handle("newsItems:markMultipleAsRead", (_event, ids: number[]) => {
  try {
    const count = newsApi.markMultipleAsRead(ids);
    return { success: true, count };
  } catch (error) {
    console.error("Failed to mark multiple as read:", error);
    return { success: false, error: "Failed to mark multiple as read" };
  }
});

ipcMain.handle("newsItems:delete", (_event, id: number) => {
  try {
    const success = newsApi.deleteNewsItem(id);
    if (success) {
      return { success: true };
    } else {
      return { success: false, error: "Failed to delete news item" };
    }
  } catch (error) {
    console.error("Failed to delete news item:", error);
    return { success: false, error: "Failed to delete news item" };
  }
});

ipcMain.handle("newsItems:cleanOldNews", (_event, days?: number) => {
  try {
    const count = newsApi.cleanOldNews(days || 30);
    return { success: true, count };
  } catch (error) {
    console.error("Failed to clean old news:", error);
    return { success: false, error: "Failed to clean old news" };
  }
});

// ==================== 收藏 IPC 处理器 ====================

ipcMain.handle("favorites:getAll", (_event, limit?: number) => {
  try {
    return { success: true, favorites: newsApi.getAllFavorites(limit || 50) };
  } catch (error) {
    console.error("Failed to get favorites:", error);
    return { success: false, error: "Failed to get favorites" };
  }
});

ipcMain.handle("favorites:add", (_event, itemId: number) => {
  try {
    const success = newsApi.addFavorite(itemId);
    if (success) {
      return { success: true };
    } else {
      return { success: false, error: "Failed to add favorite" };
    }
  } catch (error) {
    console.error("Failed to add favorite:", error);
    return { success: false, error: "Failed to add favorite" };
  }
});

ipcMain.handle("favorites:remove", (_event, itemId: number) => {
  try {
    const success = newsApi.removeFavorite(itemId);
    if (success) {
      return { success: true };
    } else {
      return { success: false, error: "Failed to remove favorite" };
    }
  } catch (error) {
    console.error("Failed to remove favorite:", error);
    return { success: false, error: "Failed to remove favorite" };
  }
});

ipcMain.handle("favorites:isFavorite", (_event, itemId: number) => {
  try {
    const isFav = newsApi.isFavorite(itemId);
    return { success: true, isFavorite: isFav };
  } catch (error) {
    console.error("Failed to check favorite:", error);
    return { success: false, error: "Failed to check favorite" };
  }
});

// ==================== 代理 IPC 处理器 ====================

ipcMain.handle("proxy:get", () => {
  try {
    const config = getProxyConfig();
    return { success: true, config };
  } catch (error) {
    console.error("Failed to get proxy config:", error);
    return { success: false, error: "Failed to get proxy config" };
  }
});

ipcMain.handle("proxy:set", async (_event, url: string | null) => {
  try {
    setProxy(url);

    // 同时更新 webview session 的代理
    const webviewSession = session.fromPartition("persist:webview");
    if (url) {
      await webviewSession.setProxy({
        proxyRules: url,
      });
    } else {
      await webviewSession.setProxy({});
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to set proxy:", error);
    return { success: false, error: "Failed to set proxy" };
  }
});

ipcMain.handle("proxy:test", async (_event, url: string) => {
  try {
    // 临时设置代理进行测试
    const originalProxy = getProxy();
    setProxy(url);

    // 测试代理连接
    const testUrl = "https://www.google.com";
    const https = require("https");
    const HttpsProxyAgent = require("https-proxy-agent").HttpsProxyAgent;

    const agent = new HttpsProxyAgent(url);
    const options = {
      agent,
      timeout: 5000,
    };

    return new Promise((resolve) => {
      const req = https.get(testUrl, options, (res: any) => {
        // 恢复原代理设置
        setProxy(originalProxy);
        resolve({
          success: true,
          message: "代理连接成功",
          statusCode: res.statusCode,
        });
      });

      req.on("error", (err: any) => {
        // 恢复原代理设置
        setProxy(originalProxy);
        resolve({
          success: false,
          error: err.message || "代理连接失败",
        });
      });

      req.on("timeout", () => {
        req.destroy();
        // 恢复原代理设置
        setProxy(originalProxy);
        resolve({
          success: false,
          error: "代理连接超时",
        });
      });
    });
  } catch (error) {
    console.error("Failed to test proxy:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to test proxy",
    };
  }
});

// ==================== 新闻源测试 IPC 处理器 ====================

ipcMain.handle("newsSources:test", async (_event, url: string) => {
  try {
    // 检查URL是否为RSS源（基于常见RSS文件扩展名或路径）
    const rssPattern = /\.(xml|rss|rdf|atom|feed|feed\.xml)$/i;
    const isRSS =
      rssPattern.test(url) ||
      url.includes("/rss") ||
      url.includes("/feed") ||
      url.includes("feed=") ||
      url.includes("rss=");

    let result;
    if (isRSS) {
      result = await testRSSFeed(url);
    } else {
      // 如果不是RSS格式，尝试作为网站进行测试
      result = await testWebsiteNews(url);
    }

    return result;
  } catch (error) {
    console.error("Failed to test news source:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to test news source",
    };
  }
});

// ==================== 管理网页收藏 IPC 处理器 ====================

ipcMain.handle("webPages:getAll", () => {
  try {
    return { success: true, webPages: webPagesApi.getAll() };
  } catch (error) {
    console.error("Failed to get web pages:", error);
    return { success: false, error: "Failed to get web pages" };
  }
});

ipcMain.handle("webPages:getById", (_event, id: number) => {
  try {
    const webPage = webPagesApi.getById(id);
    if (webPage) {
      return { success: true, webPage };
    } else {
      return { success: false, error: "Web page not found" };
    }
  } catch (error) {
    console.error("Failed to get web page:", error);
    return { success: false, error: "Failed to get web page" };
  }
});

ipcMain.handle("webPages:getByUrl", (_event, url: string) => {
  try {
    const webPage = webPagesApi.getByUrl(url);
    if (webPage) {
      return { success: true, webPage };
    } else {
      return { success: false, error: "Web page not found" };
    }
  } catch (error) {
    console.error("Failed to get web page by URL:", error);
    return { success: false, error: "Failed to get web page by URL" };
  }
});

ipcMain.handle("webPages:create", (_event, webPage: any) => {
  try {
    const id = webPagesApi.create(webPage);
    return { success: true, id };
  } catch (error) {
    console.error("Failed to create web page:", error);
    return { success: false, error: "Failed to create web page" };
  }
});

ipcMain.handle("webPages:update", (_event, id: number, webPage: any) => {
  try {
    const success = webPagesApi.update(id, webPage);
    if (success) {
      return { success: true };
    } else {
      return { success: false, error: "Failed to update web page" };
    }
  } catch (error) {
    console.error("Failed to update web page:", error);
    return { success: false, error: "Failed to update web page" };
  }
});

ipcMain.handle("webPages:delete", (_event, id: number) => {
  try {
    const success = webPagesApi.delete(id);
    if (success) {
      return { success: true };
    } else {
      return { success: false, error: "Failed to delete web page" };
    }
  } catch (error) {
    console.error("Failed to delete web page:", error);
    return { success: false, error: "Failed to delete web page" };
  }
});

ipcMain.handle("webPages:toggleFavorite", (_event, id: number) => {
  try {
    const success = webPagesApi.toggleFavorite(id);
    if (success) {
      return { success: true };
    } else {
      return { success: false, error: "Failed to toggle favorite" };
    }
  } catch (error) {
    console.error("Failed to toggle favorite:", error);
    return { success: false, error: "Failed to toggle favorite" };
  }
});

ipcMain.handle("webPages:getFavorites", () => {
  try {
    return { success: true, webPages: webPagesApi.getFavorites() };
  } catch (error) {
    console.error("Failed to get favorite web pages:", error);
    return { success: false, error: "Failed to get favorite web pages" };
  }
});

// ==================== 网页分类 IPC 处理器 ====================

ipcMain.handle("webPagesCategories:getAll", () => {
  try {
    return { success: true, categories: webPagesApi.getAllCategories() };
  } catch (error) {
    console.error("Failed to get web page categories:", error);
    return { success: false, error: "Failed to get web page categories" };
  }
});

ipcMain.handle("webPagesCategories:getById", (_event, id: number) => {
  try {
    const category = webPagesApi.getCategoryById(id);
    if (category) {
      return { success: true, category };
    } else {
      return { success: false, error: "Category not found" };
    }
  } catch (error) {
    console.error("Failed to get web page category:", error);
    return { success: false, error: "Failed to get web page category" };
  }
});

ipcMain.handle("webPagesCategories:create", (_event, category: any) => {
  try {
    const id = webPagesApi.createCategory(category);
    return { success: true, id };
  } catch (error) {
    console.error("Failed to create web page category:", error);
    return { success: false, error: "Failed to create web page category" };
  }
});

ipcMain.handle(
  "webPagesCategories:update",
  (_event, id: number, category: any) => {
    try {
      const success = webPagesApi.updateCategory(id, category);
      if (success) {
        return { success: true };
      } else {
        return { success: false, error: "Failed to update web page category" };
      }
    } catch (error) {
      console.error("Failed to update web page category:", error);
      return { success: false, error: "Failed to update web page category" };
    }
  },
);

ipcMain.handle("webPagesCategories:delete", (_event, id: number) => {
  try {
    const result = webPagesApi.deleteCategory(id);
    if (result.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: result.error || "Failed to delete web page category",
      };
    }
  } catch (error) {
    console.error("Failed to delete web page category:", error);
    return { success: false, error: "Failed to delete web page category" };
  }
});

ipcMain.handle(
  "webPagesCategories:getWebPageCount",
  (_event, categoryId: number) => {
    try {
      const count = webPagesApi.getCategoryWebPageCount(categoryId);
      return { success: true, count };
    } catch (error) {
      console.error("Failed to get web page count:", error);
      return { success: false, error: "Failed to get web page count" };
    }
  },
);

// ==================== 网页测试 IPC 处理器 ====================

// 测试网站可达性
ipcMain.handle("webPages:test", async (_event, url: string) => {
  try {
    // 获取代理配置
    const proxyUrl = getProxy();

    // 使用 Node.js 的 https 模块来测试
    const https = require("https");
    const urlObj = new URL(url);

    const options: any = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      timeout: 10000,
    };

    // 如果配置了代理，使用代理
    if (proxyUrl) {
      console.log("Testing web page with proxy:", proxyUrl);
      const HttpsProxyAgent = require("https-proxy-agent").HttpsProxyAgent;
      const agent = new HttpsProxyAgent(proxyUrl);
      options.agent = agent;
    }

    return new Promise((resolve) => {
      const req = https.request(options, (res: any) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
          // 收集响应数据
          let data = "";
          res.on("data", (chunk: any) => {
            data += chunk;
          });

          res.on("end", () => {
            // 提取网页标题
            const titleMatch = data.match(/<title>([^<]+)<\/title>/i);
            const title = titleMatch ? titleMatch[1] : "未知网站";
            resolve({
              success: true,
              pageInfo: { title },
            });
          });
        } else {
          resolve({
            success: false,
            error: `HTTP错误: ${res.statusCode}`,
          });
        }
      });

      req.on("error", (err: any) => {
        console.error("Failed to test web page:", err);
        let errorMsg = "测试失败";

        if (err.code === "ECONNREFUSED") {
          errorMsg = "连接被拒绝，目标可能不可用";
        } else if (err.code === "ETIMEDOUT" || err.code === "ESOCKETTIMEDOUT") {
          errorMsg = "连接超时，网站可能无法访问";
        } else if (err.code === "ENOTFOUND") {
          errorMsg = "域名解析失败";
        } else {
          errorMsg = `测试失败: ${err.message}`;
        }

        resolve({
          success: false,
          error: errorMsg,
        });
      });

      req.on("timeout", () => {
        req.destroy();
        resolve({
          success: false,
          error: "请求超时，网站可能无法访问",
        });
      });

      req.end();
    });
  } catch (error) {
    console.error("Failed to test web page:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "测试失败",
    };
  }
});

// ==================== BrowserView 相关 IPC 处理器 ====================

// BrowserView 实例存储
const browserViews = new Map<string, Electron.BrowserView>();

// 创建 BrowserView
ipcMain.handle(
  "browserView:create",
  async (_event, id: string, options?: any) => {
    try {
      if (browserViews.has(id)) {
        const view = browserViews.get(id);
        if (view) {
          // BrowserView can't be destroyed directly, just remove from map
          // The garbage collector will clean it up
        }
      }

      const browserView = new BrowserView({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: true,
          sandbox: true, // 启用沙盒以提高安全性
          ...options?.webPreferences,
        },
      });

      browserViews.set(id, browserView);

      return { success: true, id };
    } catch (error) {
      console.error("Failed to create BrowserView:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create BrowserView",
      };
    }
  },
);

// 加载 URL 到 BrowserView
ipcMain.handle(
  "browserView:loadURL",
  async (_event, id: string, url: string) => {
    try {
      const browserView = browserViews.get(id);
      if (!browserView) {
        return { success: false, error: "BrowserView not found" };
      }

      await browserView.webContents.loadURL(url);
      return { success: true };
    } catch (error) {
      console.error("Failed to load URL in BrowserView:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to load URL",
      };
    }
  },
);

// BrowserView 后退
ipcMain.handle("browserView:goBack", async (_event, id: string) => {
  try {
    const browserView = browserViews.get(id);
    if (!browserView) {
      return { success: false, error: "BrowserView not found" };
    }

    if (browserView.webContents.canGoBack()) {
      browserView.webContents.goBack();
      return { success: true };
    }

    return { success: false, error: "Cannot go back" };
  } catch (error) {
    console.error("Failed to go back in BrowserView:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to go back",
    };
  }
});

// BrowserView 前进
ipcMain.handle("browserView:goForward", async (_event, id: string) => {
  try {
    const browserView = browserViews.get(id);
    if (!browserView) {
      return { success: false, error: "BrowserView not found" };
    }

    if (browserView.webContents.canGoForward()) {
      browserView.webContents.goForward();
      return { success: true };
    }

    return { success: false, error: "Cannot go forward" };
  } catch (error) {
    console.error("Failed to go forward in BrowserView:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to go forward",
    };
  }
});

// BrowserView 刷新
ipcMain.handle("browserView:reload", async (_event, id: string) => {
  try {
    const browserView = browserViews.get(id);
    if (!browserView) {
      return { success: false, error: "BrowserView not found" };
    }

    browserView.webContents.reload();
    return { success: true };
  } catch (error) {
    console.error("Failed to reload BrowserView:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reload",
    };
  }
});

// BrowserView 停止加载
ipcMain.handle("browserView:stop", async (_event, id: string) => {
  try {
    const browserView = browserViews.get(id);
    if (!browserView) {
      return { success: false, error: "BrowserView not found" };
    }

    browserView.webContents.stop();
    return { success: true };
  } catch (error) {
    console.error("Failed to stop BrowserView:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to stop",
    };
  }
});

// 获取 BrowserView 的当前 URL
ipcMain.handle("browserView:getURL", async (_event, id: string) => {
  try {
    const browserView = browserViews.get(id);
    if (!browserView) {
      return { success: false, error: "BrowserView not found" };
    }

    const url = browserView.webContents.getURL();
    return { success: true, url };
  } catch (error) {
    console.error("Failed to get URL from BrowserView:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get URL",
    };
  }
});

// ==================== 统计相关 IPC 处理程序 ====================

// 开始功能使用（带窗口可见性检查）
ipcMain.handle("stats:startFeatureUsage", (_event, featureId: string) => {
  try {
    // 只在窗口可见且获焦时才开始统计
    if (mainWindow && mainWindow.isVisible() && isWindowFocused) {
      startFeatureUsage(featureId);
      return { success: true };
    } else {
      console.log(
        "Window not focused, skipping feature usage start:",
        featureId,
      );
      return { success: false, error: "Window not focused" };
    }
  } catch (error) {
    console.error("Failed to start feature usage:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to start feature usage",
    };
  }
});

// 结束功能使用
ipcMain.handle("stats:endFeatureUsage", (_event, featureId: string) => {
  try {
    endFeatureUsage(featureId);
    return { success: true };
  } catch (error) {
    console.error("Failed to end feature usage:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to end feature usage",
    };
  }
});

// 获取应用使用统计
ipcMain.handle("stats:getAppUsage", (_event, dimension: string = "all") => {
  try {
    const stats = usageStatsApi.getAppUsage(dimension);
    return { success: true, stats };
  } catch (error) {
    console.error("Failed to get app usage stats:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get app usage stats",
    };
  }
});

// 检查窗口是否获焦
ipcMain.handle("window:isFocused", () => {
  return { success: true, isFocused: isWindowFocused };
});

// 获取功能使用统计
ipcMain.handle(
  "stats:getFeatureUsage",
  (_event, featureId?: string, dimension: string = "all") => {
    try {
      const stats = usageStatsApi.getFeatureUsage(featureId, dimension);
      return { success: true, stats };
    } catch (error) {
      console.error("Failed to get feature usage stats:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get feature usage stats",
      };
    }
  },
);

// 获取历史趋势数据
ipcMain.handle(
  "stats:getHistoryTrend",
  (_event, dimension: string = "day", days: number = 30) => {
    try {
      const data = usageStatsApi.getHistoryTrend(dimension, days);
      return { success: true, data };
    } catch (error) {
      console.error("Failed to get history trend:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get history trend",
      };
    }
  },
);

// ==================== 自动更新 IPC 处理器 ====================

// 手动检查更新
ipcMain.handle("updater:checkForUpdates", async () => {
  try {
    if (!app.isPackaged) {
      return {
        success: false,
        error: "开发模式不支持自动更新检查",
      };
    }
    await autoUpdater.checkForUpdates();
    return { success: true };
  } catch (error) {
    console.error("Failed to check for updates:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to check for updates",
    };
  }
});

// 下载更新
ipcMain.handle("updater:downloadUpdate", async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    console.error("Failed to download update:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to download update",
    };
  }
});

// 安装更新并重启
ipcMain.handle("updater:quitAndInstall", async () => {
  try {
    autoUpdater.quitAndInstall();
    return { success: true };
  } catch (error) {
    console.error("Failed to quit and install:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to quit and install",
    };
  }
});

// 获取 BrowserView 的标题
ipcMain.handle("browserView:getTitle", async (_event, id: string) => {
  try {
    const browserView = browserViews.get(id);
    if (!browserView) {
      return { success: false, error: "BrowserView not found" };
    }

    const title = browserView.webContents.getTitle();
    return { success: true, title };
  } catch (error) {
    console.error("Failed to get title from BrowserView:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get title",
    };
  }
});

// 判断 BrowserView 是否可以后退
ipcMain.handle("browserView:canGoBack", async (_event, id: string) => {
  try {
    const browserView = browserViews.get(id);
    if (!browserView) {
      return { success: false, error: "BrowserView not found" };
    }

    const canGoBack = browserView.webContents.canGoBack();
    return { success: true, canGoBack };
  } catch (error) {
    console.error("Failed to check if can go back in BrowserView:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to check if can go back",
    };
  }
});

// 判断 BrowserView 是否可以前进
ipcMain.handle("browserView:canGoForward", async (_event, id: string) => {
  try {
    const browserView = browserViews.get(id);
    if (!browserView) {
      return { success: false, error: "BrowserView not found" };
    }

    const canGoForward = browserView.webContents.canGoForward();
    return { success: true, canGoForward };
  } catch (error) {
    console.error("Failed to check if can go forward in BrowserView:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to check if can go forward",
    };
  }
});

// 设置 BrowserView 的大小和位置
ipcMain.handle(
  "browserView:setBounds",
  async (_event, id: string, bounds: Electron.Rectangle) => {
    try {
      const browserView = browserViews.get(id);
      if (!browserView) {
        return { success: false, error: "BrowserView not found" };
      }

      browserView.setBounds(bounds);
      return { success: true };
    } catch (error) {
      console.error("Failed to set bounds for BrowserView:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to set bounds",
      };
    }
  },
);

// 销毁 BrowserView
ipcMain.handle("browserView:destroy", async (_event, id: string) => {
  try {
    const browserView = browserViews.get(id);
    if (!browserView) {
      return { success: false, error: "BrowserView not found" };
    }

    // BrowserView can't be directly destroyed, just remove from map
    browserViews.delete(id);
    return { success: true };
  } catch (error) {
    console.error("Failed to destroy BrowserView:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to destroy",
    };
  }
});

// BrowserView 执行 JavaScript
ipcMain.handle(
  "browserView:executeJavaScript",
  async (_event, id: string, code: string) => {
    try {
      const browserView = browserViews.get(id);
      if (!browserView) {
        return { success: false, error: "BrowserView not found" };
      }

      const result = await browserView.webContents.executeJavaScript(code);
      return { success: true, result };
    } catch (error) {
      console.error("Failed to execute JavaScript in BrowserView:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to execute JavaScript",
      };
    }
  },
);
