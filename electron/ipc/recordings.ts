import { app, ipcMain } from 'electron';
import Store from 'electron-store';
import { recordingsApi } from '../api/recordingsApi';
import fs from 'fs';
import path from 'path';

const store = new Store({
    name: "moyu-data",
});

export function registerRecordingsHandlers() {
    ipcMain.handle("recordings:getAll", async () => {
        try {
            const recordings = recordingsApi.getAll();
            return { success: true, recordings };
        } catch (error) {
            console.error("Failed to get recordings:", error);
            return { success: false, error: "Failed to get recordings" };
        }
    });

    ipcMain.handle("recordings:create", async (_event, recording) => {
        try {
            const id = recordingsApi.create(recording);
            return { success: true, id };
        } catch (error) {
            console.error("Failed to create recording:", error);
            return { success: false, error: "Failed to create recording" };
        }
    });

    ipcMain.handle("recordings:delete", async (_event, id) => {
        try {
            const result = recordingsApi.delete(id);
            return { success: result };
        } catch (error) {
            console.error("Failed to delete recording:", error);
            return { success: false, error: "Failed to delete recording" };
        }
    });

    ipcMain.handle("recordings:getById", async (_event, id) => {
        try {
            const recording = recordingsApi.getById(id);
            return { success: true, recording };
        } catch (error) {
            console.error("Failed to get recording by id:", error);
            return { success: false, error: "Failed to get recording by id" };
        }
    });

    ipcMain.handle("recordings:update", async (_event, id, recording) => {
        try {
            const result = recordingsApi.update(id, recording);
            return { success: result };
        } catch (error) {
            console.error("Failed to update recording:", error);
            return { success: false, error: "Failed to update recording" };
        }
    });

    ipcMain.handle("recordings:count", async () => {
        try {
            const count = recordingsApi.count();
            return { success: true, count };
        } catch (error) {
            console.error("Failed to get recordings count:", error);
            return { success: false, error: "Failed to get recordings count" };
        }
    });

    ipcMain.handle("recordings:getStats", async () => {
        try {
            const stats = recordingsApi.getStats();
            return { success: true, stats };
        } catch (error) {
            console.error("Failed to get recordings stats:", error);
            return { success: false, error: "Failed to get recordings stats" };
        }
    });

    ipcMain.handle("recordings:scanDirectory", async () => {
        try {
            const savePath = store.get("recordings.savePath") as string || app.getPath("documents");

            if (!fs.existsSync(savePath)) {
                return { success: true, files: [] };
            }

            const files = fs.readdirSync(savePath)
                .filter(file => ['.wav', '.mp3', '.m4a', '.webm', '.ogg'].includes(
                    path.extname(file).toLowerCase()
                ))
                .map(file => {
                    const filePath = path.join(savePath, file);
                    const stats = fs.statSync(filePath);
                    return {
                        id: `${stats.mtime.getTime()}_${file}`,
                        file_name: file,
                        file_path: filePath,
                        created_at: stats.mtime.getTime(),
                        file_size: stats.size,
                        duration: 0,
                        notes: ''
                    };
                })
                .sort((a, b) => b.created_at - a.created_at);

            return { success: true, files };
        } catch (error) {
            console.error("Failed to scan directory:", error);
            return { success: false, error: "Failed to scan directory" };
        }
    });

    ipcMain.handle("recordings:getSavePath", async () => {
        try {
            const savePath = store.get("recordings.savePath") as string || app.getPath("documents");
            return { success: true, savePath };
        } catch (error) {
            console.error("Failed to get save path:", error);
            return { success: false, error: "Failed to get save path" };
        }
    });

    ipcMain.handle("recordings:setSavePath", async (_event, savePath: string) => {
        try {
            store.set("recordings.savePath", savePath);
            return { success: true };
        } catch (error) {
            console.error("Failed to set save path:", error);
            return { success: false, error: "Failed to set save path" };
        }
    });

    ipcMain.handle("recordings:getNamingPattern", async () => {
        try {
            const pattern = store.get("recordings.namingPattern") as string || "recording_{date}_{time}";
            return { success: true, pattern };
        } catch (error) {
            console.error("Failed to get naming pattern:", error);
            return { success: false, error: "Failed to get naming pattern" };
        }
    });

    ipcMain.handle("recordings:setNamingPattern", async (_event, pattern: string) => {
        try {
            store.set("recordings.namingPattern", pattern);
            return { success: true };
        } catch (error) {
            console.error("Failed to set naming pattern:", error);
            return { success: false, error: "Failed to set naming pattern" };
        }
    });

    ipcMain.handle("recordings:generateFileName", async (_event, prefix?: string) => {
        try {
            const pattern = store.get("recordings.namingPattern") as string || "recording_{date}_{time}";
            const now = new Date();
            const date = now.toISOString().split("T")[0];
            const time = now.toTimeString().split(" ")[0].replace(/:/g, "");
            const fileName = pattern
                .replace("{date}", date)
                .replace("{time}", time)
                .replace("{prefix}", prefix || "");
            return { success: true, fileName: `${fileName}.wav` };
        } catch (error) {
            console.error("Failed to generate file name:", error);
            return { success: false, error: "Failed to generate file name" };
        }
    });

    ipcMain.handle("recordings:getDefaultDevice", async () => {
        try {
            const defaultDevice = store.get("recordings.defaultDevice") as string || "";
            return { success: true, deviceId: defaultDevice };
        } catch (error) {
            console.error("Failed to get default device:", error);
            return { success: false, error: "Failed to get default device" };
        }
    });

    ipcMain.handle("recordings:setDefaultDevice", async (_event, deviceId: string) => {
        try {
            store.set("recordings.defaultDevice", deviceId);
            return { success: true };
        } catch (error) {
            console.error("Failed to set default device:", error);
            return { success: false, error: "Failed to set default device" };
        }
    });

    ipcMain.handle("recordings:getMicVolume", async () => {
        try {
            const volume = store.get("recordings.micVolume") as number || 100;
            return { success: true, volume };
        } catch (error) {
            console.error("Failed to get mic volume:", error);
            return { success: false, error: "Failed to get mic volume" };
        }
    });

    ipcMain.handle("recordings:setMicVolume", async (_event, volume: number) => {
        try {
            store.set("recordings.micVolume", volume);
            return { success: true };
        } catch (error) {
            console.error("Failed to set mic volume:", error);
            return { success: false, error: "Failed to set mic volume" };
        }
    });

    ipcMain.handle("recordings:deleteFile", async (_event, filePath: string) => {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return { success: true };
            }
            return { success: false, error: "File not found" };
        } catch (error) {
            console.error("Failed to delete file:", error);
            return { success: false, error: "Failed to delete file" };
        }
    });

    ipcMain.handle("recordings:saveFile", async (_event, fileName: string, fileData: ArrayBuffer, savePath?: string) => {
        try {
            const targetPath = savePath || store.get("recordings.savePath") as string || app.getPath("documents");
            const fullPath = path.join(targetPath, fileName);

            if (!fs.existsSync(targetPath)) {
                fs.mkdirSync(targetPath, { recursive: true });
            }

            fs.writeFileSync(fullPath, Buffer.from(fileData));
            return { success: true, filePath: fullPath };
        } catch (error) {
            console.error("Failed to save file:", error);
            return { success: false, error: "Failed to save file" };
        }
    });
}
