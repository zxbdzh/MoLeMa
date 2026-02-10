import { app, ipcMain } from 'electron';
import { checkForUpdates, getAutoUpdateEnabled, setAutoUpdateEnabled } from "../modules/autoUpdater";

export function registerSystemHandlers() {
    // 自动更新
    ipcMain.handle("updater:getEnabled", async () => ({ success: true, enabled: getAutoUpdateEnabled() }));
    ipcMain.handle("updater:setEnabled", async (_event, enabled) => {
        setAutoUpdateEnabled(enabled);
        return { success: true };
    });
    ipcMain.handle("updater:checkForUpdates", async () => {
        try {
            await checkForUpdates();
            return { success: true };
        } catch (error) {
            return { success: false, error: "Failed to check for updates" };
        }
    });

    // 开机自启
    ipcMain.handle("autoLaunch:getEnabled", async () => ({ 
        success: true, 
        enabled: app.getLoginItemSettings().openAtLogin 
    }));

    ipcMain.handle("autoLaunch:setEnabled", async (_event, enabled: boolean) => {
        if (!app.isPackaged) return { success: false, error: "开发模式不支持设置开机自启" };
        app.setLoginItemSettings({
            openAtLogin: enabled,
            openAsHidden: process.platform === 'darwin' && enabled,
        });
        return { success: true, enabled };
    });
}