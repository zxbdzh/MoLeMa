import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Save, Eye, EyeOff, Search, FileText, Calendar, Clock, Edit2 } from 'lucide-react'
import { useNotesStore, Note } from '../store/notesStore'
import Card3D from './3DCard'

export default function Notes() {
  const { notes, addNote, updateNote, deleteNote, getNote } = useNotesStore()
  const [selectedNote, setSelectedNote] = useState<Note | null>(notes[0] || null)
  const [isEditing, setIsEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showPreview, setShowPreview] = useState(true)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [typingEffectEnabled, setTypingEffectEnabled] = useState(true)

  useEffect(() => {
    // 加载打字特效设置
    window.electronAPI?.store?.get('typingEffectEnabled').then((result) => {
      if (result?.success) {
        setTypingEffectEnabled(result.value !== undefined ? result.value : true)
      }
    })
  }, [])

  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title)
      setEditContent(selectedNote.content)
    }
  }, [selectedNote])

  const handleAddNote = () => {
    const newNote = {
      id: Date.now().toString(),
      title: '新笔记',
      content: '# 新笔记\n\n开始书写...',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    addNote(newNote.title, newNote.content)
    setSelectedNote(newNote)
    setIsEditing(true)
  }

  const handleSaveNote = () => {
    if (selectedNote && editTitle.trim()) {
      updateNote(selectedNote.id, editTitle, editContent)
      setSelectedNote({ ...selectedNote, title: editTitle, content: editContent, updatedAt: Date.now() })
      setIsEditing(false)
    }
  }

  const handleDeleteNote = (id: string) => {
    deleteNote(id)
    if (selectedNote?.id === id) {
      setSelectedNote(notes.length > 1 ? notes[0] : null)
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const renderMarkdown = (content: string) => {
    let html = content
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold and Italic
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      // Lists
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      // Line breaks
      .replace(/\n/gim, '<br>')
    
    return html
  }

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container mx-auto px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <FileText className="w-8 h-8 text-purple-400 animate-pulse-slow" />
          笔记记事本
        </h2>
        <p className="text-gray-400">记录灵感，支持 Markdown</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Notes List */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <Card3D className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 h-full border border-white/10">
            <div className="flex gap-2 mb-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAddNote}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                新建
              </motion.button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索笔记..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {filteredNotes.map((note, index) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedNote(note)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedNote?.id === note.id
                        ? 'bg-purple-500/20 border border-purple-500/50'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <h3 className="font-medium text-white mb-1 truncate">{note.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {formatDate(note.updatedAt)}
                      <Clock className="w-3 h-3 ml-2" />
                      {new Date(note.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </Card3D>
        </motion.div>

        {/* Right: Note Editor/Preview */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card3D className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 h-full border border-white/10">
            {selectedNote ? (
              <>
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                  <div className="flex gap-2">
                    {isEditing ? (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSaveNote}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-green-500/25 transition-all"
                      >
                        <Save className="w-4 h-4" />
                        保存
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsEditing(true)}
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                        编辑
                      </motion.button>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowPreview(!showPreview)}
                      className="bg-white/10 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-white/20 transition-all"
                    >
                      {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showPreview ? '隐藏预览' : '显示预览'}
                    </motion.button>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDeleteNote(selectedNote.id)}
                    className="text-red-400 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </motion.button>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[450px]">
                  {/* Editor */}
                  <div className="flex flex-col">
                    {isEditing && (
                      <div className="text-xs text-green-400 mb-2 flex items-center gap-1">
                        <Edit2 className="w-3 h-3" />
                        编辑模式 - 点击保存按钮保存更改
                      </div>
                    )}
                    <input
                      type="text"
                      value={isEditing ? editTitle : selectedNote.title}
                      onChange={(e) => isEditing && setEditTitle(e.target.value)}
                      disabled={!isEditing}
                      placeholder="笔记标题"
                      className={`bg-transparent text-xl font-bold text-white mb-3 focus:outline-none placeholder-gray-500 ${
                        !isEditing ? 'disabled:opacity-70' : 'border-b border-purple-500/50'
                      }`}
                    />
                    <textarea
                      value={isEditing ? editContent : selectedNote.content}
                      onChange={(e) => isEditing && setEditContent(e.target.value)}
                      disabled={!isEditing}
                      placeholder="开始书写... 支持 Markdown 语法"
                      className={`flex-1 bg-white/5 border border-white/10 rounded-lg p-4 text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent custom-scrollbar font-mono text-sm ${
                        !isEditing ? 'disabled:opacity-70' : typingEffectEnabled ? 'animate-pulse-slow' : ''
                      }`}
                    />
                  </div>

                  {/* Preview */}
                  {showPreview && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white/5 border border-white/10 rounded-lg p-4 overflow-y-auto custom-scrollbar"
                    >
                      <h1 className="text-2xl font-bold text-white mb-4">{selectedNote.title}</h1>
                      <div
                        className="text-gray-200 prose prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedNote.content) }}
                      />
                    </motion.div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[550px] text-gray-400">
                <FileText className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg">选择或创建一个笔记</p>
                <p className="text-sm mt-2 opacity-70">点击"新建"按钮开始</p>
              </div>
            )}
          </Card3D>
        </motion.div>
      </div>
    </div>
  )
}