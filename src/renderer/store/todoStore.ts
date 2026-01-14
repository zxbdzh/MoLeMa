import { create } from 'zustand'

export interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
  order?: number  // 添加排序字段
}

interface TodoStore {
  todos: Todo[]
  addTodo: (text: string) => void
  toggleTodo: (id: string) => void
  deleteTodo: (id: string) => void
  updateTodo: (id: string, text: string) => void
  clearCompleted: () => void
  updateOrder: (newTodos: Todo[]) => void
  initialize: () => Promise<void>
}

// 从数据库加载初始数据
const loadTodosFromDatabase = async (): Promise<Todo[]> => {
  try {
    const result = await window.electronAPI?.todos?.getAll()
    // 正确处理API返回的对象结构：{ success: boolean, todos: Todo[] }
    const todosArray = result?.success ? result.todos : []
    // 将数据库格式转换为前端格式
    return todosArray.map((todo: any) => ({
      id: todo.id.toString(),
      text: todo.text,
      completed: todo.completed === 1,
      createdAt: todo.created_at || Date.now(),
      order: todo.order
    }))
  } catch (error) {
    console.error('Failed to load todos from database:', error)
    // 返回初始示例数据
    return [
      { id: '1', text: '学习 React 和 TypeScript', completed: false, createdAt: Date.now() },
      { id: '2', text: '完成摸鱼软件项目', completed: false, createdAt: Date.now() },
      { id: '3', text: '阅读技术文章', completed: true, createdAt: Date.now() }
    ]
  }
}

// 保存 todos 到数据库
const saveTodoToDatabase = async (todo: Omit<Todo, 'id'>, id?: string) => {
  try {
    if (id) {
      // 更新现有待办事项
      await window.electronAPI?.todos?.update(id, {
        text: todo.text,
        completed: todo.completed ? 1 : 0
      })
    } else {
      // 创建新的待办事项
      const newId = await window.electronAPI?.todos?.create({
        text: todo.text
      })
      return newId
    }
  } catch (error) {
    console.error('Failed to save todo to database:', error)
  }
}

// 更新待办事项状态
const updateTodoStatusInDatabase = async (id: string, completed: boolean) => {
  try {
    await window.electronAPI?.todos?.toggle(id)
  } catch (error) {
    console.error('Failed to update todo status in database:', error)
  }
}

// 删除待办事项
const deleteTodoFromDatabase = async (id: string) => {
  try {
    await window.electronAPI?.todos?.delete(id)
  } catch (error) {
    console.error('Failed to delete todo from database:', error)
  }
}

// 清除已完成的待办事项
const clearCompletedTodosInDatabase = async () => {
  try {
    await window.electronAPI?.todos?.clearCompleted()
  } catch (error) {
    console.error('Failed to clear completed todos from database:', error)
  }
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  todos: [],
  
  initialize: async () => {
    const todos = await loadTodosFromDatabase()
    set({ todos })
  },
  
  addTodo: async (text) => {
    // 去除前后空格
    const trimmedText = text.trim()
    
    // 检查是否已存在相同的待办事项（忽略大小写）
    const existingTodo = get().todos.find(todo => todo.text.trim().toLowerCase() === trimmedText.toLowerCase())
    if (existingTodo) {
      alert('该待办事项已存在，请不要重复添加！')
      return
    }
    
    if (!trimmedText) return
    
    try {
      // 创建新待办事项，通过IPC调用数据库API
      const newId = await window.electronAPI?.todos?.create({ text: trimmedText })
      if (newId) {
        const newTodo = {
          id: newId.toString(),
          text: trimmedText,
          completed: false,
          createdAt: Date.now()
        }
        const newTodos = [...get().todos, newTodo]
        set({ todos: newTodos })
      }
    } catch (error) {
      console.error('Error adding todo:', error)
      // 降级到本地状态
      const newTodo = {
        id: Date.now().toString(),
        text: trimmedText,
        completed: false,
        createdAt: Date.now()
      }
      const newTodos = [...get().todos, newTodo]
      set({ todos: newTodos })
    }
  },
  
  toggleTodo: async (id) => {
    try {
      await window.electronAPI?.todos?.toggle(id)
      const newTodos = get().todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
      set({ todos: newTodos })
    } catch (error) {
      console.error('Error toggling todo:', error)
      // 降级到本地状态切换
      const newTodos = get().todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
      set({ todos: newTodos })
    }
  },
  
  deleteTodo: async (id) => {
    try {
      await deleteTodoFromDatabase(id)
      const newTodos = get().todos.filter((todo) => todo.id !== id)
      set({ todos: newTodos })
    } catch (error) {
      console.error('Error deleting todo:', error)
      // 降级到本地状态删除
      const newTodos = get().todos.filter((todo) => todo.id !== id)
      set({ todos: newTodos })
    }
  },
  
  updateTodo: async (id, text) => {
    try {
      await window.electronAPI?.todos?.update(id, { text, completed: 0 })
      const newTodos = get().todos.map((todo) =>
        todo.id === id ? { ...todo, text } : todo
      )
      set({ todos: newTodos })
    } catch (error) {
      console.error('Error updating todo:', error)
      // 降级到本地状态更新
      const newTodos = get().todos.map((todo) =>
        todo.id === id ? { ...todo, text } : todo
      )
      set({ todos: newTodos })
    }
  },
  
  clearCompleted: async () => {
    try {
      await clearCompletedTodosInDatabase()
      const newTodos = get().todos.filter((todo) => !todo.completed)
      set({ todos: newTodos })
    } catch (error) {
      console.error('Error clearing completed todos:', error)
      // 降级到本地状态清理
      const newTodos = get().todos.filter((todo) => !todo.completed)
      set({ todos: newTodos })
    }
  },
  
  updateOrder: async (newTodos) => {
    // 为每个todo添加顺序索引
    const todosWithOrder = newTodos.map((todo, index) => ({
      ...todo,
      order: index
    }))
    set({ todos: todosWithOrder })
    
    // 获取ID数组并转换为数字类型
    const orderedIds = newTodos.map(todo => parseInt(todo.id));
    
    try {
      // 调用数据库API更新顺序
      await window.electronAPI?.todos?.updateOrder(orderedIds);
    } catch (error) {
      console.error('Error updating todo order in database:', error);
      // 降级到本地状态更新
    }
  }
}))

// 初始化 todo store
useTodoStore.getState().initialize()