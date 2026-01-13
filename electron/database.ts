import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import Store from 'electron-store';

let db: Database.Database | null = null;

// 初始化 settings store 用于存储自定义数据库路径
const settingsStore = new Store({
  name: 'moyu-settings',
  defaults: {
    customDatabasePath: null
  }
});

/**
 * 获取数据库实例（单例模式）
 */
export function getDatabase(): Database.Database {
  if (!db) {
    // 优先使用自定义数据库路径，否则使用默认路径
    const customPath = settingsStore.get('customDatabasePath') as string | null;
    const dbPath = customPath || path.join(app.getPath('userData'), 'moyu.db');
    db = new Database(dbPath);
    
    // 启用外键约束
    db.pragma('foreign_keys = ON');
    
    // 初始化数据库结构
    initializeSchema(db);
    
    console.log('Database initialized at:', dbPath);
  }
  return db;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('Database closed');
  }
}

/**
 * 设置自定义数据库路径
 */
export function setCustomDatabasePath(dbPath: string): void {
  settingsStore.set('customDatabasePath', dbPath);
  console.log('Custom database path set:', dbPath);
}

/**
 * 获取当前数据库路径
 */
export function getCurrentDatabasePath(): string {
  const customPath = settingsStore.get('customDatabasePath') as string | null;
  return customPath || path.join(app.getPath('userData'), 'moyu.db');
}

/**
 * 初始化数据库表结构
 */
function initializeSchema(database: Database.Database): void {
  // 检查表是否已存在
  const tables = database.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='notes'
  `).get() as { name: string } | undefined;
  
  if (!tables) {
    console.log('Creating database schema...');
    const schema = getSchemaSQL();
    database.exec(schema);
    console.log('Database schema created successfully');
  } else {
    console.log('Database schema already exists');
  }
}

/**
 * 获取数据库表结构的 SQL
 */
function getSchemaSQL(): string {
  return `
    -- 笔记表
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      preview_content TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      is_deleted INTEGER DEFAULT 0,
      tags TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(is_deleted);

    -- 待办事项表
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
    CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at DESC);

    -- 新闻分类表
    CREATE TABLE IF NOT EXISTS news_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT,
      color TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_news_categories_sort ON news_categories(sort_order);

    -- 新闻源表
    CREATE TABLE IF NOT EXISTS news_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      description TEXT,
      category_id INTEGER,
      is_active INTEGER DEFAULT 1,
      fetch_interval INTEGER DEFAULT 3600,
      last_fetched_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (category_id) REFERENCES news_categories(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_news_sources_active ON news_sources(is_active);
    CREATE INDEX IF NOT EXISTS idx_news_sources_category ON news_sources(category_id);

    -- 新闻条目表
    CREATE TABLE IF NOT EXISTS news_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      link TEXT NOT NULL UNIQUE,
      description TEXT,
      content TEXT,
      pub_date INTEGER,
      author TEXT,
      image_url TEXT,
      source_id INTEGER NOT NULL,
      category_id INTEGER,
      is_read INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (source_id) REFERENCES news_sources(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES news_categories(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_news_items_pub_date ON news_items(pub_date DESC);
    CREATE INDEX IF NOT EXISTS idx_news_items_source ON news_items(source_id);
    CREATE INDEX IF NOT EXISTS idx_news_items_category ON news_items(category_id);
    CREATE INDEX IF NOT EXISTS idx_news_items_read ON news_items(is_read);

    -- 收藏表
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (item_id) REFERENCES news_items(id) ON DELETE CASCADE,
      UNIQUE(item_id)
    );

    CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);

    -- 设置表
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
  `;
}

/**
 * 插入默认数据
 */
export function seedDefaultData(database: Database.Database): void {
  // 检查是否已有分类数据
  const categoryCount = database.prepare('SELECT COUNT(*) as count FROM news_categories').get() as { count: number };
  
  if (categoryCount.count === 0) {
    console.log('Seeding default data...');
    
    // 插入默认分类
    const insertCategory = database.prepare(`
      INSERT INTO news_categories (name, icon, color, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const defaultCategories = [
      { name: '科技', icon: 'cpu', color: '#3B82F6', sort: 1 },
      { name: '财经', icon: 'dollar', color: '#10B981', sort: 2 },
      { name: '娱乐', icon: 'film', color: '#F59E0B', sort: 3 },
      { name: '体育', icon: 'trophy', color: '#EF4444', sort: 4 },
      { name: '国际', icon: 'globe', color: '#8B5CF6', sort: 5 }
    ];
    
    for (const cat of defaultCategories) {
      insertCategory.run(cat.name, cat.icon, cat.color, cat.sort, Date.now());
    }
    
    console.log('Default categories seeded');
  }
}