import { ipcMain } from 'electron';
import { usageStatsApi } from "../api/usageStatsApi";
import { usageStatsManager } from "../modules/usageStatsManager";

export function registerStatsHandlers() {
    ipcMain.handle("stats:startSession", async (_event, sessionId) => {
        try {
            return { success: usageStatsApi.startSession(sessionId) };
        } catch (error) {
            return { success: false, error: "Failed to start session" };
        }
    });

    ipcMain.handle("stats:endSession", async (_event, sessionId) => {
        try {
            return { success: usageStatsApi.endSession(sessionId) };
        } catch (error) {
            return { success: false, error: "Failed to end session" };
        }
    });

    ipcMain.handle("stats:startFeatureUsage", async (_event, featureId) => {
        try {
            const sessionId = usageStatsManager.getCurrentSessionId();
            if (!sessionId) return { success: false, error: "No active session" };
            return { success: usageStatsApi.startFeatureUsage(sessionId, featureId) };
        } catch (error) {
            return { success: false, error: "Failed to start feature usage" };
        }
    });

    ipcMain.handle("stats:endFeatureUsage", async (_event, featureId) => {
        try {
            return { success: usageStatsApi.endFeatureUsage(featureId) };
        } catch (error) {
            return { success: false, error: "Failed to end feature usage" };
        }
    });

    ipcMain.handle("stats:getAppUsage", async (_event, dimension) => {
        try {
            return { success: true, stats: usageStatsApi.getAppUsage(dimension) };
        } catch (error) {
            return { success: false, error: "Failed to get app usage" };
        }
    });

    ipcMain.handle("stats:getFeatureUsage", async (_event, featureId, dimension) => {
        try {
            const stats = usageStatsApi.getFeatureUsage(featureId, dimension);
            return { success: true, stats };
        } catch (error) {
            console.error("Failed to get feature usage:", error);
            return { success: false, error: "Failed to get feature usage" };
        }
    });

    ipcMain.handle("stats:getHistoryTrend", async (_event, dimension, days) => {
        try {
            return { success: true, trend: usageStatsApi.getHistoryTrend(dimension, days) };
        } catch (error) {
            return { success: false, error: "Failed to get history trend" };
        }
    });
}
