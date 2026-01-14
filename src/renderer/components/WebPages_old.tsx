// WebPages.tsx - 网页收藏和浏览组件
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, Clock, Code, Globe, RefreshCw, Filter, Link, Plus, Trash2, Edit2, X, Check, Settings, Chrome, Web, Monitor } from 'lucide-react'
import { Card3D } from './3DCard'

type WebPageCategory = {
  id: number
  name: string
  icon?: string
  color?: string
}

interface WebPageItem {
  id?: number
  name: string
  url: string
  description?: string
  category_id?: number
  is_active?: number
  created_at?: number
  updated_at?: number
  category_name?: string
  category_color?: string
}

const categories = [
  { id: 'all', label: '全部', icon: Globe },
  { id: 'work', label: '工作', icon: Code },
  { id: 'learn', label: '学习', icon: Web },
  { id: 'tools', label: '工具', icon: Chrome },
  { id: 'entertainment', label: '娱乐', icon: Monitor }
]

export default function WebPages() {
  const [webPages, setWebPages] = useState<WebPageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [error, setError] = useState<string | null>(null)

  // 网页管理
  const [showWebPageManager, setShowWebPageManager] = useState(false)
  const [webPagesList, setWebPagesList] = useState<WebPageItem[]>([])
  const [editingWebPage, setEditingWebPage] = useState<WebPageItem | null>(null)
  const [webPageForm, setWebPageForm] = useState<WebPageItem>({
    name: '',
    url: '',
    description: '',
    category_id: 1,
    is_active: 1
  })
  const [testingWebPage, setTestingWebPage] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; pageInfo?: any } | null>(null)

  useEffect(() => {
    fetchWebPages()
  }, [selectedCategory])

  const fetchWebPages = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI?.webPages?.getWebPages(
        selectedCategory === 'all' ? undefined : selectedCategory
      )
      
      if (result?.success) {
        setWebPages(result.webPages || [])
      } else {
        setError(result?.error || '获取网页失败')
      }
    } catch (err) {
      console.error('Failed to fetch web pages:', err)
      setError('获取网页失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchWebPagesList = async () => {
    try {
      const result = await window.electronAPI?.webPages?.getAll()
      if (result?.success) {
        setWebPagesList(result.webPages || [])
      }
    } catch (error) {
      console.error('Failed to fetch web pages list:', error)
    }
  }

  const handleTestWebPage = async () => {
    if (!webPageForm.url.trim()) {
      setTestResult({ success: false, error: '请输入网站 URL' })
      return
    }

    setTestingWebPage(true)
    setTestResult(null)

    try {
      const result = await window.electronAPI?.webPages?.test(webPageForm.url)
      setTestResult(result)
    } catch (error) {
      setTestResult({ success: false, error: '测试失败' })
    } finally {
      setTestingWebPage(false)
    }
  }

  const handleSaveWebPage = async () => {
    try {
      if (editingWebPage?.id) {
        await window.electronAPI?.webPages?.update(editingWebPage.id, webPageForm)
      } else {
        await window.electronAPI?.webPages?.create(webPageForm)
      }
      await fetchWebPagesList()
      await fetchWebPages()
      setShowWebPageManager(false)
      setEditingWebPage(null)
      setTestResult(null)
    } catch (error) {
      console.error('Failed to save web page:', error)
    }
  }

  const handleDeleteWebPage = async (id: number) => {
    if (confirm('确定要删除这个网页吗？删除后将无法恢复。')) {
      try {
        await window.electronAPI?.webPages?.delete(id)
        await fetchWebPagesList()
        await fetchWebPages()
      } catch (error) {
        console.error('Failed to delete web page:', error)
      }
    }
  }

  const handleToggleWebPage = async (webPage: WebPageItem) => {
    try {
      await window.electronAPI?.webPages?.update(webPage.id!, {
        is_active: webPage.is_active === 1 ? 0 : 1
      })
      await fetchWebPagesList()
      await fetchWebPages()
    } catch (error) {
      console.error('Failed to toggle web page:', error)
    }
  }

  const handleAddWebPage = () => {
    setEditingWebPage(null)
    setWebPageForm({
      name: '',
      url: '',
      description: '',
      category_id: 1,
      is_active: 1
    })
    setTestResult(null)
  }

  const handleEditWebPage = (webPage: WebPageItem) => {
    setEditingWebPage(webPage)
    setWebPageForm({
      name: webPage.name,
      url: webPage.url,
      description: webPage.description || '',
      category_id: webPage.category_id,
      is_active: webPage.is_active
    })
    setTestResult(null)
  }

  const filteredWebPages = selectedCategory === 'all' 
    ? webPages 
    : webPages.filter(item => {
        if (item.category_name) {
          if (selectedCategory === 'work' && item.category_name.includes('工作')) return true
          if (selectedCategory === 'learn' && item.category_name.includes('学习')) return true
          if (selectedCategory === 'tools' && item.category_name.includes('工具')) return true
          if (selectedCategory === 'entertainment' && item.category_name.includes('娱乐')) return true
        }
        return false
      })

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category ? category.icon : Globe
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return '今天'
    if (diffDays === 2) return '昨天'
    return ${diffDays} 天前
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold dark:text-white text-slate-900 mb-2 flex items-center gap-3">
          <Link className="w-8 h-8 text-blue-400" />
          网页收藏
        </h2>
        <p className="text-slate-400 dark:text-slate-400 text-slate-600">收藏和快速访问您喜欢的网站</p>
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
                  className={lex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors }
                >
                  <Icon className="w-4 h-4" />
                  {category.label}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => {
              setShowWebPageManager(true)
              handleAddWebPage()
            }}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-primary text-white rounded-lg hover:bg-blue-500 dark:hover:bg-primary/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
            管理网页
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
            onClick={fetchWebPages}
            className="px-4 py-2 bg-blue-600 dark:text-white text-slate-900 rounded-lg hover:bg-blue-500 transition-colors"
          >
            重试
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {webPages.map((item) => {
            const CategoryIcon = getCategoryIcon(item.category_name || 'work')
            return (
              <a
                key={item.id || item.url}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card3D className="overflow-hidden group h-full">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Web className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-bold dark:text-white text-slate-900 line-clamp-1">
                            {item.name}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-500 text-slate-600 truncate max-w-[180px]">
                            {item.url}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-xs rounded">
                          {item.category_name || '未分类'}
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-400 dark:text-slate-400 text-slate-600 mb-4 line-clamp-2 text-sm">
                      {item.description || '暂无描述'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-500 text-slate-600">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-300 dark:text-slate-300 text-slate-700">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.created_at ? formatDate(item.created_at) : '未知时间'}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                      访问网站
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </Card3D>
              </a>
            )
          })}
        </div>
      )}

      {webPages.length === 0 && !loading && !error && (
        <div className="text-center py-20">
          <Link className="w-16 h-16 mx-auto mb-4 text-gray-500 dark:text-gray-500 text-slate-500" />
          <h3 className="text-xl font-bold text-slate-400 dark:text-slate-400 text-slate-600 mb-2">暂无收藏网页</h3>
          <p className="text-slate-500 dark:text-slate-500 text-slate-600">点击右上角管理按钮添加您的第一个网页收藏</p>
        </div>
      )}

      {/* 网页管理模态框 */}
      {showWebPageManager && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold dark:text-white text-slate-900 flex items-center gap-3">
                <Settings className="w-6 h-6 text-blue-500" />
                管理收藏网页
              </h2>
              <button
                onClick={() => setShowWebPageManager(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* 添加/编辑表单 */}
              <div className="mb-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <h3 className="text-lg font-bold mb-4 dark:text-white text-slate-900">
                  {editingWebPage?.id ? '编辑网页' : '添加网页'}
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 dark:text-slate-300 text-slate-700">网站名称</label>
                      <input
                        type="text"
                        value={webPageForm.name}
                        onChange={(e) => setWebPageForm({ ...webPageForm, name: e.target.value })}
                        placeholder="网站名称"
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500/50 dark:text-white text-slate-900 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 dark:text-slate-300 text-slate-700">分类</label>
                      <select
                        value={webPageForm.category_id}
                        onChange={(e) => setWebPageForm({ ...webPageForm, category_id: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500/50 dark:text-white text-slate-900 transition-colors"
                      >
                        {categories.slice(1).map((cat) => (
                          <option key={cat.id} value={categories.indexOf(cat)}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 dark:text-slate-300 text-slate-700">网站URL</label>
                    <input
                      type="text"
                      value={webPageForm.url}
                      onChange={(e) => setWebPageForm({ ...webPageForm, url: e.target.value })}
                      placeholder="https://example.com"
                      className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500/50 dark:text-white text-slate-900 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 dark:text-slate-300 text-slate-700">描述（可选）</label>
                    <input
                      type="text"
                      value={webPageForm.description}
                      onChange={(e) => setWebPageForm({ ...webPageForm, description: e.target.value })}
                      placeholder="网站描述"
                      className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500/50 dark:text-white text-slate-900 transition-colors"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleTestWebPage}
                      disabled={testingWebPage}
                      className="flex-1 py-2 bg-slate-800 dark:bg-slate-800 bg-white border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {testingWebPage ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          测试中...
                        </>
                      ) : (
                        '测试网站'
                      )}
                    </button>
                    <button
                      onClick={handleSaveWebPage}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-white transition-colors"
                    >
                      保存
                    </button>
                  </div>

                  {testResult && (
                    <div className={lex items-center gap-2 p-3 rounded-lg }>
                      {testResult.success ? (
                        <>
                          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm text-green-700 dark:text-green-300">
                            {testResult.pageInfo?.title} - 网站可访问
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

              {/* 网页列表 */}
              <div>
                <h3 className="text-lg font-bold mb-4 dark:text-white text-slate-900">已收藏的网页</h3>
                {webPagesList.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-500 text-slate-600">
                    <Link className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>还没有收藏任何网页</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {webPagesList.map((webPage) => (
                      <div
                        key={webPage.id}
                        className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold dark:text-white text-slate-900">{webPage.name}</h4>
                              <span className={px-2 py-0.5 rounded-full text-xs }>
                                {webPage.is_active === 1 ? '已启用' : '已禁用'}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-500 text-slate-600 truncate">{webPage.url}</p>
                            {webPage.description && (
                              <p className="text-sm text-slate-400 dark:text-slate-400 text-slate-600 mt-1">{webPage.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleWebPage(webPage)}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title={webPage.is_active === 1 ? '禁用' : '启用'}
                            >
                              {webPage.is_active === 1 ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <X className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                            <button
                              onClick={() => handleEditWebPage(webPage)}
                              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="编辑"
                            >
                              <Edit2 className="w-4 h-4 text-slate-400" />
                            </button>
                            <button
                              onClick={() => handleDeleteWebPage(webPage.id!)}
                              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
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
    </div>
  )
}
