import { ipcMain } from 'electron';
import { webPagesApi } from '../api/webPagesApi';

export function registerWebPagesHandlers() {
    ipcMain.handle("webPages:getAll", async () => {
        try {
            const webPages = webPagesApi.getAll();
            return { success: true, webPages };
        } catch (error) {
            console.error("Failed to get web pages:", error);
            return { success: false, error: "Failed to get web pages" };
        }
    });

    ipcMain.handle("webPages:create", async (_event, webPage) => {
        try {
            const id = webPagesApi.create(webPage);
            return { success: true, id };
        } catch (error) {
            console.error("Failed to create web page:", error);
            return { success: false, error: "Failed to create web page" };
        }
    });

    ipcMain.handle("webPages:update", async (_event, id, webPage) => {
        try {
            const result = webPagesApi.update(id, webPage);
            return { success: result };
        } catch (error) {
            console.error("Failed to update web page:", error);
            return { success: false, error: "Failed to update web page" };
        }
    });

    ipcMain.handle("webPages:delete", async (_event, id) => {
        try {
            const result = webPagesApi.delete(id);
            return { success: result };
        } catch (error) {
            console.error("Failed to delete web page:", error);
            return { success: false, error: "Failed to delete web page" };
        }
    });

    ipcMain.handle("webPagesCategories:getAll", async () => {
        try {
            const categories = webPagesApi.getAllCategories();
            return { success: true, categories };
        } catch (error) {
            console.error("Failed to get web page categories:", error);
            return { success: false, error: "Failed to get web page categories" };
        }
    });

    ipcMain.handle("webPagesCategories:getById", async (_event, id) => {
        try {
            const category = webPagesApi.getCategoryById(id);
            return { success: true, category };
        } catch (error) {
            console.error("Failed to get web page category by id:", error);
            return { success: false, error: "Failed to get web page category by id" };
        }
    });

    ipcMain.handle("webPagesCategories:create", async (_event, category) => {
        try {
            const id = webPagesApi.createCategory(category);
            return { success: true, id };
        } catch (error) {
            console.error("Failed to create web page category:", error);
            return { success: false, error: "Failed to create web page category" };
        }
    });

    ipcMain.handle("webPagesCategories:update", async (_event, id, category) => {
        try {
            const result = webPagesApi.updateCategory(id, category);
            return { success: result };
        } catch (error) {
            console.error("Failed to update web page category:", error);
            return { success: false, error: "Failed to update web page category" };
        }
    });

    ipcMain.handle("webPagesCategories:delete", async (_event, id) => {
        try {
            const result = webPagesApi.deleteCategory(id);
            return { success: result };
        } catch (error) {
            console.error("Failed to delete web page category:", error);
            return { success: false, error: "Failed to delete web page category" };
        }
    });

    ipcMain.handle("webPagesCategories:getWebPageCount", async (_event, categoryId) => {
        try {
            const count = webPagesApi.getCategoryWebPageCount(categoryId);
            return { success: true, count };
        } catch (error) {
            console.error("Failed to get web page count:", error);
            return { success: false, error: "Failed to get web page count" };
        }
    });
}
