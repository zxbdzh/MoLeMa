import { ipcMain } from 'electron';
import Store from 'electron-store';
import {
    initializeWebDAV,
    testConnection,
    syncAll,
    getConfig,
    getSyncLogs,
    listRemoteFiles,
    checkConflicts,
    downloadAll,
} from "../services/webdavSyncService";
import { getMainWindow } from "../modules/windowManager";
import { WebDAVConfig } from '@shared/types/electron';

const store = new Store({
    name: "moyu-data",
});

export function registerWebDAVHandlers() {
    ipcMain.handle("webdav:getConfig", async () => {
        try {
            const config = store.get("webdav.config") as WebDAVConfig | null;
            return { success: true, config };
        } catch (error) {
            console.error("Failed to get WebDAV config:", error);
            return { success: false, error: "Failed to get WebDAV config" };
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

            return { success: true };
        } catch (error) {
            console.error("Failed to set WebDAV config:", error);
            return { success: false, error: "Failed to set WebDAV config" };
        }
    });

    ipcMain.handle("webdav:testConnection", async () => {
        try {
            const success = await testConnection();
            return { success };
        } catch (error) {
            console.error("Failed to test WebDAV connection:", error);
            return { success: false, error: "Failed to test connection" };
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

            return { success };
        } catch (error) {
            console.error("Failed to upload:", error);
            return { success: false, error: "Failed to upload" };
        }
    });

    ipcMain.handle("webdav:getSyncLogs", async () => {
        try {
            const logs = getSyncLogs();
            return { success: true, logs };
        } catch (error) {
            console.error("Failed to get sync logs:", error);
            return { success: false, error: "Failed to get sync logs" };
        }
    });

    ipcMain.handle("webdav:startScheduledSync", async () => {
        try {
            const config = store.get("webdav.config") as WebDAVConfig | null;
            if (!config) {
                return { success: false, error: "WebDAV config not found" };
            }

            if (config.syncMode !== 'scheduled') {
                console.log('>>> WebDAV: 模式不是 scheduled');
                return { success: false };
            }

            const scheduledSyncService = (await import('../services/scheduledSyncService')).default;
            scheduledSyncService.startScheduledSync(config);
            return { success: true };
        } catch (error) {
            console.error("Failed to start scheduled sync:", error);
            return { success: false, error: "Failed to start scheduled sync" };
        }
    });

    ipcMain.handle("webdav:stopScheduledSync", async () => {
        try {
            const scheduledSyncService = (await import('../services/scheduledSyncService')).default;
            scheduledSyncService.stopScheduledSync();
            return { success: true };
        } catch (error) {
            console.error("Failed to stop scheduled sync:", error);
            return { success: false, error: "Failed to stop scheduled sync" };
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
            return { success: true };
        } catch (error) {
            console.error("Failed to set up scheduled sync status change listener:", error);
            return { success: false, error: "Failed to set up listener" };
        }
    });

    ipcMain.handle("webdav:listRemoteFiles", async () => {
        try {
            const files = await listRemoteFiles();
            return { success: true, files };
        } catch (error) {
            console.error("Failed to list remote files:", error);
            return { success: false, error: "Failed to list remote files" };
        }
    });

    ipcMain.handle("webdav:checkConflicts", async () => {
        try {
            const conflicts = await checkConflicts();
            return { success: true, conflicts };
        } catch (error) {
            console.error("Failed to check conflicts:", error);
            return { success: false, error: "Failed to check conflicts" };
        }
    });

    ipcMain.handle("webdav:downloadAll", async (_event, options: any) => {
        try {
            console.log('>>> WebDAV: 开始下载', options);
            const success = await downloadAll(options);

            if (success) {
                console.log('>>> WebDAV: 下载成功');
                const currentConfig = getConfig();
                if (currentConfig) {
                    store.set("webdav.config", currentConfig);
                }
            } else {
                console.log('>>> WebDAV: 下载失败');
            }

            return { success };
        } catch (error) {
            console.error("Failed to download:", error);
            return { success: false, error: "Failed to download" };
        }
    });
}
