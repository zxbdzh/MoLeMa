import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Edit2, ListChecks, Circle, CheckCircle, BarChart3, X, Calendar, CalendarDays, CalendarClock, ChevronRight, ChevronDown } from 'lucide-react'
import { useTodoStore } from '../store/todoStore'
import { Card3D } from './3DCard'
import * as Dialog from '@radix-ui/react-dialog'
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import { 
  arrayMove, 
  sortableKeyboardCoordinates,
  useSortable
} from '@dnd-kit/sortable'
import { CSS as DndCSS } from '@dnd-kit/utilities'
import type { TodoCompletionStats } from '../types/electron'

interface Todo {
  id: string
  text: string
  completed: boolean
}

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

// 统计弹层组件
interface CompletionStatsModalProps {
  stats: TodoCompletionStats | null
  isOpen: boolean
  onClose: () => void
}

function CompletionStatsModal({ stats, isOpen, onClose }: CompletionStatsModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-blue-500" />
                <Dialog.Title className="text-xl font-bold text-slate-900 dark:text-white">完成统计</Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </Dialog.Close>
            </div>
            
            <div className="space-y-4">
              <StatItem 
                icon={<Calendar className="w-5 h-5 text-green-500" />}
                label="今日完成"
                value={stats?.today || 0}
                color="text-green-500"
                bgColor="bg-green-50 dark:bg-green-950/30"
              />
              <StatItem 
                icon={<CalendarDays className="w-5 h-5 text-blue-500" />}
                label="本周完成"
                value={stats?.thisWeek || 0}
                color="text-blue-500"
                bgColor="bg-blue-50 dark:bg-blue-950/30"
              />
              <StatItem 
                icon={<CalendarClock className="w-5 h-5 text-purple-500" />}
                label="本月完成"
                value={stats?.thisMonth || 0}
                color="text-purple-500"
                bgColor="bg-purple-50 dark:bg-purple-950/30"
              />
              <StatItem 
                icon={<Calendar className="w-5 h-5 text-orange-500" />}
                label="本年完成"
                value={stats?.thisYear || 0}
                color="text-orange-500"
                bgColor="bg-orange-50 dark:bg-orange-950/30"
              />
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <StatItem 
                  icon={<BarChart3 className="w-5 h-5 text-yellow-500" />}
                  label="累计完成"
                  value={stats?.total || 0}
                  color="text-yellow-600 dark:text-yellow-400"
                  bgColor="bg-yellow-50 dark:bg-yellow-950/30"
                />
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function StatItem({ icon, label, value, color, bgColor }: { icon: React.ReactNode, label: string, value: number, color: string, bgColor?: string }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl ${bgColor || 'bg-slate-100 dark:bg-slate-700/30'}`}>
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-slate-700 dark:text-slate-300">{label}</span>
      </div>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
  )
}

// 分页按钮组件
function PaginationButtons({
  currentPage,
  totalPages,
  maxVisible,
  onPageChange
}: {
  currentPage: number
  totalPages: number
  maxVisible: number
  onPageChange: (page: number) => void
}) {
  const pages = []

  // 如果总页数小于等于最大显示数，显示所有页码
  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
            currentPage === i
              ? 'bg-blue-500 text-white'
              : 'bg-slate-800/40 dark:bg-slate-800/40 bg-white/40 border border-slate-700/50 dark:border-slate-700/50 border-slate-200/50 text-slate-600 dark:text-slate-400 hover:bg-slate-700/50 dark:hover:bg-slate-700/50'
          }`}
        >
          {i}
        </button>
      )
    }
  } else {
    // 总页数超过最大显示数，使用省略号
    let startPage = Math.max(2, currentPage - Math.floor((maxVisible - 2) / 2))
    let endPage = Math.min(totalPages - 1, startPage + maxVisible - 3)

    // 调整起始页，确保显示足够的页码
    if (endPage - startPage + 1 < maxVisible - 2) {
      startPage = Math.max(2, endPage - (maxVisible - 3))
    }

    // 第一页
    pages.push(
      <button
        key={1}
        onClick={() => onPageChange(1)}
        className={`px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
          currentPage === 1
            ? 'bg-blue-500 text-white'
            : 'bg-slate-800/40 dark:bg-slate-800/40 bg-white/40 border border-slate-700/50 dark:border-slate-700/50 border-slate-200/50 text-slate-600 dark:text-slate-400 hover:bg-slate-700/50 dark:hover:bg-slate-700/50'
        }`}
      >
        1
      </button>
    )

    // 起始省略号
    if (startPage > 2) {
      pages.push(<span key="start-ellipsis" className="text-slate-400">...</span>)
    }

    // 中间页码
    for (let i = startPage; i <= endPage; i++) {
      if (i > 1 && i < totalPages) {
        pages.push(
          <button
            key={i}
            onClick={() => onPageChange(i)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
              currentPage === i
                ? 'bg-blue-500 text-white'
                : 'bg-slate-800/40 dark:bg-slate-800/40 bg-white/40 border border-slate-700/50 dark:border-slate-700/50 border-slate-200/50 text-slate-600 dark:text-slate-400 hover:bg-slate-700/50 dark:hover:bg-slate-700/50'
            }`}
          >
            {i}
          </button>
        )
      }
    }

    // 结束省略号
    if (endPage < totalPages - 1) {
      pages.push(<span key="end-ellipsis" className="text-slate-400">...</span>)
    }

    // 最后一页
    pages.push(
      <button
        key={totalPages}
        onClick={() => onPageChange(totalPages)}
        className={`px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer ${
          currentPage === totalPages
            ? 'bg-blue-500 text-white'
            : 'bg-slate-800/40 dark:bg-slate-800/40 bg-white/40 border border-slate-700/50 dark:border-slate-700/50 border-slate-200/50 text-slate-600 dark:text-slate-400 hover:bg-slate-700/50 dark:hover:bg-slate-700/50'
        }`}
      >
        {totalPages}
      </button>
    )
  }

  return <>{pages}</>
}

export default function TodoList() {
  const {
    todos,
    addTodo,
    toggleTodo,
    deleteTodo,
    updateTodo,
    clearCompleted,
    updateOrder,
    initialize,
    completionStats,
    loadCompletionStats,
    pendingTodos,
    completedTodos,
    completedTotalCount,
    completedCurrentPage,
    completedTotalPages,
    completedPageSize,
    completedMaxVisiblePages,
    completedCollapsed,
    toggleCompletedCollapsed,
    setCompletedPage,
    setCompletedPageSize,
    setCompletedMaxVisiblePages
  } = useTodoStore()
  const [newTodo, setNewTodo] = useState('')
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [pageInput, setPageInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // 初始化 todo 数据
  useEffect(() => {
    initialize()
  }, [initialize])

  // 定期刷新统计数据
  useEffect(() => {
    const interval = setInterval(() => {
      loadCompletionStats()
    }, 60000) // 每分钟刷新一次
    
    return () => clearInterval(interval)
  }, [loadCompletionStats])

  // 窗口可见时聚焦输入框
  useWindowVisibility(() => {
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  })

  // 组件挂载时聚焦输入框
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }, [])

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault()
    if (newTodo.trim()) {
      addTodo(newTodo.trim())
      setNewTodo('')
      // 重新聚焦输入框
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }

  const handleStatsModalClose = () => {
    setShowStatsModal(false)
    // Radix UI Dialog 会自动处理焦点管理，关闭后会自动返回之前的焦点
  }

  const completedCount = todos.filter((t) => t.completed).length
  const totalCount = todos.length

  // 传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      const oldIndex = todos.findIndex((item: Todo) => item.id === active.id)
      const newIndex = todos.findIndex((item: Todo) => item.id === over.id)
      
      const newTodos = arrayMove(todos, oldIndex, newIndex)
      updateOrder(newTodos)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ListChecks className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold font-heading dark:text-white text-slate-900">待办事项</h1>
          </div>
          <p className="text-slate-400 ml-11">高效管理您的任务，让工作井井有条</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card3D className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <ListChecks className="w-5 h-5 text-blue-400" />
              <div className="text-3xl font-bold dark:text-white text-slate-900">{totalCount}</div>
            </div>
            <div className="text-gray-400 dark:text-gray-400 text-slate-500">总任务</div>
          </Card3D>

          <Card3D className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div className="text-3xl font-bold dark:text-white text-slate-900">{completedCount}</div>
            </div>
            <div className="text-gray-400 dark:text-gray-400 text-slate-500">已完成</div>
          </Card3D>

          <Card3D className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Circle className="w-5 h-5 text-orange-400" />
                <div className="text-3xl font-bold dark:text-white text-slate-900">{totalCount - completedCount}</div>
              </div>
              <button
                onClick={() => setShowStatsModal(true)}
                className="p-2 hover:bg-slate-700/50 dark:hover:bg-slate-700/50 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="查看统计"
              >
                <BarChart3 className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="text-gray-400 dark:text-gray-400 text-slate-500">待完成</div>
          </Card3D>
        </div>

        <form onSubmit={handleAddTodo} className="mt-6 flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="添加新任务..."
            className="flex-1 px-4 py-3 bg-slate-800/50 dark:bg-slate-800/50 bg-white/50 border border-slate-700 dark:border-slate-700 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500/50 dark:text-white text-slate-900 placeholder-slate-400 dark:placeholder-slate-400 placeholder-slate-400 transition-colors"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium text-white dark:text-white flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            添加
          </button>
        </form>

        <div className="mt-8 space-y-3">
          {/* 待完成的任务 */}
          <div className="space-y-3">
            {pendingTodos.map((todo: Todo) => (
              <SortableTodoItem 
                key={todo.id} 
                todo={todo} 
                toggleTodo={toggleTodo} 
                deleteTodo={deleteTodo} 
                updateTodo={updateTodo} 
              />
            ))}
          </div>

          {/* 已完成的任务 */}
          {completedTodos.length > 0 && (
            <div className="mt-6">
              <button
                onClick={toggleCompletedCollapsed}
                className="flex items-center gap-2 mb-3 text-slate-400 hover:text-slate-300 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                {completedCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                <span>已完成 ({completedTotalCount})</span>
              </button>

              {!completedCollapsed && (
                <div className="space-y-3">
                  {completedTodos.map((todo: Todo) => (
                    <SortableTodoItem
                      key={todo.id}
                      todo={todo}
                      toggleTodo={toggleTodo}
                      deleteTodo={deleteTodo}
                      updateTodo={updateTodo}
                    />
                  ))}

                  {/* 分页控件 */}
                  {completedTotalPages > 1 && (
                    <div className="flex items-center justify-center flex-wrap gap-2 pt-2">
                      {/* 上一页按钮 */}
                      <button
                        onClick={() => setCompletedPage(completedCurrentPage - 1)}
                        disabled={completedCurrentPage === 1}
                        className="px-3 py-1.5 rounded-lg bg-slate-800/40 dark:bg-slate-800/40 bg-white/40 border border-slate-700/50 dark:border-slate-700/50 border-slate-200/50 text-slate-600 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer text-sm"
                      >
                        上一页
                      </button>

                      {/* 页码按钮 */}
                      <PaginationButtons
                        currentPage={completedCurrentPage}
                        totalPages={completedTotalPages}
                        maxVisible={completedMaxVisiblePages}
                        onPageChange={setCompletedPage}
                      />

                      {/* 下一页按钮 */}
                      <button
                        onClick={() => setCompletedPage(completedCurrentPage + 1)}
                        disabled={completedCurrentPage === completedTotalPages}
                        className="px-3 py-1.5 rounded-lg bg-slate-800/40 dark:bg-slate-800/40 bg-white/40 border border-slate-700/50 dark:border-slate-700/50 border-slate-200/50 text-slate-600 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer text-sm"
                      >
                        下一页
                      </button>

                      {/* 页码跳转输入框 */}
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400">跳转</span>
                        <input
                          type="number"
                          min="1"
                          max={completedTotalPages}
                          value={pageInput}
                          onChange={(e) => setPageInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const page = parseInt(pageInput)
                              if (page >= 1 && page <= completedTotalPages) {
                                setCompletedPage(page)
                                setPageInput('')
                              }
                            }
                          }}
                          placeholder="页码"
                          className="w-16 px-2 py-1.5 rounded-lg bg-slate-800/40 dark:bg-slate-800/40 bg-white/40 border border-slate-700/50 dark:border-slate-700/50 border-slate-200/50 text-sm dark:text-white text-slate-900 focus:outline-none focus:border-blue-500/50"
                        />
                        <button
                          onClick={() => {
                            const page = parseInt(pageInput)
                            if (page >= 1 && page <= completedTotalPages) {
                              setCompletedPage(page)
                              setPageInput('')
                            }
                          }}
                          disabled={!pageInput || parseInt(pageInput) < 1 || parseInt(pageInput) > completedTotalPages}
                          className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          Go
                        </button>
                      </div>

                      {/* 每页显示数量选择 */}
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400">每页</span>
                        <select
                          value={completedPageSize}
                          onChange={(e) => setCompletedPageSize(parseInt(e.target.value))}
                          className="px-2 py-1.5 rounded-lg bg-slate-800/40 dark:bg-slate-800/40 bg-white/40 border border-slate-700/50 dark:border-slate-700/50 border-slate-200/50 text-sm dark:text-white text-slate-900 focus:outline-none focus:border-blue-500/50 cursor-pointer"
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                        <span className="text-sm text-slate-600 dark:text-slate-400">条</span>
                      </div>

                      {/* 最大显示页码数选择 */}
                      <div className="flex items-center gap-2 ml-2">
                        <select
                          value={completedMaxVisiblePages}
                          onChange={(e) => setCompletedMaxVisiblePages(parseInt(e.target.value))}
                          className="px-2 py-1.5 rounded-lg bg-slate-800/40 dark:bg-slate-800/40 bg-white/40 border border-slate-700/50 dark:border-slate-700/50 border-slate-200/50 text-sm dark:text-white text-slate-900 focus:outline-none focus:border-blue-500/50 cursor-pointer"
                        >
                          <option value={3}>3</option>
                          <option value={5}>5</option>
                          <option value={7}>7</option>
                          <option value={10}>10</option>
                        </select>
                        <span className="text-sm text-slate-600 dark:text-slate-400">/页</span>
                      </div>

                      {/* 总页数显示 */}
                      <span className="text-sm text-slate-600 dark:text-slate-400 ml-2">
                        共 {completedTotalPages} 页
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {todos.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-500 text-slate-500">
              <ListChecks className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg dark:text-lg text-slate-700">还没有任务</p>
              <p className="text-sm mt-2">添加一个新任务开始吧！</p>
            </div>
          )}
        </div>

        {completedCount > 0 && (
          <button
            onClick={clearCompleted}
            className="mt-4 w-full py-3 bg-slate-800/40 dark:bg-slate-800/40 bg-white/40 border border-slate-700/50 dark:border-slate-700/50 border-slate-200/50 rounded-xl text-slate-400 dark:text-slate-400 text-slate-600 hover:text-white dark:hover:text-slate-900 hover:border-red-500/30 dark:hover:border-red-500/30 hover:border-red-300/30 hover:bg-red-500/10 dark:hover:bg-red-500/10 hover:bg-red-50/20 transition-colors cursor-pointer"
          >
            清除已完成任务 ({completedCount})
          </button>
        )}
      </div>
      
      {/* 统计弹层 */}
      <CompletionStatsModal
        stats={completionStats}
        isOpen={showStatsModal}
        onClose={handleStatsModalClose}
      />
    </DndContext>
  )
}

// Sortable Todo Item 组件
function SortableTodoItem({ todo, toggleTodo, deleteTodo, updateTodo }: { 
  todo: Todo, 
  toggleTodo: (id: string) => void, 
  deleteTodo: (id: string) => void, 
  updateTodo: (id: string, text: string) => void 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: todo.id })

  const style = {
    transform: DndCSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1,
    position: 'relative' as const
  }

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState(todo.text)

  const handleEditStart = (text: string) => {
    setEditingId(todo.id)
    setEditingText(text)
  }

  const handleEditSave = () => {
    if (editingText.trim()) {
      updateTodo(todo.id, editingText.trim())
    }
    setEditingId(null)
    setEditingText('')
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditingText('')
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group overflow-hidden rounded-lg border transition-all ${
        todo.completed
          ? 'bg-green-500/5 border-green-500/20 dark:bg-green-500/5 dark:border-green-500/20 bg-green-50/30 border-green-200/30'
          : 'bg-slate-800/40 border-slate-700/50 dark:bg-slate-800/40 dark:border-slate-700/50 bg-white/40 border-slate-200/50'
      } hover:border-blue-500/30 dark:hover:border-blue-500/30 hover:border-blue-300/30`}
    >
      <div className="p-4 flex items-center gap-4">
        {/* 拖动手柄 - 六点图标，增大尺寸 */}
        <div 
          className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1" 
          {...attributes} 
          {...listeners}
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            className="w-6 h-6 text-slate-400"
          >
            <circle cx="8" cy="8" r="2" />
            <circle cx="8" cy="12" r="2" />
            <circle cx="8" cy="16" r="2" />
            <circle cx="16" cy="8" r="2" />
            <circle cx="16" cy="12" r="2" />
            <circle cx="16" cy="16" r="2" />
          </svg>
        </div>
        
        {/* 完成状态图标 - 增大尺寸 */}
        <div className="flex-shrink-0 cursor-pointer" onClick={() => toggleTodo(todo.id)}>
          {todo.completed ? (
            <CheckCircle className="w-6 h-6 text-green-400" />
          ) : (
            <Circle className="w-6 h-6 text-gray-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {editingId === todo.id ? (
            <input
              type="text"
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onBlur={handleEditSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEditSave()
                if (e.key === 'Escape') handleEditCancel()
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              className="w-full px-3 py-1 bg-slate-800/50 dark:bg-slate-800/50 bg-white/50 border border-slate-700 dark:border-slate-700 border-slate-200 rounded focus:outline-none focus:border-blue-500/50 dark:text-white text-slate-900 transition-colors"
            />
          ) : (
            <span
              className={`text-base truncate ${
                todo.completed
                  ? 'text-slate-500 dark:text-slate-300 text-slate-600 line-through'
                  : 'text-slate-200 dark:text-slate-100 text-slate-800'
              }`}
            >
              {todo.text}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!editingId && !todo.completed && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleEditStart(todo.text)
              }}
              className="p-2 hover:bg-slate-800/50 dark:hover:bg-slate-800/50 hover:bg-slate-200 rounded transition-colors cursor-pointer"
              title="编辑"
            >
              <Edit2 className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              deleteTodo(todo.id)
            }}
            className="p-2 hover:bg-red-500/20 rounded transition-colors cursor-pointer"
            title="删除"
          >
            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
          </button>
        </div>
      </div>
    </div>
  )
}
