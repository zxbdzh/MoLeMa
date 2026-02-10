import { ipcMain, session, dialog } from 'electron';
import Store from 'electron-store';
import { getMainWindow } from "../modules/windowManager";
import {
    getCurrentDatabasePath,
    getProxy,
    migrateDatabaseToNewPath,
    setProxy
} from "../database";

const store = new Store({ name: "moyu-data" });

export function registerConfigHandlers() {
    // Store
    ipcMain.handle("store:get", async (_event, key: string) => {
        try {
            return { success: true, value: store.get(key) };
        } catch (error) {
            return { success: false, error: "Failed to get store value" };
        }
    });

    ipcMain.handle("store:set", async (_event, key: string, value: any) => {
        try {
            store.set(key, value);
            return { success: true };
        } catch (error) {
            return { success: false, error: "Failed to set store value" };
        }
    });

    ipcMain.handle("store:getDataPath", async () => {
        try {
            return { success: true, path: store.path };
        } catch (error) {
            return { success: false, error: "Failed to get data path" };
        }
    });

    // Database
    ipcMain.handle("database:getPath", async () => {
        try {
            return { success: true, path: getCurrentDatabasePath() };
        } catch (error) {
            return { success: false, error: "Failed to get database path" };
        }
    });

    ipcMain.handle("database:setPath", async (_event, newPath) => {
        try {
            return migrateDatabaseToNewPath(newPath);
        } catch (error) {
            return { success: false, error: "Failed to set database path" };
        }
    });

    // Proxy
    ipcMain.handle("proxy:get", async () => {
        try {
            return { success: true, proxy: getProxy() };
        } catch (error) {
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
            return { success: false, error: "Failed to set proxy" };
        }
    });

    // Dialogs
    ipcMain.handle("dialog:selectDirectory", async () => {
        const result = await dialog.showOpenDialog(getMainWindow()!, {
            properties: ["openDirectory", "createDirectory"],
        });
        if (!result.canceled && result.filePaths.length > 0) {
            return { success: true, path: result.filePaths[0] };
        }
        return { success: false, canceled: true };
    });
}
