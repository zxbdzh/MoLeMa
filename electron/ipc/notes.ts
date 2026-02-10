import { ipcMain } from 'electron';
import { notesApi } from '../api/notesApi';

export function registerNotesHandlers() {
    ipcMain.handle("notes:getAll", async () => {
        try {
            const notes = notesApi.getAll();
            return { success: true, notes };
        } catch (error) {
            console.error("Failed to get notes:", error);
            return { success: false, error: "Failed to get notes" };
        }
    });

    ipcMain.handle("notes:create", async (_event, note) => {
        try {
            const id = notesApi.create(note);
            return { success: true, id };
        } catch (error) {
            console.error("Failed to create note:", error);
            return { success: false, error: "Failed to create note" };
        }
    });

    ipcMain.handle("notes:update", async (_event, id, note) => {
        try {
            const result = notesApi.update(id, note);
            return { success: result };
        } catch (error) {
            console.error("Failed to update note:", error);
            return { success: false, error: "Failed to update note" };
        }
    });

    ipcMain.handle("notes:delete", async (_event, id) => {
        try {
            const result = notesApi.delete(id);
            return { success: result };
        } catch (error) {
            console.error("Failed to delete note:", error);
            return { success: false, error: "Failed to delete note" };
        }
    });
}
