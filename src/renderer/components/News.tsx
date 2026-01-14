import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, Clock, Code, Globe, RefreshCw, Filter, Link, Zap, Rocket, Plus, Trash2, Edit2, X, Check, Settings, Star, StarOff, Monitor } from 'lucide-react'
import { Card3D } from './3DCard'
import WebPageBrowser from './WebPageBrowser'

interface WebPage {
  id?: number
  title: string
  url: string
  description?: string
  category_id?: number
  is_favorite?: number
  created_at?: number
  updated_at?: number
  view_count?: number
  category_name?: string
}

interface WebPageCategory {
  id?: number
  name: string
  icon?: string
  color?: string
}

const categories = [
  { id: 'all', label: '全部', icon: Globe },
  { id: 'work', label: '工作', icon: Code },
  { id: 'study', label: '学习', icon: Code },
  { id: 'tools', label: '工具', icon: Rocket },
  { id: 'entertainment', label: '娱乐', icon: Zap }
]

export default function WebPages() {
  const [webPages, setWebPages] = useState<WebPage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 网页管理
  const [showManager, setShowManager] = useState(false)
  const [pages, setPages] = useState<WebPage[]>([])
  const [editingPage, setEditingPage] = useState<WebPage | null>(null)
  const [pageForm, setPageForm] = useState<WebPage>({
    title: '',
    url: '',
    description: '',
    category_id: 1,
    is_favorite: 0
  })
  const [testingPage, setTestingPage] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  
  // 内嵌浏览器
  const [selectedWebPage, setSelectedWebPage] = useState<WebPage | null>(null)

  useEffect(() => {
    fetchWebPages()
  }, [selectedCategory])

  const fetchWebPages = async () => {
    setLoading(true)
    setError(null)
    try {
      // 从数据库获取网页收藏
      const result = await window.electronAPI?.webPages?.getAll(
        selectedCategory === 'all' ? undefined : selectedCategory
      )
      
      if (result?.success) {
        setWebPages(result.pages || [])
      } else {
        setError(result?.error || '获取网页收藏失败')
      }
    } catch (err) {
      console.error('Failed to fetch web pages:', err)
      setError('获取网页收藏失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchWebPages()
    setRefreshing(false)
  }

  const handleAddPage = () => {
    setEditingPage(null)
    setPageForm({
      title: '',
      url: '',
      description: '',
      category_id: 1,
      is_favorite: 0
    })
    setTestResult(null)
  }

  const handleEditPage = (page: WebPage) => {
    setEditingPage(page)
    setPageForm({
      title: page.title,
      url: page.url,
      description: page.description || '',
      category_id: page.category_id || 1,
      is_favorite: page.is_favorite || 0
    })
    setTestResult(null)
  }

  const handleTestPage = async () => {
    if (!pageForm.url.trim()) {
      setTestResult({ success: false, error: '请输入网站 URL' })
      return
    }

    setTestingPage(true)
    setTestResult(null)

    try {
      // 简单测试URL是否可访问
      const response = await fetch(pageForm.url, { method: 'HEAD' })
      setTestResult({ success: response.ok })
    } catch (error) {
      setTestResult({ success: false, error: '测试失败' })
    } finally {
      setTestingPage(false)
    }
  }

  const handleSavePage = async () => {
    try {
      if (editingPage?.id) {
        await window.electronAPI?.webPages?.update(editingPage.id, pageForm)
      } else {
        await window.electronAPI?.webPages?.create(pageForm)
      }
      await fetchWebPages()
      setShowManager(false)
      setEditingPage(null)
      setTestResult(null)
    } catch (error) {
      console.error('Failed to save page:', error)
    }
  }

  const handleDeletePage = async (id: number) => {
    if (confirm('确定要删除这个网页收藏吗？')) {
      try {
        await window.electronAPI?.webPages?.delete(id)
        await fetchWebPages()
      } catch (error) {
        console.error('Failed to delete page:', error)
      }
    }
  }

  const handleToggleFavorite = async (id: number) => {
    try {
      await window.electronAPI?.webPages?.toggleFavorite(id)
      await fetchWebPages()
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  const filteredPages = selectedCategory === 'all' 
    ? webPages 
    : webPages.filter(item => item.category_name === selectedCategory)

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category ? category.icon : Globe
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '未知时间'
    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return '今天'
    if (diffDays === 2) return '昨天'
    return `${diffDays} 天前`
  }

  const handleViewPage = async (page: WebPage) => {
    // 增加访问次数
    if (page.id) {
      await window.electronAPI?.webPages?.incrementViewCount(page.id)
    }
    setSelectedWebPage(page)
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold dark:text-white text-slate-900 mb-2 flex items-center gap-3">
          <Link className="w-8 h-8 text-blue-400" />
          网页收藏
        </h2>
        <p className="text-slate-400 dark:text-slate-400 text-slate-600">快速访问您收藏的网站</p>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Filter className="w-5 h-5 text-slate-400" />
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white dark:text-white'
                      : 'bg-slate-800/40 dark:bg-slate-800/40 bg-white/40 text-slate-700 dark:text-slate-300 hover:bg-slate-700/50 dark:hover:bg-slate-700/50 hover:bg-slate-200/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {category.label}
                </button>
              )
            })}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-slate-800/40 dark:bg-slate-800/40 bg-white/40 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-700/50 dark:hover:bg-slate-700/50 hover:bg-slate-200/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button
            onClick={() => {
              setShowManager(true)
              handleAddPage()
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-primary text-white rounded-lg hover:bg-blue-500 dark:hover:bg-primary/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加网页
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-400 mb-4" />
          <p className="text-slate-400 dark:text-slate-400 text-slate-600">加载中...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Link className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h3 className="text-xl font-bold text-slate-400 dark:text-slate-400 text-slate-600 mb-2">加载失败</h3>
          <p className="text-slate-500 dark:text-slate-500 text-slate-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 dark:text-white text-slate-900 rounded-lg hover:bg-blue-500 transition-colors"
          >
            重试
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPages.map((item) => {
            const CategoryIcon = getCategoryIcon(item.category_name || 'all')
            return (
              <div
                key={item.id}
                onClick={() => handleViewPage(item)}
                className="block cursor-pointer"
              >
                <Card3D className="overflow-hidden group h-full">
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-bold dark:text-white text-slate-900 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-1">
                        {item.title}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (item.id) {
                            handleToggleFavorite(item.id)
                          }
                        }}
                        className="ml-2 p-1 rounded-full hover:bg-slate-800/50 dark:hover:bg-slate-800/50 hover:bg-slate-200 transition-colors"
                        title={item.is_favorite ? '取消收藏' : '收藏'}
                      >
                        {item.is_favorite ? (
                          <Star className="w-5 h-5 text-yellow-400 fill-current" />
                        ) : (
                          <Star className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                    </div>
                    <p className="text-slate-400 dark:text-slate-400 text-slate-600 mb-4 line-clamp-2 text-sm">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-500 text-slate-600">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-300 dark:text-slate-300 text-slate-700 flex items-center gap-1">
                          <CategoryIcon className="w-3 h-3" />
                          {item.category_name || '未分类'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(item.created_at)}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                      {item.view_count ? `已访问 ${item.view_count} 次` : '点击访问'}
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </Card3D>
              </div>
            )
          })}
        </div>
      )}

      {filteredPages.length === 0 && !loading && !error && (
        <div className="text-center py-20">
          <Link className="w-16 h-16 mx-auto mb-4 text-gray-500 dark:text-gray-500 text-slate-500" />
          <h3 className="text-xl font-bold text-slate-400 dark:text-slate-400 text-slate-600 mb-2">暂无收藏</h3>
          <p className="text-slate-500 dark:text-slate-500 text-slate-600">添加一些喜欢的网站开始吧！</p>
        </div>
      )}

      {/* 网页管理模态框 */}
      {showManager && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold dark:text-white text-slate-900 flex items-center gap-3">
                <Settings className="w-6 h-6 text-blue-500" />
                管理网页收藏
              </h2>
              <button
                onClick={() => setShowManager(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* 添加/编辑表单 */}
              <div className="mb-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <h3 className="text-lg font-bold mb-4 dark:text-white text-slate-900">
                  {editingPage?.id ? '编辑网页' : '添加网页'}
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 dark:text-slate-300 text-slate-700">标题</label>
                      <input
                        type="text"
                        value={pageForm.title}
                        onChange={(e) => setPageForm({ ...pageForm, title: e.target.value })}
                        placeholder="网页标题"
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500/50 dark:text-white text-slate-900 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 dark:text-slate-300 text-slate-700">分类</label>
                      <select
                        value={pageForm.category_id}
                        onChange={(e) => setPageForm({ ...pageForm, category_id: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500/50 dark:text-white text-slate-900 transition-colors"
                      >
                        <option value={1}>工作</option>
                        <option value={2}>学习</option>
                        <option value={3}>工具</option>
                        <option value={4}>娱乐</option>
                        <option value={5}>其他</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 dark:text-slate-300 text-slate-700">网站URL</label>
                    <input
                      type="text"
                      value={pageForm.url}
                      onChange={(e) => setPageForm({ ...pageForm, url: e.target.value })}
                      placeholder="https://example.com"
                      className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500/50 dark:text-white text-slate-900 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 dark:text-slate-300 text-slate-700">描述（可选）</label>
                    <input
                      type="text"
                      value={pageForm.description}
                      onChange={(e) => setPageForm({ ...pageForm, description: e.target.value })}
                      placeholder="网站描述"
                      className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500/50 dark:text-white text-slate-900 transition-colors"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleTestPage}
                      disabled={testingPage}
                      className="flex-1 py-2 bg-slate-800 dark:bg-slate-800 bg-white border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {testingPage ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          测试中...
                        </>
                      ) : (
                        '测试连接'
                      )}
                    </button>
                    <button
                      onClick={handleSavePage}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-white transition-colors cursor-pointer"
                    >
                      保存
                    </button>
                  </div>

                  {testResult && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg ${
                      testResult.success
                        ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-500/30'
                        : 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-500/30'
                    }`}>
                      {testResult.success ? (
                        <>
                          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm text-green-700 dark:text-green-300">
                            网站连接正常
                          </span>
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                          <span className="text-sm text-red-700 dark:text-red-300">
                            {testResult.error}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 网页收藏列表 */}
              <div>
                <h3 className="text-lg font-bold mb-4 dark:text-white text-slate-900">已收藏的网页</h3>
                {webPages.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-500 text-slate-600">
                    <Link className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>还没有收藏任何网页</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {webPages.map((page) => (
                      <div
                        key={page.id}
                        className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold dark:text-white text-slate-900 truncate">{page.title}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                page.is_favorite
                                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                              }`}>
                                {page.is_favorite ? '已收藏' : '未收藏'}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-500 text-slate-600 truncate">{page.url}</p>
                            {page.description && (
                              <p className="text-sm text-slate-400 dark:text-slate-400 text-slate-600 mt-1">{page.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleFavorite(page.id!)}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                              title={page.is_favorite ? '取消收藏' : '收藏'}
                            >
                              {page.is_favorite ? (
                                <Star className="w-4 h-4 text-yellow-500" />
                              ) : (
                                <StarOff className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                            <button
                              onClick={() => handleEditPage(page)}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="编辑"
                            >
                              <Edit2 className="w-4 h-4 text-slate-400" />
                            </button>
                            <button
                              onClick={() => handleDeletePage(page.id!)}
                              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 内嵌网页浏览器 */}
      {selectedWebPage && (
        <WebPageBrowser
          url={selectedWebPage.url}
          title={selectedWebPage.title}
          description={selectedWebPage.description}
          onClose={() => setSelectedWebPage(null)}
          onFavoriteToggle={selectedWebPage.id ? () => handleToggleFavorite(selectedWebPage.id!) : undefined}
          isFavorite={!!selectedWebPage.is_favorite}
        />
      )}
    </div>
  )
}
