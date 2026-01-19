import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import Store from 'electron-store';
import { getDatabase, seedDefaultData } from './database';
import { notesApi } from './api/notesApi';
import { todosApi } from './api/todosApi';

/**
 * 备份现有数据
 */
function backupExistingData(): string | null {
  const userDataPath = app.getPath('userData');
  const storePath = path.join(userDataPath, 'moyu-data.json');
  const backupPath = path.join(userDataPath, `moyu-data.backup.${Date.now()}.json`);
  
  if (fs.existsSync(storePath)) {
    try {
      fs.copyFileSync(storePath, backupPath);
      console.log('✓ Data backed up to:', backupPath);
      return backupPath;
    } catch (error) {
      console.error('✗ Failed to backup data:', error);
      return null;
    }
  }
  
  console.log('No existing data file found, skipping backup');
  return null;
}

/**
 * 检查是否需要迁移
 */
function shouldMigrate(): boolean {
  const db = getDatabase();
  
  // 检查数据库中是否已有数据
  const notesCount = db.prepare('SELECT COUNT(*) as count FROM notes').get() as { count: number };
  const todosCount = db.prepare('SELECT COUNT(*) as count FROM todos').get() as { count: number };
  
  // 如果数据库中已有数据，不需要迁移
  if (notesCount.count > 0 || todosCount.count > 0) {
    console.log('Database already contains data, skipping migration');
    return false;
  }
  
  // 检查 JSON 文件是否存在
  const userDataPath = app.getPath('userData');
  const storePath = path.join(userDataPath, 'moyu-data.json');
  
  if (!fs.existsSync(storePath)) {
    console.log('No JSON data file found, skipping migration');
    return false;
  }
  
  return true;
}

/**
 * 迁移笔记数据
 */
function migrateNotes(store: Store): { success: number; failed: number } {
  console.log('Migrating notes...');
  
  const notes = store.get('notes', []) as any[];
  let success = 0;
  let failed = 0;
  
  for (const note of notes) {
    try {
      notesApi.create({
        title: note.title || 'Untitled',
        content: note.content || '',
        tags: note.tags || null
      });
      success++;
    } catch (error) {
      console.error('Failed to migrate note:', note, error);
      failed++;
    }
  }
  
  console.log(`✓ Notes migration complete: ${success} succeeded, ${failed} failed`);
  return { success, failed };
}

/**
 * 迁移待办事项数据
 */
function migrateTodos(store: Store): { success: number; failed: number } {
  console.log('Migrating todos...');
  
  const todos = store.get('todos', []) as any[];
  let success = 0;
  let failed = 0;
  
  for (const todo of todos) {
    try {
      todosApi.create({
        text: todo.text || ''
      });
      
      // 如果已标记为完成，更新状态
      if (todo.completed) {
        const db = getDatabase();
        const lastId = db.prepare('SELECT last_insert_rowid() as id').get() as { id: number };
        if (lastId.id) {
          todosApi.update(lastId.id, { completed: 1 });
        }
      }
      
      success++;
    } catch (error) {
      console.error('Failed to migrate todo:', todo, error);
      failed++;
    }
  }
  
  console.log(`✓ Todos migration complete: ${success} succeeded, ${failed} failed`);
  return { success, failed };
}

/**
 * 迁移收藏数据
 */
function migrateFavorites(store: Store): { success: number; failed: number } {
  console.log('Migrating favorites...');
  
  const favorites = store.get('favorites', []) as any[];
  let success = 0;
  let failed = 0;
  
  const db = getDatabase();
  
  for (const favorite of favorites) {
    try {
      // 尝试根据 link 或 guid 查找对应的新闻条目
      const newsItem = db.prepare(`
        SELECT id FROM news_items 
        WHERE link = ? OR guid = ?
      `).get(favorite.link || favorite.guid, favorite.guid || favorite.link) as { id: number } | undefined;
      
      if (newsItem) {
        db.prepare('INSERT INTO favorites (item_id, created_at) VALUES (?, ?)').run(
          newsItem.id,
          favorite.createdAt || Date.now()
        );
        success++;
      } else {
        console.warn('News item not found for favorite:', favorite);
        failed++;
      }
    } catch (error) {
      console.error('Failed to migrate favorite:', favorite, error);
      failed++;
    }
  }
  
  console.log(`✓ Favorites migration complete: ${success} succeeded, ${failed} failed`);
  return { success, failed };
}

/**
 * 迁移设置数据
 */
function migrateSettings(store: Store): { success: number; failed: number } {
  console.log('Migrating settings...');
  
  const settingsToMigrate = [
    'shortcuts',
    'typingEffectEnabled'
  ];
  
  let success = 0;
  let failed = 0;
  
  const db = getDatabase();
  
  for (const key of settingsToMigrate) {
    try {
      const value = store.get(key);
      if (value !== undefined) {
        const jsonValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        db.prepare(`
          INSERT OR REPLACE INTO settings (key, value, updated_at)
          VALUES (?, ?, ?)
        `).run(key, jsonValue, Date.now());
        success++;
      }
    } catch (error) {
      console.error('Failed to migrate setting:', key, error);
      failed++;
    }
  }
  
  console.log(`✓ Settings migration complete: ${success} succeeded, ${failed} failed`);
  return { success, failed };
}

/**
 * 执行数据迁移
 */
export function runMigration(): {
  success: boolean;
  backupPath?: string;
  results: {
    notes: { success: number; failed: number };
    todos: { success: number; failed: number };
    favorites: { success: number; failed: number };
    settings: { success: number; failed: number };
  };
} {
  console.log('Starting data migration...');
  
  // 1. 检查是否需要迁移
  if (!shouldMigrate()) {
    console.log('Migration not needed');
    return {
      success: true,
      results: {
        notes: { success: 0, failed: 0 },
        todos: { success: 0, failed: 0 },
        favorites: { success: 0, failed: 0 },
        settings: { success: 0, failed: 0 }
      }
    };
  }
  
  // 2. 备份现有数据
  const backupPath = backupExistingData();
  if (!backupPath) {
    console.error('Failed to backup data, aborting migration');
    return {
      success: false,
      results: {
        notes: { success: 0, failed: 0 },
        todos: { success: 0, failed: 0 },
        favorites: { success: 0, failed: 0 },
        settings: { success: 0, failed: 0 }
      }
    };
  }
  
  // 3. 初始化数据库
  const db = getDatabase();
  seedDefaultData(db);
  
  // 4. 加载现有数据
  const store = new Store({ name: 'moyu-data' });
  
  // 5. 执行迁移
  const results = {
    notes: migrateNotes(store),
    todos: migrateTodos(store),
    favorites: migrateFavorites(store),
    settings: migrateSettings(store)
  };
  
  // 6. 验证迁移结果
  const notesCount = db.prepare('SELECT COUNT(*) as count FROM notes').get() as { count: number };
  const todosCount = db.prepare('SELECT COUNT(*) as count FROM todos').get() as { count: number };
  
  console.log('\n=== Migration Summary ===');
  console.log(`Notes: ${notesCount.count} migrated`);
  console.log(`Todos: ${todosCount.count} migrated`);
  console.log(`Backup: ${backupPath}`);
  console.log('========================\n');
  
  return {
    success: true,
    backupPath,
    results
  };
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

/**
 * 迁移历史完成数据到统计表
 * 将 todos 表中已完成的任务记录迁移到 todo_completion_stats 表
 */
export function migrateTodoCompletionStats(): { success: number; failed: number } {
  console.log('Migrating todo completion stats...');
  
  const db = getDatabase();
  
  // 获取所有已完成的任务
  const completedTodos = db.prepare(`
    SELECT id, completed_at 
    FROM todos 
    WHERE completed = 1 AND completed_at IS NOT NULL
  `).all() as any[];
  
  let success = 0;
  let failed = 0;
  
  for (const todo of completedTodos) {
    try {
      const completedAt = todo.completed_at;
      const date = new Date(completedAt);
      
      // 计算各种时间键
      const dateKey = parseInt(date.getFullYear().toString() + 
        (date.getMonth() + 1).toString().padStart(2, '0') + 
        date.getDate().toString().padStart(2, '0'));
      
      // 计算周键（ISO 周数）
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
      `).run(todo.id, completedAt, dateKey, weekKey, monthKey, yearKey, completedAt);
      
      success++;
    } catch (error) {
      console.error('Failed to migrate todo completion stat:', todo, error);
      failed++;
    }
  }
  
  console.log(`✓ Todo completion stats migration complete: ${success} succeeded, ${failed} failed`);
  return { success, failed };
}