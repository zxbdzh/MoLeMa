import { ipcMain } from 'electron';
import { webdavClient } from '../services/webdav/client';
import { webdavService } from '../services/webdav/service';
import { syncEngine } from '../services/webdav/syncEngine';
import { WebDAVConfig } from '@shared/types/electron';

export function registerWebDAVHandlers() {
    ipcMain.handle("webdav:getConfig", async () => {
        try {
            const config = webdavService.config;
            return { success: true, config };
        } catch (error) {
            console.error("Failed to get WebDAV config:", error);
            return { success: false, error: "Failed to get WebDAV config" };
        }
    });

    ipcMain.handle("webdav:setConfig", async (_event, config: WebDAVConfig) => {
        try {
            await webdavService.updateConfig(config);
            return { success: true };
        } catch (error) {
            console.error("Failed to set WebDAV config:", error);
            return { success: false, error: "Failed to set WebDAV config" };
        }
    });

    ipcMain.handle("webdav:testConnection", async () => {
        try {
            const success = await webdavClient.testConnection();
            return { success };
        } catch (error) {
            console.error("Failed to test WebDAV connection:", error);
            return { success: false, error: "Failed to test connection" };
        }
    });

    ipcMain.handle("webdav:syncAll", async () => {
        try {
            await webdavService.syncAll();
            return { success: true };
        } catch (error) {
            console.error("Failed to sync:", error);
            return { success: false, error: "Failed to sync" };
        }
    });

    ipcMain.handle("webdav:listRemoteFiles", async () => {
        try {
            const files = await syncEngine.getRemoteFiles();
            return { success: true, files };
        } catch (error) {
            console.error("Failed to list remote files:", error);
            return { success: false, error: "Failed to list remote files" };
        }
    });

    ipcMain.handle("webdav:getSyncLogs", async () => {
        try {
            const logs = webdavService.getLogs();
            return { success: true, logs };
        } catch (error) {
            return { success: false, error: "Failed to get logs" };
        }
    });

    ipcMain.handle("webdav:downloadAll", async (_event, _options: any) => {
        try {
            await webdavService.syncAll();
            return { success: true };
        } catch (error) {
            console.error("Failed to download:", error);
            return { success: false, error: "Failed to download" };
        }
    });
}
