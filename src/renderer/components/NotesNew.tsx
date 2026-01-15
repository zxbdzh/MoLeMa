import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Save, Eye, EyeOff, Search, FileText, Calendar, Clock, Edit2 } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { Card3D } from './3DCard'

interface Note {
  id: number
  title: string
  content: string
  created_at: number
  updated_at: number
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showPreview, setShowPreview] = useState(true)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [loading, setLoading] = useState(true)

  // 加载笔记数据
  useEffect(() => {
    loadNotes()
  }, [])

  // 当选中的笔记改变时，更新编辑状态
  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title)
      setEditContent(selectedNote.content)
    }
  }, [selectedNote])

  const loadNotes = async () => {
    try {
      setLoading(true)
      const result = await window.electronAPI?.notes?.getAll()
      if (result?.success && result.notes) {
        const notes = result.notes as Note[]
        setNotes(notes)
        if (notes.length > 0 && !selectedNote) {
          setSelectedNote(notes[0])
        }
      }
    } catch (error) {
      console.error('Failed to load notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async () => {
    try {
      const result = await window.electronAPI?.notes?.create({
        title: '新笔记',
        content: '# 新笔记\n\n开始书写...'
      })
      
      if (result?.success) {
        await loadNotes()
        const newNote = notes.find(n => n.id === result.id)
        if (newNote) {
          setSelectedNote(newNote)
          setIsEditing(true)
        }
      }
    } catch (error) {
      console.error('Failed to add note:', error)
    }
  }

  const handleSaveNote = async () => {
    if (selectedNote && editTitle.trim()) {
      try {
        const result = await window.electronAPI?.notes?.update(selectedNote.id, {
          title: editTitle,
          content: editContent
        })
        
        if (result?.success) {
          await loadNotes()
          setIsEditing(false)
        }
      } catch (error) {
        console.error('Failed to save note:', error)
      }
    }
  }

  const handleDeleteNote = async (id: number) => {
    try {
      const result = await window.electronAPI?.notes?.delete(id)
      if (result?.success) {
        await loadNotes()
        if (selectedNote?.id === id) {
          setSelectedNote(notes.length > 1 ? notes[0] : null)
        }
      }
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">加载中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-3xl font-bold dark:text-white text-slate-900 mb-2 flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-400" />
          笔记记事本
        </h2>
        <p className="text-slate-500 dark:text-slate-400">记录灵感，支持 Markdown</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：笔记列表 */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <Card3D className="p-4 space-y-4">
            {/* 新建笔记按钮 */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddNote}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              新建笔记
            </motion.button>

            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索笔记..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500/50 dark:text-white text-slate-900 placeholder-slate-500 dark:placeholder-slate-400 transition-colors"
            />
            </div>

            {/* 笔记列表 */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
              {filteredNotes.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>还没有笔记</p>
                  <p className="text-sm mt-2">点击"新建笔记"开始吧！</p>
                </div>
              ) : (
                filteredNotes.map((note, index) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + index * 0.05 }}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => {
                      setSelectedNote(note)
                      setIsEditing(false)
                    }}
                    className={`p-4 rounded-lg cursor-pointer transition-all border ${
                      selectedNote?.id === note.id
                        ? 'bg-blue-500/10 border-blue-500/30'
                        : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50'
                    }`}
                  >
                    <h3 className="font-bold mb-1 truncate">{note.title}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
                      {note.content.replace(/[#*`]/g, '').substring(0, 50)}...
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(note.updated_at)}</span>
                      <Clock className="w-3 h-3 ml-auto" />
                      <span>{formatTime(note.updated_at)}</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </Card3D>
        </motion.div>

        {/* 右侧：编辑器和预览 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          {!selectedNote ? (
            <Card3D className="p-8">
              <div className="text-center py-12 text-slate-500 dark:text-slate-500">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>选择一个笔记开始编辑</p>
              </div>
            </Card3D>
          ) : (
            <Card3D className="p-4">
              {/* 工具栏 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSaveNote}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-white flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        保存
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setEditTitle(selectedNote.title)
                          setEditContent(selectedNote.content)
                          setIsEditing(false)
                        }}
                        className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg font-medium text-white transition-colors cursor-pointer"
                      >
                        取消
                      </motion.button>
                    </>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-white flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                      编辑
                    </motion.button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowPreview(!showPreview)}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg font-medium text-white flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showPreview ? '隐藏预览' : '显示预览'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleDeleteNote(selectedNote.id)}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg font-medium text-red-400 hover:text-red-300 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </motion.button>
                </div>
              </div>

              {/* 编辑器和预览区域 */}
              <div className={`grid gap-4 ${showPreview ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                {/* 编辑器 */}
                <div className={`flex flex-col space-y-3 ${!showPreview ? 'min-h-[calc(100vh-300px)]' : ''}`}>
                  <input
                    type="text"
                    value={isEditing ? editTitle : selectedNote.title}
                    onChange={(e) => isEditing && setEditTitle(e.target.value)}
                    disabled={!isEditing}
                    placeholder="笔记标题"
                    className={`bg-transparent text-xl font-bold dark:text-white text-slate-900 focus:outline-none placeholder-slate-500 dark:placeholder-slate-400 ${
                      !isEditing ? 'disabled:opacity-70' : 'border-b border-blue-500/50'
                    }`}
                  />
                  <textarea
                    value={isEditing ? editContent : selectedNote.content}
                    onChange={(e) => isEditing && setEditContent(e.target.value)}
                    disabled={!isEditing}
                    placeholder="开始书写... 支持 Markdown 语法"
                    className={`flex-1 ${showPreview ? 'min-h-[400px]' : 'min-h-[calc(100vh-350px)]'} bg-slate-100 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700/50 rounded-lg p-4 dark:text-slate-200 text-slate-700 resize-none focus:outline-none focus:border-blue-500/50 custom-scrollbar font-mono text-sm transition-colors ${
                      !isEditing ? 'disabled:opacity-70' : ''
                    }`}
                  />
                </div>

                {/* 预览区域 - 固定 Header */}
                {showPreview && (
                    <div className="flex flex-col min-h-[400px] bg-slate-100 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-700/50 rounded-lg overflow-hidden">
                    {/* 固定的标题栏 */}
                      <div className="sticky top-0 bg-slate-200 dark:bg-slate-800/50 backdrop-blur-sm border-b border-slate-300 dark:border-slate-700/50 p-4 z-10">
                      <h3 className="text-lg font-bold dark:text-white text-slate-900">
                        {selectedNote.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        最后更新：{formatDate(selectedNote.updated_at)} {formatTime(selectedNote.updated_at)}
                      </p>
                    </div>
                    
                    {/* 可滚动的内容区域 */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                      <MarkdownRenderer 
                        content={isEditing ? editContent : selectedNote.content}
                        className="dark:text-slate-200 text-slate-700"
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card3D>
          )}
        </motion.div>
      </div>
    </div>
  )
}
