import { Tray, Menu, nativeImage, app } from "electron";
import path from "node:path";
import fs from "node:fs";
import { toggleWindow } from "./windowManager";

let tray: Tray | null = null;

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
 * 创建系统托盘
 */
export function createTray() {
  const iconPath = getIconPath();

  try {
    tray = new Tray(iconPath);
  } catch (error) {
    console.warn("Failed to load tray icon, using default icon:", error);
    tray = new Tray(nativeImage.createEmpty());
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "显示/隐藏窗口",
      click: () => {
        toggleWindow();
      },
    },
    {
      label: "关于",
      click: () => {
        const { getMainWindow } = require("./windowManager");
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isVisible()) {
          toggleWindow();
        } else {
          mainWindow?.show();
        }
      },
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("摸了吗软件");
  tray.setContextMenu(contextMenu);

  tray.on("double-click", () => {
    toggleWindow();
  });
}

/**
 * 获取托盘实例
 */
export function getTray(): Tray | null {
  return tray;
}