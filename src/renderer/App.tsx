import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Rss, FileText, CheckSquare, Newspaper, X, Maximize2, Minimize } from 'lucide-react'
import RSSPage from './components/RSSPage'
import ArticleReader from './components/ArticleReader'
import StarBackground from './components/StarBackground'
import Card3D from './components/3DCard'
import TodoList from './components/TodoList'
import Settings from './components/Settings'
import Notes from './components/NotesNew'
import News from './components/News'
import { useRSSStore } from './store/rssStore'

type TabType = 'home' | 'rss' | 'notes' | 'todo' | 'news' | 'settings'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [shortcuts, setShortcuts] = useState({ toggleWindow: 'CommandOrControl+Alt+M' })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { currentArticle, setCurrentArticle } = useRSSStore()

  // 加载快捷键配置
  useEffect(() => {
    window.electronAPI?.shortcuts?.get().then((config) => {
      if (config) {
        setShortcuts(config)
      }
    })
  }, [])

  // 监听快捷键变更
  useEffect(() => {
    const unsubscribe = window.electronAPI?.shortcuts?.onChanged?.((newShortcuts) => {
      setShortcuts(newShortcuts)
    })
    return unsubscribe
  }, [])

  const tabs = [
    { id: 'home' as TabType, icon: '🏠', label: '首页' },
    { id: 'rss' as TabType, icon: <Rss className="w-5 h-5" />, label: 'RSS 订阅' },
    { id: 'notes' as TabType, icon: <FileText className="w-5 h-5" />, label: '记事本' },
    { id: 'todo' as TabType, icon: <CheckSquare className="w-5 h-5" />, label: 'Todo List' },
    { id: 'news' as TabType, icon: <Newspaper className="w-5 h-5" />, label: '新闻资讯' },
    { id: 'settings' as TabType, icon: '⚙️', label: '设置' }
  ]

  return (
    <div className="dark min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white relative overflow-hidden">
      {/* 星空背景 */}
      <StarBackground />
      
      {/* 内容容器 */}
      <div className="relative z-10">
        {/* 顶部导航栏 */}
        <motion.header
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="bg-black/30 backdrop-blur-md border-b border-white/10 sticky top-0 z-50"
        >
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.electronAPI?.minimizeWindow?.()}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="最小化"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <rect x="2" y="6" width="8" height="1" fill="currentColor" />
                </svg>
              </motion.button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2 animate-pulse-slow">
                🐟 摸鱼软件
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">
                快捷键: <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20">{shortcuts.toggleWindow.replace('CommandOrControl+', 'Ctrl+').replace('Alt+', 'Alt+').replace('Shift+', 'Shift+')}</kbd>
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={async () => {
                  await window.electronAPI?.fullscreenWindow?.()
                  const result = await window.electronAPI?.isFullscreen?.()
                  setIsFullscreen(result?.isFullscreen || false)
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title={isFullscreen ? "退出全屏" : "全屏"}
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.electronAPI?.closeWindow?.()}
                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                title="关闭"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </motion.header>

        {/* 标签栏 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-black/20 backdrop-blur-md border-b border-white/10"
        >
          <div className="container mx-auto px-4">
            <div className="flex gap-2 py-3 overflow-x-auto">
              {tabs.map((tab) => (
                <motion.button
                  key={tab.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                      : 'hover:bg-white/10 text-gray-300 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  <span className="whitespace-nowrap">{tab.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* 主内容区域 */}
        <main className="container mx-auto px-4 py-8">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center mb-12"
                >
                  <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    欢迎来到摸鱼软件
                  </h2>
                  <p className="text-gray-400 text-lg">
                    使用全局快捷键 Ctrl+Alt+M 显示/隐藏窗口，快速查看技术文章
                  </p>
                </motion.div>

                {/* 功能卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FeatureCard3D
                    icon="📰"
                    title="RSS 订阅"
                    description="订阅你喜欢的技术博客，实时获取最新文章"
                    delay={0.3}
                    onClick={() => setActiveTab('rss')}
                  />
                  <FeatureCard3D
                    icon="📝"
                    title="记事本"
                    description="快速记录想法和笔记，支持 Markdown"
                    delay={0.4}
                    onClick={() => setActiveTab('notes')}
                  />
                  <FeatureCard3D
                    icon="✅"
                    title="Todo List"
                    description="管理你的任务和待办事项"
                    delay={0.5}
                    onClick={() => setActiveTab('todo')}
                  />
                  <FeatureCard3D
                    icon="📊"
                    title="新闻资讯"
                    description="浏览最新的技术新闻和资讯"
                    delay={0.6}
                    onClick={() => setActiveTab('news')}
                  />
                  <FeatureCard3D
                    icon="🎨"
                    title="炫酷动画"
                    description="流畅的动画效果，提升使用体验"
                    delay={0.7}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'rss' && (
              <motion.div
                key="rss"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <RSSPage />
              </motion.div>
            )}

            {activeTab === 'notes' && (
              <motion.div
                key="notes"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Notes />
              </motion.div>
            )}

            {activeTab === 'todo' && (
              <motion.div
                key="todo"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <TodoList />
              </motion.div>
            )}

            {activeTab === 'news' && (
              <motion.div
                key="news"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <News />
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Settings />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* 文章阅读器 */}
        <AnimatePresence>
          {currentArticle && (
            <ArticleReader onClose={() => setCurrentArticle(null)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function FeatureCard3D({
  icon,
  title,
  description,
  delay,
  onClick
}: {
  icon: string
  title: string
  description: string
  delay: number
  onClick?: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      whileHover={{ 
        scale: 1.05, 
        y: -5,
        boxShadow: '0 20px 40px rgba(147, 51, 234, 0.3)'
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-md rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-all group cursor-pointer relative overflow-hidden`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10">
        <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{icon}</div>
        <h3 className="text-xl font-bold mb-2 group-hover:text-purple-400 transition-colors">{title}</h3>
        <p className="text-gray-400">{description}</p>
      </div>
    </motion.div>
  )
}

export default App