import { create } from 'zustand'

export interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
}

interface TodoStore {
  todos: Todo[]
  addTodo: (text: string) => void
  toggleTodo: (id: string) => void
  deleteTodo: (id: string) => void
  updateTodo: (id: string, text: string) => void
  clearCompleted: () => void
  initialize: () => Promise<void>
}

// 从 electron-store 加载初始数据
const loadTodosFromStore = async (): Promise<Todo[]> => {
  try {
    const result = await window.electronAPI?.store?.get('todos')
    return result?.value || [
      { id: '1', text: '学习 React 和 TypeScript', completed: false, createdAt: Date.now() },
      { id: '2', text: '完成摸鱼软件项目', completed: false, createdAt: Date.now() },
      { id: '3', text: '阅读技术文章', completed: true, createdAt: Date.now() }
    ]
  } catch (error) {
    console.error('Failed to load todos from store:', error)
    return [
      { id: '1', text: '学习 React 和 TypeScript', completed: false, createdAt: Date.now() },
      { id: '2', text: '完成摸鱼软件项目', completed: false, createdAt: Date.now() },
      { id: '3', text: '阅读技术文章', completed: true, createdAt: Date.now() }
    ]
  }
}

// 保存 todos 到 electron-store
const saveTodosToStore = async (todos: Todo[]) => {
  try {
    await window.electronAPI?.store?.set('todos', todos)
  } catch (error) {
    console.error('Failed to save todos to store:', error)
  }
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  todos: [],
  
  initialize: async () => {
    const todos = await loadTodosFromStore()
    set({ todos })
  },
  
  addTodo: async (text) => {
    const newTodo = {
      id: Date.now().toString(),
      text,
      completed: false,
      createdAt: Date.now()
    }
    const newTodos = [...get().todos, newTodo]
    set({ todos: newTodos })
    await saveTodosToStore(newTodos)
  },
  
  toggleTodo: async (id) => {
    const newTodos = get().todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    )
    set({ todos: newTodos })
    await saveTodosToStore(newTodos)
  },
  
  deleteTodo: async (id) => {
    const newTodos = get().todos.filter((todo) => todo.id !== id)
    set({ todos: newTodos })
    await saveTodosToStore(newTodos)
  },
  
  updateTodo: async (id, text) => {
    const newTodos = get().todos.map((todo) =>
      todo.id === id ? { ...todo, text } : todo
    )
    set({ todos: newTodos })
    await saveTodosToStore(newTodos)
  },
  
  clearCompleted: async () => {
    const newTodos = get().todos.filter((todo) => !todo.completed)
    set({ todos: newTodos })
    await saveTodosToStore(newTodos)
  }
}))

// 初始化 todo store
useTodoStore.getState().initialize()