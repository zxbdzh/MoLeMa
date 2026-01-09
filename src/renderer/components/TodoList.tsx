import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Check, X, Edit2 } from 'lucide-react'
import { useTodoStore } from '../store/todoStore'
import Card3D from './3DCard'

export default function TodoList() {
  const { todos, addTodo, toggleTodo, deleteTodo, updateTodo, clearCompleted } = useTodoStore()
  const [newTodo, setNewTodo] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault()
    if (newTodo.trim()) {
      addTodo(newTodo.trim())
      setNewTodo('')
    }
  }

  const handleEditStart = (id: string, text: string) => {
    setEditingId(id)
    setEditingText(text)
  }

  const handleEditSave = (id: string) => {
    if (editingText.trim()) {
      updateTodo(id, editingText.trim())
    }
    setEditingId(null)
    setEditingText('')
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditingText('')
  }

  const completedCount = todos.filter((t) => t.completed).length
  const totalCount = todos.length

  return (
    <div className="space-y-6">
      {/* 统计信息 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card3D className="p-6">
          <div className="text-3xl font-bold text-purple-400">{totalCount}</div>
          <div className="text-gray-400">总任务</div>
        </Card3D>
        <Card3D className="p-6">
          <div className="text-3xl font-bold text-green-400">{completedCount}</div>
          <div className="text-gray-400">已完成</div>
        </Card3D>
        <Card3D className="p-6">
          <div className="text-3xl font-bold text-pink-400">{totalCount - completedCount}</div>
          <div className="text-gray-400">待完成</div>
        </Card3D>
      </motion.div>

      {/* 添加任务表单 */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleAddTodo}
        className="flex gap-3"
      >
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="添加新任务..."
          className="flex-1 px-4 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all text-white placeholder-gray-500"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-medium hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          添加
        </motion.button>
      </motion.form>

      {/* 任务列表 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <AnimatePresence mode="popLayout">
          {todos.map((todo, index) => (
            <motion.div
              key={todo.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              layout
              className={`group relative overflow-hidden rounded-xl border ${
                todo.completed
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-white/5 border-white/10'
              } backdrop-blur-md`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative z-10 p-4 flex items-center gap-4">
                {/* 复选框 */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleTodo(todo.id)}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    todo.completed
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-500 hover:border-purple-500'
                  }`}
                >
                  {todo.completed && <Check className="w-4 h-4 text-white" />}
                </motion.button>

                {/* 任务文本 */}
                <div className="flex-1">
                  {editingId === todo.id ? (
                    <input
                      type="text"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onBlur={() => handleEditSave(todo.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSave(todo.id)
                        if (e.key === 'Escape') handleEditCancel()
                      }}
                      autoFocus
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-purple-500/50 text-white"
                    />
                  ) : (
                    <span
                      className={`text-lg ${
                        todo.completed
                          ? 'text-gray-500 line-through'
                          : 'text-white'
                      }`}
                    >
                      {todo.text}
                    </span>
                  )}
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!editingId && !todo.completed && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEditStart(todo.id, todo.text)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Edit2 className="w-4 h-4 text-gray-400" />
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => deleteTodo(todo.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {todos.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-6xl mb-4">📝</div>
            <p className="text-gray-400 text-lg">还没有任务，添加一个吧！</p>
          </motion.div>
        )}
      </motion.div>

      {/* 清除已完成按钮 */}
      {completedCount > 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={clearCompleted}
          className="w-full py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-red-500/50 hover:bg-red-500/10 transition-all"
        >
          清除已完成任务 ({completedCount})
        </motion.button>
      )}
    </div>
  )
}