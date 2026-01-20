import { create } from 'zustand'

export interface Note {
  id: string
  title: string
  content: string
  createdAt: number
  updatedAt: number
}

interface NotesStore {
  notes: Note[]
  addNote: (title: string, content: string) => void
  updateNote: (id: string, title: string, content: string) => void
  deleteNote: (id: string) => void
  getNote: (id: string) => Note | undefined
  initialize: () => Promise<void>
}

// 从 electron-store 加载初始数据
const loadNotesFromStore = async (): Promise<Note[]> => {
  try {
    const result = await window.electronAPI?.store?.get('notes')
    return result?.value || [
      {
        id: '1',
        title: '欢迎使用摸了吗软件',
        content: '# 欢迎使用\n\n这是一个示例笔记，支持 **Markdown** 语法。\n\n## 功能特点\n\n- 快速记录\n- 支持 Markdown\n- 炫酷动画\n\n开始使用吧！',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]
  } catch (error) {
    console.error('Failed to load notes from store:', error)
    return [
      {
        id: '1',
        title: '欢迎使用摸了吗软件',
        content: '# 欢迎使用\n\n这是一个示例笔记，支持 **Markdown** 语法。\n\n## 功能特点\n\n- 快速记录\n- 支持 Markdown\n- 炫酷动画\n\n开始使用吧！',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]
  }
}

// 保存 notes 到 electron-store
const saveNotesToStore = async (notes: Note[]) => {
  try {
    await window.electronAPI?.store?.set('notes', notes)
  } catch (error) {
    console.error('Failed to save notes to store:', error)
  }
}

export const useNotesStore = create<NotesStore>((set, get) => ({
  notes: [],
  
  initialize: async () => {
    const notes = await loadNotesFromStore()
    set({ notes })
  },
  
  addNote: async (title, content) => {
    const newNote = {
      id: Date.now().toString(),
      title,
      content,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    const newNotes = [...get().notes, newNote]
    set({ notes: newNotes })
    await saveNotesToStore(newNotes)
  },
  
  updateNote: async (id, title, content) => {
    const newNotes = get().notes.map((note) =>
      note.id === id ? { ...note, title, content, updatedAt: Date.now() } : note
    )
    set({ notes: newNotes })
    await saveNotesToStore(newNotes)
  },
  
  deleteNote: async (id) => {
    const newNotes = get().notes.filter((note) => note.id !== id)
    set({ notes: newNotes })
    await saveNotesToStore(newNotes)
  },
  
  getNote: (id) => {
    return get().notes.find((note) => note.id === id)
  }
}))

// 初始化 notes store
useNotesStore.getState().initialize()