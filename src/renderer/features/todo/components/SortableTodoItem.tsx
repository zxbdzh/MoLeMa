import React, { useState } from 'react';
import { useSortable, defaultAnimateLayoutChanges, AnimateLayoutChanges } from '@dnd-kit/sortable';
import { CSS as DndCSS } from '@dnd-kit/utilities';
import { CheckCircle, Circle, Edit2, Trash2 } from 'lucide-react';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface SortableTodoItemProps {
  todo: Todo;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  updateTodo: (id: string, text: string) => void;
}

export function SortableTodoItem({ todo, toggleTodo, deleteTodo, updateTodo }: SortableTodoItemProps) {
  const animateLayoutChanges: AnimateLayoutChanges = (args) =>
    defaultAnimateLayoutChanges({ ...args, wasDragging: true });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: todo.id,
    animateLayoutChanges
  });

  const style = {
    transform: DndCSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 1,
    position: 'relative' as const
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState(todo.text);

  const handleEditStart = (text: string) => {
    setEditingId(todo.id);
    setEditingText(text);
  };

  const handleEditSave = () => {
    if (editingText.trim()) {
      updateTodo(todo.id, editingText.trim());
    }
    setEditingId(null);
    setEditingText('');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingText('');
  };

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
        {/* 拖动手柄 */}
        <div 
          className="flex-shrink-0 cursor-grab active:cursor-grabbing p-2 select-none touch-none" 
          {...attributes} 
          {...listeners}
          role="button"
          aria-label="拖动排序"
          tabIndex={0}
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            className="w-6 h-6 text-slate-400 pointer-events-none"
          >
            <circle cx="8" cy="8" r="2" />
            <circle cx="8" cy="12" r="2" />
            <circle cx="8" cy="16" r="2" />
            <circle cx="16" cy="8" r="2" />
            <circle cx="16" cy="12" r="2" />
            <circle cx="16" cy="16" r="2" />
          </svg>
        </div>
        
        {/* 完成状态图标 */}
        <div 
          className="flex-shrink-0 cursor-pointer" 
          onClick={() => toggleTodo(todo.id)}
          data-no-dnd="true"
        >
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
                if (e.key === 'Enter') handleEditSave();
                if (e.key === 'Escape') handleEditCancel();
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              data-no-dnd="true"
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
                e.stopPropagation();
                handleEditStart(todo.text);
              }}
              className="p-2 hover:bg-slate-800/50 dark:hover:bg-slate-800/50 hover:bg-slate-200 rounded transition-colors cursor-pointer"
              title="编辑"
              data-no-dnd="true"
            >
              <Edit2 className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteTodo(todo.id);
            }}
            className="p-2 hover:bg-red-500/20 rounded transition-colors cursor-pointer"
            title="删除"
            data-no-dnd="true"
          >
            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
