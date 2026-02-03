import { globalShortcut, app } from "electron";
import Store from "electron-store";
import { getMainWindow, toggleWindow } from "./windowManager";

interface StoreData {
  shortcuts: {
    toggleWindow: string;
    toggleRecording?: string;
  };
}

const store = new Store<StoreData>({
  name: "moyu-data",
  defaults: {
    shortcuts: {
      toggleWindow: "CommandOrControl+Alt+M",
      toggleRecording: "CommandOrControl+Shift+R",
    },
  },
});

/**
 * 获取快捷键配置
 */
export function getShortcuts(): StoreData["shortcuts"] {
  return store.get("shortcuts");
}

/**
 * 设置快捷键配置
 */
export function setShortcuts(shortcuts: StoreData["shortcuts"]) {
  store.set("shortcuts", shortcuts);
}

/**
 * 注册全局快捷键
 */
export function registerGlobalShortcuts() {
  console.log('>>> registerGlobalShortcuts 被调用');
  const shortcuts = getShortcuts();
  console.log('>>> 获取到的快捷键配置:', shortcuts);

  // 注册显示/隐藏窗口快捷键
  globalShortcut.register(shortcuts.toggleWindow, () => {
    console.log('>>> 全局快捷键触发: toggleWindow');
    toggleWindow();
  });
  console.log(`>>> 已注册 toggleWindow 快捷键: ${shortcuts.toggleWindow}`);

  // 注册录音切换快捷键
  if (shortcuts.toggleRecording) {
    globalShortcut.register(shortcuts.toggleRecording, () => {
      console.log('>>> 全局快捷键触发: toggleRecording（后台模式）');
      const mainWindow = getMainWindow();
      if (mainWindow) {
        console.log('>>> 发送 recording:toggle 消息到渲染进程');
        mainWindow.webContents.send('recording:toggle');
      } else {
        console.error('>>> mainWindow 不存在，无法发送消息');
      }
    });
    console.log(`>>> 已注册 toggleRecording 快捷键: ${shortcuts.toggleRecording}（后台模式）`);
  } else {
    console.log('>>> toggleRecording 快捷键为空，跳过注册');
  }

  console.log("全局快捷键已注册");
}

/**
 * 更新快捷键
 */
export async function updateShortcuts(newShortcuts: StoreData["shortcuts"]) {
  try {
    console.log('>>> updateShortcuts 被调用, shortcuts =', newShortcuts);
    
    const currentShortcuts = store.get('shortcuts') || {};
    console.log('>>> 当前快捷键配置:', currentShortcuts);
    const mainWindow = getMainWindow();
    
    // 注册 toggleWindow 快捷键
    if (newShortcuts.toggleWindow !== currentShortcuts.toggleWindow) {
      if (currentShortcuts.toggleWindow) {
        globalShortcut.unregister(currentShortcuts.toggleWindow);
        console.log('>>> 已注销旧的 toggleWindow 快捷键:', currentShortcuts.toggleWindow);
      }
      
      const registered = globalShortcut.register(newShortcuts.toggleWindow, () => {
        console.log('>>> 快捷键触发: toggleWindow');
        toggleWindow();
      });
      
      if (!registered) {
        console.error('>>> 注册 toggleWindow 快捷键失败:', newShortcuts.toggleWindow);
        return { success: false, error: 'Failed to register toggleWindow shortcut' };
      }
      console.log('>>> 已注册 toggleWindow 快捷键:', newShortcuts.toggleWindow);
    } else {
      console.log('>>> toggleWindow 快捷键未变化，跳过');
    }

    // 注册 toggleRecording 快捷键
    if (newShortcuts.toggleRecording !== currentShortcuts.toggleRecording) {
      if (currentShortcuts.toggleRecording) {
        globalShortcut.unregister(currentShortcuts.toggleRecording);
        console.log('>>> 已注销旧的 toggleRecording 快捷键:', currentShortcuts.toggleRecording);
      }
      
      if (newShortcuts.toggleRecording) {
        const registered = globalShortcut.register(newShortcuts.toggleRecording, () => {
          console.log('>>> 快捷键触发: toggleRecording（后台模式）');
          if (mainWindow) {
            console.log('>>> 发送 recording:toggle 消息到渲染进程');
            mainWindow.webContents.send('recording:toggle');
          } else {
            console.error('>>> mainWindow 不存在，无法发送消息');
          }
        });
        
        if (!registered) {
          console.error('>>> 注册 toggleRecording 快捷键失败:', newShortcuts.toggleRecording);
          return { success: false, error: 'Failed to register toggleRecording shortcut' };
        }
        console.log('>>> 已注册 toggleRecording 快捷键:', newShortcuts.toggleRecording, '（后台模式）');
      } else {
        console.log('>>> toggleRecording 快捷键为空，跳过');
      }
    } else {
      console.log('>>> toggleRecording 快捷键未变化，跳过');
    }

    setShortcuts(newShortcuts);
    console.log("快捷键已更新:", newShortcuts);

    // 通知渲染进程快捷键已更新
    mainWindow?.webContents.send("shortcuts:changed", newShortcuts);

    return { success: true };
  } catch (error) {
    console.error("Failed to update shortcuts:", error);
    return { success: false, error: "Failed to update shortcuts" };
  }
}

/**
 * 注销所有快捷键
 */
export function unregisterAllShortcuts() {
  globalShortcut.unregisterAll();
}