import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, ListChecks, Circle, CheckCircle } from 'lucide-react'
import { useTodoStore } from '../store/todoStore'
import { Card3D } from './3DCard'
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
  SortableContext, 
  sortableKeyboardCoordinates,
  useSortable
} from '@dnd-kit/sortable'
import { CSS as DndCSS } from '@dnd-kit/utilities'

interface Todo {
  id: string
  text: string
  completed: boolean
}

export default function TodoList() {
  const { todos, addTodo, toggleTodo, deleteTodo, updateTodo, clearCompleted, updateOrder, initialize } = useTodoStore()
  const [newTodo, setNewTodo] = useState('')

  // 初始化 todo 数据
  useEffect(() => {
    initialize()
  }, [initialize])

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault()
    if (newTodo.trim()) {
      addTodo(newTodo.trim())
      setNewTodo('')
    }
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
            <div className="flex items-center gap-3 mb-2">
              <Circle className="w-5 h-5 text-orange-400" />
              <div className="text-3xl font-bold dark:text-white text-slate-900">{totalCount - completedCount}</div>
            </div>
            <div className="text-gray-400 dark:text-gray-400 text-slate-500">待完成</div>
          </Card3D>
        </div>

        <form onSubmit={handleAddTodo} className="mt-6 flex gap-3">
          <input
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
          <SortableContext items={todos.map((todo: Todo) => todo.id)}>
            {todos.map((todo: Todo) => (
              <SortableTodoItem 
                key={todo.id} 
                todo={todo} 
                toggleTodo={toggleTodo} 
                deleteTodo={deleteTodo} 
                updateTodo={updateTodo} 
              />
            ))}
          </SortableContext>

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
