import { app, dialog, ipcMain, session, shell } from 'electron';
import Store from 'electron-store';
import {
    closeWindow,
    getMainWindow,
    getWindowFocused,
    isFullscreen,
    maximizeWindow,
    minimizeWindow,
    toggleFullscreen,
    toggleWindow
} from "../modules/windowManager";
import { getShortcuts, updateShortcuts } from "../modules/shortcutManager";
import { checkForUpdates, getAutoUpdateEnabled, setAutoUpdateEnabled } from "../modules/autoUpdater";
import {
    getCurrentDatabasePath,
    getProxy,
    getProxyConfig,
    migrateDatabaseToNewPath,
    setProxy
} from "../database";
import { usageStatsApi } from "../api/usageStatsApi";
import { getCurrentSessionId } from "../main";

const store = new Store({
    name: "moyu-data",
});

export function registerSystemHandlers() {
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
            return { success: true, isFullscreen: isFullscreen() };
        } catch (error) {
            console.error("Failed to check fullscreen status:", error);
            return { success: false, error: "Failed to check fullscreen status" };
        }
    });

    ipcMain.handle("window:isFocused", async () => {
        try {
            return { success: true, focused: getWindowFocused() };
        } catch (error) {
            console.error("Failed to check window focused status:", error);
            return { success: false, error: "Failed to check window focused status" };
        }
    });

    // ==================== 数据存储 IPC ====================
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

    // ==================== 对话框 IPC ====================
    ipcMain.handle("dialog:selectDirectory", async () => {
        try {
            const mainWindow = getMainWindow();
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
            const mainWindow = getMainWindow();
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

    // ==================== 数据库和代理配置 ====================
    ipcMain.handle("database:getPath", async () => {
        try {
            const path = getCurrentDatabasePath();
            return { success: true, path };
        } catch (error) {
            console.error("Failed to get database path:", error);
            return { success: false, error: "Failed to get database path" };
        }
    });

    ipcMain.handle("database:setPath", async (_event, newPath) => {
        try {
            return migrateDatabaseToNewPath(newPath);
        } catch (error) {
            console.error("Failed to set database path:", error);
            return { success: false, error: "Failed to set database path" };
        }
    });

    ipcMain.handle("proxy:get", async () => {
        try {
            const proxy = getProxy();
            return { success: true, proxy };
        } catch (error) {
            console.error("Failed to get proxy:", error);
            return { success: false, error: "Failed to get proxy" };
        }
    });

    ipcMain.handle("proxy:set", async (_event, proxy) => {
        try {
            setProxy(proxy);
            const webviewSession = session.fromPartition("persist:webview");
            if (proxy && proxy.url) {
                webviewSession.setProxy({ proxyRules: proxy.url });
            } else {
                webviewSession.setProxy({});
            }
            return { success: true };
        } catch (error) {
            console.error("Failed to set proxy:", error);
            return { success: false, error: "Failed to set proxy" };
        }
    });

    // ==================== Shell 操作 ====================
    ipcMain.handle("shell:openPath", async (_event, path: string) => {
        try {
            await shell.openPath(path);
            return { success: true };
        } catch (error) {
            console.error("Failed to open path:", error);
            return { success: false, error: error instanceof Error ? error.message : "Failed to open path" };
        }
    });

    ipcMain.handle("shell:showItemInFolder", async (_event, filePath: string) => {
        try {
            shell.showItemInFolder(filePath);
            return { success: true };
        } catch (error) {
            console.error("Failed to show item in folder:", error);
            return { success: false, error: error instanceof Error ? error.message : "Failed to show item in folder" };
        }
    });

    // ==================== 自动更新 ====================
    ipcMain.handle("updater:getEnabled", async () => {
        try {
            return { success: true, enabled: getAutoUpdateEnabled() };
        } catch (error) {
            console.error("Failed to get updater enabled status:", error);
            return { success: false, error: "Failed to get updater enabled status" };
        }
    });

    ipcMain.handle("updater:setEnabled", async (_event, enabled) => {
        try {
            setAutoUpdateEnabled(enabled);
            return { success: true };
        } catch (error) {
            console.error("Failed to set updater enabled:", error);
            return { success: false, error: "Failed to set updater enabled" };
        }
    });

    ipcMain.handle("updater:checkForUpdates", async () => {
        try {
            await checkForUpdates();
            return { success: true };
        } catch (error) {
            console.error("Failed to check for updates:", error);
            return { success: false, error: "Failed to check for updates" };
        }
    });

    ipcMain.handle("autoUpdate:getEnabled", async () => {
        try {
            return { success: true, enabled: getAutoUpdateEnabled() };
        } catch (error) {
            console.error("Failed to get auto update enabled status:", error);
            return { success: false, error: "Failed to get auto update enabled status" };
        }
    });

    // ==================== 开机自启 ====================
    ipcMain.handle("autoLaunch:getEnabled", async () => {
        try {
            const settings = app.getLoginItemSettings();
            return { success: true, enabled: settings.openAtLogin };
        } catch (error) {
            console.error("Failed to get auto launch status:", error);
            return { success: false, error: "Failed to get auto launch status" };
        }
    });

    ipcMain.handle("autoLaunch:setEnabled", async (_event, enabled: boolean) => {
        try {
            if (!app.isPackaged) {
                console.warn("开发模式不支持设置开机自启");
                return { success: false, error: "开发模式不支持设置开机自启" };
            }
            app.setLoginItemSettings({
                openAtLogin: enabled,
                openAsHidden: process.platform === 'darwin' && enabled,
            });
            return { success: true, enabled };
        } catch (error) {
            console.error("Failed to set auto launch status:", error);
            return { success: false, error: "Failed to set auto launch status" };
        }
    });

    // ==================== Usage Stats API ====================
    ipcMain.handle("stats:startSession", async (_event, sessionId) => {
        try {
            const result = usageStatsApi.startSession(sessionId);
            return { success: result };
        } catch (error) {
            console.error("Failed to start session:", error);
            return { success: false, error: "Failed to start session" };
        }
    });

    ipcMain.handle("stats:endSession", async (_event, sessionId) => {
        try {
            const result = usageStatsApi.endSession(sessionId);
            return { success: result };
        } catch (error) {
            console.error("Failed to end session:", error);
            return { success: false, error: "Failed to end session" };
        }
    });

    ipcMain.handle("stats:startFeatureUsage", async (_event, featureId) => {
        try {
            const sessionId = getCurrentSessionId();
            if (!sessionId) {
                return { success: false, error: "No active session" };
            }
            const result = usageStatsApi.startFeatureUsage(sessionId, featureId);
            return { success: result };
        } catch (error) {
            console.error("Failed to start feature usage:", error);
            return { success: false, error: "Failed to start feature usage" };
        }
    });

    ipcMain.handle("stats:endFeatureUsage", async (_event, featureId) => {
        try {
            const result = usageStatsApi.endFeatureUsage(featureId);
            return { success: result };
        } catch (error) {
            console.error("Failed to end feature usage:", error);
            return { success: false, error: "Failed to end feature usage" };
        }
    });

    ipcMain.handle("stats:getAppUsage", async (_event, dimension) => {
        try {
            const stats = usageStatsApi.getAppUsage(dimension);
            return { success: true, stats };
        } catch (error) {
            console.error("Failed to get app usage:", error);
            return { success: false, error: "Failed to get app usage" };
        }
    });

    ipcMain.handle("stats:getFeatureUsage", async (_event, featureId) => {
        try {
            const stats = usageStatsApi.getFeatureUsage(featureId);
            return { success: true, stats };
        } catch (error) {
            console.error("Failed to get feature usage:", error);
            return { success: false, error: "Failed to get feature usage" };
        }
    });

    ipcMain.handle("stats:getHistoryTrend", async (_event, dimension, days) => {
        try {
            const trend = usageStatsApi.getHistoryTrend(dimension, days);
            return { success: true, trend };
        } catch (error) {
            console.error("Failed to get history trend:", error);
            return { success: false, error: "Failed to get history trend" };
        }
    });
}
