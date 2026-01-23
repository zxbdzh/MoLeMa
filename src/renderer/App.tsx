import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Rss,
  FileText,
  CheckSquare,
  Home,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Monitor,
  X,
  Minimize,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Link,
} from "lucide-react";
import Tooltip from "./components/Tooltip";
import RSSPage from "./components/RSSPage";
import ArticleReader from "./components/ArticleReader";
import StarBackground from "./components/StarBackground";
import TodoList from "./components/TodoList";
import Settings from "./components/Settings";
import Notes from "./components/NotesNew";
import WebPages from "./components/WebPages";
import Stats from "./components/Stats";
import ConfirmDialog from "./components/ConfirmDialog";
import AlertDialog from "./components/AlertDialog";
import { ToastProvider } from "./components/Toast";
import { useRSSStore } from "./store/rssStore";

type TabType = "home" | "rss" | "notes" | "todo" | "webpages" | "settings";

function App() {
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [shortcuts, setShortcuts] = useState({
    toggleWindow: "CommandOrControl+Alt+M",
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    type?: "warning" | "info" | "success" | "error";
    title: string;
    message?: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: undefined,
  });
  const { currentArticle, setCurrentArticle } = useRSSStore();

  // 加载主题设置
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as
      | "dark"
      | "light"
      | "system"
      | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // 覆盖原生 alert 和 confirm
  useEffect(() => {
    // 保存原始函数
    const originalAlert = window.alert;
    const originalConfirm = window.confirm;

    // 覆盖 alert
    window.alert = (message: string) => {
      setAlertDialog({
        isOpen: true,
        type: "info",
        title: "提示",
        message: message,
        onConfirm: () => {
          setAlertDialog((prev) => ({ ...prev, isOpen: false }));
        },
      });
    };

    // 覆盖 confirm
    window.confirm = (message?: string): boolean => {
      let result = false;
      setAlertDialog({
        isOpen: true,
        type: "warning",
        title: "确认",
        message: message || "",
        onConfirm: () => {
          result = true;
          setAlertDialog((prev) => ({ ...prev, isOpen: false }));
        },
      });
      return result;
    };

    // 清理函数
    return () => {
      window.alert = originalAlert;
      window.confirm = originalConfirm;
    };
  }, []);

  // 加载侧边栏折叠状态
  useEffect(() => {
    const savedSidebarState = localStorage.getItem("sidebarCollapsed");
    if (savedSidebarState !== null) {
      setSidebarCollapsed(savedSidebarState === "true");
    }
  }, []);

  // 应用主题
  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
        : theme === "dark";

    if (isDark) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
  }, [theme]);

  // 监听系统主题变化
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const root = document.documentElement;
      const isDark = mediaQuery.matches;

      if (isDark) {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.remove("dark");
        root.classList.add("light");
      }
    };

    // 添加监听器
    mediaQuery.addEventListener("change", handleChange);

    // 清理监听器
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [theme]);

  // 保存主题设置
  const handleThemeChange = (newTheme: "dark" | "light" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  // 保存侧边栏折叠状态
  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
    localStorage.setItem("sidebarCollapsed", (!sidebarCollapsed).toString());
  };

  // 处理关闭窗口
  const handleCloseWindow = () => {
    setShowCloseDialog(true);
  };

  // 最小化到托盘
  const handleMinimizeToTray = () => {
    window.electronAPI?.minimizeWindow?.();
    setShowCloseDialog(false);
  };

  // 直接退出应用
  const handleQuitApp = () => {
    // 通知主进程准备退出
    window.electronAPI?.closeWindow?.();
    setShowCloseDialog(false);
  };

  // 加载快捷键配置
  useEffect(() => {
    window.electronAPI?.shortcuts?.get().then((config) => {
      if (config) {
        setShortcuts(config);
      }
    });
  }, []);

  // 监听快捷键变更
  useEffect(() => {
    const unsubscribe = window.electronAPI?.shortcuts?.onChanged?.(
      (newShortcuts) => {
        setShortcuts(newShortcuts);
      },
    );
    return unsubscribe;
  }, []);

  // 追踪功能使用情况
  useEffect(() => {
    let unsubscribeFocus: (() => void) | undefined;
    let currentFeatureId: string | null = null;

    const trackFeatureUsage = async (isWindowFocused: boolean = true) => {
      // 首页和设置不追踪
      if (activeTab === "home" || activeTab === "settings") {
        if (currentFeatureId && window.electronAPI?.stats?.endFeatureUsage) {
          await window.electronAPI.stats.endFeatureUsage(currentFeatureId);
          currentFeatureId = null;
        }
        return;
      }

      // 如果窗口未获焦，不开始/恢复统计
      if (!isWindowFocused) {
        if (currentFeatureId && window.electronAPI?.stats?.endFeatureUsage) {
          await window.electronAPI.stats.endFeatureUsage(currentFeatureId);
          currentFeatureId = null;
        }
        return;
      }

      // 结束之前的功能使用
      if (
        currentFeatureId &&
        currentFeatureId !== activeTab &&
        window.electronAPI?.stats?.endFeatureUsage
      ) {
        await window.electronAPI.stats.endFeatureUsage(currentFeatureId);
      }

      // 开始新的功能使用
      currentFeatureId = activeTab;
      if (window.electronAPI?.stats?.startFeatureUsage) {
        await window.electronAPI.stats.startFeatureUsage(activeTab);
      }
    };

    // 初始化：检查窗口焦点状态
    const initializeTracking = async () => {
      try {
        const result = await window.electronAPI?.window?.isFocused?.();
        const isFocused = result?.isFocused ?? true; // 默认认为窗口是获焦的
        await trackFeatureUsage(isFocused);
      } catch (error) {
        console.error("Failed to check window focus:", error);
        await trackFeatureUsage(true); // 出错时默认认为窗口获焦
      }
    };

    initializeTracking();

    // 监听窗口焦点变化
    if (window.electronAPI?.window?.onFocusChanged) {
      unsubscribeFocus = window.electronAPI.window.onFocusChanged(
        async (isFocused: boolean) => {
          console.log(
            "Window focus changed:",
            isFocused,
            "Current feature:",
            activeTab,
          );
          if (activeTab !== "home" && activeTab !== "settings") {
            if (isFocused) {
              // 窗口获焦，恢复功能统计
              currentFeatureId = activeTab;
              await trackFeatureUsage(true);
            } else {
              // 窗口失焦，暂停功能统计
              if (
                currentFeatureId &&
                window.electronAPI?.stats?.endFeatureUsage
              ) {
                await window.electronAPI.stats.endFeatureUsage(
                  currentFeatureId,
                );
                currentFeatureId = null;
              }
            }
          }
        },
      );
    }

    // 组件卸载时清理
    return () => {
      // 异步清理但不等待完成
      if (currentFeatureId && window.electronAPI?.stats?.endFeatureUsage) {
        void window.electronAPI.stats.endFeatureUsage(currentFeatureId);
        currentFeatureId = null;
      }
      if (unsubscribeFocus) {
        unsubscribeFocus();
      }
    };
  }, [activeTab]);

  const tabs = [
    {
      id: "home" as TabType,
      icon: <Home className="w-5 h-5" />,
      label: "首页",
    },
    {
      id: "rss" as TabType,
      icon: <Rss className="w-5 h-5" />,
      label: "RSS 订阅",
    },
    {
      id: "notes" as TabType,
      icon: <FileText className="w-5 h-5" />,
      label: "记事本",
    },
    {
      id: "todo" as TabType,
      icon: <CheckSquare className="w-5 h-5" />,
      label: "待办清单",
    },
    {
      id: "webpages" as TabType,
      icon: <Link className="w-5 h-5" />,
      label: "网页收藏",
    },
    {
      id: "settings" as TabType,
      icon: <SettingsIcon className="w-5 h-5" />,
      label: "设置",
    },
  ];

  return (
    <div
      className={`${theme === "dark" ? "dark" : "light"} min-h-screen bg-slate-950 dark:bg-slate-950 bg-slate-100 text-slate-900 dark:text-white relative overflow-hidden flex`}
    >
      {/* 星空背景 */}
      <StarBackground />

      {/* 左侧可折叠侧边栏 */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 64 : 224 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="fixed left-0 top-0 z-30 h-screen bg-slate-900 dark:bg-slate-900 bg-white border-r border-slate-800 dark:border-slate-800 border-slate-200 flex flex-col overflow-hidden"
      >
        {/* Logo 区域 */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-slate-800 dark:border-slate-800 border-slate-200">
          <AnimatePresence mode="wait">
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 overflow-hidden"
              >
                <img
                  src="/icon.png"
                  alt="摸了吗"
                  className="w-8 h-8 rounded-lg flex-shrink-0"
                />
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="font-bold font-heading dark:text-white text-slate-900 tracking-tight whitespace-nowrap"
                  style={{
                    fontSize: "16px",
                    lineHeight: "1",
                    display: "inline-block",
                    verticalAlign: "middle",
                    height: "20px",
                  }}
                >
                  摸了吗
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={handleSidebarToggle}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800/50 dark:hover:bg-slate-800/50 hover:bg-slate-100/50 text-slate-400 dark:text-slate-400 text-slate-600 hover:text-white dark:hover:text-white transition-colors cursor-pointer flex-shrink-0 ml-auto"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
          {tabs.map((tab) => (
            <Tooltip
              key={tab.id}
              content={tab.label}
              enabled={sidebarCollapsed}
            >
              <motion.button
                onClick={() => setActiveTab(tab.id)}
                initial={false}
                animate={{
                  width: "100%",
                  opacity: activeTab === tab.id ? 1 : 0.7,
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer group overflow-hidden ${
                  activeTab === tab.id
                    ? "bg-blue-500/10 dark:text-white text-slate-900"
                    : "text-slate-500 dark:text-slate-400 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                style={{
                  minWidth: sidebarCollapsed ? undefined : "100%",
                  padding: sidebarCollapsed ? "0.625rem" : "0.625rem 0.75rem",
                  justifyContent: sidebarCollapsed ? "center" : "flex-start",
                }}
              >
                <div
                  className={`flex-shrink-0 ${activeTab === tab.id ? "text-blue-400" : "group-hover:text-blue-400 transition-colors"}`}
                >
                  {tab.icon}
                </div>
                <AnimatePresence mode="wait">
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="font-medium text-sm whitespace-nowrap"
                    >
                      {tab.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 rounded-full"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            </Tooltip>
          ))}
        </nav>

        {/* 底部操作区域 - 固定位置 */}
        {!sidebarCollapsed && (
          <div className="p-2 border-t border-slate-800 dark:border-slate-800 border-slate-200 space-y-2">
            {/* 主题切换 */}
            <div className="group flex items-center justify-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => handleThemeChange("light")}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors cursor-pointer text-sm ${
                  theme === "light"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <Sun className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap overflow-hidden">浅色</span>
              </button>
              <button
                onClick={() => handleThemeChange("dark")}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors cursor-pointer text-sm ${
                  theme === "dark"
                    ? "bg-slate-700 dark:bg-slate-700 text-white dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <Moon className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap overflow-hidden">深色</span>
              </button>
              <button
                onClick={() => handleThemeChange("system")}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors cursor-pointer text-sm ${
                  theme === "system"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <Monitor className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap overflow-hidden">跟随</span>
              </button>
            </div>

            {/* 窗口控制按钮 */}
            <div className="group flex items-center justify-center gap-1">
              <button
                onClick={async () => {
                  await window.electronAPI?.fullscreenWindow?.();
                  const result = await window.electronAPI?.isFullscreen?.();
                  setIsFullscreen(result?.isFullscreen || false);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              >
                {isFullscreen ? (
                  <Minimize className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => window.electronAPI?.minimizeWindow?.()}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="currentColor"
                >
                  <rect
                    x="2"
                    y="5"
                    width="8"
                    height="2"
                    rx="0.5"
                    fill="currentColor"
                  />
                </svg>
              </button>
              <button
                onClick={handleCloseWindow}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </motion.aside>

      {/* 主内容区域 */}
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarCollapsed ? 64 : 224 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="flex-1 flex flex-col relative z-10 overflow-hidden"
      >
        {/* 顶部标题栏（仅显示当前页面标题） */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ WebkitAppRegion: "drag" } as any}
          className="h-14 px-6 flex items-center border-b border-slate-800 dark:border-slate-800 border-slate-200 bg-white dark:bg-slate-900"
        >
          <h1
            style={{ WebkitAppRegion: "no-drag" } as any}
            className="text-lg font-bold font-heading dark:text-white text-slate-900 select-none"
          >
            {tabs.find((t) => t.id === activeTab)?.label || "摸鱼"}
          </h1>
        </motion.header>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="p-6"
            >
              {activeTab === "home" && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="max-w-7xl mx-auto"
                >
                  <div className="text-center mb-8">
                    <motion.h2
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="text-4xl font-bold font-heading mb-4 dark:text-white text-slate-900"
                    >
                      欢迎使用摸了吗
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="text-slate-400 dark:text-slate-400 text-slate-600 text-lg"
                    >
                      使用快捷键{" "}
                      <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-sm mx-1 font-mono font-medium">
                        {shortcuts.toggleWindow}
                      </kbd>{" "}
                      快速显示/隐藏窗口
                    </motion.p>
                  </div>
                  <Stats />
                </motion.div>
              )}

              {activeTab === "rss" && <RSSPage />}
              {activeTab === "notes" && <Notes />}
              {activeTab === "todo" && <TodoList />}
              {activeTab === "webpages" && <WebPages />}
              {activeTab === "settings" && <Settings />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 文章阅读器 */}
        <AnimatePresence>
          {currentArticle && (
            <ArticleReader onClose={() => setCurrentArticle(null)} />
          )}
        </AnimatePresence>

        {/* 关闭确认弹窗 */}
        <ConfirmDialog
          isOpen={showCloseDialog}
          title="关闭应用"
          message="您希望如何关闭应用？"
          detail="最小化到托盘后，应用会在后台继续运行，可通过托盘图标或快捷键快速恢复"
          confirmText="直接退出"
          cancelText="取消"
          showMinimize={true}
          onMinimize={handleMinimizeToTray}
          onConfirm={handleQuitApp}
          onCancel={() => setShowCloseDialog(false)}
        />

        {/* 全局 Alert/Confirm 弹窗 */}
        <AlertDialog
          isOpen={alertDialog.isOpen}
          type={alertDialog.type}
          title={alertDialog.title}
          message={alertDialog.message}
          showCancel={alertDialog.type === "warning"}
          confirmText={alertDialog.type === "warning" ? "确定" : "确定"}
          cancelText="取消"
          onConfirm={() => {
            alertDialog.onConfirm?.();
            setAlertDialog((prev) => ({ ...prev, isOpen: false }));
          }}
          onCancel={() =>
            setAlertDialog((prev) => ({ ...prev, isOpen: false }))
          }
        />
      </motion.main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  onClick,
  index,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{
        y: -5,
        boxShadow: "0 20px 40px -10px rgba(0,0,0,0.3)",
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-blue-300 dark:hover:border-slate-600 transition-all duration-300 cursor-pointer group relative overflow-hidden"
    >
      <div className="relative z-10 mb-3">{icon}</div>
      <h3 className="relative z-10 text-lg font-bold font-heading mb-2 dark:text-white text-slate-900 group-hover:text-blue-600 transition-colors duration-200">
        {title}
      </h3>
      <p className="relative z-10 text-slate-400 dark:text-slate-400 text-slate-600 text-sm leading-relaxed">
        {description}
      </p>
      <div className="relative z-10 mt-4 flex items-center text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-4px] group-hover:translate-x-0">
        立即体验
        <svg
          className="w-4 h-4 ml-1 transition-transform duration-300 group-hover:translate-x-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </motion.div>
  );
}

// 用 ToastProvider 包装整个应用
export default function AppWrapper() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}
