import { create } from 'zustand'

export interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
  order?: number  // 添加排序字段
}

export interface TodoCompletionStats {
  today: number
  thisWeek: number
  thisMonth: number
  thisYear: number
  total: number
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
  
  // 新增：完成统计
  completionStats: TodoCompletionStats | null
  loadCompletionStats: () => Promise<void>
  
  // 新增：分页相关
  currentPage: number
  pageSize: number
  paginationEnabled: boolean
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  loadPaginatedTodos: (page?: number) => Promise<void>
  
  // 新增：已完成折叠
  completedCollapsed: boolean
  toggleCompletedCollapsed: () => void

  // 新增：已完成任务总数和分页
  completedTotalCount: number
  completedCurrentPage: number
  completedTotalPages: number
  completedPageSize: number
  completedMaxVisiblePages: number
  setCompletedPage: (page: number) => void
  setCompletedPageSize: (size: number) => void
  setCompletedMaxVisiblePages: (max: number) => void

  // 新增：获取待完成和已完成的待办事项
  pendingTodos: Todo[]
  completedTodos: Todo[]
  loadPendingTodos: (page?: number) => Promise<void>
  loadCompletedTodos: (page?: number) => Promise<void>
}

// 从数据库加载初始数据
const loadTodosFromDatabase = async (): Promise<Todo[]> => {
  try {
    const result = await window.electronAPI?.todos?.getAll()
    // 正确处理API返回的对象结构：{ success: boolean, todos: Todo[] }
    const todosArray = result?.success ? (result.todos || []) : []
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
      { id: '2', text: '完成摸了吗软件项目', completed: false, createdAt: Date.now() },
      { id: '3', text: '阅读技术文章', completed: true, createdAt: Date.now() }
    ]
  }
}

// 删除待办事项
const deleteTodoFromDatabase = async (id: string) => {
  try {
    await window.electronAPI?.todos?.delete(parseInt(id))
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
  completionStats: null,
  currentPage: 1,
  pageSize: 10,
  paginationEnabled: false,
  completedCollapsed: true,
  completedTotalCount: 0,
  completedCurrentPage: 1,
  completedTotalPages: 1,
  completedPageSize: 10,
  completedMaxVisiblePages: 5,
  pendingTodos: [],
  completedTodos: [],
  
  initialize: async () => {
    const todos = await loadTodosFromDatabase()
    set({ todos })

    // 检查是否需要分页
    set({ paginationEnabled: todos.length >= 5 })

    // 加载完成统计
    get().loadCompletionStats()

    // 加载待完成和已完成的待办事项
    get().loadPendingTodos()

    // 加载已完成任务（使用分页）
    const completedResult = await window.electronAPI?.todos?.getCompleted(1, 10)
    if (completedResult?.success && completedResult.todos) {
      const todos = completedResult.todos.map((todo: any) => ({
        id: todo.id.toString(),
        text: todo.text,
        completed: todo.completed === 1,
        createdAt: todo.created_at || Date.now(),
        order: todo.order
      }))

      // 如果已完成任务超过5个，自动折叠
      if (completedResult.total && completedResult.total > 5) {
        set({
          completedTodos: todos.slice(0, 5),
          completedTotalCount: completedResult.total,
          completedCurrentPage: 1,
          completedTotalPages: Math.ceil(completedResult.total / 10),
          completedCollapsed: true
        })
      } else {
        set({
          completedTodos: todos,
          completedTotalCount: completedResult.total || 0,
          completedCurrentPage: 1,
          completedTotalPages: completedResult.totalPages || 1
        })
      }
    }
  },
  
  loadCompletionStats: async () => {
    try {
      const result = await window.electronAPI?.todos?.getCompletionStats()
      if (result?.success && result.stats) {
        set({ completionStats: result.stats })
      }
    } catch (error) {
      console.error('Failed to load completion stats:', error)
    }
  },
  
  setCurrentPage: (page: number) => {
    set({ currentPage: page })
  },
  
  setPageSize: (size: number) => {
    set({ pageSize: size, currentPage: 1 })
  },
  
  loadPaginatedTodos: async (page?: number) => {
    try {
      const currentPage = page || get().currentPage
      const pageSize = get().pageSize
      const result = await window.electronAPI?.todos?.getPaginated(currentPage, pageSize)
      
      if (result?.success && result.todos) {
        const todos = result.todos.map((todo: any) => ({
          id: todo.id.toString(),
          text: todo.text,
          completed: todo.completed === 1,
          createdAt: todo.created_at || Date.now(),
          order: todo.order
        }))
        set({ todos })
      }
    } catch (error) {
      console.error('Failed to load paginated todos:', error)
    }
  },
  
  loadPendingTodos: async (page?: number) => {
    try {
      const currentPage = page || 1
      const result = await window.electronAPI?.todos?.getPending(currentPage, 100) // 获取所有待完成的
      
      if (result?.success && result.todos) {
        const todos = result.todos.map((todo: any) => ({
          id: todo.id.toString(),
          text: todo.text,
          completed: todo.completed === 1,
          createdAt: todo.created_at || Date.now(),
          order: todo.order
        }))
        set({ pendingTodos: todos })
      }
    } catch (error) {
      console.error('Failed to load pending todos:', error)
    }
  },
  
  loadCompletedTodos: async (page?: number) => {
    try {
      const isCollapsed = get().completedCollapsed
      const pageSize = get().completedPageSize

      if (isCollapsed) {
        // 折叠状态：只加载前5个任务
        const result = await window.electronAPI?.todos?.getCompleted(1, 5)
        if (result?.success && result.todos) {
          const todos = result.todos.map((todo: any) => ({
            id: todo.id.toString(),
            text: todo.text,
            completed: todo.completed === 1,
            createdAt: todo.created_at || Date.now(),
            order: todo.order
          }))
          set({
            completedTodos: todos,
            completedTotalCount: result.total || 0
          })
        }
      } else {
        // 展开状态：使用分页加载
        const currentPage = page || get().completedCurrentPage
        const result = await window.electronAPI?.todos?.getCompleted(currentPage, pageSize)

        if (result?.success && result.todos) {
          const todos = result.todos.map((todo: any) => ({
            id: todo.id.toString(),
            text: todo.text,
            completed: todo.completed === 1,
            createdAt: todo.created_at || Date.now(),
            order: todo.order
          }))
          // 更新已完成任务总数和分页信息
          set({
            completedTodos: todos,
            completedTotalCount: result.total || 0,
            completedCurrentPage: result.currentPage || 1,
            completedTotalPages: result.totalPages || 1
          })
        }
      }
    } catch (error) {
      console.error('Failed to load completed todos:', error)
    }
  },

  setCompletedPage: (page: number) => {
    set({ completedCurrentPage: page })
    get().loadCompletedTodos(page)
  },

  setCompletedPageSize: (size: number) => {
    set({ completedPageSize: size, completedCurrentPage: 1 })
    get().loadCompletedTodos(1)
  },

  setCompletedMaxVisiblePages: (max: number) => {
    set({ completedMaxVisiblePages: max })
  },
  
  toggleCompletedCollapsed: () => {
    const newCollapsed = !get().completedCollapsed
    set({ completedCollapsed: newCollapsed })
    // 重新加载已完成的待办事项
    get().loadCompletedTodos()
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
        
        // 重新加载待完成列表
        get().loadPendingTodos()
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
      await window.electronAPI?.todos?.toggle(parseInt(id))
      const newTodos = get().todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
      set({ todos: newTodos })
      
      // 重新加载列表和统计
      get().loadPendingTodos()
      get().loadCompletedTodos()
      get().loadCompletionStats()
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
      
      // 重新加载列表
      get().loadPendingTodos()
      get().loadCompletedTodos()
    } catch (error) {
      console.error('Error deleting todo:', error)
      // 降级到本地状态删除
      const newTodos = get().todos.filter((todo) => todo.id !== id)
      set({ todos: newTodos })
    }
  },
  
  updateTodo: async (id, text) => {
    try {
      await window.electronAPI?.todos?.update(parseInt(id), { text, completed: 0 })
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
      
      // 重新加载列表（不影响统计）
      get().loadCompletedTodos()
      get().loadCompletionStats()
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
  },
  
  updatePendingOrder: async (newPendingTodos) => {
    // 为每个todo添加顺序索引
    const todosWithOrder = newPendingTodos.map((todo, index) => ({
      ...todo,
      order: index
    }))
    
    // 获取ID数组并转换为数字类型
    const orderedIds = newPendingTodos.map(todo => parseInt(todo.id))
    
    try {
      // 调用数据库API更新顺序
      await window.electronAPI?.todos?.updateOrder(orderedIds)
      // 更新本地状态
      set({ pendingTodos: todosWithOrder })
    } catch (error) {
      console.error('Error updating pending todo order in database:', error);
    }
  },
  
  updateCompletedOrder: async (newCompletedTodos) => {
    // 为每个todo添加顺序索引
    const todosWithOrder = newCompletedTodos.map((todo, index) => ({
      ...todo,
      order: index
    }))
    
    // 获取ID数组并转换为数字类型
    const orderedIds = newCompletedTodos.map(todo => parseInt(todo.id))
    
    try {
      // 调用数据库API更新顺序
      await window.electronAPI?.todos?.updateOrder(orderedIds)
      // 更新本地状态
      set({ completedTodos: todosWithOrder })
    } catch (error) {
      console.error('Error updating completed todo order in database:', error);
    }
  }
}))

// 初始化 todo store
useTodoStore.getState().initialize()