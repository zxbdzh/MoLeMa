import { dialog } from "electron";
import { getDatabase, seedDefaultData, closeDatabase } from "../database";
import { runMigration, createUsageStatsTables } from "../migration";

export const appInitializer = {
    async initialize(): Promise<void> {
        try {
            console.log('=== Initializing Application ===');
            const db = getDatabase();
            seedDefaultData(db);
            runMigration();
            createUsageStatsTables();
            console.log('=== Initialization Complete ===');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            dialog.showErrorBox('初始化失败', `应用初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
            throw error;
        }
    },

    cleanup(): void {
        closeDatabase();
    }
};
