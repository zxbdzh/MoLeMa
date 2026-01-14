import { getDatabase } from '../database';

export interface Todo {
  id?: number;
  text: string;
  completed?: number;
  created_at?: number;
  completed_at?: number;
  order_index?: number;
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
  }
};