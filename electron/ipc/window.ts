import { ipcMain } from 'electron';
import {
    closeWindow,
    getWindowFocused,
    isFullscreen,
    maximizeWindow,
    minimizeWindow,
    toggleFullscreen,
    toggleWindow
} from "../modules/windowManager";

export function registerWindowHandlers() {
    ipcMain.on("toggle-window", () => toggleWindow());
    ipcMain.on("minimize-window", () => minimizeWindow());
    ipcMain.on("maximize-window", () => maximizeWindow());
    ipcMain.on("close-window", () => closeWindow());
    ipcMain.on("fullscreen-window", () => toggleFullscreen());

    ipcMain.handle("is-fullscreen", async () => {
        try {
            return { success: true, isFullscreen: isFullscreen() };
        } catch (error) {
            return { success: false, error: "Failed to check fullscreen status" };
        }
    });

    ipcMain.handle("window:isFocused", async () => {
        try {
            return { success: true, focused: getWindowFocused() };
        } catch (error) {
            return { success: false, error: "Failed to check window focused status" };
        }
    });
}
