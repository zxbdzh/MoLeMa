import { useState, useEffect, useRef } from 'react';
import { Plus, ListChecks, Circle, CheckCircle, BarChart3, ChevronRight, ChevronDown } from 'lucide-react';
import { useTodoStore } from '../../store/todoStore';
import { Card3D } from '../../components/ui/3DCard';
import { useWindowVisibility } from '../../hooks/useWindowVisibility';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  sortableKeyboardCoordinates,
  SortableContext
} from '@dnd-kit/sortable';

import { CompletionStatsModal } from './components/CompletionStatsModal';
import { PaginationButtons } from './components/PaginationButtons';
import { SortableTodoItem } from './components/SortableTodoItem';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export default function TodoList() {
  const {
    todos,
    addTodo,
    toggleTodo,
    deleteTodo,
    updateTodo,
    clearCompleted,
    updatePendingOrder,
    updateCompletedOrder,
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
  } = useTodoStore();

  const [newTodo, setNewTodo] = useState('');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [pageInput, setPageInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 初始化 todo 数据
  useEffect(() => {
    initialize();
  }, [initialize]);

  // 定期刷新统计数据
  useEffect(() => {
    const interval = setInterval(() => {
      loadCompletionStats();
    }, 60000); // 每分钟刷新一次
    
    return () => clearInterval(interval);
  }, [loadCompletionStats]);

  // 窗口可见时聚焦输入框
  useWindowVisibility(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  });

  // 组件挂载时聚焦输入框
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.trim()) {
      addTodo(newTodo.trim());
      setNewTodo('');
      // 重新聚焦输入框
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleStatsModalClose = () => {
    setShowStatsModal(false);
  };

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;

  // 传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const activeTodo = pendingTodos.find((t: Todo) => t.id === active.id);
      const overTodo = pendingTodos.find((t: Todo) => t.id === over.id);
      
      let sourceList: Todo[];
      let targetList: Todo[];
      
      if (activeTodo && overTodo) {
        // 都在待完成列表中
        sourceList = pendingTodos;
        targetList = pendingTodos;
      } else {
        // 都在已完成列表中
        sourceList = completedTodos;
        targetList = completedTodos;
      }
      
      const oldIndex = sourceList.findIndex((item: Todo) => item.id === active.id);
      const newIndex = targetList.findIndex((item: Todo) => item.id === over.id);
      
      const newSourceList = arrayMove(sourceList, oldIndex, newIndex);
      
      // 更新对应的列表
      if (activeTodo && overTodo) {
        // 更新待完成列表
        updatePendingOrder(newSourceList);
      } else {
        // 更新已完成列表
        updateCompletedOrder(newSourceList);
      }
    }
  };

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
          <SortableContext items={pendingTodos.map(t => t.id)}>
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
          </SortableContext>

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
                <SortableContext items={completedTodos.map(t => t.id)}>
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
                              const page = parseInt(pageInput);
                              if (page >= 1 && page <= completedTotalPages) {
                                setCompletedPage(page);
                                setPageInput('');
                              }
                            }
                          }}
                          placeholder="页码"
                          className="w-16 px-2 py-1.5 rounded-lg bg-slate-800/40 dark:bg-slate-800/40 bg-white/40 border border-slate-700/50 dark:border-slate-700/50 border-slate-200/50 text-sm dark:text-white text-slate-900 focus:outline-none focus:border-blue-500/50"
                        />
                        <button
                          onClick={() => {
                            const page = parseInt(pageInput);
                            if (page >= 1 && page <= completedTotalPages) {
                              setCompletedPage(page);
                              setPageInput('');
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
                </SortableContext>
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
  );
}