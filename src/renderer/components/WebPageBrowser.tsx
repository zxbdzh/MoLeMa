import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowLeft, ExternalLink, Loader2, AlertCircle, Star, StarOff, RotateCcw } from 'lucide-react'

interface WebPageBrowserProps {
  url: string;
  title: string;
  description?: string;
  onClose: () => void;
  onFavoriteToggle?: (url: string) => void;
  isFavorite?: boolean;
}

export default function WebPageBrowser({ url, title, description, onClose, onFavoriteToggle, isFavorite }: WebPageBrowserProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const webviewRef = useRef<HTMLWebViewElement>(null);
  
  // 确保URL带有协议前缀
  const normalizedUrl = url.startsWith('http://') || url.startsWith('https://') 
    ? url 
    : `https://${url}`;

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

    // 处理webview加载结束
    const handleDidStopLoading = () => {
      setLoading(false);
    }

    // 处理webview加载失败
    const handleDidFailLoad = () => {
      setLoading(false);
      setError('页面加载失败');
    }

    // 处理新窗口请求
    const handleNewWindow = (e: any) => {
      e.preventDefault();
      window.open(e.url, '_blank');
    }

    // 添加事件监听器
    webview.addEventListener('did-start-loading', handleDidStartLoading);
    webview.addEventListener('did-stop-loading', handleDidStopLoading);
    webview.addEventListener('did-fail-load', handleDidFailLoad);
    webview.addEventListener('new-window', handleNewWindow);

    // 清理函数中移除事件监听器
    return () => {
      webview.removeEventListener('did-start-loading', handleDidStartLoading);
      webview.removeEventListener('did-stop-loading', handleDidStopLoading);
      webview.removeEventListener('did-fail-load', handleDidFailLoad);
      webview.removeEventListener('new-window', handleNewWindow);
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

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col"
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          className="w-full h-14 flex items-center justify-between px-4 border-b border-white/10 dark:border-white/10 border-slate-200 bg-black/20 dark:bg-black/20 bg-slate-50/50"
        >
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 hover:bg-white/10 dark:hover:bg-white/10 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <div className="max-w-xs md:max-w-md overflow-hidden text-ellipsis whitespace-nowrap">
              <span className="text-sm text-gray-400 dark:text-gray-400 text-slate-600">{title}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleRefresh}
              className="p-2 hover:bg-white/10 dark:hover:bg-white/10 hover:bg-slate-200 rounded-lg transition-colors"
              title="刷新页面"
            >
              <RotateCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </motion.button>
            <motion.a
              href={normalizedUrl}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 hover:bg-white/10 dark:hover:bg-white/10 hover:bg-slate-200 rounded-lg transition-colors"
              title="在外部浏览器打开"
            >
              <ExternalLink className="w-5 h-5" />
            </motion.a>
            {onFavoriteToggle && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onFavoriteToggle(url)}
                className={`p-2 rounded-lg transition-colors ${
                  isFavorite
                    ? 'text-yellow-400 hover:bg-yellow-500/20'
                    : 'text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-gray-300'
                }`}
                title={isFavorite ? '取消收藏' : '收藏'}
              >
                {isFavorite ? <Star className="w-5 h-5 fill-current" /> : <StarOff className="w-5 h-5" />}
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>

        <div className="flex-1 relative overflow-hidden bg-white dark:bg-slate-900">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <Loader2 className="w-12 h-12 animate-spin text-purple-400 mb-4" />
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
            webpreferences="nodeIntegration=no, contextIsolation=yes"
          />
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}