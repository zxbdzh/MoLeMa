import { BrowserWindow, app } from "electron";
import path from "node:path";
import fs from "node:fs";

let mainWindow: BrowserWindow | null = null;
let isWindowVisible = false;
let isWindowFocused = false;

// 窗口状态变化回调
type WindowStateCallback = (focused: boolean) => void;
let windowStateCallback: WindowStateCallback | null = null;

/**
 * 设置窗口状态变化回调
 */
export function setWindowStateCallback(callback: WindowStateCallback) {
  windowStateCallback = callback;
}

/**
 * 获取图标路径（开发和生产环境兼容）
 */
function getIconPath(): string {
  if (process.env.NODE_ENV === "development") {
    return path.join(__dirname, "../../build/icon.png");
  } else {
    const possiblePaths = [
      path.join(process.resourcesPath, "build/icon.png"),
      path.join(process.resourcesPath, "../build/icon.png"),
      path.join(process.resourcesPath, "build/icons/icon.png"),
      path.join(process.resourcesPath, "icon.png"),
      path.join(process.resourcesPath, "app.asar.unpacked/build/icon.png")
    ];

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        return possiblePath;
      }
    }
  }
  return "";
}

/**
 * 创建主窗口
 */
export function createWindow() {
  const iconPath = getIconPath();
  const isDev = process.env.NODE_ENV === "development" || process.env.VITE_DEV_SERVER_URL;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    transparent: false,
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      webviewTag: true,
      allowRunningInsecureContent: false,
    },
    icon: iconPath,
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
  if (process.env.NODE_ENV === "development" || process.env.VITE_DEV_SERVER_URL) {
    console.log("Loading Vite dev server:", devServerUrl);
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools();
  } else {
    console.log("Loading from file");
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("ready-to-show", () => {
    if (!isWindowVisible) {
      mainWindow?.hide();
    } else {
      mainWindow?.show();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.on("close", () => {
    if (!app.isQuitting) {
      app.isQuitting = true;
      app.quit();
    }
  });

  mainWindow.on("minimize", () => {
    mainWindow?.hide();
  });

  mainWindow.on("blur", () => {
    if (isWindowFocused) {
      isWindowFocused = false;
      windowStateCallback?.(false);
      console.log("Window blurred");
      mainWindow?.webContents.send("window:focus-changed", false);
    }
  });

  mainWindow.on("focus", () => {
    if (!isWindowFocused) {
      isWindowFocused = true;
      console.log("Window focused");
      windowStateCallback?.(true);
      mainWindow?.webContents.send("window:focus-changed", true);
    }
  });
}

/**
 * 切换窗口显示/隐藏
 */
export function toggleWindow() {
  if (mainWindow) {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
      isWindowVisible = false;
    } else {
      mainWindow.show();
      mainWindow.focus();
      isWindowVisible = true;
      isWindowFocused = true;
    }
  }
}

/**
 * 显示窗口
 */
export function showWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    isWindowVisible = true;
    isWindowFocused = true;
  }
}

/**
 * 隐藏窗口
 */
export function hideWindow() {
  if (mainWindow) {
    mainWindow.hide();
    isWindowVisible = false;
  }
}

/**
 * 最小化窗口
 */
export function minimizeWindow() {
  mainWindow?.minimize();
}

/**
 * 最大化/还原窗口
 */
export function maximizeWindow() {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
}

/**
 * 关闭窗口
 */
export function closeWindow() {
  mainWindow?.close();
}

/**
 * 全屏切换
 */
export function toggleFullscreen() {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
}

/**
 * 检查是否全屏
 */
export function isFullscreen(): boolean {
  return mainWindow?.isFullScreen() || false;
}

/**
 * 获取主窗口实例
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

/**
 * 设置窗口可见状态
 */
export function setWindowVisible(visible: boolean) {
  isWindowVisible = visible;
}

/**
 * 获取窗口可见状态
 */
export function getWindowVisible(): boolean {
  return isWindowVisible;
}

/**
 * 获取窗口聚焦状态
 */
export function getWindowFocused(): boolean {
  return isWindowFocused;
}