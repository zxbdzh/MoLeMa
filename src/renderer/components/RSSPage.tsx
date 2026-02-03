import { useState } from 'react'
import { Plus, Trash2, RefreshCw, Rss, Clock, ExternalLink, Star, StarOff } from 'lucide-react'
import { useRSSStore } from '../store/rssStore'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import AlertDialog from './AlertDialog'

// 预设的 RSS 源
const PRESET_FEEDS = [
  { name: '阮一峰的网络日志', url: 'http://www.ruanyifeng.com/blog/atom.xml' },
  { name: '掘金前端', url: 'https://juejin.cn/rss/fe' },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { name: 'InfoQ 中文', url: 'https://www.infoq.cn/feed' }
]

export default function RSSPage() {
  const { feeds, currentFeed, favorites, addFeed, removeFeed, setCurrentFeed, setCurrentArticle, refreshFeed, toggleFavorite } = useRSSStore()
  const [newFeedUrl, setNewFeedUrl] = useState('')
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<'feeds' | 'favorites'>('feeds')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [feedToDelete, setFeedToDelete] = useState<string | null>(null)

  const setLoading = (key: string, value: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }))
  }

  const handleAddFeed = async () => {
    if (!newFeedUrl.trim()) return

    setLoading('add', true)
    setError('')

    try {
      await addFeed(newFeedUrl.trim())
      setNewFeedUrl('')
    } catch (err) {
      setError('添加 RSS 源失败，请检查 URL 是否正确')
    } finally {
      setLoading('add', false)
    }
  }

  const handleAddPresetFeed = async (url: string) => {
    setLoading(`preset-${url}`, true)
    setError('')

    try {
      await addFeed(url)
    } catch (err) {
      setError('添加 RSS 源失败，请检查 URL 是否正确')
    } finally {
      setLoading(`preset-${url}`, false)
    }
  }

  const handleRefreshFeed = async (url: string) => {
    setLoading(`refresh-${url}`, true)
    setError('')

    try {
      await refreshFeed(url)
    } catch (err) {
      setError('刷新 RSS 源失败')
    } finally {
      setLoading(`refresh-${url}`, false)
    }
  }

  const handleRemoveFeed = (url: string) => {
    setFeedToDelete(url)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteFeed = () => {
    if (feedToDelete) {
      removeFeed(feedToDelete)
      setShowDeleteConfirm(false)
      setFeedToDelete(null)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold font-heading flex items-center gap-3 dark:text-white text-slate-900">
            <Rss className="w-8 h-8 text-primary" />
            RSS 订阅
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('feeds')}
              className={`px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                viewMode === 'feeds'
                  ? 'font-bold text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              订阅源
            </button>
            <button
              onClick={() => setViewMode('favorites')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 cursor-pointer ${
                viewMode === 'favorites'
                  ? 'font-bold text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Star className="w-4 h-4" />
              收藏夹
              {favorites.length > 0 && (
                <span className="bg-slate-200 dark:bg-slate-700/50 text-slate-900 dark:text-white px-2 py-0.5 rounded-full text-xs">
                  {favorites.length}
                </span>
              )}
            </button>
          </div>
        </div>
        <p className="text-slate-400 dark:text-slate-400 text-slate-600">订阅你喜欢的技术博客，实时获取最新文章</p>
      </div>

      {/* 添加 RSS 源 */}
      <div className="bg-slate-900/60 dark:bg-slate-900/60 bg-white/60 backdrop-blur-md rounded-xl p-6 border border-slate-700/50 dark:border-slate-700/50 border-slate-200 mb-8">
        <h2 className="text-xl font-bold mb-4 dark:text-white text-slate-900">添加 RSS 源</h2>

        {/* 预设 RSS 源 */}
        <div className="mb-4">
          <p className="text-sm text-slate-400 dark:text-slate-400 text-slate-600 mb-2">推荐订阅：</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_FEEDS.map((feed) => (
              <button
                key={feed.url}
                onClick={() => handleAddPresetFeed(feed.url)}
                disabled={loadingStates[`preset-${feed.url}`]}
                className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loadingStates[`preset-${feed.url}`] ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    添加中...
                  </>
                ) : (
                  feed.name
                )}
              </button>
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
            className="flex-1 px-4 py-2 bg-slate-800/50 dark:bg-slate-800/50 bg-white/50 border border-slate-700/50 dark:border-slate-700/50 border-slate-200 rounded-lg focus:outline-none focus:border-primary dark:text-white text-slate-900 placeholder-slate-400 dark:placeholder-slate-400 placeholder-slate-500"
            onKeyPress={(e) => e.key === 'Enter' && handleAddFeed()}
          />
          <button
            onClick={handleAddFeed}
            disabled={loadingStates.add}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-white flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loadingStates.add ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                添加中...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                添加
              </>
            )}
          </button>
        </div>

        {error && (
          <p className="mt-2 text-red-400 text-sm">{error}</p>
        )}
      </div>

      {/* RSS 源列表 */}
      {viewMode === 'feeds' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：RSS 源列表 */}
          <div className="lg:col-span-1">
            <div className="space-y-3">
              {feeds.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-500 text-slate-600">
                  <Rss className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>还没有订阅任何 RSS 源</p>
                  <p className="text-sm">添加一个 RSS 源开始阅读吧！</p>
                </div>
              ) : (
                feeds.map((feed) => {
                  // 确保feed.url没有前后空格
                  const trimmedUrl = feed.url.trim();
                  return (
                  <div
                    key={trimmedUrl}
                    onClick={() => setCurrentFeed({...feed, url: trimmedUrl})}
                    className={`p-4 rounded-xl cursor-pointer transition-all ${
                      currentFeed?.url === trimmedUrl
                        ? 'bg-primary/30 border-primary/70'
                        : 'bg-slate-800/40 dark:bg-slate-800/40 bg-white/40 border-slate-700/50 dark:border-slate-700/50 border-slate-200 hover:bg-slate-800/60 dark:hover:bg-slate-800/60 hover:bg-slate-100/50'
                    } border`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate mb-1 dark:text-white text-slate-900">{feed.title}</h3>
                        <p className="text-sm text-slate-400 dark:text-slate-400 text-slate-600 truncate">{feed.description}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 text-slate-600 mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {feed.items.length} 篇文章
                        </p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRefreshFeed(trimmedUrl)
                          }}
                          disabled={loadingStates[`refresh-${trimmedUrl}`]}
                          className="p-1.5 hover:bg-slate-800/50 dark:hover:bg-slate-800/50 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-400 ${loadingStates[`refresh-${trimmedUrl}`] ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveFeed(trimmedUrl)
                          }}
                          className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-slate-600 dark:text-slate-400 hover:text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                  )
                })
              )}
            </div>
          </div>

          {/* 右侧：文章列表 */}
          <div className="lg:col-span-2">
            {!currentFeed ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-500 text-slate-600">
                <Rss className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>选择一个 RSS 源查看文章</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold dark:text-white text-slate-900">{currentFeed.title}</h2>
                  <span className="text-sm text-slate-400 dark:text-slate-400 text-slate-600">{currentFeed.items.length} 篇文章</span>
                </div>

                {currentFeed.items.map((item) => (
                  <article
                    key={item.guid}
                    onClick={() => setCurrentArticle(item)}
                    className="p-4 bg-slate-900/60 dark:bg-slate-900/60 bg-white/60 backdrop-blur-md rounded-xl border border-slate-700/50 dark:border-slate-700/50 border-slate-200 hover:border-primary/50 cursor-pointer transition-all"
                  >
                    <h3 className="font-bold mb-2 hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-slate-400 dark:text-slate-400 text-slate-600 line-clamp-2 mb-3">
                      {item.contentSnippet}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-500 text-slate-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(item.pubDate), {
                          addSuffix: true,
                          locale: zhCN
                        })}
                      </span>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="w-3 h-3" />
                        查看原文
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 收藏夹视图 */}
      {viewMode === 'favorites' && (
        <div className="space-y-4">
          {favorites.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-500 text-slate-600">
              <StarOff className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>还没有收藏文章</p>
              <p className="text-sm mt-2">在阅读文章时点击收藏按钮即可</p>
            </div>
          ) : (
            favorites.map((item) => (
              <article
                key={item.guid}
                onClick={() => setCurrentArticle(item)}
                className="p-4 bg-slate-900/60 dark:bg-slate-900/60 bg-white/60 backdrop-blur-md rounded-xl border border-slate-700/50 dark:border-slate-700/50 border-slate-200 hover:border-purple-500/50 cursor-pointer transition-all"
              >
                <h3 className="font-bold mb-2 hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-slate-400 dark:text-slate-400 text-slate-600 text-sm mb-3 line-clamp-2">
                  {item.contentSnippet}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-500 text-slate-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(item.pubDate), {
                      addSuffix: true,
                      locale: zhCN
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(item)
                        }}
                        className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 cursor-pointer"
                    >
                      <Star className="w-3 h-3 fill-current" />
                      取消收藏
                    </button>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-primary hover:text-primary/80 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      查看原文
                    </a>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ... 现有内容 ... */}
      
      {/* 删除确认对话框 */}
      <AlertDialog
        isOpen={showDeleteConfirm}
        type="warning"
        title="删除 RSS 源"
        message="确定要删除这个 RSS 源吗？删除后将无法恢复。"
        confirmText="删除"
        cancelText="取消"
        showCancel={true}
        onConfirm={confirmDeleteFeed}
        onCancel={() => {
          setShowDeleteConfirm(false)
          setFeedToDelete(null)
        }}
      />
    </div>
  )
}
