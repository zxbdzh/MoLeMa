import { getDatabase } from '../database';

export interface NewsCategory {
  id?: number;
  name: string;
  icon?: string;
  color?: string;
  sort_order?: number;
  created_at?: number;
}

export interface NewsSource {
  id?: number;
  name: string;
  url: string;
  description?: string;
  category_id?: number;
  is_active?: number;
  fetch_interval?: number;
  last_fetched_at?: number;
  created_at?: number;
  updated_at?: number;
}

export interface NewsItem {
  id?: number;
  title: string;
  link: string;
  description?: string;
  content?: string;
  pub_date?: number;
  author?: string;
  image_url?: string;
  source_id: number;
  category_id?: number;
  is_read?: number;
  created_at?: number;
}

export const newsApi = {
  // ==================== 分类管理 ====================
  
  /**
   * 获取所有分类
   */
  getAllCategories: (): NewsCategory[] => {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM news_categories 
      ORDER BY sort_order ASC
    `).all() as NewsCategory[];
  },

  /**
   * 根据 ID 获取分类
   */
  getCategoryById: (id: number): NewsCategory | undefined => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM news_categories WHERE id = ?').get(id) as NewsCategory | undefined;
  },

  /**
   * 创建分类
   */
  createCategory: (category: Omit<NewsCategory, 'id' | 'created_at'>): number => {
    const db = getDatabase();
    const result = db.prepare(`
      INSERT INTO news_categories (name, icon, color, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(category.name, category.icon || null, category.color || null, category.sort_order || 0, Date.now());
    return result.lastInsertRowid as number;
  },

  /**
   * 更新分类
   */
  updateCategory: (id: number, category: Partial<Pick<NewsCategory, 'name' | 'icon' | 'color' | 'sort_order'>>): boolean => {
    const db = getDatabase();
    const updates: string[] = [];
    const values: any[] = [];
    
    if (category.name !== undefined) {
      updates.push('name = ?');
      values.push(category.name);
    }
    if (category.icon !== undefined) {
      updates.push('icon = ?');
      values.push(category.icon);
    }
    if (category.color !== undefined) {
      updates.push('color = ?');
      values.push(category.color);
    }
    if (category.sort_order !== undefined) {
      updates.push('sort_order = ?');
      values.push(category.sort_order);
    }
    
    if (updates.length === 0) return false;
    
    values.push(id);
    
    const result = db.prepare(`
      UPDATE news_categories SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);
    
    return result.changes > 0;
  },

  /**
   * 删除分类
   */
  deleteCategory: (id: number): boolean => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM news_categories WHERE id = ?').run(id);
    return result.changes > 0;
  },

  // ==================== 新闻源管理 ====================
  
  /**
   * 获取所有新闻源
   */
  getAllSources: (): NewsSource[] => {
    const db = getDatabase();
    return db.prepare(`
      SELECT s.*, c.name as category_name 
      FROM news_sources s
      LEFT JOIN news_categories c ON s.category_id = c.id
      ORDER BY s.created_at DESC
    `).all() as any[];
  },

  /**
   * 获取活跃的新闻源
   */
  getActiveSources: (): NewsSource[] => {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM news_sources 
      WHERE is_active = 1
      ORDER BY created_at DESC
    `).all() as NewsSource[];
  },

  /**
   * 根据 ID 获取新闻源
   */
  getSourceById: (id: number): NewsSource | undefined => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM news_sources WHERE id = ?').get(id) as NewsSource | undefined;
  },

  /**
   * 根据 URL 获取新闻源
   */
  getSourceByUrl: (url: string): NewsSource | undefined => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM news_sources WHERE url = ?').get(url) as NewsSource | undefined;
  },

  /**
   * 创建新闻源
   */
  createSource: (source: Omit<NewsSource, 'id' | 'created_at' | 'updated_at'>): number => {
    const db = getDatabase();
    const now = Date.now();
    const result = db.prepare(`
      INSERT INTO news_sources (name, url, description, category_id, is_active, fetch_interval, last_fetched_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      source.name,
      source.url,
      source.description || null,
      source.category_id || null,
      source.is_active !== undefined ? source.is_active : 1,
      source.fetch_interval || 3600,
      source.last_fetched_at || null,
      now,
      now
    );
    return result.lastInsertRowid as number;
  },

  /**
   * 更新新闻源
   */
  updateSource: (id: number, source: Partial<Pick<NewsSource, 'name' | 'url' | 'description' | 'category_id' | 'is_active' | 'fetch_interval'>>): boolean => {
    const db = getDatabase();
    const updates: string[] = [];
    const values: any[] = [];
    
    if (source.name !== undefined) {
      updates.push('name = ?');
      values.push(source.name);
    }
    if (source.url !== undefined) {
      updates.push('url = ?');
      values.push(source.url);
    }
    if (source.description !== undefined) {
      updates.push('description = ?');
      values.push(source.description);
    }
    if (source.category_id !== undefined) {
      updates.push('category_id = ?');
      values.push(source.category_id);
    }
    if (source.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(source.is_active);
    }
    if (source.fetch_interval !== undefined) {
      updates.push('fetch_interval = ?');
      values.push(source.fetch_interval);
    }
    
    if (updates.length === 0) return false;
    
    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);
    
    const result = db.prepare(`
      UPDATE news_sources SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);
    
    return result.changes > 0;
  },

  /**
   * 更新新闻源最后抓取时间
   */
  updateSourceLastFetched: (id: number): boolean => {
    const db = getDatabase();
    const result = db.prepare(`
      UPDATE news_sources SET last_fetched_at = ?, updated_at = ? WHERE id = ?
    `).run(Date.now(), Date.now(), id);
    return result.changes > 0;
  },

  /**
   * 删除新闻源
   */
  deleteSource: (id: number): boolean => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM news_sources WHERE id = ?').run(id);
    return result.changes > 0;
  },

  // ==================== 新闻条目管理 ====================
  
  /**
   * 获取新闻条目（分页）
   */
  getNewsItems: (limit: number = 50, offset: number = 0, categoryId?: number): NewsItem[] => {
    const db = getDatabase();
    let query = `
      SELECT n.*, s.name as source_name, c.name as category_name, c.color as category_color
      FROM news_items n
      LEFT JOIN news_sources s ON n.source_id = s.id
      LEFT JOIN news_categories c ON n.category_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (categoryId !== undefined) {
      query += ' AND n.category_id = ?';
      params.push(categoryId);
    }
    
    query += ' ORDER BY n.pub_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    return db.prepare(query).all(...params) as any[];
  },

  /**
   * 获取最近的新闻条目
   */
  getRecentNewsItems: (limit: number = 50): NewsItem[] => {
    return newsApi.getNewsItems(limit, 0);
  },

  /**
   * 根据 ID 获取新闻条目
   */
  getNewsItemById: (id: number): NewsItem | undefined => {
    const db = getDatabase();
    return db.prepare(`
      SELECT n.*, s.name as source_name, c.name as category_name, c.color as category_color
      FROM news_items n
      LEFT JOIN news_sources s ON n.source_id = s.id
      LEFT JOIN news_categories c ON n.category_id = c.id
      WHERE n.id = ?
    `).get(id) as any;
  },

  /**
   * 根据 source_id 获取新闻条目
   */
  getNewsItemsBySourceId: (sourceId: number, limit: number = 50): NewsItem[] => {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM news_items 
      WHERE source_id = ?
      ORDER BY pub_date DESC
      LIMIT ?
    `).all(sourceId, limit) as NewsItem[];
  },

  /**
   * 创建新闻条目
   */
  createNewsItem: (item: Omit<NewsItem, 'id' | 'created_at'>): number => {
    const db = getDatabase();
    const now = Date.now();
    
    try {
      const result = db.prepare(`
        INSERT OR IGNORE INTO news_items (title, link, description, content, pub_date, author, image_url, source_id, category_id, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        item.title,
        item.link,
        item.description || null,
        item.content || null,
        item.pub_date || now,
        item.author || null,
        item.image_url || null,
        item.source_id,
        item.category_id || null,
        item.is_read !== undefined ? item.is_read : 0,
        now
      );
      return result.lastInsertRowid as number;
    } catch (error) {
      // 如果是唯一键冲突（重复的 link），返回 0
      return 0;
    }
  },

  /**
   * 更新新闻条目
   */
  updateNewsItem: (id: number, item: Partial<Pick<NewsItem, 'title' | 'description' | 'content' | 'is_read'>>): boolean => {
    const db = getDatabase();
    const updates: string[] = [];
    const values: any[] = [];
    
    if (item.title !== undefined) {
      updates.push('title = ?');
      values.push(item.title);
    }
    if (item.description !== undefined) {
      updates.push('description = ?');
      values.push(item.description);
    }
    if (item.content !== undefined) {
      updates.push('content = ?');
      values.push(item.content);
    }
    if (item.is_read !== undefined) {
      updates.push('is_read = ?');
      values.push(item.is_read);
    }
    
    if (updates.length === 0) return false;
    
    values.push(id);
    
    const result = db.prepare(`
      UPDATE news_items SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);
    
    return result.changes > 0;
  },

  /**
   * 更新新闻条目内容
   */
  updateNewsItemContent: (id: number, content: string): boolean => {
    const db = getDatabase();
    const result = db.prepare('UPDATE news_items SET content = ? WHERE id = ?').run(content, id);
    return result.changes > 0;
  },

  /**
   * 标记新闻为已读
   */
  markAsRead: (id: number): boolean => {
    const db = getDatabase();
    const result = db.prepare('UPDATE news_items SET is_read = 1 WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * 批量标记新闻为已读
   */
  markMultipleAsRead: (ids: number[]): number => {
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    const result = db.prepare(`UPDATE news_items SET is_read = 1 WHERE id IN (${placeholders})`).run(...ids);
    return result.changes;
  },

  /**
   * 删除新闻条目
   */
  deleteNewsItem: (id: number): boolean => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM news_items WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * 清理旧新闻（保留最近 N 天）
   */
  cleanOldNews: (daysToKeep: number = 30): number => {
    const db = getDatabase();
    const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const result = db.prepare('DELETE FROM news_items WHERE pub_date < ?').run(cutoffDate);
    return result.changes;
  },

  // ==================== 收藏管理 ====================
  
  /**
   * 添加收藏
   */
  addFavorite: (itemId: number): boolean => {
    const db = getDatabase();
    try {
      db.prepare('INSERT INTO favorites (item_id, created_at) VALUES (?, ?)').run(itemId, Date.now());
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * 移除收藏
   */
  removeFavorite: (itemId: number): boolean => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM favorites WHERE item_id = ?').run(itemId);
    return result.changes > 0;
  },

  /**
   * 获取所有收藏
   */
  getAllFavorites: (limit: number = 50): any[] => {
    const db = getDatabase();
    return db.prepare(`
      SELECT n.*, s.name as source_name, c.name as category_name, c.color as category_color, f.created_at as favorited_at
      FROM favorites f
      JOIN news_items n ON f.item_id = n.id
      LEFT JOIN news_sources s ON n.source_id = s.id
      LEFT JOIN news_categories c ON n.category_id = c.id
      ORDER BY f.created_at DESC
      LIMIT ?
    `).all(limit);
  },

  /**
   * 检查是否已收藏
   */
  isFavorite: (itemId: number): boolean => {
    const db = getDatabase();
    const result = db.prepare('SELECT COUNT(*) as count FROM favorites WHERE item_id = ?').get(itemId) as { count: number };
    return result.count > 0;
  }
};