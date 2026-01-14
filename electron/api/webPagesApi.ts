import { getDatabase } from '../database';

export interface WebPage {
  id?: number;
  title: string;
  url: string;
  description?: string;
  category_id?: number;
  is_favorite?: number;
  is_active?: number;
  favicon?: string;
  created_at?: number;
  updated_at?: number;
  view_count?: number;
}

export interface WebPageCategory {
  id?: number;
  name: string;
  icon?: string;
  color?: string;
  sort_order?: number;
  created_at?: number;
}

export const webPagesApi = {
  // ==================== 分类管理 ====================
  
  /**
   * 获取所有分类
   */
  getAllCategories: (): WebPageCategory[] => {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM web_page_categories 
      ORDER BY sort_order ASC
    `).all() as WebPageCategory[];
  },

  /**
   * 根据 ID 获取分类
   */
  getCategoryById: (id: number): WebPageCategory | undefined => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM web_page_categories WHERE id = ?').get(id) as WebPageCategory | undefined;
  },

  /**
   * 创建分类
   */
  createCategory: (category: Omit<WebPageCategory, 'id' | 'created_at'>): number => {
    const db = getDatabase();
    const result = db.prepare(`
      INSERT INTO web_page_categories (name, icon, color, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(category.name, category.icon || null, category.color || null, category.sort_order || 0, Date.now());
    return result.lastInsertRowid as number;
  },

  /**
   * 更新分类
   */
  updateCategory: (id: number, category: Partial<Pick<WebPageCategory, 'name' | 'icon' | 'color' | 'sort_order'>>): boolean => {
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
      UPDATE web_page_categories SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);
    
    return result.changes > 0;
  },

  /**
   * 删除分类（检查是否有关联网页）
   */
  deleteCategory: (id: number): { success: boolean; error?: string; webPageCount?: number } => {
    const db = getDatabase();
    
    // 检查是否有关联网页
    const countResult = db.prepare('SELECT COUNT(*) as count FROM web_pages WHERE category_id = ?').get(id) as { count: number };
    
    if (countResult.count > 0) {
      return {
        success: false,
        error: `无法删除，该分类下还有 ${countResult.count} 个网页`,
        webPageCount: countResult.count
      };
    }
    
    const result = db.prepare('DELETE FROM web_page_categories WHERE id = ?').run(id);
    return {
      success: result.changes > 0,
      webPageCount: countResult.count
    };
  },

  /**
   * 获取分类下的网页数量
   */
  getCategoryWebPageCount: (categoryId: number): number => {
    const db = getDatabase();
    const result = db.prepare('SELECT COUNT(*) as count FROM web_pages WHERE category_id = ?').get(categoryId) as { count: number };
    return result.count;
  },

  // ==================== 网页收藏管理 ====================
  
  /**
   * 获取所有网页收藏
   */
  getAll: (limit: number = 50, offset: number = 0, categoryId?: number, isFavorite?: boolean): WebPage[] => {
    const db = getDatabase();
    let query = `
      SELECT w.*, wpc.name as category_name
      FROM web_pages w
      LEFT JOIN web_page_categories wpc ON w.category_id = wpc.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (categoryId !== undefined) {
      query += ' AND w.category_id = ?';
      params.push(categoryId);
    }
    
    if (isFavorite !== undefined) {
      query += ` AND w.is_favorite = ${isFavorite ?1 : 0}`;
    }
    
    query += ' ORDER BY w.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    return db.prepare(query).all(...params) as any[];
  },

  /**
   * 根据 ID 获取网页
   */
  getById: (id: number): WebPage | undefined => {
    const db = getDatabase();
    return db.prepare(`
      SELECT w.*, wpc.name as category_name
      FROM web_pages w
      LEFT JOIN web_page_categories wpc ON w.category_id = wpc.id
      WHERE w.id = ?
    `).get(id) as any;
  },

  /**
   * 根据 URL 获取网页
   */
  getByUrl: (url: string): WebPage | undefined => {
    const db = getDatabase();
    return db.prepare(`
      SELECT w.*, wpc.name as category_name
      FROM web_pages w
      LEFT JOIN web_page_categories wpc ON w.category_id = wpc.id
      WHERE w.url = ?
    `).get(url) as any;
  },

  /**
   * 创建网页收藏
   */
  create: (webPage: Omit<WebPage, 'id' | 'created_at' | 'updated_at'>): number => {
    const db = getDatabase();
    const now = Date.now();
    const result = db.prepare(`
      INSERT INTO web_pages (title, url, description, category_id, is_favorite, is_active, favicon, created_at, updated_at, view_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      webPage.title,
      webPage.url,
      webPage.description || null,
      webPage.category_id || null,
      webPage.is_favorite || 0,
      webPage.is_active || 1,
      webPage.favicon || null,
      now,
      now,
      webPage.view_count || 0
    );
    return result.lastInsertRowid as number;
  },

  /**
   * 更新网页收藏
   */
  update: (id: number, webPage: Partial<Pick<WebPage, 'title' | 'url' | 'description' | 'category_id' | 'is_favorite' | 'is_active' | 'favicon'>>): boolean => {
    const db = getDatabase();
    const updates: string[] = [];
    const values: any[] = [];
    
    if (webPage.title !== undefined) {
      updates.push('title = ?');
      values.push(webPage.title);
    }
    if (webPage.url !== undefined) {
      updates.push('url = ?');
      values.push(webPage.url);
    }
    if (webPage.description !== undefined) {
      updates.push('description = ?');
      values.push(webPage.description);
    }
    if (webPage.category_id !== undefined) {
      updates.push('category_id = ?');
      values.push(webPage.category_id);
    }
    if (webPage.is_favorite !== undefined) {
      updates.push('is_favorite = ?');
      values.push(webPage.is_favorite);
    }
    if (webPage.is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(webPage.is_active);
    }
    if (webPage.favicon !== undefined) {
      updates.push('favicon = ?');
      values.push(webPage.favicon);
    }
    
    if (updates.length === 0) return false;
    
    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);
    
    const result = db.prepare(`
      UPDATE web_pages SET ${updates.join(', ')} WHERE id = ?
    `).run(...values);
    
    return result.changes > 0;
  },

  /**
   * 删除网页收藏
   */
  delete: (id: number): boolean => {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM web_pages WHERE id = ?').run(id);
    return result.changes > 0;
  },

  /**
   * 增加网页访问次数
   */
  incrementViewCount: (id: number): boolean => {
    const db = getDatabase();
    const result = db.prepare('UPDATE web_pages SET view_count = view_count + 1, updated_at = ? WHERE id = ?').run(Date.now(), id);
    return result.changes > 0;
  },

  /**
   * 切换收藏状态
   */
  toggleFavorite: (id: number): boolean => {
    const db = getDatabase();
    const result = db.prepare(`
      UPDATE web_pages 
      SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END,
          updated_at = ?
      WHERE id = ?
    `).run(Date.now(), id);
    return result.changes > 0;
  },

  /**
   * 获取收藏的网页
   */
  getFavorites: (limit: number = 50, offset: number = 0): WebPage[] => {
    const db = getDatabase();
    return db.prepare(`
      SELECT w.*, wpc.name as category_name
      FROM web_pages w
      LEFT JOIN web_page_categories wpc ON w.category_id = wpc.id
      WHERE w.is_favorite = 1
      ORDER BY w.updated_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as any[];
  },

  /**
   * 获取统计信息
   */
  getStats: (): { total: number; favorites: number } => {
    const db = getDatabase();
    const total = db.prepare('SELECT COUNT(*) as count FROM web_pages').get() as { count: number };
    const favorites = db.prepare('SELECT COUNT(*) as count FROM web_pages WHERE is_favorite = 1').get() as { count: number };
    
    return {
      total: total.count,
      favorites: favorites.count
    };
  },

  /**
   * 搜索网页收藏
   */
  search: (query: string, limit: number = 50, offset: number = 0): WebPage[] => {
    const db = getDatabase();
    const searchTerm = `%${query}%`;
    return db.prepare(`
      SELECT w.*, wpc.name as category_name
      FROM web_pages w
      LEFT JOIN web_page_categories wpc ON w.category_id = wpc.id
      WHERE w.title LIKE ? OR w.description LIKE ? OR w.url LIKE ?
      ORDER BY w.created_at DESC
      LIMIT ? OFFSET ?
    `).all(searchTerm, searchTerm, searchTerm, limit, offset) as any[];
  },

  /**
   * 记录访问
   */
  visit: (id: number): boolean => {
    return webPagesApi.incrementViewCount(id);
  },

  /**
   * 获取总数
   */
  count: (): number => {
    const db = getDatabase();
    const result = db.prepare('SELECT COUNT(*) as count FROM web_pages').get() as { count: number };
    return result.count;
  }
};
