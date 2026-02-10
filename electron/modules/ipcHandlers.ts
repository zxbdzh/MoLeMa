import { getMainWindow } from "./windowManager";
import { registerRSSHandlers } from "../ipc/rss";
import { registerNotesHandlers } from "../ipc/notes";
import { registerTodosHandlers } from "../ipc/todos";
import { registerWebPagesHandlers } from "../ipc/webPages";
import { registerRecordingsHandlers } from "../ipc/recordings";
import { registerWebDAVHandlers } from "../ipc/webdav";
import { registerSystemHandlers } from "../ipc/system";
import { registerNewsHandlers } from "../ipc/news";
import { registerBrowserViewHandlers } from "../ipc/browserView";
import { registerWindowHandlers } from "../ipc/window";
import { registerConfigHandlers } from "../ipc/config";
import { registerStatsHandlers } from "../ipc/stats";
import { registerShellHandlers } from "../ipc/shell";
import { registerShortcutHandlers } from "../ipc/shortcuts";
import { webdavService } from "../services/webdav/service";

/**
 * 注册所有 IPC 处理程序
 */
export function registerIPCHandlers() {
    // 设置 WebDAV 服务的主窗口引用
    webdavService.setMainWindow(getMainWindow());

    // 注册各模块的 IPC 处理程序
    registerRSSHandlers();
    registerNotesHandlers();
    registerTodosHandlers();
    registerWebPagesHandlers();
    registerRecordingsHandlers();
    registerWebDAVHandlers();
    registerNewsHandlers();
    registerBrowserViewHandlers();
    
    // 新拆分的模块
    registerWindowHandlers();
    registerConfigHandlers();
    registerStatsHandlers();
    registerShellHandlers();
    registerShortcutHandlers();
    registerSystemHandlers();

    console.log("IPC handlers registered");
}