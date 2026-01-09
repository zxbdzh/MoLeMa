import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, RefreshCw, Rss, Clock, ExternalLink, Star, StarOff } from 'lucide-react'
import { useRSSStore } from '../store/rssStore'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// 预设的 RSS 源
const PRESET_FEEDS = [
  { name: '阮一峰的网络日志', url: 'http://www.ruanyifeng.com/blog/atom.xml' },
  { name: '掘金前端', url: 'https://juejin.cn/rss/fe' },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { name: 'InfoQ 中文', url: 'https://www.infoq.cn/feed' }
]

export default function RSSPage() {
  const { feeds, currentFeed, currentArticle, favorites, addFeed, removeFeed, setCurrentFeed, setCurrentArticle, refreshFeed, isFavorite, toggleFavorite } = useRSSStore()
  const [newFeedUrl, setNewFeedUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<'feeds' | 'favorites'>('feeds')

  const handleAddFeed = async () => {
    if (!newFeedUrl.trim()) return

    setIsLoading(true)
    setError('')

    try {
      await addFeed(newFeedUrl.trim())
      setNewFeedUrl('')
    } catch (err) {
      setError('添加 RSS 源失败，请检查 URL 是否正确')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddPresetFeed = async (url: string) => {
    setIsLoading(true)
    setError('')

    try {
      await addFeed(url)
    } catch (err) {
      setError('添加 RSS 源失败，请检查 URL 是否正确')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefreshFeed = async (url: string) => {
    setIsLoading(true)
    setError('')

    try {
      await refreshFeed(url)
    } catch (err) {
      setError('刷新 RSS 源失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveFeed = (url: string) => {
    if (confirm('确定要删除这个 RSS 源吗？')) {
      removeFeed(url)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Rss className="w-8 h-8 text-purple-400" />
            RSS 订阅
          </h1>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('feeds')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'feeds'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-gray-400 hover:text-white'
              }`}
            >
              订阅源
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('favorites')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                viewMode === 'favorites'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/10 text-gray-400 hover:text-white'
              }`}
            >
              <Star className="w-4 h-4" />
              收藏夹
              {favorites.length > 0 && (
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                  {favorites.length}
                </span>
              )}
            </motion.button>
          </div>
        </div>
        <p className="text-gray-400">订阅你喜欢的技术博客，实时获取最新文章</p>
      </motion.div>

      {/* 添加 RSS 源 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 mb-8"
      >
        <h2 className="text-xl font-bold mb-4">添加 RSS 源</h2>

        {/* 预设 RSS 源 */}
        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-2">推荐订阅：</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_FEEDS.map((feed) => (
              <motion.button
                key={feed.url}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAddPresetFeed(feed.url)}
                className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-sm transition-colors"
              >
                {feed.name}
              </motion.button>
            ))}
          </div>
        </div>

        {/* 自定义 RSS 源 */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newFeedUrl}
            onChange={(e) => setNewFeedUrl(e.target.value)}
            placeholder="输入 RSS 源 URL..."
            className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500"
            onKeyPress={(e) => e.key === 'Enter' && handleAddFeed()}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAddFeed}
            disabled={isLoading}
            className="px-6 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            添加
          </motion.button>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-red-400 text-sm"
          >
            {error}
          </motion.p>
        )}
      </motion.div>

      {/* RSS 源列表 */}
      {viewMode === 'feeds' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：RSS 源列表 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="space-y-3">
              {feeds.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Rss className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>还没有订阅任何 RSS 源</p>
                  <p className="text-sm">添加一个 RSS 源开始阅读吧！</p>
                </div>
              ) : (
                feeds.map((feed, index) => (
                  <motion.div
                    key={feed.url}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setCurrentFeed(feed)}
                    className={`p-4 rounded-xl cursor-pointer transition-all ${
                      currentFeed?.url === feed.url
                        ? 'bg-purple-500/20 border-purple-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    } border`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate mb-1">{feed.title}</h3>
                        <p className="text-sm text-gray-400 truncate">{feed.description}</p>
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {feed.items.length} 篇文章
                        </p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRefreshFeed(feed.url)
                          }}
                          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-4 h-4 text-gray-400" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveFeed(feed.url)
                          }}
                          className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* 右侧：文章列表 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            {!currentFeed ? (
              <div className="text-center py-12 text-gray-500">
                <Rss className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>选择一个 RSS 源查看文章</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">{currentFeed.title}</h2>
                  <span className="text-sm text-gray-400">{currentFeed.items.length} 篇文章</span>
                </div>

                {currentFeed.items.map((item, index) => (
                  <motion.article
                    key={item.guid}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.01, y: -2 }}
                    onClick={() => setCurrentArticle(item)}
                    className="p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 hover:border-purple-500/50 cursor-pointer transition-all"
                  >
                    <h3 className="font-bold mb-2 hover:text-purple-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                      {item.contentSnippet}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(item.pubDate), {
                          addSuffix: true,
                          locale: zhCN
                        })}
                      </span>
                      <motion.a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-purple-400 hover:text-purple-300"
                      >
                        <ExternalLink className="w-3 h-3" />
                        查看原文
                      </motion.a>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* 收藏夹视图 */}
      {viewMode === 'favorites' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {favorites.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <StarOff className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>还没有收藏文章</p>
              <p className="text-sm mt-2">在阅读文章时点击收藏按钮即可</p>
            </div>
          ) : (
            favorites.map((item, index) => (
              <motion.article
                key={item.guid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.01, y: -2 }}
                onClick={() => setCurrentArticle(item)}
                className="p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 hover:border-purple-500/50 cursor-pointer transition-all"
              >
                <h3 className="font-bold mb-2 hover:text-purple-400 transition-colors">
                  {item.title}
                </h3>
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                  {item.contentSnippet}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(item.pubDate), {
                      addSuffix: true,
                      locale: zhCN
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(item)
                      }}
                      className="flex items-center gap-1 text-yellow-400 hover:text-yellow-300"
                    >
                      <Star className="w-3 h-3 fill-current" />
                      取消收藏
                    </motion.button>
                    <motion.a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-purple-400 hover:text-purple-300"
                    >
                      <ExternalLink className="w-3 h-3" />
                      查看原文
                    </motion.a>
                  </div>
                </div>
              </motion.article>
            ))
          )}
        </motion.div>
      )}
    </div>
  )
}