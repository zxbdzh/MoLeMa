import {app, BrowserView, dialog, ipcMain} from "electron";
import {createRequire} from 'node:module';
// 导入模块
import {closeDatabase, getDatabase, seedDefaultData,} from "./database";
import {createUsageStatsTables, runMigration} from "./migration";
import {usageStatsApi} from "./api/usageStatsApi";
import {testRSSFeed} from "./services/rssFetcher";
import {testWebsiteNews} from "./services/websiteNewsFetcher";
import {newsApi} from "./api/newsApi";

// 导入管理模块
import {
    createWindow,
    getMainWindow,
    setWindowStateCallback,
    setWindowVisible
} from "./modules/windowManager";
import {registerGlobalShortcuts, unregisterAllShortcuts} from "./modules/shortcutManager";
import {createTray} from "./modules/trayManager";
import {checkForUpdates, getAutoUpdateEnabled, setupAutoUpdater} from "./modules/autoUpdater";
import {registerIPCHandlers} from "./modules/ipcHandlers";

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

// ==================== 统计相关 ====================

let currentSessionId: string | null = null;
let currentFeatureId: string | null = null;

function generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function startNewSession(): void {
    if (currentSessionId) return;
    currentSessionId = generateSessionId();
    usageStatsApi.startSession(currentSessionId);
    console.log("Session started:", currentSessionId);
}

function endCurrentSession(): void {
    if (currentSessionId) {
        if (currentFeatureId) {
            usageStatsApi.endFeatureUsage(currentFeatureId);
            currentFeatureId = null;
        }
        usageStatsApi.endSession(currentSessionId);
        console.log("Session ended:", currentSessionId);
        currentSessionId = null;
    }
}
function pauseFeatureUsage(): void {
    if (currentFeatureId) {
        usageStatsApi.endFeatureUsage(currentFeatureId);
    }
}

// 设置窗口状态变化回调
setWindowStateCallback((focused) => {
    if (!focused) pauseFeatureUsage();
});

// 重写 toggleWindow 以集成会话管理
export function toggleWindowWithSession() {
    if (getMainWindow() && getMainWindow().isVisible()) {
        endCurrentSession();
        getMainWindow().hide();
        setWindowVisible(false);
    } else {
        startNewSession();
        getMainWindow()?.show();
        setWindowVisible(true);
    }
}

export function getCurrentSessionId(): string | null {
    return currentSessionId;
}


// ==================== 应用启动 ====================

app.whenReady().then(async () => {
    process.versions.app = packageJson.version;

    try {
        console.log('=== Initializing Application ===');
        const db = getDatabase();
        seedDefaultData(db);
        runMigration();
        createUsageStatsTables();
        console.log('=== Initialization Complete ===');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        dialog.showErrorBox('初始化失败', `应用初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }

    // 创建窗口、托盘、注册快捷键、IPC处理程序
    createWindow();
    createTray();
    registerGlobalShortcuts();
    registerIPCHandlers();
    startNewSession();

    // 设置自动更新
    setupAutoUpdater();
    if (getAutoUpdateEnabled()) {
        try {
            checkForUpdates();
        } catch (error) {
            console.error("检查更新时出错:", error);
        }
    }

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("will-quit", () => {
    endCurrentSession();
    unregisterAllShortcuts();
    closeDatabase();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// ==================== 额外的 IPC 处理器 ====================

const browserViews = new Map<string, Electron.BrowserView>();

// BrowserView 相关
ipcMain.handle("browserView:create", async (_event, id: string, options?: any) => {
    try {
        if (browserViews.has(id)) browserViews.delete(id);
        const browserView = new BrowserView({
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                webSecurity: true,
                sandbox: true, ...options?.webPreferences
            },
        });
        browserViews.set(id, browserView);
        return {success: true, id};
    } catch (error) {
        return {success: false, error: error instanceof Error ? error.message : "Failed to create BrowserView"};
    }
});

ipcMain.handle("browserView:loadURL", async (_event, id: string, url: string) => {
    try {
        const browserView = browserViews.get(id);
        if (!browserView) return {success: false, error: "BrowserView not found"};
        await browserView.webContents.loadURL(url);
        return {success: true};
    } catch (error) {
        return {success: false, error: error instanceof Error ? error.message : "Failed to load URL"};
    }
});

const browserViewNavHandler = async (id: string, method: 'goBack' | 'goForward' | 'reload' | 'stop') => {
    try {
        const browserView = browserViews.get(id);
        if (!browserView) return {success: false, error: "BrowserView not found"};
        if (method === 'goBack' && browserView.webContents.canGoBack()) browserView.webContents.goBack();
        else if (method === 'goForward' && browserView.webContents.canGoForward()) browserView.webContents.goForward();
        else if (method === 'reload') browserView.webContents.reload();
        else if (method === 'stop') browserView.webContents.stop();
        else return {success: false, error: `Cannot ${method}`};
        return {success: true};
    } catch (error) {
        return {success: false, error: error instanceof Error ? error.message : `Failed to ${method}`};
    }
};

ipcMain.handle("browserView:goBack", (_, id) => browserViewNavHandler(id, 'goBack'));
ipcMain.handle("browserView:goForward", (_, id) => browserViewNavHandler(id, 'goForward'));
ipcMain.handle("browserView:reload", (_, id) => browserViewNavHandler(id, 'reload'));
ipcMain.handle("browserView:stop", (_, id) => browserViewNavHandler(id, 'stop'));

ipcMain.handle("browserView:getURL", async (_event, id: string) => {
    try {
        const browserView = browserViews.get(id);
        if (!browserView) return {success: false, error: "BrowserView not found"};
        return {success: true, url: browserView.webContents.getURL()};
    } catch (error) {
        return {success: false, error: error instanceof Error ? error.message : "Failed to get URL"};
    }
});

ipcMain.handle("browserView:getTitle", async (_event, id: string) => {
    try {
        const browserView = browserViews.get(id);
        if (!browserView) return {success: false, error: "BrowserView not found"};
        return {success: true, title: browserView.webContents.getTitle()};
    } catch (error) {
        return {success: false, error: error instanceof Error ? error.message : "Failed to get title"};
    }
});

ipcMain.handle("browserView:canGoBack", async (_event, id: string) => {
    try {
        const browserView = browserViews.get(id);
        if (!browserView) return {success: false, error: "BrowserView not found"};
        return {success: true, canGoBack: browserView.webContents.canGoBack()};
    } catch (error) {
        return {success: false, error: error instanceof Error ? error.message : "Failed to check"};
    }
});

ipcMain.handle("browserView:canGoForward", async (_event, id: string) => {
    try {
        const browserView = browserViews.get(id);
        if (!browserView) return {success: false, error: "BrowserView not found"};
        return {success: true, canGoForward: browserView.webContents.canGoForward()};
    } catch (error) {
        return {success: false, error: error instanceof Error ? error.message : "Failed to check"};
    }
});

ipcMain.handle("browserView:setBounds", async (_event, id: string, bounds: Electron.Rectangle) => {
    try {
        const browserView = browserViews.get(id);
        if (!browserView) return {success: false, error: "BrowserView not found"};
        browserView.setBounds(bounds);
        return {success: true};
    } catch (error) {
        return {success: false, error: error instanceof Error ? error.message : "Failed to set bounds"};
    }
});

ipcMain.handle("browserView:destroy", async (_event, id: string) => {
    try {
        if (browserViews.has(id)) {
            browserViews.delete(id);
            return {success: true};
        }
        return {success: false, error: "BrowserView not found"};
    } catch (error) {
        return {success: false, error: error instanceof Error ? error.message : "Failed to destroy"};
    }
});

ipcMain.handle("browserView:executeJavaScript", async (_event, id: string, code: string) => {
    try {
        const browserView = browserViews.get(id);
        if (!browserView) return {success: false, error: "BrowserView not found"};
        const result = await browserView.webContents.executeJavaScript(code);
        return {success: true, result};
    } catch (error) {
        return {success: false, error: error instanceof Error ? error.message : "Failed to execute"};
    }
});

// 新闻相关
ipcMain.handle("news:getDomesticNews", async (_event, category?: string) => {
    try {
        let categoryId: number | undefined;
        if (category && category !== "all") {
            const categories = newsApi.getAllCategories();
            let categoryName: string | undefined;
            switch (category) {
                case "tech":
                    categoryName = "科技";
                    break;
                case "news":
                    categoryName = "资讯";
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
            if (categoryName) {
                for (const cat of categories) {
                    if (cat.name.includes(categoryName) || categoryName.includes(cat.name)) {
                        categoryId = cat.id;
                        break;
                    }
                }
            }
        }
        const newsItems = newsApi.getNewsItems(50, 0, categoryId);
        const allNews = newsItems.map((item: any) => {
            const sourceName = item.source_name || `Source ${item.source_id}`;
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
                publishedAt: item.pub_date ? new Date(item.pub_date).toISOString() : new Date().toISOString(),
                source: sourceName,
                category: categoryLabel,
                image: item.image_url,
            };
        });
        allNews.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        return {success: true, news: allNews.slice(0, 50)};
    } catch (error) {
        console.error("Failed to get domestic news:", error);
        return {success: false, error: "Failed to get domestic news"};
    }
});

// 新闻源测试
ipcMain.handle("newsSources:test", async (_event, url: string) => {
    try {
        const rssPattern = /\.(xml|rss|rdf|atom|feed|feed\.xml)$/i;
        const isRSS = rssPattern.test(url) || url.includes("/rss") || url.includes("/feed");
        let result;
        if (isRSS) {
            result = await testRSSFeed(url);
        } else {
            result = await testWebsiteNews(url);
        }
        return result;
    } catch (error) {
        console.error("Failed to test news source:", error);
        return {success: false, error: error instanceof Error ? error.message : "Failed to test news source"};
    }
});

// 开机自启
ipcMain.handle("autoLaunch:getEnabled", async () => {
    try {
        const settings = app.getLoginItemSettings();
        return {success: true, enabled: settings.openAtLogin};
    } catch (error) {
        console.error("Failed to get auto launch status:", error);
        return {success: false, error: error instanceof Error ? error.message : "Failed to get auto launch status"};
    }
});

ipcMain.handle("autoLaunch:setEnabled", async (_event, enabled: boolean) => {
    try {
        if (!app.isPackaged) {
            console.warn("开发模式不支持设置开机自启");
            return {success: false, error: "开发模式不支持设置开机自启"};
        }
        app.setLoginItemSettings({
            openAtLogin: enabled,
            openAsHidden: process.platform === 'darwin' && enabled,
        });
        console.log(`开机自启已${enabled ? '启用' : '禁用'}`);
        return {success: true, enabled};
    } catch (error) {
        console.error("Failed to set auto launch status:", error);
        return {success: false, error: error instanceof Error ? error.message : "Failed to set auto launch status"};
    }
});

// Shell 操作
ipcMain.handle("shell:openPath", async (_event, path: string) => {
    try {
        const {shell} = require('electron');
        await shell.openPath(path);
        return {success: true};
    } catch (error) {
        console.error("Failed to open path:", error);
        return {success: false, error: error instanceof Error ? error.message : "Failed to open path"};
    }
});

ipcMain.handle("shell:showItemInFolder", async (_event, path: string) => {
    try {
        const {shell} = require('electron');
        shell.showItemInFolder(path);
        return {success: true};
    } catch (error) {
        console.error("Failed to show item in folder:", error);
        return {success: false, error: error instanceof Error ? error.message : "Failed to show item in folder"};
    }
});