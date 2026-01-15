import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowLeft, ExternalLink, Loader2, AlertCircle, Star, StarOff } from 'lucide-react'
import { useRSSStore } from '../store/rssStore'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface ArticleReaderProps {
  onClose: () => void
}

export default function ArticleReader({ onClose }: ArticleReaderProps) {
  const { currentArticle, currentFeed, isFavorite, toggleFavorite } = useRSSStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 锁定背景滚动
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  useEffect(() => {
    if (currentArticle) {
      setLoading(false)
      setError(null)
    }
  }, [currentArticle])

  if (!currentArticle) return null

  // 处理 HTML 内容，修复图片路径
  const processHtmlContent = (html: string) => {
    const div = document.createElement('div')
    div.innerHTML = html
    
    // 处理图片路径
    const images = div.querySelectorAll('img')
    images.forEach((img) => {
      const src = img.getAttribute('src')
      if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
        // 尝试将相对路径转换为绝对路径
        if (currentArticle.link) {
          try {
            const url = new URL(currentArticle.link)
            const baseUrl = `${url.protocol}//${url.host}`
            img.src = src.startsWith('/') ? `${baseUrl}${src}` : `${baseUrl}/${src}`
          } catch (e) {
            // 如果 URL 解析失败，保持原样
          }
        }
      }
    })
    
    return div.innerHTML
  }

  const processedContent = processHtmlContent(currentArticle.content)

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl max-h-[90vh] dark:bg-slate-900 bg-white rounded-2xl border border-white/10 dark:border-white/10 border-slate-200 shadow-2xl overflow-hidden flex flex-col"
        >
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 dark:border-white/10 border-slate-200 bg-black/20 dark:bg-black/20 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 hover:bg-white/10 dark:hover:bg-white/10 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
              <span className="text-sm text-gray-400 dark:text-gray-400 text-slate-600">
                {currentFeed?.title || 'RSS Reader'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <motion.a
                href={currentArticle.link}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 hover:bg-white/10 dark:hover:bg-white/10 hover:bg-slate-200 rounded-lg transition-colors"
                title="查看原文"
              >
                <ExternalLink className="w-5 h-5" />
              </motion.a>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => currentArticle && toggleFavorite(currentArticle)}
                className={`p-2 rounded-lg transition-colors ${
                  isFavorite(currentArticle)
                    ? 'text-yellow-400 hover:bg-yellow-500/20'
                    : 'text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-gray-300'
                }`}
                title={isFavorite(currentArticle) ? '取消收藏' : '收藏'}
              >
                {isFavorite(currentArticle) ? <Star className="w-5 h-5 fill-current" /> : <StarOff className="w-5 h-5" />}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          {/* 文章内容 */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 animate-spin text-purple-400 mb-4" />
                <p className="text-gray-400 dark:text-gray-400 text-slate-600">加载中...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20">
                <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                <p className="text-gray-400 dark:text-gray-400 text-slate-600">{error}</p>
              </div>
            ) : (
              <motion.article
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="prose prose-invert prose-lg max-w-none dark:prose-invert prose-slate"
              >
                <h1 className="text-3xl font-bold mb-4 dark:text-white text-slate-900">
                  {currentArticle.title}
                </h1>

                <div className="flex items-center gap-4 text-sm text-gray-400 dark:text-gray-400 text-slate-600 mb-6">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-purple-500 rounded-full" />
                    {format(new Date(currentArticle.pubDate), 'yyyy年MM月dd日 HH:mm', {
                      locale: zhCN
                    })}
                  </span>
                  {currentFeed && (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-blue-500 rounded-full" />
                      {currentFeed.title}
                    </span>
                  )}
                </div>

                <div className="bg-white/5 dark:bg-white/5 bg-slate-50 backdrop-blur-md rounded-xl p-6 border border-white/10 dark:border-white/10 border-slate-200">
                  <div 
                    className="dark:text-gray-300 text-slate-700 leading-relaxed prose prose-invert dark:prose-invert prose-slate"
                    dangerouslySetInnerHTML={{ __html: processedContent }}
                  />
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 pt-6 border-t border-white/10 dark:border-white/10 border-slate-200"
                >
                  <motion.a
                    href={currentArticle.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 rounded-xl font-medium text-white dark:text-white transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    查看原文
                  </motion.a>
                </motion.div>
              </motion.article>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
