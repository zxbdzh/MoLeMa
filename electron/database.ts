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
    console.log('Database schema already exists, checking for missing tables and columns...');
    
    // 检查是否所有必要的表都存在
    const tablesToCheck = ['todos', 'web_pages', 'web_page_categories'];
    for (const tableName of tablesToCheck) {
      const tableExists = database.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
      `).get(tableName) as { name: string } | undefined;
      
      if (!tableExists) {
        console.log(`Table ${tableName} does not exist, creating it...`);
        // 只创建缺失的表，而不是整个模式
        const tableSchema = getSchemaSQL().split(';').find(statement => 
          statement.toLowerCase().includes(`create table if not exists ${tableName}`)
        );
        if (tableSchema) {
          database.exec(tableSchema + ';');
          console.log(`Table ${tableName} created successfully`);
        }
      }
    }
    
    // 检查并添加缺失的列
    const todoColumns = database.prepare(`
      PRAGMA table_info(todos)
    `).all() as { name: string }[];
    
    const todoColumnNames = todoColumns.map(col => col.name);
    
    // 如果todos表缺少order_index列，添加该列
    if (!todoColumnNames.includes('order_index')) {
      console.log('Adding order_index column to todos table...');
      database.exec('ALTER TABLE todos ADD COLUMN order_index INTEGER DEFAULT 0');
      console.log('order_index column added successfully');
    }
    
    // 检查web_pages表是否缺少is_active列
    const webPagesColumns = database.prepare(`
      PRAGMA table_info(web_pages)
    `).all() as { name: string }[];
    
    const webPagesColumnNames = webPagesColumns.map(col => col.name);
    
    // 如果web_pages表缺少is_active列，添加该列
    if (!webPagesColumnNames.includes('is_active')) {
      console.log('Adding is_active column to web_pages table...');
      database.exec('ALTER TABLE web_pages ADD COLUMN is_active INTEGER DEFAULT 1');
      console.log('is_active column added successfully');
    }
    
    // 如果web_pages表缺少favicon列，添加该列
    if (!webPagesColumnNames.includes('favicon')) {
      console.log('Adding favicon column to web_pages table...');
      database.exec('ALTER TABLE web_pages ADD COLUMN favicon TEXT');
      console.log('favicon column added successfully');
    }
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
      completed_at INTEGER,
      order_index INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
    CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_todos_order ON todos(order_index);

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

    -- 网页分类表（独立于新闻分类）
    CREATE TABLE IF NOT EXISTS web_page_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_web_page_categories_sort ON web_page_categories(sort_order);

    -- 登录页面信息表
    CREATE TABLE IF NOT EXISTS web_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      description TEXT,
      category_id INTEGER,
      is_favorite INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      view_count INTEGER DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES web_page_categories(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_web_pages_category ON web_pages(category_id);
    CREATE INDEX IF NOT EXISTS idx_web_pages_favorite ON web_pages(is_favorite);

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
  // 检查新闻分类是否已有数据
  const newsCategoryCount = database.prepare('SELECT COUNT(*) as count FROM news_categories').get() as { count: number };

  if (newsCategoryCount.count === 0) {
    console.log('Seeding default news categories...');

    // 插入默认新闻分类
    const insertNewsCategory = database.prepare(`
      INSERT INTO news_categories (name, icon, color, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const defaultNewsCategories = [
      { name: '科技', icon: 'cpu', color: '#3B82F6', sort: 1 },
      { name: '财经', icon: 'dollar', color: '#10B981', sort: 2 },
      { name: '娱乐', icon: 'film', color: '#F59E0B', sort: 3 },
      { name: '体育', icon: 'trophy', color: '#EF4444', sort: 4 },
      { name: '国际', icon: 'globe', color: '#8B5CF6', sort: 5 }
    ];

    for (const cat of defaultNewsCategories) {
      insertNewsCategory.run(cat.name, cat.icon, cat.color, cat.sort, Date.now());
    }

    console.log('Default news categories seeded');
  }

  // 检查网页分类是否已有数据
  const webPageCategoryCount = database.prepare('SELECT COUNT(*) as count FROM web_page_categories').get() as { count: number };

  if (webPageCategoryCount.count === 0) {
    console.log('Seeding default web page categories...');

    // 插入默认网页分类
    const insertWebPageCategory = database.prepare(`
      INSERT INTO web_page_categories (name, icon, color, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const defaultWebPageCategories = [
      { name: '工作', icon: 'briefcase', color: '#3B82F6', sort: 1 },
      { name: '学习', icon: 'book', color: '#10B981', sort: 2 },
      { name: '工具', icon: 'wrench', color: '#F59E0B', sort: 3 },
      { name: '娱乐', icon: 'gamepad', color: '#EF4444', sort: 4 },
      { name: '其他', icon: 'folder', color: '#8B5CF6', sort: 5 }
    ];

    for (const cat of defaultWebPageCategories) {
      insertWebPageCategory.run(cat.name, cat.icon, cat.color, cat.sort, Date.now());
    }

    console.log('Default web page categories seeded');
  }
}

/**
 * 设置自定义数据库目录
 */
export function setCustomDatabaseDirectory(directoryPath: string): string {
  const dbPath = path.join(directoryPath, 'moyu.db');
  settingsStore.set('customDatabasePath', dbPath);
  console.log('Custom database directory set:', directoryPath);
  console.log('Database path:', dbPath);
  return dbPath;
}

/**
 * 将数据库迁移到新路径
 */
export function migrateDatabaseToNewPath(newDbPath: string): {
  success: boolean;
  error?: string;
  migratedRecords?: {
    notes: number;
    todos: number;
    news_categories: number;
    news_sources: number;
    news_items: number;
    favorites: number;
    settings: number;
  };
} {
  try {
    console.log('Starting database migration to:', newDbPath);

    // 获取当前数据库
    const currentDb = getDatabase();
    const currentDbPath = getCurrentDatabasePath();

    // 如果目标路径和当前路径相同，不需要迁移
    if (currentDbPath === newDbPath) {
      console.log('Database is already at the target path, no migration needed');
      return {
        success: true,
        migratedRecords: {
          notes: 0,
          todos: 0,
          news_categories: 0,
          news_sources: 0,
          news_items: 0,
          favorites: 0,
          settings: 0
        }
      };
    }

    // 备份当前数据库
    const backupPath = currentDbPath + '.backup.' + Date.now();
    const fs = require('fs');
    fs.copyFileSync(currentDbPath, backupPath);
    console.log('Database backed up to:', backupPath);

    // 创建新数据库
    const newDb = new Database(newDbPath);
    newDb.pragma('foreign_keys = ON');

    // 初始化新数据库结构
    const schema = getSchemaSQL();
    newDb.exec(schema);

    // 迁移数据
    const migratedRecords = {
      notes: 0,
      todos: 0,
      news_categories: 0,
      news_sources: 0,
      news_items: 0,
      favorites: 0,
      settings: 0
    };

    // 迁移笔记
    const notes = currentDb.prepare('SELECT * FROM notes WHERE is_deleted = 0').all() as any[];
    const insertNote = newDb.prepare(`
      INSERT INTO notes (id, title, content, preview_content, created_at, updated_at, is_deleted, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const note of notes) {
      insertNote.run(note.id, note.title, note.content, note.preview_content, note.created_at, note.updated_at, note.is_deleted, note.tags);
      migratedRecords.notes++;
    }

    // 迁移待办事项
    const todos = currentDb.prepare('SELECT * FROM todos').all() as any[];
    const insertTodo = newDb.prepare(`
      INSERT INTO todos (id, text, completed, created_at, completed_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const todo of todos) {
      insertTodo.run(todo.id, todo.text, todo.completed, todo.created_at, todo.completed_at);
      migratedRecords.todos++;
    }

    // 迁移新闻分类
    const categories = currentDb.prepare('SELECT * FROM news_categories').all() as any[];
    const insertCategory = newDb.prepare(`
      INSERT INTO news_categories (id, name, icon, color, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const cat of categories) {
      insertCategory.run(cat.id, cat.name, cat.icon, cat.color, cat.sort_order, cat.created_at);
      migratedRecords.news_categories++;
    }

    // 迁移新闻源
    const sources = currentDb.prepare('SELECT * FROM news_sources').all() as any[];
    const insertSource = newDb.prepare(`
      INSERT INTO news_sources (id, name, url, description, category_id, is_active, fetch_interval, last_fetched_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const source of sources) {
      insertSource.run(
        source.id,
        source.name,
        source.url,
        source.description,
        source.category_id,
        source.is_active,
        source.fetch_interval,
        source.last_fetched_at,
        source.created_at,
        source.updated_at
      );
      migratedRecords.news_sources++;
    }

    // 迁移新闻条目
    const items = currentDb.prepare('SELECT * FROM news_items').all() as any[];
    const insertItem = newDb.prepare(`
      INSERT INTO news_items (id, title, link, description, content, pub_date, author, image_url, source_id, category_id, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of items) {
      insertItem.run(
        item.id,
        item.title,
        item.link,
        item.description,
        item.content,
        item.pub_date,
        item.author,
        item.image_url,
        item.source_id,
        item.category_id,
        item.is_read,
        item.created_at
      );
      migratedRecords.news_items++;
    }

    // 迁移收藏
    const favorites = currentDb.prepare('SELECT * FROM favorites').all() as any[];
    const insertFavorite = newDb.prepare(`
      INSERT INTO favorites (id, item_id, created_at)
      VALUES (?, ?, ?)
    `);
    for (const fav of favorites) {
      insertFavorite.run(fav.id, fav.item_id, fav.created_at);
      migratedRecords.favorites++;
    }

    // 迁移设置
    const settings = currentDb.prepare('SELECT * FROM settings').all() as any[];
    const insertSetting = newDb.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, ?)
    `);
    for (const setting of settings) {
      insertSetting.run(setting.key, setting.value, setting.updated_at);
      migratedRecords.settings++;
    }

    // 关闭新数据库
    newDb.close();

    // 关闭当前数据库
    closeDatabase();

    // 更新自定义数据库路径
    setCustomDatabasePath(newDbPath);

    console.log('Database migration completed successfully');
    console.log('Migrated records:', migratedRecords);

    return {
      success: true,
      migratedRecords
    };
  } catch (error) {
    console.error('Database migration failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during migration'
    };
  }
}

/**
 * 获取代理配置
 */
export function getProxy(): string | null {
  const db = getDatabase();
  const result = db.prepare('SELECT value FROM settings WHERE key = ?').get('proxy') as { value: string } | undefined;
  if (result) {
    try {
      const config = JSON.parse(result.value);
      return config.enabled ? config.url : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * 设置代理配置
 */
export function setProxy(url: string | null): void {
  const db = getDatabase();
  const value = JSON.stringify({
    enabled: url !== null && url.trim() !== '',
    url: url || ''
  });
  db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
  `).run('proxy', value, Date.now());
  console.log('Proxy configuration updated:', url ? 'Enabled' : 'Disabled');
}

/**
 * 获取完整的代理配置
 */
export function getProxyConfig(): { enabled: boolean; url: string } {
  const db = getDatabase();
  const result = db.prepare('SELECT value FROM settings WHERE key = ?').get('proxy') as { value: string } | undefined;
  if (result) {
    try {
      return JSON.parse(result.value);
    } catch {
      return { enabled: false, url: '' };
    }
  }
  return { enabled: false, url: '' };
}
