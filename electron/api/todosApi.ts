import { getDatabase } from '../database';

export interface Todo {
  id?: number;
  text: string;
  completed?: number;
  created_at?: number;
  completed_at?: number;
  order_index?: number;
}

export interface TodoCompletionStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  thisYear: number;
  total: number;
}

/**
 * 获取 ISO 周数
 */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export const todosApi = {
  /**
   * 获取所有待办事项
   */
  getAll: (): Todo[] => {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM todos 
      ORDER BY order_index ASC, created_at DESC
    `).all() as Todo[];
  },

  /**
   * 根据 ID 获取待办事项
   */
  getById: (id: number): Todo | undefined => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as Todo | undefined;
  },

  /**
   * 创建待办事项
   */
  create: (todo: Pick<Todo, 'text'>): number => {
    const db = getDatabase();
    const now = Date.now();
    const result = db.prepare(`
      INSERT INTO todos (text, completed, created_at, completed_at)
      VALUES (?, 0, ?, NULL)
    `).run(todo.text, now);
    return result.lastInsertRowid as number;
  },

  /**
   * 更新待办事项
   */
  update: (id: number, todo: Partial<Pick<Todo, 'text' | 'completed' | 'completed_at'>>): boolean => {
    const db = getDatabase();
    const updates: string[] = [];
    const values: any[] = [];
    
    if (todo.text !== undefined) {
      updates.push('text = ?');
      values.push(todo.text);
    }
    if (todo.completed !== undefined) {
      updates.push('completed = ?');
      values.push(todo.completed);
      // 如果标记为完成，设置完成时间
      if (todo.completed === 1) {
        updates.push('completed_at = ?');
        values.push(Date.now());
      } else {
        updates.push('completed_at = NULL');
      }
    }
    
    if (updates.length === 0) return false;
    
    values.push(id);
    
    const result = db.prepare(`
      UPDATE todos SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);
    
    return result.changes > 0;
  },

  /**
   * 切换完成状态
   */
  toggle: (id: number): boolean => {
    const db = getDatabase();
    const todo = todosApi.getById(id);
    if (!todo) return false;
    
    const newCompleted = todo.completed === 1 ? 0 : 1;
    const completedAt = newCompleted === 1 ? Date.now() : null;
    
    const result = db.prepare(`
      UPDATE todos SET completed = ?, completed_at = ? WHERE id = ?
    `).run(newCompleted, completedAt, id);
    
    if (result.changes > 0) {
      // 如果标记为完成，记录统计
      if (newCompleted === 1 && completedAt !== null) {
        todosApi.recordCompletion(id, completedAt);
      }
      // 如果取消完成，删除统计记录
      else {
        todosApi.removeCompletion(id);
      }
    }
    
    return result.changes > 0;
  },

  /**
   * 删除待办事项
   */
  delete: (id: number): boolean => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM todos WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * 清除已完成的待办事项
   */
  clearCompleted: (): number => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM todos WHERE completed = 1').run();
    return result.changes;
  },

  /**
   * 获取统计信息
   */
  getStats: (): { total: number; completed: number; pending: number } => {
    const db = getDatabase();
    const total = db.prepare('SELECT COUNT(*) as count FROM todos').get() as { count: number };
    const completed = db.prepare('SELECT COUNT(*) as count FROM todos WHERE completed = 1').get() as { count: number };
    
    return {
      total: total.count,
      completed: completed.count,
      pending: total.count - completed.count
    };
  },

  /**
   * 批量更新待办事项顺序
   */
  updateOrder: (orderedIds: number[]): boolean => {
    const db = getDatabase();
    
    try {
      // 开始事务
      const transaction = db.transaction(() => {
        const updateStmt = db.prepare('UPDATE todos SET order_index = ? WHERE id = ?');
        
        for (let i = 0; i < orderedIds.length; i++) {
          updateStmt.run(i, orderedIds[i]);
        }
      });
      
      transaction();
      
      return true;
    } catch (error) {
      console.error('Failed to update todo order:', error);
      return false;
    }
  },

  /**
   * 获取完成统计信息
   */
  getCompletionStats: (): TodoCompletionStats => {
    const db = getDatabase();
    const now = new Date();
    
    // 计算当前时间键
    const dateKey = parseInt(now.getFullYear().toString() + 
      (now.getMonth() + 1).toString().padStart(2, '0') + 
      now.getDate().toString().padStart(2, '0'));
    
    const weekKey = parseInt(now.getFullYear().toString() + 
      getISOWeek(now).toString().padStart(2, '0'));
    
    const monthKey = parseInt(now.getFullYear().toString() + 
      (now.getMonth() + 1).toString().padStart(2, '0'));
    
    const yearKey = now.getFullYear();
    
    // 查询各时间段完成数
    const todayCount = db.prepare(`
      SELECT COUNT(*) as count FROM todo_completion_stats WHERE date_key = ?
    `).get(dateKey) as { count: number };
    
    const thisWeekCount = db.prepare(`
      SELECT COUNT(*) as count FROM todo_completion_stats WHERE week_key = ?
    `).get(weekKey) as { count: number };
    
    const thisMonthCount = db.prepare(`
      SELECT COUNT(*) as count FROM todo_completion_stats WHERE month_key = ?
    `).get(monthKey) as { count: number };
    
    const thisYearCount = db.prepare(`
      SELECT COUNT(*) as count FROM todo_completion_stats WHERE year_key = ?
    `).get(yearKey) as { count: number };
    
    const totalCount = db.prepare(`
      SELECT COUNT(*) as count FROM todo_completion_stats
    `).get() as { count: number };
    
    return {
      today: todayCount.count,
      thisWeek: thisWeekCount.count,
      thisMonth: thisMonthCount.count,
      thisYear: thisYearCount.count,
      total: totalCount.count
    };
  },

  /**
   * 记录任务完成
   * 当任务从未完成变为完成时调用
   */
  recordCompletion: (todoId: number, completedAt: number): boolean => {
    const db = getDatabase();
    
    try {
      const date = new Date(completedAt);
      
      // 计算各种时间键
      const dateKey = parseInt(date.getFullYear().toString() + 
        (date.getMonth() + 1).toString().padStart(2, '0') + 
        date.getDate().toString().padStart(2, '0'));
      
      const weekKey = parseInt(date.getFullYear().toString() + 
        getISOWeek(date).toString().padStart(2, '0'));
      
      const monthKey = parseInt(date.getFullYear().toString() + 
        (date.getMonth() + 1).toString().padStart(2, '0'));
      
      const yearKey = date.getFullYear();
      
      // 插入统计记录
      db.prepare(`
        INSERT INTO todo_completion_stats 
        (todo_id, completed_at, date_key, week_key, month_key, year_key, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(todoId, completedAt, dateKey, weekKey, monthKey, yearKey, Date.now());
      
      return true;
    } catch (error) {
      console.error('Failed to record completion:', error);
      return false;
    }
  },

  /**
   * 取消任务完成记录
   * 当任务从完成变为未完成时调用
   */
  removeCompletion: (todoId: number): boolean => {
    const db = getDatabase();
    
    try {
      // 删除该任务的完成记录
      db.prepare('DELETE FROM todo_completion_stats WHERE todo_id = ?').run(todoId);
      return true;
    } catch (error) {
      console.error('Failed to remove completion:', error);
      return false;
    }
  },

  /**
   * 获取分页的待办事项
   */
  getPaginatedTodos: (page: number = 1, pageSize: number = 10): {
    todos: Todo[];
    total: number;
    totalPages: number;
    currentPage: number;
  } => {
    const db = getDatabase();
    
    // 获取总数
    const totalResult = db.prepare('SELECT COUNT(*) as count FROM todos').get() as { count: number };
    const total = totalResult.count;
    
    // 计算分页
    const totalPages = Math.ceil(total / pageSize);
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const offset = (currentPage - 1) * pageSize;
    
    // 获取分页数据
    const todos = db.prepare(`
      SELECT * FROM todos 
      ORDER BY order_index ASC, created_at DESC
      LIMIT ? OFFSET ?
    `).all(pageSize, offset) as Todo[];
    
    return {
      todos,
      total,
      totalPages,
      currentPage
    };
  },

  /**
   * 获取待完成的待办事项（分页）
   */
  getPendingTodos: (page: number = 1, pageSize: number = 10): {
    todos: Todo[];
    total: number;
    totalPages: number;
    currentPage: number;
  } => {
    const db = getDatabase();
    
    // 获取总数
    const totalResult = db.prepare('SELECT COUNT(*) as count FROM todos WHERE completed = 0').get() as { count: number };
    const total = totalResult.count;
    
    // 计算分页
    const totalPages = Math.ceil(total / pageSize);
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const offset = (currentPage - 1) * pageSize;
    
    // 获取分页数据
    const todos = db.prepare(`
      SELECT * FROM todos 
      WHERE completed = 0
      ORDER BY order_index ASC, created_at DESC
      LIMIT ? OFFSET ?
    `).all(pageSize, offset) as Todo[];
    
    return {
      todos,
      total,
      totalPages,
      currentPage
    };
  },

  /**
   * 获取已完成的待办事项（分页）
   */
  getCompletedTodos: (page: number = 1, pageSize: number = 10): {
    todos: Todo[];
    total: number;
    totalPages: number;
    currentPage: number;
  } => {
    const db = getDatabase();
    
    // 获取总数
    const totalResult = db.prepare('SELECT COUNT(*) as count FROM todos WHERE completed = 1').get() as { count: number };
    const total = totalResult.count;
    
    // 计算分页
    const totalPages = Math.ceil(total / pageSize);
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const offset = (currentPage - 1) * pageSize;
    
    // 获取分页数据
    const todos = db.prepare(`
      SELECT * FROM todos 
      WHERE completed = 1
      ORDER BY completed_at DESC, created_at DESC
      LIMIT ? OFFSET ?
    `).all(pageSize, offset) as Todo[];
    
    return {
      todos,
      total,
      totalPages,
      currentPage
    };
  }
};