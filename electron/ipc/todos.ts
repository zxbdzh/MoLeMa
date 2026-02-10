import { ipcMain } from 'electron';
import { todosApi } from '../api/todosApi';

export function registerTodosHandlers() {
    ipcMain.handle("todos:getAll", async () => {
        try {
            const todos = todosApi.getAll();
            return { success: true, todos };
        } catch (error) {
            console.error("Failed to get todos:", error);
            return { success: false, error: "Failed to get todos" };
        }
    });

    ipcMain.handle("todos:create", async (_event, todo) => {
        try {
            const id = todosApi.create(todo);
            return { success: true, id };
        } catch (error) {
            console.error("Failed to create todo:", error);
            return { success: false, error: "Failed to create todo" };
        }
    });

    ipcMain.handle("todos:toggle", async (_event, id) => {
        try {
            const result = todosApi.toggle(id);
            return { success: result };
        } catch (error) {
            console.error("Failed to toggle todo:", error);
            return { success: false, error: "Failed to toggle todo" };
        }
    });

    ipcMain.handle("todos:updateOrder", async (_event, orderedIds) => {
        try {
            const result = todosApi.updateOrder(orderedIds);
            return { success: result };
        } catch (error) {
            console.error("Failed to update todo order:", error);
            return { success: false, error: "Failed to update todo order" };
        }
    });

    ipcMain.handle("todos:getCompletionStats", async () => {
        try {
            const stats = todosApi.getCompletionStats();
            return { success: true, stats };
        } catch (error) {
            console.error("Failed to get completion stats:", error);
            return { success: false, error: "Failed to get completion stats" };
        }
    });

    ipcMain.handle("todos:getPending", async (_event, page, pageSize) => {
        try {
            const result = todosApi.getPendingTodos(page, pageSize);
            return { success: true, ...result };
        } catch (error) {
            console.error("Failed to get pending todos:", error);
            return { success: false, error: "Failed to get pending todos" };
        }
    });

    ipcMain.handle("todos:getCompleted", async (_event, page, pageSize) => {
        try {
            const result = todosApi.getCompletedTodos(page, pageSize);
            return { success: true, ...result };
        } catch (error) {
            console.error("Failed to get completed todos:", error);
            return { success: false, error: "Failed to get completed todos" };
        }
    });

    ipcMain.handle("todos:clearCompleted", async () => {
        try {
            const count = todosApi.clearCompleted();
            return { success: true, count };
        } catch (error) {
            console.error("Failed to clear completed todos:", error);
            return { success: false, error: "Failed to clear completed todos" };
        }
    });

    ipcMain.handle("todos:delete", async (_event, id) => {
        try {
            const result = todosApi.delete(id);
            return { success: result };
        } catch (error) {
            console.error("Failed to delete todo:", error);
            return { success: false, error: "Failed to delete todo" };
        }
    });
}
