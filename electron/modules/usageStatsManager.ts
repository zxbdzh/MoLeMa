import { usageStatsApi } from "../api/usageStatsApi";
import { setWindowStateCallback } from "./windowManager";

let currentSessionId: string | null = null;
let currentFeatureId: string | null = null;

function generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const usageStatsManager = {
    startNewSession(): void {
        if (currentSessionId) return;
        currentSessionId = generateSessionId();
        usageStatsApi.startSession(currentSessionId);
        console.log("Session started:", currentSessionId);
    },

    endCurrentSession(): void {
        if (currentSessionId) {
            if (currentFeatureId) {
                usageStatsApi.endFeatureUsage(currentFeatureId);
                currentFeatureId = null;
            }
            usageStatsApi.endSession(currentSessionId);
            console.log("Session ended:", currentSessionId);
            currentSessionId = null;
        }
    },

    pauseFeatureUsage(): void {
        if (currentFeatureId) {
            usageStatsApi.endFeatureUsage(currentFeatureId);
            currentFeatureId = null;
        }
    },

    startFeatureUsage(featureId: string): void {
        if (currentFeatureId) {
            usageStatsApi.endFeatureUsage(currentFeatureId);
        }
        currentFeatureId = featureId;
        usageStatsApi.startFeatureUsage(featureId);
    },

    getCurrentSessionId(): string | null {
        return currentSessionId;
    }
};

// 自动设置窗口焦点变化时的统计逻辑
setWindowStateCallback((focused) => {
    if (!focused) {
        usageStatsManager.pauseFeatureUsage();
    }
});
