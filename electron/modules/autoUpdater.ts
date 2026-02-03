import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import { dialog, shell, app } from "electron";
import { getMainWindow } from "./windowManager";

let autoUpdateEnabled = true;

/**
 * 配置自动更新
 */
export async function setupAutoUpdater() {
  try {
    console.log("开始配置自动更新...");

    if (!app.isPackaged) {
      console.log("开发模式：将使用 dev-app-update.yml 配置");
      autoUpdater.fullChangelog = true;
    } else {
      console.log("生产模式：将使用标准配置");
      autoUpdater.fullChangelog = false;
    }

    const updateConfig = {
      provider: 'github',
      owner: 'zxbdzh',
      repo: 'MoLeMa',
    };

    console.log("自动更新配置:", JSON.stringify(updateConfig, null, 2));
    autoUpdater.setFeedURL(updateConfig);
    console.log("自动更新配置成功");

    if (app.isPackaged) {
      console.log("在生产环境中设置更新事件处理器");
    }
  } catch (error) {
    console.error("设置自动更新失败:", error);
    return;
  }

  // 监听更新事件
  autoUpdater.on("checking-for-update", () => {
    console.log("检查更新中...");
  });

  autoUpdater.on("update-available", (info) => {
    console.log("发现新版本:", info.version);
    const mainWindow = getMainWindow();
    mainWindow?.webContents.send("update:available", {
      version: info.version,
      releaseNotes: info.releaseNotes,
    });

    dialog
      .showMessageBox({
        type: "info",
        title: "发现新版本",
        message: `发现新版本 ${info.version}，点击确定开始下载...`,
        buttons: ["确定"],
      })
      .then(async () => {
        console.log("用户点击确定，开始下载更新...");
        
        mainWindow?.webContents.send("update:progress", {
          percent: 0,
          transferred: 0,
          total: 1,
          bytesPerSecond: 0,
          status: "started"
        });
        
        try {
          await autoUpdater.downloadUpdate();
          console.log("下载更新完成");
        } catch (error) {
          console.error("下载更新失败:", error);
          dialog.showMessageBox({
            type: "error",
            title: "下载错误",
            message: `下载更新失败: ${error.message}\n\n您可以前往 GitHub Releases 页面手动下载最新版本：\nhttps://github.com/zxbdzh/MoLeMa/releases`,
            buttons: ["确定", "前往 GitHub"],
            defaultId: 0,
            cancelId: 0,
          }).then(({ response }) => {
            if (response === 1) {
              shell.openExternal("https://github.com/zxbdzh/MoLeMa/releases");
            }
          });
        }
      });
  });

  autoUpdater.on("update-not-available", (info) => {
    console.log("当前已是最新版本:", info.version);
    const mainWindow = getMainWindow();
    mainWindow?.webContents.send("update:not-available", {
      version: info.version,
    });
  });

  autoUpdater.on("error", (err) => {
    console.error("自动更新错误:", err);

    if (err.message && (err.message.includes("app-update.yml") || err.message.includes("ENOENT"))) {
      console.warn("app-update.yml 文件问题，尝试继续使用默认配置:", err.message);
    }

    const mainWindow = getMainWindow();
    mainWindow?.webContents.send("update:error", {
      message: err.message,
    });
    
    dialog.showMessageBox({
      type: "error",
      title: "更新错误",
      message: `更新失败: ${err.message}\n\n您可以前往 GitHub Releases 页面手动下载最新版本：\nhttps://github.com/zxbdzh/MoLeMa/releases`,
      buttons: ["确定", "前往 GitHub"],
      defaultId: 0,
      cancelId: 0,
    }).then(({ response }) => {
      if (response === 1) {
        shell.openExternal("https://github.com/zxbdzh/MoLeMa/releases");
      }
    });
  });

  autoUpdater.on("download-progress", (progressObj) => {
    let logMessage = `下载进度: ${Math.floor(progressObj.percent)}%`;
    logMessage += ` (${progressObj.transferred}/${progressObj.total} bytes)`;
    logMessage += ` - ${Math.floor(progressObj.bytesPerSecond / 1024)} KB/s`;
    console.log(logMessage);
    const mainWindow = getMainWindow();
    mainWindow?.webContents.send("update:progress", {
      percent: progressObj.percent,
      transferred: progressObj.transferred,
      total: progressObj.total,
      bytesPerSecond: progressObj.bytesPerSecond,
      status: "downloading"
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log("更新下载完成:", info.version);
    const mainWindow = getMainWindow();
    mainWindow?.webContents.send("update:downloaded", {
      version: info.version,
    });

    dialog
      .showMessageBox({
        type: "info",
        title: "更新已就绪",
        message: `版本 ${info.version} 下载完成，是否立即安装并重启应用？`,
        buttons: ["立即安装", "稍后"],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });
}

/**
 * 检查更新
 */
export async function checkForUpdates() {
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    console.error("检查更新时出错:", error);
  }
}

/**
 * 获取自动更新状态
 */
export function getAutoUpdateEnabled(): boolean {
  return autoUpdateEnabled;
}

/**
 * 设置自动更新状态
 */
export function setAutoUpdateEnabled(enabled: boolean) {
  autoUpdateEnabled = enabled;
  console.log(`自动更新已${enabled ? '启用' : '禁用'}`);
}