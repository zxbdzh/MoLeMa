import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowLeft, ArrowRight, ExternalLink, Loader2, AlertCircle, RotateCcw } from 'lucide-react'

interface WebPageBrowserProps {
  url: string;
  title: string;
  onClose: () => void;
  onFaviconSave?: (favicon: string) => void;
}

// 定义一个简单的样式对象用于解决 Electron 拖拽问题
const noDragStyle = { WebkitAppRegion: 'no-drag' } as const;

export default function WebPageBrowser({ url, title, onClose, onFaviconSave }: WebPageBrowserProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTitle, setCurrentTitle] = useState(title)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const webviewRef = useRef<HTMLWebViewElement>(null);

  const normalizedUrl = url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `https://${url}`;

  const faviconUrl = useRef<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleDidStartLoading = () => {
      setLoading(true);
      setError(null);
    }

    const handleDomReady = async () => {
      setLoading(false);
      try {
        const favicons = await webview.executeJavaScript(`
          (function() {
            const links = document.querySelectorAll('link[rel*="icon"]');
            const icons = [];
            links.forEach(link => {
              icons.push({ href: link.href, rel: link.getAttribute('rel') });
            });
            return icons;
          })()
        `) as any[];

        let faviconFound = false;
        if (favicons && favicons.length > 0) {
          let bestIcon = favicons.find(f => f.rel && f.rel.includes('apple-touch-icon')) ||
              favicons.find(f => f.rel === 'icon') ||
              favicons[0];

          if (bestIcon && bestIcon.href) {
            faviconUrl.current = bestIcon.href;
            faviconFound = true;
            if (onFaviconSave) onFaviconSave(bestIcon.href);
          }
        }

        if (!faviconFound) {
          try {
            const origin = new URL(normalizedUrl).origin;
            const faviconUrlPath = `${origin}/favicon.ico`;
            faviconUrl.current = faviconUrlPath;
            if (onFaviconSave) onFaviconSave(faviconUrlPath);
          } catch (err) {
            console.error(err);
          }
        }

        const pageTitle = await webview.executeJavaScript('document.title');
        if (pageTitle) setCurrentTitle(pageTitle);
      } catch (err) {
        console.error(err);
      }
    }

    const handleDidNavigate = (e: any) => {
      setLoading(true);
      setError(null);
      handleNavigationStateChange();
    }

    const handleDidNavigateInPage = (e: any) => {
      setLoading(false);
      handleNavigationStateChange();
    }

    const handleDidFailLoad = (e: any) => {
      setLoading(false);
      setError(`页面加载失败: ${e.errorDescription}`);
      handleNavigationStateChange();
    }

    const handleNewWindow = (e: any) => {
      e.preventDefault();
      window.open(e.url, '_blank');
    }

    const handleNavigationStateChange = () => {
      if (webviewRef.current) {
        setCanGoBack(webviewRef.current.canGoBack());
        setCanGoForward(webviewRef.current.canGoForward());
      }
    }

    const handleTitleUpdated = (e: any) => {
      setCurrentTitle(e.title);
    }

    webview.addEventListener('did-start-loading', handleDidStartLoading);
    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-navigate', handleDidNavigate);
    webview.addEventListener('did-navigate-in-page', handleDidNavigateInPage);
    webview.addEventListener('did-fail-load', handleDidFailLoad);
    webview.addEventListener('new-window', handleNewWindow);
    webview.addEventListener('page-title-updated', handleTitleUpdated);
    webview.addEventListener('did-frame-finish-load', handleNavigationStateChange);

    return () => {
      webview.removeEventListener('did-start-loading', handleDidStartLoading);
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-navigate', handleDidNavigate);
      webview.removeEventListener('did-navigate-in-page', handleDidNavigateInPage);
      webview.removeEventListener('did-fail-load', handleDidFailLoad);
      webview.removeEventListener('new-window', handleNewWindow);
      webview.removeEventListener('page-title-updated', handleTitleUpdated);
      webview.removeEventListener('did-frame-finish-load', handleNavigationStateChange);
    };
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    webviewRef.current?.reload();
  }

  const handleGoBack = () => {
    if (webviewRef.current && canGoBack) {
      webviewRef.current.goBack();
      setLoading(true);
    }
  }

  const handleGoForward = () => {
    if (webviewRef.current && canGoForward) {
      webviewRef.current.goForward();
      setLoading(true);
    }
  }

  return createPortal(
      <AnimatePresence>
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col"
        >
          {/* 标题栏
          FIX 1: 添加 relative z-50 shrink-0 确保标题栏在 webview 之上且不被压缩
        */}
          <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="w-full h-14 flex items-center justify-between px-4 border-b border-white/20 dark:border-white/20 bg-white/30 dark:bg-black/40 backdrop-blur-xl relative z-50 shrink-0"
          >
            {/* 左侧按钮组 */}
            {/* FIX 2: 给按钮组容器添加 no-drag 样式 (可选，但建议直接加在按钮上) */}
            <div className="flex items-center gap-3">
              <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleGoBack}
                  // FIX 3: 添加 no-drag 样式，防止 Electron 窗口拖拽拦截点击
                  style={noDragStyle as any}
                  className={`p-2 rounded-lg transition-colors ${canGoBack ? 'hover:bg-white/20 dark:hover:bg-white/20' : 'opacity-50 cursor-not-allowed'}`}
                  disabled={!canGoBack || loading}
                  title={canGoBack ? '后退' : '无法后退'}
              >
                <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-white" />
              </motion.button>
              <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleGoForward}
                  style={noDragStyle as any}
                  className={`p-2 rounded-lg transition-colors ${canGoForward ? 'hover:bg-white/20 dark:hover:bg-white/20' : 'opacity-50 cursor-not-allowed'}`}
                  disabled={!canGoForward || loading}
                  title={canGoForward ? '前进' : '无法前进'}
              >
                <ArrowRight className="w-5 h-5 text-gray-900 dark:text-white" />
              </motion.button>
              <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleRefresh}
                  style={noDragStyle as any}
                  className="p-2 hover:bg-white/20 dark:hover:bg-white/20 rounded-lg transition-colors"
                  title="刷新页面"
              >
                <RotateCcw className={`w-5 h-5 text-gray-900 dark:text-white ${loading ? 'animate-spin' : ''}`} />
              </motion.button>

              {faviconUrl.current && (
                  <img
                      src={faviconUrl.current}
                      alt=""
                      className="w-6 h-6 rounded flex-shrink-0"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
              )}
              <div className="max-w-xs md:max-w-md overflow-hidden text-ellipsis whitespace-nowrap">
                <span className="text-sm font-medium text-gray-900 dark:text-white select-none">{currentTitle}</span>
              </div>
            </div>

            {/* 右侧按钮组 */}
            <div className="flex items-center gap-2">
              <motion.a
                  href={loading ? undefined : normalizedUrl}
                  target={loading ? undefined : "_blank"}
                  rel="noopener noreferrer"
                  whileHover={loading ? {} : { scale: 1.1 }}
                  whileTap={loading ? {} : { scale: 0.9 }}
                  // FIX 4: 右侧按钮添加 no-drag 样式
                  style={noDragStyle as any}
                  className={`p-2 rounded-lg transition-colors ${
                      loading
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-white/20 dark:hover:bg-white/20'
                  }`}
                  title={loading ? '页面加载中' : '在外部浏览器打开'}
                  onClick={(e) => {
                    if (loading) e.preventDefault();
                  }}
              >
                <ExternalLink className="w-5 h-5 text-gray-900 dark:text-white" />
              </motion.a>
              <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  // FIX 5: 关闭按钮添加 no-drag 样式
                  style={noDragStyle as any}
                  className="p-2 hover:bg-white/20 dark:hover:bg-white/20 rounded-lg transition-colors"
                  title="关闭"
              >
                <X className="w-5 h-5 text-gray-900 dark:text-white" />
              </motion.button>
            </div>
          </motion.div>

          {/* webview 容器 */}
          <div className="flex-1 relative overflow-hidden bg-white dark:bg-slate-900">
            {/* Loading 和 Error 遮罩层逻辑保持不变 */}
            {loading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
                  <p className="text-gray-400 dark:text-gray-400 text-slate-600">加载中...</p>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-4 text-center">
                  <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">加载失败</h3>
                  <p className="text-gray-400 dark:text-gray-400 text-slate-600 mb-6">
                    {error === '页面加载失败' ? '无法加载该网站，请尝试在新标签页中打开' : error}
                  </p>
                  <div className="flex gap-4">
                    <button
                        onClick={handleRefresh}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                    >
                      重新加载
                    </button>
                    <a
                        href={normalizedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      在新标签页中打开
                    </a>
                  </div>
                </div>
            )}

            <webview
                ref={webviewRef}
                src={normalizedUrl}
                title={title}
                className="w-full h-full"
                partition="persist:webview"
                webpreferences="nodeIntegration=no, contextIsolation=yes, webSecurity=yes, allowRunningInsecureContent=no, allowDisplayingInsecureContent=no, allowPopups=yes, nativeWindowOpen=yes"
            />
          </div>
        </motion.div>
      </AnimatePresence>,
      document.body
  )
}
