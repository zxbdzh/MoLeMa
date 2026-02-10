import { ipcMain } from 'electron';
import { getShortcuts, updateShortcuts } from "../modules/shortcutManager";

export function registerShortcutHandlers() {
    ipcMain.handle("shortcuts:get", async () => {
        return getShortcuts();
    });

    ipcMain.handle("shortcuts:set", async (_event, shortcuts) => {
        return await updateShortcuts(shortcuts);
    });
}
