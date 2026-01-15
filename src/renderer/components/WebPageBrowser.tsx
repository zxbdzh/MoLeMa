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

export default function WebPageBrowser({ url, title, onClose, onFaviconSave }: WebPageBrowserProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTitle, setCurrentTitle] = useState(title) // 添加状态跟踪当前页面标题
  const [canGoBack, setCanGoBack] = useState(false) // 添加后退状态
  const [canGoForward, setCanGoForward] = useState(false) // 添加前进状态
  const webviewRef = useRef<HTMLWebViewElement>(null);

  // 确保URL带有协议前缀
  const normalizedUrl = url.startsWith('http://') || url.startsWith('https://')
    ? url
    : `https://${url}`;

  // 保存 favicon URL
  const faviconUrl = useRef<string | null>(null);

  useEffect(() => {
    // 锁定背景滚动
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    // 处理webview加载开始
    const handleDidStartLoading = () => {
      setLoading(true);
      setError(null);
    }

    // 处理webview DOM 准备就绪（优先使用，提前结束loading）
    const handleDomReady = async () => {
      setLoading(false);
      // 尝试获取网页 favicon 和标题
      try {
        // 获取 favicon
        const favicons = await webview.executeJavaScript(`
          (function() {
            const links = document.querySelectorAll('link[rel*="icon"]');
            const icons = [];
            links.forEach(link => {
              const href = link.href;
             
              const sizes = link.getAttribute('sizes');
              const type = link.getAttribute('type');
              const rel = link.getAttribute('rel');
              icons.push({ href, sizes, type, rel });
            });
            return icons;
          })()
        `) as any[];

        let faviconFound = false;
        
        if (favicons && favicons.length > 0) {
          // 找到最佳 favicon（优先使用 apple-touch-icon，然后是 icon）
          let bestIcon = favicons.find(f => f.rel && f.rel.includes('apple-touch-icon'));
          if (!bestIcon) {
            bestIcon = favicons.find(f => f.rel === 'icon');
          }
          if (!bestIcon) {
            bestIcon = favicons[0];
          }

          // 保存 favicon URL
          if (bestIcon && bestIcon.href) {
            faviconUrl.current = bestIcon.href;
            faviconFound = true;
            console.log('Found favicon:', bestIcon.href);

            // 立即保存 favicon 到数据库
            if (onFaviconSave) {
              onFaviconSave(bestIcon.href);
            }
          }
        }
        
        // 如果没有获取到 favicon，尝试使用网站根目录的 favicon.ico
        if (!faviconFound) {
          try {
            const origin = new URL(normalizedUrl).origin;
            const faviconUrlPath = `${origin}/favicon.ico`;
            // 尝试设置 favicon.ico 作为备用
            faviconUrl.current = faviconUrlPath;
            console.log('Using default favicon at root:', faviconUrlPath);
            
            // 保存 favicon 到数据库
            if (onFaviconSave) {
              onFaviconSave(faviconUrlPath);
            }
          } catch (err) {
            console.error('Failed to set default favicon.ico:', err);
          }
        }
        
        // 获取页面标题
        const pageTitle = await webview.executeJavaScript('document.title');
        if (pageTitle) {
          setCurrentTitle(pageTitle);
        }
      } catch (err) {
        console.error('Failed to get favicon or title:', err);
      }
    }

    // 处理页面导航（跳转链接时触发）
    const handleDidNavigate = (e: any) => {
      console.log('Page navigated to:', e.url);
      setLoading(true);
      setError(null);
    }

    // 处理页面内导航（如锚点链接）
    const handleDidNavigateInPage = (e: any) => {
      console.log('Navigated within page to:', e.url);
      setLoading(false);
    }

    // 处理webview加载失败
    const handleDidFailLoad = (e: any) => {
      console.error('Page load failed:', e);
      setLoading(false);
      setError(`页面加载失败: ${e.errorDescription}`);
    }

    // 处理新窗口请求
    const handleNewWindow = (e: any) => {
      e.preventDefault();
      window.open(e.url, '_blank');
    }

    // 处理页面权限请求
    const handlePermissionRequest = (e: any) => {
      console.log('Permission requested:', e.permission);
      // 对于某些权限请求，允许它们
      if (['media', 'geolocation', 'notifications'].includes(e.permission)) {
        e.preventDefault();
        e.callback(false); // 拒绝这些权限
      }
      // 对于其他权限，默认允许
    }
    
    // 处理页面标题更新
    const handleTitleUpdated = (e: any) => {
      console.log('Title updated:', e.title);
      setCurrentTitle(e.title);
    }

    // 处理导航状态更新
    const handleUpdateTargetUrl = (e: any) => {
      // 暂时记录目标 URL，可以用于调试
      console.log('Target URL updated:', e.url);
    }

    // 处理导航状态变化
    const handleNavigationStateChange = () => {
      // 更新导航状态
      if (webviewRef.current) {
        setCanGoBack(webviewRef.current.canGoBack());
        setCanGoForward(webviewRef.current.canGoForward());
      }
    }

    // 定义复合处理函数
    const handleDidNavigateWithStateUpdate = (e: any) => {
      handleDidNavigate(e);
      handleNavigationStateChange();
    };
    
    const handleDidNavigateInPageWithStateUpdate = (e: any) => {
      handleDidNavigateInPage(e);
      handleNavigationStateChange();
    };
    
    const handleDidFailLoadWithStateUpdate = (e: any) => {
      handleDidFailLoad(e);
      handleNavigationStateChange();
    };

    // 添加事件监听器
    webview.addEventListener('did-start-loading', handleDidStartLoading);
    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-navigate', handleDidNavigateWithStateUpdate);  // 监听页面跳转
    webview.addEventListener('did-navigate-in-page', handleDidNavigateInPageWithStateUpdate);  // 监听页面内跳转
    webview.addEventListener('did-fail-load', handleDidFailLoadWithStateUpdate);
    webview.addEventListener('new-window', handleNewWindow);
    webview.addEventListener('permission-request', handlePermissionRequest);
    webview.addEventListener('page-title-updated', handleTitleUpdated);
    webview.addEventListener('update-target-url', handleUpdateTargetUrl);
    webview.addEventListener('did-frame-finish-load', handleNavigationStateChange); // 页面加载完成时更新导航状态

    // 清理函数中移除事件监听器
    return () => {
      webview.removeEventListener('did-start-loading', handleDidStartLoading);
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-navigate', handleDidNavigateWithStateUpdate);
      webview.removeEventListener('did-navigate-in-page', handleDidNavigateInPageWithStateUpdate);
      webview.removeEventListener('did-fail-load', handleDidFailLoadWithStateUpdate);
      webview.removeEventListener('new-window', handleNewWindow);
      webview.removeEventListener('permission-request', handlePermissionRequest);
      webview.removeEventListener('page-title-updated', handleTitleUpdated);
      webview.removeEventListener('update-target-url', handleUpdateTargetUrl);
      webview.removeEventListener('did-frame-finish-load', handleNavigationStateChange);
    };
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    // 强制webview重新加载
    if (webviewRef.current) {
      webviewRef.current.reload();
    }
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
        {/* 标题栏 */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="w-full h-14 flex items-center justify-between px-4 border-b border-white/20 dark:border-white/20 bg-white/30 dark:bg-black/40 backdrop-blur-xl"
        >
          {/* 左侧按钮组 */}
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleGoBack}
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
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div className="max-w-xs md:max-w-md overflow-hidden text-ellipsis whitespace-nowrap">
              <span className="text-sm font-medium text-gray-900 dark:text-white">{currentTitle}</span>
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
              className={`p-2 rounded-lg transition-colors ${
                loading
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-white/20 dark:hover:bg-white/20'
              }`}
              title={loading ? '页面加载中' : '在外部浏览器打开'}
              onClick={(e) => {
                if (loading) {
                  e.preventDefault();
                }
              }}
            >
              <ExternalLink className="w-5 h-5 text-gray-900 dark:text-white" />
            </motion.a>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 hover:bg-white/20 dark:hover:bg-white/20 rounded-lg transition-colors"
              title="关闭"
            >
              <X className="w-5 h-5 text-gray-900 dark:text-white" />
            </motion.button>
          </div>
        </motion.div>

        {/* webview 容器 */}
        <div className="flex-1 relative overflow-hidden bg-white dark:bg-slate-900">
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
                {error === '页面加载失败'
                  ? '无法加载该网站，请尝试在新标签页中打开'
                  : error}
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

          {/* 使用webview替代iframe */}
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
