import { ipcMain, shell } from 'electron';

export function registerShellHandlers() {
    ipcMain.handle("shell:openPath", async (_event, path: string) => {
        try {
            await shell.openPath(path);
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "Failed to open path" };
        }
    });

    ipcMain.handle("shell:showItemInFolder", async (_event, filePath: string) => {
        try {
            shell.showItemInFolder(filePath);
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : "Failed to show item in folder" };
        }
    });
}
