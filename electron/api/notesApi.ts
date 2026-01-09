import { getDatabase } from '../database';

export interface Note {
  id?: number;
  title: string;
  content: string;
  preview_content?: string;
  created_at?: number;
  updated_at?: number;
  is_deleted?: number;
  tags?: string;
}

export const notesApi = {
  /**
   * 获取所有笔记
   */
  getAll: (): Note[] => {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM notes 
      WHERE is_deleted = 0 
      ORDER BY updated_at DESC
    `).all() as Note[];
  },

  /**
   * 根据 ID 获取笔记
   */
  getById: (id: number): Note | undefined => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM notes WHERE id = ? AND is_deleted = 0').get(id) as Note | undefined;
  },

  /**
   * 搜索笔记
   */
  search: (query: string): Note[] => {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM notes 
      WHERE is_deleted = 0 
      AND (title LIKE ? OR content LIKE ?)
      ORDER BY updated_at DESC
    `).all(`%${query}%`, `%${query}%`) as Note[];
  },

  /**
   * 创建笔记
   */
  create: (note: Omit<Note, 'id' | 'created_at' | 'updated_at' | 'is_deleted'>): number => {
    const db = getDatabase();
    const now = Date.now();
    const result = db.prepare(`
      INSERT INTO notes (title, content, preview_content, created_at, updated_at, is_deleted, tags)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(
      note.title,
      note.content,
      note.preview_content || null,
      now,
      now,
      note.tags || null
    );
    return result.lastInsertRowid as number;
  },

  /**
   * 更新笔记
   */
  update: (id: number, note: Partial<Pick<Note, 'title' | 'content' | 'preview_content' | 'tags'>>): boolean => {
    const db = getDatabase();
    const updates: string[] = [];
    const values: any[] = [];
    
    if (note.title !== undefined) {
      updates.push('title = ?');
      values.push(note.title);
    }
    if (note.content !== undefined) {
      updates.push('content = ?');
      values.push(note.content);
    }
    if (note.preview_content !== undefined) {
      updates.push('preview_content = ?');
      values.push(note.preview_content);
    }
    if (note.tags !== undefined) {
      updates.push('tags = ?');
      values.push(note.tags);
    }
    
    if (updates.length === 0) return false;
    
    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);
    
    const result = db.prepare(`
      UPDATE notes SET ${updates.join(', ')} WHERE id = ? AND is_deleted = 0
    `).run(...values);
    
    return result.changes > 0;
  },

  /**
   * 删除笔记（软删除）
   */
  delete: (id: number): boolean => {
    const db = getDatabase();
    const result = db.prepare('UPDATE notes SET is_deleted = 1 WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * 永久删除笔记
   */
  permanentDelete: (id: number): boolean => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM notes WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * 获取笔记数量
   */
  count: (): number => {
    const db = getDatabase();
    const result = db.prepare('SELECT COUNT(*) as count FROM notes WHERE is_deleted = 0').get() as { count: number };
    return result.count;
  }
};