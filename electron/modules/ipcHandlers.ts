import { getMainWindow } from "./windowManager";
import { setMainWindow } from "../services/webdavSyncService";
import { registerRSSHandlers } from "../ipc/rss";
import { registerNotesHandlers } from "../ipc/notes";
import { registerTodosHandlers } from "../ipc/todos";
import { registerWebPagesHandlers } from "../ipc/webPages";
import { registerRecordingsHandlers } from "../ipc/recordings";
import { registerWebDAVHandlers } from "../ipc/webdav";
import { registerSystemHandlers } from "../ipc/system";
import { registerNewsHandlers } from "../ipc/news";
import { registerBrowserViewHandlers } from "../ipc/browserView";

/**
 * 注册所有 IPC 处理程序
 */
export function registerIPCHandlers() {
    // 设置 WebDAV 服务的主窗口引用
    setMainWindow(getMainWindow());

    // 注册各模块的 IPC 处理程序
    registerRSSHandlers();
    registerNotesHandlers();
    registerTodosHandlers();
    registerWebPagesHandlers();
    registerRecordingsHandlers();
    registerWebDAVHandlers();
    registerSystemHandlers();
    registerNewsHandlers();
    registerBrowserViewHandlers();

    console.log("IPC handlers registered");
}
