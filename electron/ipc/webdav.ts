import { ipcMain } from 'electron';
import { webdavClient } from '../services/webdav/client';
import { webdavService } from '../services/webdav/service';
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

    ipcMain.handle("webdav:upload", async () => {
        try {
            await webdavService.uploadAll();
            return { success: true };
        } catch (error) {
            console.error("Upload failed:", error);
            return { success: false, error: "Upload failed" };
        }
    });

    ipcMain.handle("webdav:download", async () => {
        try {
            await webdavService.downloadAll();
            return { success: true };
        } catch (error) {
            console.error("Download failed:", error);
            return { success: false, error: "Download failed" };
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

    ipcMain.handle("webdav:clearLogs", async () => {
        try {
            webdavService.clearLogs();
            return { success: true };
        } catch (error) {
            return { success: false, error: "Failed to clear logs" };
        }
    });
}