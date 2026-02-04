import {app, dialog, ipcMain, session, shell} from "electron";
import Store from "electron-store";
import Parser from "rss-parser";
import {
    closeWindow,
    getMainWindow,
    getWindowFocused,
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
import {usageStatsApi} from "../api/usageStatsApi";
import {getCurrentDatabasePath, getProxy, getProxyConfig, migrateDatabaseToNewPath, setProxy} from "../database";
import {getCurrentSessionId} from "../main";
import { initializeWebDAV, testConnection, syncAll, getConfig, getSyncLogs, WebDAVConfig } from "../services/webdavSyncService";

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

    ipcMain.handle("webPagesCategories:getAll", async () => {
        try {
            const categories = webPagesApi.getAllCategories();
            return {success: true, categories};
        } catch (error) {
            console.error("Failed to get web page categories:", error);
            return {success: false, error: "Failed to get web page categories"};
        }
    });

    ipcMain.handle("webPagesCategories:getById", async (_event, id) => {
        try {
            const category = webPagesApi.getCategoryById(id);
            return {success: true, category};
        } catch (error) {
            console.error("Failed to get web page category by id:", error);
            return {success: false, error: "Failed to get web page category by id"};
        }
    });

    ipcMain.handle("webPagesCategories:create", async (_event, category) => {
        try {
            const id = webPagesApi.createCategory(category);
            return {success: true, id};
        } catch (error) {
            console.error("Failed to create web page category:", error);
            return {success: false, error: "Failed to create web page category"};
        }
    });

    ipcMain.handle("webPagesCategories:update", async (_event, id, category) => {
        try {
            const result = webPagesApi.updateCategory(id, category);
            return {success: result};
        } catch (error) {
            console.error("Failed to update web page category:", error);
            return {success: false, error: "Failed to update web page category"};
        }
    });

    ipcMain.handle("webPagesCategories:delete", async (_event, id) => {
        try {
            const result = webPagesApi.deleteCategory(id);
            return {success: result};
        } catch (error) {
            console.error("Failed to delete web page category:", error);
            return {success: false, error: "Failed to delete web page category"};
        }
    });

    ipcMain.handle("webPagesCategories:getWebPageCount", async (_event, categoryId) => {
        try {
            const count = webPagesApi.getCategoryWebPageCount(categoryId);
            return {success: true, count};
        } catch (error) {
            console.error("Failed to get web page count:", error);
            return {success: false, error: "Failed to get web page count"};
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

    ipcMain.handle("recordings:getById", async (_event, id) => {
        try {
            const recording = recordingsApi.getById(id);
            return {success: true, recording};
        } catch (error) {
            console.error("Failed to get recording by id:", error);
            return {success: false, error: "Failed to get recording by id"};
        }
    });

    ipcMain.handle("recordings:update", async (_event, id, recording) => {
        try {
            const result = recordingsApi.update(id, recording);
            return {success: result};
        } catch (error) {
            console.error("Failed to update recording:", error);
            return {success: false, error: "Failed to update recording"};
        }
    });

    ipcMain.handle("recordings:count", async () => {
        try {
            const count = recordingsApi.count();
            return {success: true, count};
        } catch (error) {
            console.error("Failed to get recordings count:", error);
            return {success: false, error: "Failed to get recordings count"};
        }
    });

    ipcMain.handle("recordings:getStats", async () => {
        try {
            const stats = recordingsApi.getStats();
            return {success: true, stats};
        } catch (error) {
            console.error("Failed to get recordings stats:", error);
            return {success: false, error: "Failed to get recordings stats"};
        }
    });

    ipcMain.handle("recordings:scanDirectory", async () => {
        try {
            const fs = require('fs');
            const path = require('path');

            const savePath = store.get("recordings.savePath") as string || app.getPath("documents");

            if (!fs.existsSync(savePath)) {
                return {success: true, files: []};
            }

            const files = fs.readdirSync(savePath)
                .filter(file => ['.wav', '.mp3', '.m4a', '.webm', '.ogg'].includes(
                    path.extname(file).toLowerCase()
                ))
                .map(file => {
                    const filePath = path.join(savePath, file);
                    const stats = fs.statSync(filePath);
                    return {
                        id: `${stats.mtime.getTime()}_${file}`,
                        file_name: file,
                        file_path: filePath,
                        created_at: stats.mtime.getTime(),
                        file_size: stats.size,
                        duration: 0,
                        notes: ''
                    };
                })
                .sort((a, b) => b.created_at - a.created_at);

            return {success: true, files};
        } catch (error) {
            console.error("Failed to scan directory:", error);
            return {success: false, error: "Failed to scan directory"};
        }
    });

    ipcMain.handle("recordings:getSavePath", async () => {
        try {
            const savePath = store.get("recordings.savePath") as string || app.getPath("documents");
            return {success: true, savePath};
        } catch (error) {
            console.error("Failed to get save path:", error);
            return {success: false, error: "Failed to get save path"};
        }
    });

    ipcMain.handle("recordings:setSavePath", async (_event, savePath: string) => {
        try {
            store.set("recordings.savePath", savePath);
            return {success: true};
        } catch (error) {
            console.error("Failed to set save path:", error);
            return {success: false, error: "Failed to set save path"};
        }
    });

    ipcMain.handle("recordings:getNamingPattern", async () => {
        try {
            const pattern = store.get("recordings.namingPattern") as string || "recording_{date}_{time}";
            return {success: true, pattern};
        } catch (error) {
            console.error("Failed to get naming pattern:", error);
            return {success: false, error: "Failed to get naming pattern"};
        }
    });

    ipcMain.handle("recordings:setNamingPattern", async (_event, pattern: string) => {
        try {
            store.set("recordings.namingPattern", pattern);
            return {success: true};
        } catch (error) {
            console.error("Failed to set naming pattern:", error);
            return {success: false, error: "Failed to set naming pattern"};
        }
    });

    ipcMain.handle("recordings:generateFileName", async (_event, prefix?: string) => {
        try {
            const pattern = store.get("recordings.namingPattern") as string || "recording_{date}_{time}";
            const now = new Date();
            const date = now.toISOString().split("T")[0];
            const time = now.toTimeString().split(" ")[0].replace(/:/g, "");
            const fileName = pattern
                .replace("{date}", date)
                .replace("{time}", time)
                .replace("{prefix}", prefix || "");
            return {success: true, fileName: `${fileName}.wav`};
        } catch (error) {
            console.error("Failed to generate file name:", error);
            return {success: false, error: "Failed to generate file name"};
        }
    });

    ipcMain.handle("recordings:getDefaultDevice", async () => {
        try {
            const defaultDevice = store.get("recordings.defaultDevice") as string || "";
            return {success: true, deviceId: defaultDevice};
        } catch (error) {
            console.error("Failed to get default device:", error);
            return {success: false, error: "Failed to get default device"};
        }
    });

    ipcMain.handle("recordings:setDefaultDevice", async (_event, deviceId: string) => {
        try {
            store.set("recordings.defaultDevice", deviceId);
            return {success: true};
        } catch (error) {
            console.error("Failed to set default device:", error);
            return {success: false, error: "Failed to set default device"};
        }
    });

    ipcMain.handle("recordings:getMicVolume", async () => {
        try {
            const volume = store.get("recordings.micVolume") as number || 100;
            return {success: true, volume};
        } catch (error) {
            console.error("Failed to get mic volume:", error);
            return {success: false, error: "Failed to get mic volume"};
        }
    });

    ipcMain.handle("recordings:setMicVolume", async (_event, volume: number) => {
        try {
            store.set("recordings.micVolume", volume);
            return {success: true};
        } catch (error) {
            console.error("Failed to set mic volume:", error);
            return {success: false, error: "Failed to set mic volume"};
        }
    });

    ipcMain.handle("recordings:deleteFile", async (_event, filePath: string) => {
        try {
            const fs = require('fs');
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return {success: true};
            }
            return {success: false, error: "File not found"};
        } catch (error) {
            console.error("Failed to delete file:", error);
            return {success: false, error: "Failed to delete file"};
        }
    });

    ipcMain.handle("recordings:saveFile", async (_event, fileName: string, fileData: ArrayBuffer, savePath?: string) => {
        try {
            const fs = require('fs');
            const path = require('path');
            const targetPath = savePath || store.get("recordings.savePath") as string || app.getPath("documents");
            const fullPath = path.join(targetPath, fileName);

            if (!fs.existsSync(targetPath)) {
                fs.mkdirSync(targetPath, {recursive: true});
            }

            fs.writeFileSync(fullPath, Buffer.from(fileData));
            return {success: true, filePath: fullPath};
        } catch (error) {
            console.error("Failed to save file:", error);
            return {success: false, error: "Failed to save file"};
        }
    });

    // ==================== Usage Stats API ====================

    ipcMain.handle("stats:startSession", async (_event, sessionId) => {
        try {
            const result = usageStatsApi.startSession(sessionId);
            return {success: result};
        } catch (error) {
            console.error("Failed to start session:", error);
            return {success: false, error: "Failed to start session"};
        }
    });

    ipcMain.handle("stats:endSession", async (_event, sessionId) => {
        try {
            const result = usageStatsApi.endSession(sessionId);
            return {success: result};
        } catch (error) {
            console.error("Failed to end session:", error);
            return {success: false, error: "Failed to end session"};
        }
    });

    ipcMain.handle("stats:startFeatureUsage", async (_event, featureId) => {
        try {
            const sessionId = getCurrentSessionId();
            if (!sessionId) {
                return {success: false, error: "No active session"};
            }
            const result = usageStatsApi.startFeatureUsage(sessionId, featureId);
            return {success: result};
        } catch (error) {
            console.error("Failed to start feature usage:", error);
            return {success: false, error: "Failed to start feature usage"};
        }
    });

    ipcMain.handle("stats:endFeatureUsage", async (_event, featureId) => {
        try {
            const result = usageStatsApi.endFeatureUsage(featureId);
            return {success: result};
        } catch (error) {
            console.error("Failed to end feature usage:", error);
            return {success: false, error: "Failed to end feature usage"};
        }
    });

    ipcMain.handle("stats:getAppUsage", async (_event, dimension) => {
        try {
            const stats = usageStatsApi.getAppUsage(dimension);
            return {success: true, stats};
        } catch (error) {
            console.error("Failed to get app usage:", error);
            return {success: false, error: "Failed to get app usage"};
        }
    });

    ipcMain.handle("stats:getFeatureUsage", async (_event, featureId) => {
        try {
            const stats = usageStatsApi.getFeatureUsage(featureId);
            return {success: true, stats};
        } catch (error) {
            console.error("Failed to get feature usage:", error);
            return {success: false, error: "Failed to get feature usage"};
        }
    });

    ipcMain.handle("stats:getHistoryTrend", async (_event, dimension, days) => {
        try {
            const trend = usageStatsApi.getHistoryTrend(dimension, days);
            return {success: true, trend};
        } catch (error) {
            console.error("Failed to get history trend:", error);
            return {success: false, error: "Failed to get history trend"};
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
            return migrateDatabaseToNewPath(newPath);
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

    ipcMain.handle("window:isFocused", async () => {
        try {
            return {success: true, focused: getWindowFocused()};
        } catch (error) {
            console.error("Failed to check window focused status:", error);
            return {success: false, error: "Failed to check window focused status"};
        }
    });

    ipcMain.handle("autoUpdate:getEnabled", async () => {
        try {
            return {success: true, enabled: getAutoUpdateEnabled()};
        } catch (error) {
            console.error("Failed to get auto update enabled status:", error);
            return {success: false, error: "Failed to get auto update enabled status"};
        }
    });

    ipcMain.handle("todos:getPending", async (_event, page, pageSize) => {
        try {
            const result = todosApi.getPendingTodos(page, pageSize);
            return {success: true, ...result};
        } catch (error) {
            console.error("Failed to get pending todos:", error);
            return {success: false, error: "Failed to get pending todos"};
        }
    });

    ipcMain.handle("todos:getCompleted", async (_event, page, pageSize) => {
        try {
            const result = todosApi.getCompletedTodos(page, pageSize);
            return {success: true, ...result};
        } catch (error) {
            console.error("Failed to get completed todos:", error);
            return {success: false, error: "Failed to get completed todos"};
        }
    });

    ipcMain.handle("todos:clearCompleted", async () => {
        try {
            const count = todosApi.clearCompleted();
            return {success: true, count};
        } catch (error) {
            console.error("Failed to clear completed todos:", error);
            return {success: false, error: "Failed to clear completed todos"};
        }
    });

    ipcMain.handle("todos:delete", async (_event, id) => {
        try {
            const result = todosApi.delete(id);
            return {success: result};
        } catch (error) {
            console.error("Failed to delete todo:", error);
            return {success: false, error: "Failed to delete todo"};
        }
    });

    ipcMain.handle("shell:showItemInFolder", async (_event, filePath: string) => {
        try {
            shell.showItemInFolder(filePath);
            return {success: true};
        } catch (error) {
            console.error("Failed to show item in folder:", error);
            return {success: false, error: "Failed to show item in folder"};
        }
    });

    // WebDAV API
    ipcMain.handle("webdav:getConfig", async () => {
        try {
            const config = store.get("webdav.config") as WebDAVConfig | null;
            return {success: true, config};
        } catch (error) {
            console.error("Failed to get WebDAV config:", error);
            return {success: false, error: "Failed to get WebDAV config"};
        }
    });

    ipcMain.handle("webdav:setConfig", async (_event, config: WebDAVConfig) => {
        try {
            console.log('>>> WebDAV: 设置配置，上传模式:', config.syncMode);
            
            store.set("webdav.config", config);
            await initializeWebDAV(config);

            if (config.syncMode === 'scheduled') {
                console.log('>>> WebDAV: 切换到定时上传模式');
                const scheduledSyncService = (await import('../services/scheduledSyncService')).default;
                scheduledSyncService.startScheduledSync(config);
            } else {
                console.log('>>> WebDAV: 切换到手动模式');
                const scheduledSyncService = (await import('../services/scheduledSyncService')).default;
                scheduledSyncService.stopScheduledSync();
            }

            return {success: true};
        } catch (error) {
            console.error("Failed to set WebDAV config:", error);
            return {success: false, error: "Failed to set WebDAV config"};
        }
    });

    ipcMain.handle("webdav:testConnection", async () => {
        try {
            const success = await testConnection();
            return {success};
        } catch (error) {
            console.error("Failed to test WebDAV connection:", error);
            return {success: false, error: "Failed to test connection"};
        }
    });

    ipcMain.handle("webdav:syncAll", async () => {
        try {
            console.log('>>> WebDAV: 开始上传');
            
            const success = await syncAll();
            
            if (success) {
                console.log('>>> WebDAV: 上传成功');
                
                const currentConfig = getConfig();
                
                if (currentConfig) {
                    store.set("webdav.config", currentConfig);
                    console.log('>>> WebDAV: 配置已保存');
                }
            } else {
                console.log('>>> WebDAV: 上传失败');
            }
            
            return {success};
        } catch (error) {
            console.error("Failed to upload:", error);
            return {success: false, error: "Failed to upload"};
        }
    });

    ipcMain.handle("webdav:getSyncLogs", async () => {
        try {
            const logs = getSyncLogs();
            return {success: true, logs};
        } catch (error) {
            console.error("Failed to get sync logs:", error);
            return {success: false, error: "Failed to get sync logs"};
        }
    });

    // WebDAV 状态变更监听（用于同步状态反馈）
    ipcMain.handle("webdav:onStatusChange", async (_event) => {
        try {
            return {success: true};
        } catch (error) {
            console.error("Failed to set up status change listener:", error);
            return {success: false, error: "Failed to set up listener"};
        }
    });

    // WebDAV 定时同步 API
    ipcMain.handle("webdav:startScheduledSync", async () => {
        try {
            const config = store.get("webdav.config") as WebDAVConfig | null;
            if (!config) {
                return {success: false, error: "WebDAV config not found"};
            }

            if (config.syncMode !== 'scheduled') {
                console.log('>>> WebDAV: 模式不是 scheduled');
                return {success: false};
            }

            const scheduledSyncService = (await import('../services/scheduledSyncService')).default;
            scheduledSyncService.startScheduledSync(config);
            return {success: true};
        } catch (error) {
            console.error("Failed to start scheduled sync:", error);
            return {success: false, error: "Failed to start scheduled sync"};
        }
    });

    ipcMain.handle("webdav:stopScheduledSync", async () => {
        try {
            const scheduledSyncService = (await import('../services/scheduledSyncService')).default;
            scheduledSyncService.stopScheduledSync();
            return {success: true};
        } catch (error) {
            console.error("Failed to stop scheduled sync:", error);
            return {success: false, error: "Failed to stop scheduled sync"};
        }
    });

    ipcMain.handle("webdav:onScheduledSyncStatusChange", async (_event) => {
        try {
            const scheduledSyncService = (await import('../services/scheduledSyncService')).default;
            scheduledSyncService.onStatusChange((status) => {
                const mainWindow = getMainWindow();
                if (mainWindow) {
                    mainWindow.webContents.send('webdav:scheduledSyncStatusChanged', {
                        isRunning: status.isRunning,
                        nextSyncTime: status.nextSyncTime,
                        error: status.error
                    });
                }
            });
            return {success: true};
        } catch (error) {
            console.error("Failed to set up scheduled sync status change listener:", error);
            return {success: false, error: "Failed to set up listener"};
        }
    });

    console.log("IPC handlers registered");
}