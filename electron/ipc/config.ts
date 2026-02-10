import { ipcMain, session, dialog } from 'electron';
import Store from 'electron-store';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { getMainWindow } from "../modules/windowManager";
import https from 'https';
import {
    getCurrentDatabasePath,
    getProxy,
    migrateDatabaseToNewPath,
    setProxy,
    setCustomDatabaseDirectory
} from "../database";

const store = new Store({ name: "moyu-data" });

export function registerConfigHandlers() {
    // Store
    ipcMain.handle("store:get", async (_event, key: string) => {
        try {
            return { success: true, value: store.get(key) };
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

    ipcMain.handle("store:setDataPath", async (_event, newPath: string) => {
        try {
            console.log("Request to change store data path to:", newPath);
            return { success: true };
        } catch (error) {
            return { success: false, error: "Failed to set store data path" };
        }
    });

    // Database
    ipcMain.handle("database:getPath", async () => {
        try {
            return { success: true, path: getCurrentDatabasePath() };
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

    ipcMain.handle("database:setDirectory", async (_event, directoryPath: string) => {
        try {
            const dbPath = setCustomDatabaseDirectory(directoryPath);
            return { success: true, path: dbPath };
        } catch (error) {
            console.error("Failed to set database directory:", error);
            return { success: false, error: "Failed to set database directory" };
        }
    });

    // Proxy
    ipcMain.handle("proxy:get", async () => {
        try {
            return { success: true, proxy: getProxy() };
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

    ipcMain.handle("proxy:test", async (_event, url: string) => {
        return new Promise((resolve) => {
            try {
                const agent = url ? new HttpsProxyAgent(url) : undefined;
                // 使用 GitHub 作为测试目标，因为它在开启代理后通常是可访问的，且能更好地反映代理的真实能力
                const testUrl = 'https://www.github.com';
                
                const options = {
                    method: 'GET',
                    timeout: 8000,
                    agent: agent,
                    rejectUnauthorized: false, // 仅在测试时允许忽略证书错误，以防代理 MITM 拦截
                    headers: {
                        'User-Agent': 'MoLeMa-App/1.0'
                    }
                };

                const req = https.request(testUrl, options, (res) => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
                        resolve({ success: true, message: '代理连接成功 (HTTP ' + res.statusCode + ')' });
                    } else {
                        resolve({ success: false, error: `代理响应异常: HTTP ${res.statusCode}` });
                    }
                });

                req.on('error', (err: any) => {
                    let msg = err.message;
                    if (err.code === 'ECONNRESET') msg = '连接被重置 (可能代理地址错误或协议不支持)';
                    if (err.code === 'ECONNREFUSED') msg = '连接被拒绝 (请检查代理服务是否开启)';
                    resolve({ success: false, error: `连接失败: ${msg}` });
                });

                req.on('timeout', () => {
                    req.destroy();
                    resolve({ success: false, error: '连接超时 (代理响应过慢)' });
                });

                req.end();
            } catch (error: any) {
                resolve({ success: false, error: `内部错误: ${error.message}` });
            }
        });
    });

    // Dialogs
    ipcMain.handle("dialog:selectDirectory", async () => {
        try {
            const result = await dialog.showOpenDialog(getMainWindow()!, {
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
            const result = await dialog.showOpenDialog(getMainWindow()!, {
                properties: ["openFile"],
                filters: [{ name: "SQLite Database", extensions: ["db", "sqlite", "sqlite3"] }, { name: "All Files", extensions: ["*"] }]
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
}