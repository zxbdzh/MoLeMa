import {app, BrowserView, dialog, ipcMain} from "electron";
import {createRequire} from 'node:module';
import Store from 'electron-store';
// 导入模块
import {closeDatabase, getDatabase, seedDefaultData,} from "./database";
import {createUsageStatsTables, runMigration} from "./migration";
import {usageStatsApi} from "./api/usageStatsApi";
import {testRSSFeed} from "./services/rssFetcher";
import {testWebsiteNews} from "./services/websiteNewsFetcher";
import {newsApi} from "./api/newsApi";
import {WebDAVConfig} from "./services/webdavSyncService";

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
import {webdavService} from "./services/webdav/service";

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

    // 初始化 WebDAV 服务
    webdavService.setMainWindow(getMainWindow());
    webdavService.initialize();

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
