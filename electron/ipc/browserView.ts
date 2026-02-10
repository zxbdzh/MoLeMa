import { BrowserView, ipcMain } from 'electron';

const browserViews = new Map<string, Electron.BrowserView>();

export function registerBrowserViewHandlers() {
    ipcMain.handle("browserView:create", async (_event, id: string, options?: any) => {
        try {
            if (browserViews.has(id)) browserViews.delete(id);
            const browserView = new BrowserView({
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    webSecurity: true,
                    sandbox: true, ...options?.webPreferences
                },
            });
            browserViews.set(id, browserView);
            return { success: true, id };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "Failed to create BrowserView" };
        }
    });

    ipcMain.handle("browserView:loadURL", async (_event, id: string, url: string) => {
        try {
            const browserView = browserViews.get(id);
            if (!browserView) return { success: false, error: "BrowserView not found" };
            await browserView.webContents.loadURL(url);
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "Failed to load URL" };
        }
    });

    const browserViewNavHandler = async (id: string, method: 'goBack' | 'goForward' | 'reload' | 'stop') => {
        try {
            const browserView = browserViews.get(id);
            if (!browserView) return { success: false, error: "BrowserView not found" };
            if (method === 'goBack' && browserView.webContents.canGoBack()) browserView.webContents.goBack();
            else if (method === 'goForward' && browserView.webContents.canGoForward()) browserView.webContents.goForward();
            else if (method === 'reload') browserView.webContents.reload();
            else if (method === 'stop') browserView.webContents.stop();
            else return { success: false, error: `Cannot ${method}` };
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : `Failed to ${method}` };
        }
    };

    ipcMain.handle("browserView:goBack", (_, id) => browserViewNavHandler(id, 'goBack'));
    ipcMain.handle("browserView:goForward", (_, id) => browserViewNavHandler(id, 'goForward'));
    ipcMain.handle("browserView:reload", (_, id) => browserViewNavHandler(id, 'reload'));
    ipcMain.handle("browserView:stop", (_, id) => browserViewNavHandler(id, 'stop'));

    ipcMain.handle("browserView:getURL", async (_event, id: string) => {
        try {
            const browserView = browserViews.get(id);
            if (!browserView) return { success: false, error: "BrowserView not found" };
            return { success: true, url: browserView.webContents.getURL() };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "Failed to get URL" };
        }
    });

    ipcMain.handle("browserView:getTitle", async (_event, id: string) => {
        try {
            const browserView = browserViews.get(id);
            if (!browserView) return { success: false, error: "BrowserView not found" };
            return { success: true, title: browserView.webContents.getTitle() };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "Failed to get title" };
        }
    });

    ipcMain.handle("browserView:canGoBack", async (_event, id: string) => {
        try {
            const browserView = browserViews.get(id);
            if (!browserView) return { success: false, error: "BrowserView not found" };
            return { success: true, canGoBack: browserView.webContents.canGoBack() };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "Failed to check" };
        }
    });

    ipcMain.handle("browserView:canGoForward", async (_event, id: string) => {
        try {
            const browserView = browserViews.get(id);
            if (!browserView) return { success: false, error: "BrowserView not found" };
            return { success: true, canGoForward: browserView.webContents.canGoForward() };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "Failed to check" };
        }
    });

    ipcMain.handle("browserView:setBounds", async (_event, id: string, bounds: Electron.Rectangle) => {
        try {
            const browserView = browserViews.get(id);
            if (!browserView) return { success: false, error: "BrowserView not found" };
            browserView.setBounds(bounds);
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "Failed to set bounds" };
        }
    });

    ipcMain.handle("browserView:destroy", async (_event, id: string) => {
        try {
            if (browserViews.has(id)) {
                browserViews.delete(id);
                return { success: true };
            }
            return { success: false, error: "BrowserView not found" };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "Failed to destroy" };
        }
    });

    ipcMain.handle("browserView:executeJavaScript", async (_event, id: string, code: string) => {
        try {
            const browserView = browserViews.get(id);
            if (!browserView) return { success: false, error: "BrowserView not found" };
            const result = await browserView.webContents.executeJavaScript(code);
            return { success: true, result };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "Failed to execute" };
        }
    });
}
