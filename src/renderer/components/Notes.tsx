import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Eye, EyeOff, Search, FileText, Calendar, Clock, Edit2 } from 'lucide-react'
import { useNotesStore, Note } from '../store/notesStore'
import { Card3D } from './3DCard'
import { MarkdownRenderer } from './MarkdownRenderer'

// 窗口可见性监听器
const useWindowVisibility = (callback: () => void) => {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        callback()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [callback])
}

export default function Notes() {
  const { notes, addNote, updateNote, deleteNote } = useNotesStore()
  const [selectedNote, setSelectedNote] = useState<Note | null>(notes[0] || null)
  const [isEditing, setIsEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showPreview, setShowPreview] = useState(true)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title)
      setEditContent(selectedNote.content)
    }
  }, [selectedNote])

  // 窗口可见时自动刷新
  useWindowVisibility(() => {
    loadNotes()
  })

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

  const handleSaveNote = async () => {
    if (selectedNote && editTitle.trim()) {
      try {
        // 调用 API 保存
        const result = await window.electronAPI?.notes?.update(selectedNote.id, {
          title: editTitle,
          content: editContent
        })
        
        if (result?.success) {
          // 乐观更新：立即更新 selectedNote
          setSelectedNote({
            ...selectedNote,
            title: editTitle,
            content: editContent,
            updated_at: Date.now()
          })
          
          // 重新加载笔记列表（后台更新）
          await loadNotes()
          setIsEditing(false)
        }
      } catch (error) {
        console.error('Failed to save note:', error)
      }
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

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold dark:text-white text-slate-900 mb-2 flex items-center gap-3">
          <FileText className="w-8 h-8 text-purple-400" />
          笔记记事本
        </h2>
        <p className="text-gray-400 dark:text-gray-400 text-slate-600">记录灵感，支持 Markdown</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card3D className="bg-white/5 dark:bg-white/5 bg-white/60 backdrop-blur-xl rounded-2xl p-4 h-full border border-white/10 dark:border-white/10 border-slate-200">
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleAddNote}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                新建
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索笔记..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 dark:bg-white/10 bg-white/50 border border-white/20 dark:border-white/20 border-slate-200 rounded-lg pl-10 pr-4 py-2 dark:text-white text-slate-900 placeholder-gray-400 dark:placeholder-gray-400 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedNote?.id === note.id
                      ? 'bg-purple-500/20 border border-purple-500/50'
                      : 'bg-white/5 dark:bg-white/5 bg-white/50 border border-white/10 dark:border-white/10 border-slate-200 hover:bg-white/10 dark:hover:bg-white/10 hover:bg-slate-100'
                  }`}
                >
                  <h3 className="font-medium dark:text-white text-slate-900 mb-1 truncate">{note.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-400 text-slate-600">
                    <Calendar className="w-3 h-3" />
                    {formatDate(note.updatedAt)}
                    <Clock className="w-3 h-3 ml-2" />
                    {new Date(note.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </Card3D>
        </div>

        <div className="lg:col-span-2">
          <Card3D className="bg-white/5 dark:bg-white/5 bg-white/60 backdrop-blur-xl rounded-2xl p-6 h-full border border-white/10 dark:border-white/10 border-slate-200">
            {selectedNote ? (
              <>
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                  <div className="flex gap-2">
                    {isEditing ? (
                      <button
                        onClick={handleSaveNote}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-green-500/25 transition-all"
                      >
                        <Save className="w-4 h-4" />
                        保存
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/25 transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                        编辑
                      </button>
                    )}
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="bg-white/10 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-white/20 transition-all"
                    >
                      {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showPreview ? '隐藏预览' : '显示预览'}
                    </button>
                  </div>
                  <button
                    onClick={() => handleDeleteNote(selectedNote.id)}
                    className="text-red-400 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[450px]">
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
                      className={`bg-transparent text-xl font-bold dark:text-white text-slate-900 mb-3 focus:outline-none placeholder-gray-500 dark:placeholder-gray-500 placeholder-slate-500 ${
                        !isEditing ? 'disabled:opacity-70' : 'border-b border-purple-500/50'
                      }`}
                    />
                    <textarea
                      value={isEditing ? editContent : selectedNote.content}
                      onChange={(e) => isEditing && setEditContent(e.target.value)}
                      disabled={!isEditing}
                      placeholder="开始书写... 支持 Markdown 语法"
                      className={`flex-1 bg-white/5 dark:bg-white/5 bg-white/50 border border-white/10 dark:border-white/10 border-slate-200 rounded-lg p-4 dark:text-gray-200 text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent custom-scrollbar font-mono text-sm ${
                        !isEditing ? 'disabled:opacity-70' : ''
                      }`}
                    />
                  </div>

                  {showPreview && (
                    <div className="bg-white/5 dark:bg-white/5 bg-white/50 border border-white/10 dark:border-white/10 border-slate-200 rounded-lg p-4 overflow-y-auto custom-scrollbar">
                      <h1 className="text-2xl font-bold dark:text-white text-slate-900 mb-4">{selectedNote.title}</h1>
                      <div className="dark:text-gray-200 text-slate-800 prose prose-invert max-w-none">
                        <MarkdownRenderer content={selectedNote.content} />
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[550px] text-gray-400 dark:text-gray-400 text-slate-600">
                <FileText className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg dark:text-lg text-slate-700">选择或创建一个笔记</p>
                <p className="text-sm mt-2 opacity-70">点击"新建"按钮开始</p>
              </div>
            )}
          </Card3D>
        </div>
      </div>
    </div>
  )
}
