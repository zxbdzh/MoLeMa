import { useState, useEffect } from 'react'
import { ExternalLink, Clock, Code, Globe, RefreshCw, Filter, Newspaper, Zap, Rocket } from 'lucide-react'
import { Card3D } from './3DCard'

interface NewsItem {
  id: string
  title: string
  description: string
  url: string
  publishedAt: string
  source: string
  category: string
  image?: string
}

const categories = [
  { id: 'all', label: '全部', icon: Globe },
  { id: 'tech', label: '技术', icon: Code },
  { id: 'news', label: '资讯', icon: Newspaper },
  { id: 'startup', label: '创业', icon: Rocket },
  { id: 'ai', label: 'AI', icon: Zap }
]

export default function News() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchNews()
  }, [selectedCategory])

  const fetchNews = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI?.news?.getDomesticNews(
        selectedCategory === 'all' ? undefined : selectedCategory
      )
      
      if (result?.success) {
        setNews(result.news || [])
      } else {
        setError(result?.error || '获取新闻失败')
      }
    } catch (err) {
      console.error('Failed to fetch news:', err)
      setError('获取新闻失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchNews()
    setRefreshing(false)
  }

  const filteredNews = selectedCategory === 'all' 
    ? news 
    : news.filter(item => item.category === selectedCategory)

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category ? category.icon : Globe
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return '今天'
    if (diffDays === 2) return '昨天'
    return `${diffDays} 天前`
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold dark:text-white text-slate-900 mb-2 flex items-center gap-3">
          <Newspaper className="w-8 h-8 text-blue-400" />
          新闻资讯
        </h2>
        <p className="text-slate-400 dark:text-slate-400 text-slate-600">最新技术动态和行业资讯</p>
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
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-400 mb-4" />
          <p className="text-slate-400 dark:text-slate-400 text-slate-600">加载中...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Newspaper className="w-16 h-16 mx-auto mb-4 text-red-400" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {news.map((item) => {
            const CategoryIcon = getCategoryIcon(item.category)
            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Card3D className="overflow-hidden group h-full">
                  {item.image && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-3 left-3 flex items-center gap-2">
                        <span className="px-3 py-1 bg-blue-600/80 backdrop-blur-sm rounded-full text-xs font-medium text-white">
                          <CategoryIcon className="w-3 h-3 inline mr-1" />
                          {categories.find(c => c.id === item.category)?.label}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="text-xl font-bold dark:text-white text-slate-900 mb-3 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </h3>
    <p className="text-slate-400 dark:text-slate-400 text-slate-600 mb-4 line-clamp-2 text-sm">
      {item.description}
    </p>
    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-500 text-slate-600">
      <div className="flex items-center gap-3">
        <span className="font-medium text-slate-300 dark:text-slate-300 text-slate-700">{item.source}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(item.publishedAt)}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                      阅读全文
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </Card3D>
              </a>
            )
          })}
        </div>
      )}

      {news.length === 0 && !loading && !error && (
        <div className="text-center py-20">
          <Newspaper className="w-16 h-16 mx-auto mb-4 text-gray-500 dark:text-gray-500 text-slate-500" />
          <h3 className="text-xl font-bold text-slate-400 dark:text-slate-400 text-slate-600 mb-2">暂无新闻</h3>
          <p className="text-slate-500 dark:text-slate-500 text-slate-600">该分类下暂时没有新闻</p>
        </div>
      )}
    </div>
  )
}
