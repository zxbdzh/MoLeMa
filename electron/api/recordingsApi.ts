import { getDatabase } from '../database';

export interface Recording {
  id?: number;
  file_name: string;
  file_path: string;
  duration?: number;
  file_size?: number;
  device_name?: string;
  device_id?: string;
  created_at?: number;
  notes?: string;
}

export const recordingsApi = {
  /**
   * 获取所有录音记录
   */
  getAll: (limit: number = 50, offset: number = 0): Recording[] => {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM recordings
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as Recording[];
  },

  /**
   * 根据 ID 获取录音
   */
  getById: (id: number): Recording | undefined => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM recordings WHERE id = ?').get(id) as Recording | undefined;
  },

  /**
   * 创建录音记录
   */
  create: (recording: Omit<Recording, 'id' | 'created_at'>): number => {
    const db = getDatabase();
    const result = db.prepare(`
      INSERT INTO recordings (file_name, file_path, duration, file_size, device_name, device_id, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      recording.file_name,
      recording.file_path,
      recording.duration || null,
      recording.file_size || null,
      recording.device_name || null,
      recording.device_id || null,
      recording.notes || null,
      Date.now()
    );
    console.log(`Recording created with ID: ${result.lastInsertRowid}`);
    return result.lastInsertRowid as number;
  },

  /**
   * 更新录音记录
   */
  update: (id: number, recording: Partial<Pick<Recording, 'duration' | 'file_size' | 'notes'>>): boolean => {
    const db = getDatabase();
    const updates: string[] = [];
    const values: any[] = [];
    
    if (recording.duration !== undefined) {
      updates.push('duration = ?');
      values.push(recording.duration);
    }
    if (recording.file_size !== undefined) {
      updates.push('file_size = ?');
      values.push(recording.file_size);
    }
    if (recording.notes !== undefined) {
      updates.push('notes = ?');
      values.push(recording.notes);
    }
    
    if (updates.length === 0) return false;
    
    values.push(id);
    
    const result = db.prepare(`
      UPDATE recordings SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);
    
    return result.changes > 0;
  },

  /**
   * 删除录音记录
   */
  delete: (id: number): boolean => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM recordings WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * 获取录音总数
   */
  count: (): number => {
    const db = getDatabase();
    const result = db.prepare('SELECT COUNT(*) as count FROM recordings').get() as { count: number };
    return result.count;
  },

  /**
   * 获取统计信息
   */
  getStats: (): { total: number; totalDuration: number; totalSize: number } => {
    const db = getDatabase();
    const total = db.prepare('SELECT COUNT(*) as count FROM recordings').get() as { count: number };
    const durationResult = db.prepare('SELECT SUM(duration) as total FROM recordings').get() as { total: number | null };
    const sizeResult = db.prepare('SELECT SUM(file_size) as total FROM recordings').get() as { total: number | null };
    
    return {
      total: total.count,
      totalDuration: durationResult.total || 0,
      totalSize: sizeResult.total || 0
    };
  }
};