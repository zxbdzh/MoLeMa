import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink, Clock, TrendingUp, Zap, Code, Rocket, Globe, RefreshCw, Filter } from 'lucide-react'
import Card3D from './3DCard'

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
  { id: 'news', label: '资讯', icon: TrendingUp },
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
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-purple-400 animate-pulse-slow" />
          新闻资讯
        </h2>
        <p className="text-gray-400">最新技术动态和行业资讯</p>
      </motion.div>

      {/* 分类筛选 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="flex items-center gap-4 mb-4">
          <Filter className="w-5 h-5 text-gray-400" />
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <motion.button
                  key={category.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedCategory === category.id
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {category.label}
                </motion.button>
              )
            })}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={refreshing}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </motion.button>
        </div>
      </motion.div>

      {/* 新闻列表 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="w-12 h-12 animate-spin text-purple-400 mb-4" />
          <p className="text-gray-400">加载中...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h3 className="text-xl font-bold text-gray-400 mb-2">加载失败</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all"
          >
            重试
          </motion.button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {news.map((item, index) => {
              const CategoryIcon = getCategoryIcon(item.category)
              return (
                <motion.a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  className="block"
                >
                  <Card3D className="bg-white/5 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 hover:border-purple-500/50 transition-all group h-full">
                    {item.image && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-3 left-3 flex items-center gap-2">
                          <span className="px-3 py-1 bg-purple-500/80 backdrop-blur-sm rounded-full text-xs font-medium text-white">
                            <CategoryIcon className="w-3 h-3 inline mr-1" />
                            {categories.find(c => c.id === item.category)?.label}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="p-5">
                      <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-purple-400 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-gray-400 mb-4 line-clamp-2 text-sm">
                        {item.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-300">{item.source}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(item.publishedAt)}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center text-purple-400 text-sm font-medium group-hover:translate-x-2 transition-transform">
                        阅读全文
                        <ExternalLink className="w-4 h-4 ml-1" />
                      </div>
                    </div>
                  </Card3D>
                </motion.a>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {news.length === 0 && !loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-500" />
          <h3 className="text-xl font-bold text-gray-400 mb-2">暂无新闻</h3>
          <p className="text-gray-500">该分类下暂时没有新闻</p>
        </motion.div>
      )}
    </div>
  )
}