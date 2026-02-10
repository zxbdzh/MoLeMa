import { app, BrowserWindow, dialog } from "electron";
import { createRequire } from 'node:module';
// 导入管理模块
import {
    createWindow,
    getMainWindow,
    setWindowVisible
} from "./modules/windowManager";
import { registerGlobalShortcuts, unregisterAllShortcuts } from "./modules/shortcutManager";
import { createTray } from "./modules/trayManager";
import { checkForUpdates, getAutoUpdateEnabled, setupAutoUpdater } from "./modules/autoUpdater";
import { registerIPCHandlers } from "./modules/ipcHandlers";
import { webdavService } from "./services/webdav/service";
import { usageStatsManager } from "./modules/usageStatsManager";
import { appInitializer } from "./modules/appInitializer";

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

// 重写 toggleWindow 以集成会话管理
export function toggleWindowWithSession() {
    const mainWindow = getMainWindow();
    if (mainWindow && mainWindow.isVisible()) {
        usageStatsManager.endCurrentSession();
        mainWindow.hide();
        setWindowVisible(false);
    } else {
        usageStatsManager.startNewSession();
        mainWindow?.show();
        setWindowVisible(true);
    }
}

// ==================== 应用启动 ====================

app.whenReady().then(async () => {
    process.versions.app = packageJson.version;

    // 执行初始化
    await appInitializer.initialize();

    // 创建窗口、托盘、注册快捷键、IPC处理程序
    createWindow();
    createTray();
    registerGlobalShortcuts();
    registerIPCHandlers();
    
    // 启动统计会话
    usageStatsManager.startNewSession();

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
    usageStatsManager.endCurrentSession();
    unregisterAllShortcuts();
    appInitializer.cleanup();
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});