import {dialog, ipcMain, session} from "electron";
import Store from "electron-store";
import Parser from "rss-parser";
import {
    closeWindow,
    getMainWindow,
    isFullscreen,
    maximizeWindow,
    minimizeWindow,
    toggleFullscreen,
    toggleWindow
} from "./windowManager";
import {getShortcuts, updateShortcuts} from "./shortcutManager";
import {checkForUpdates, getAutoUpdateEnabled, setAutoUpdateEnabled} from "./autoUpdater";
import {notesApi} from "../api/notesApi";
import {todosApi} from "../api/todosApi";
import {webPagesApi} from "../api/webPagesApi";
import {recordingsApi} from "../api/recordingsApi";
import {getCurrentDatabasePath, getProxy, getProxyConfig, migrateDatabaseToNewPath, setProxy} from "../database";

const store = new Store({
    name: "moyu-data",
});

const parser = new Parser();

// 获取 RSS feeds
const getRSSFeeds = () => {
    return store.get("rssFeeds") as Record<string, any>;
};

// 保存 RSS feeds
const saveRSSFeeds = (feeds: Record<string, any>) => {
    store.set("rssFeeds", feeds);
};

/**
 * 注册所有 IPC 处理程序
 */
export function registerIPCHandlers() {
    // ==================== RSS 相关 ====================

    ipcMain.handle("rss:addFeed", async (_event, url: string) => {
        try {
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

            return {success: true, feed: feedData};
        } catch (error) {
            console.error("Failed to parse RSS feed:", error);
            return {success: false, error: "Failed to parse RSS feed"};
        }
    });

    ipcMain.handle("rss:removeFeed", async (_event, url: string) => {
        try {
            const trimmedUrl = url.trim();
            const feeds = getRSSFeeds();
            delete feeds[trimmedUrl];
            saveRSSFeeds(feeds);
            return {success: true};
        } catch (error) {
            console.error("Failed to remove RSS feed:", error);
            return {success: false, error: "Failed to remove RSS feed"};
        }
    });

    ipcMain.handle("rss:refreshFeed", async (_event, url: string) => {
        try {
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

            return {success: true, feed: feedData};
        } catch (error) {
            console.error("Failed to refresh RSS feed:", error);
            return {success: false, error: "Failed to refresh RSS feed"};
        }
    });

    ipcMain.handle("rss:getFeeds", async () => {
        try {
            const feeds = Object.values(getRSSFeeds()).map((feed) => ({
                ...feed,
                url: feed.url.trim(),
            }));
            return {success: true, feeds};
        } catch (error) {
            console.error("Failed to get RSS feeds:", error);
            return {success: false, error: "Failed to get RSS feeds"};
        }
    });

    ipcMain.handle("rss:getFeed", async (_event, url: string) => {
        try {
            const trimmedUrl = url.trim();
            const feeds = getRSSFeeds();
            const feed = feeds[trimmedUrl];
            if (feed) {
                return {success: true, feed: {...feed, url: trimmedUrl}};
            } else {
                return {success: false, error: "Feed not found"};
            }
        } catch (error) {
            console.error("Failed to get RSS feed:", error);
            return {success: false, error: "Failed to get RSS feed"};
        }
    });

    // ==================== 快捷键管理 ====================

    ipcMain.handle("shortcuts:get", async () => {
        return getShortcuts();
    });

    ipcMain.handle("shortcuts:set", async (_event, shortcuts) => {
        return await updateShortcuts(shortcuts);
    });

    // ==================== 窗口控制 IPC ====================

    ipcMain.on("toggle-window", () => {
        toggleWindow();
    });

    ipcMain.on("minimize-window", () => {
        minimizeWindow();
    });

    ipcMain.on("maximize-window", () => {
        maximizeWindow();
    });

    ipcMain.on("close-window", () => {
        closeWindow();
    });

    ipcMain.on("fullscreen-window", () => {
        toggleFullscreen();
    });

    ipcMain.handle("is-fullscreen", async () => {
        try {
            return {success: true, isFullscreen: isFullscreen()};
        } catch (error) {
            console.error("Failed to check fullscreen status:", error);
            return {success: false, error: "Failed to check fullscreen status"};
        }
    });

    // ==================== 数据存储 IPC ====================

    ipcMain.handle("store:get", async (_event, key: string) => {
        try {
            const value = store.get(key);
            return {success: true, value};
        } catch (error) {
            console.error("Failed to get store value:", error);
            return {success: false, error: "Failed to get store value"};
        }
    });

    ipcMain.handle("store:set", async (_event, key: string, value: any) => {
        try {
            store.set(key, value);
            return {success: true};
        } catch (error) {
            console.error("Failed to set store value:", error);
            return {success: false, error: "Failed to set store value"};
        }
    });

    ipcMain.handle("store:getDataPath", async () => {
        try {
            return {success: true, path: store.path};
        } catch (error) {
            console.error("Failed to get data path:", error);
            return {success: false, error: "Failed to get data path"};
        }
    });

    ipcMain.handle("store:setDataPath", async (_event, newPath: string) => {
        try {
            const currentData = store.store;
            const newStore = new Store({
                name: "moyu-data",
                cwd: newPath,
            });

            Object.keys(currentData).forEach((key) => {
                newStore.set(key, currentData[key]);
            });

            return {
                success: true,
                message: "数据已迁移，请重启应用以使用新的存储路径",
                requiresRestart: true,
            };
        } catch (error) {
            console.error("Failed to set data path:", error);
            return {success: false, error: "Failed to set data path"};
        }
    });

    // ==================== 对话框 IPC ====================

    ipcMain.handle("dialog:selectDirectory", async () => {
        try {
            const mainWindow = getMainWindow();
            const result = await dialog.showOpenDialog(mainWindow!, {
                properties: ["openDirectory", "createDirectory"],
            });

            if (!result.canceled && result.filePaths.length > 0) {
                return {success: true, path: result.filePaths[0]};
            }

            return {success: false, canceled: true};
        } catch (error) {
            console.error("Failed to select directory:", error);
            return {success: false, error: "Failed to select directory"};
        }
    });

    ipcMain.handle("dialog:selectDatabaseFile", async () => {
        try {
            const mainWindow = getMainWindow();
            const result = await dialog.showOpenDialog(mainWindow!, {
                properties: ["openFile"],
                filters: [
                    {name: "SQLite Database", extensions: ["db", "sqlite", "sqlite3"]},
                    {name: "All Files", extensions: ["*"]},
                ],
            });

            if (!result.canceled && result.filePaths.length > 0) {
                return {success: true, path: result.filePaths[0]};
            }

            return {success: false, canceled: true};
        } catch (error) {
            console.error("Failed to select database file:", error);
            return {success: false, error: "Failed to select database file"};
        }
    });

    // ==================== Notes API ====================

    ipcMain.handle("notes:getAll", async () => {
        try {
            const notes = notesApi.getAll();
            return {success: true, notes};
        } catch (error) {
            console.error("Failed to get notes:", error);
            return {success: false, error: "Failed to get notes"};
        }
    });

    ipcMain.handle("notes:create", async (_event, note) => {
        try {
            const id = notesApi.create(note);
            return {success: true, id};
        } catch (error) {
            console.error("Failed to create note:", error);
            return {success: false, error: "Failed to create note"};
        }
    });

    ipcMain.handle("notes:update", async (_event, id, note) => {
        try {
            const result = notesApi.update(id, note);
            return {success: result};
        } catch (error) {
            console.error("Failed to update note:", error);
            return {success: false, error: "Failed to update note"};
        }
    });

    ipcMain.handle("notes:delete", async (_event, id) => {
        try {
            const result = notesApi.delete(id);
            return {success: result};
        } catch (error) {
            console.error("Failed to delete note:", error);
            return {success: false, error: "Failed to delete note"};
        }
    });

    // ==================== Todos API ====================

    ipcMain.handle("todos:getAll", async () => {
        try {
            const todos = todosApi.getAll();
            return {success: true, todos};
        } catch (error) {
            console.error("Failed to get todos:", error);
            return {success: false, error: "Failed to get todos"};
        }
    });

    ipcMain.handle("todos:create", async (_event, todo) => {
        try {
            const id = todosApi.create(todo);
            return {success: true, id};
        } catch (error) {
            console.error("Failed to create todo:", error);
            return {success: false, error: "Failed to create todo"};
        }
    });

    ipcMain.handle("todos:toggle", async (_event, id) => {
        try {
            const result = todosApi.toggle(id);
            return {success: result};
        } catch (error) {
            console.error("Failed to toggle todo:", error);
            return {success: false, error: "Failed to toggle todo"};
        }
    });

    ipcMain.handle("todos:updateOrder", async (_event, orderedIds) => {
        try {
            const result = todosApi.updateOrder(orderedIds);
            return {success: result};
        } catch (error) {
            console.error("Failed to update todo order:", error);
            return {success: false, error: "Failed to update todo order"};
        }
    });

    ipcMain.handle("todos:getCompletionStats", async () => {
        try {
            const stats = todosApi.getCompletionStats();
            return {success: true, stats};
        } catch (error) {
            console.error("Failed to get completion stats:", error);
            return {success: false, error: "Failed to get completion stats"};
        }
    });

    // ==================== WebPages API ====================

    ipcMain.handle("webPages:getAll", async () => {
        try {
            const webPages = webPagesApi.getAll();
            return {success: true, webPages};
        } catch (error) {
            console.error("Failed to get web pages:", error);
            return {success: false, error: "Failed to get web pages"};
        }
    });

    ipcMain.handle("webPages:create", async (_event, webPage) => {
        try {
            const id = webPagesApi.create(webPage);
            return {success: true, id};
        } catch (error) {
            console.error("Failed to create web page:", error);
            return {success: false, error: "Failed to create web page"};
        }
    });

    ipcMain.handle("webPages:update", async (_event, id, webPage) => {
        try {
            const result = webPagesApi.update(id, webPage);
            return {success: result};
        } catch (error) {
            console.error("Failed to update web page:", error);
            return {success: false, error: "Failed to update web page"};
        }
    });

    ipcMain.handle("webPages:delete", async (_event, id) => {
        try {
            const result = webPagesApi.delete(id);
            return {success: result};
        } catch (error) {
            console.error("Failed to delete web page:", error);
            return {success: false, error: "Failed to delete web page"};
        }
    });

    // ==================== Recordings API ====================

    ipcMain.handle("recordings:getAll", async () => {
        try {
            const recordings = recordingsApi.getAll();
            return {success: true, recordings};
        } catch (error) {
            console.error("Failed to get recordings:", error);
            return {success: false, error: "Failed to get recordings"};
        }
    });

    ipcMain.handle("recordings:create", async (_event, recording) => {
        try {
            const id = recordingsApi.create(recording);
            return {success: true, id};
        } catch (error) {
            console.error("Failed to create recording:", error);
            return {success: false, error: "Failed to create recording"};
        }
    });

    ipcMain.handle("recordings:delete", async (_event, id) => {
        try {
            const result = recordingsApi.delete(id);
            return {success: result};
        } catch (error) {
            console.error("Failed to delete recording:", error);
            return {success: false, error: "Failed to delete recording"};
        }
    });

    // ==================== Usage Stats API ====================

    ipcMain.handle("stats:startSession", async (_event, sessionId) => {
        try {
            const result = require("../api/usageStatsApi").usageStatsApi.startSession(sessionId);
            return {success: result};
        } catch (error) {
            console.error("Failed to start session:", error);
            return {success: false, error: "Failed to start session"};
        }
    });

    ipcMain.handle("stats:endSession", async (_event, sessionId) => {
        try {
            const result = require("../api/usageStatsApi").usageStatsApi.endSession(sessionId);
            return {success: result};
        } catch (error) {
            console.error("Failed to end session:", error);
            return {success: false, error: "Failed to end session"};
        }
    });

    ipcMain.handle("stats:startFeatureUsage", async (_event, sessionId, featureId) => {
        try {
            const result = require("../api/usageStatsApi").usageStatsApi.startFeatureUsage(sessionId, featureId);
            return {success: result};
        } catch (error) {
            console.error("Failed to start feature usage:", error);
            return {success: false, error: "Failed to start feature usage"};
        }
    });

    ipcMain.handle("stats:endFeatureUsage", async (_event, featureId) => {
        try {
            const result = require("../api/usageStatsApi").usageStatsApi.endFeatureUsage(featureId);
            return {success: result};
        } catch (error) {
            console.error("Failed to end feature usage:", error);
            return {success: false, error: "Failed to end feature usage"};
        }
    });

    ipcMain.handle("stats:getAppUsage", async (_event, dimension) => {
        try {
            const stats = require("../api/usageStatsApi").usageStatsApi.getAppUsage(dimension);
            return {success: true, stats};
        } catch (error) {
            console.error("Failed to get app usage:", error);
            return {success: false, error: "Failed to get app usage"};
        }
    });

    ipcMain.handle("stats:getFeatureUsage", async (_event, featureId) => {
        try {
            const stats = require("../api/usageStatsApi").usageStatsApi.getFeatureUsage(featureId);
            return {success: true, stats};
        } catch (error) {
            console.error("Failed to get feature usage:", error);
            return {success: false, error: "Failed to get feature usage"};
        }
    });

    // ==================== 数据库和代理配置 ====================

    ipcMain.handle("database:getPath", async () => {
        try {
            const path = getCurrentDatabasePath();
            return {success: true, path};
        } catch (error) {
            console.error("Failed to get database path:", error);
            return {success: false, error: "Failed to get database path"};
        }
    });

    ipcMain.handle("database:setPath", async (_event, newPath) => {
        try {
            const result = migrateDatabaseToNewPath(newPath);
            return result;
        } catch (error) {
            console.error("Failed to set database path:", error);
            return {success: false, error: "Failed to set database path"};
        }
    });

    ipcMain.handle("proxy:get", async () => {
        try {
            const proxy = getProxy();
            return {success: true, proxy};
        } catch (error) {
            console.error("Failed to get proxy:", error);
            return {success: false, error: "Failed to get proxy"};
        }
    });

    ipcMain.handle("proxy:set", async (_event, proxy) => {
        try {
            setProxy(proxy);
            return {success: true};
        } catch (error) {
            console.error("Failed to set proxy:", error);
            return {success: false, error: "Failed to set proxy"};
        }
    });

    ipcMain.handle("proxy:getConfig", async () => {
        try {
            const config = getProxyConfig();
            return {success: true, config};
        } catch (error) {
            console.error("Failed to get proxy config:", error);
            return {success: false, error: "Failed to get proxy config"};
        }
    });

    // ==================== 自动更新 ====================

    ipcMain.handle("updater:getEnabled", async () => {
        try {
            return {success: true, enabled: getAutoUpdateEnabled()};
        } catch (error) {
            console.error("Failed to get updater enabled status:", error);
            return {success: false, error: "Failed to get updater enabled status"};
        }
    });

    ipcMain.handle("updater:setEnabled", async (_event, enabled) => {
        try {
            setAutoUpdateEnabled(enabled);
            return {success: true};
        } catch (error) {
            console.error("Failed to set updater enabled:", error);
            return {success: false, error: "Failed to set updater enabled"};
        }
    });

    ipcMain.handle("updater:checkForUpdates", async () => {
        try {
            await checkForUpdates();
            return {success: true};
        } catch (error) {
            console.error("Failed to check for updates:", error);
            return {success: false, error: "Failed to check for updates"};
        }
    });

    // ==================== 初始化 webview 代理 ====================

    const webviewSession = session.fromPartition("persist:webview");

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

    setupWebviewProxy();

    console.log("IPC handlers registered");
}