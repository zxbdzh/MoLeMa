import { getDatabase } from '../database';

export interface AppUsageStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  thisYear: number;
  total: number;
  sessions: number;
}

export interface FeatureUsageStats {
  featureId: string;
  featureName: string;
  duration: number;
  count: number;
  todayDuration: number;
  todayCount: number;
  thisWeekDuration: number;
  thisWeekCount: number;
  thisMonthDuration: number;
  thisMonthCount: number;
}

export interface HistoryTrendData {
  date: string;
  duration: number;
  sessions: number;
}

export const usageStatsApi = {
  /**
   * 开始新会话
   */
  startSession: (sessionId: string): boolean => {
    const db = getDatabase();
    const now = Date.now();
    const date = new Date(now);
    
    const dateKey = parseInt(date.getFullYear().toString() + 
      (date.getMonth() + 1).toString().padStart(2, '0') + 
      date.getDate().toString().padStart(2, '0'));
    
    const weekKey = parseInt(date.getFullYear().toString() + 
      getISOWeek(date).toString().padStart(2, '0'));
    
    const monthKey = parseInt(date.getFullYear().toString() + 
      (date.getMonth() + 1).toString().padStart(2, '0'));
    
    const yearKey = date.getFullYear();
    
    try {
      db.prepare(`
        INSERT INTO app_usage_stats 
        (session_id, started_at, duration, date_key, week_key, month_key, year_key, created_at)
        VALUES (?, ?, 0, ?, ?, ?, ?, ?)
      `).run(sessionId, now, dateKey, weekKey, monthKey, yearKey, now);
      
      return true;
    } catch (error) {
      console.error('Failed to start session:', error);
      return false;
    }
  },

  /**
   * 结束会话
   */
  endSession: (sessionId: string): boolean => {
    const db = getDatabase();
    const now = Date.now();
    
    try {
      // 获取会话开始时间
      const session = db.prepare(`
        SELECT started_at FROM app_usage_stats 
        WHERE session_id = ? AND ended_at IS NULL
      `).get(sessionId) as { started_at: number } | undefined;
      
      if (!session) {
        console.warn('Session not found or already ended:', sessionId);
        return false;
      }
      
      const duration = now - session.started_at;
      
      // 更新会话
      db.prepare(`
        UPDATE app_usage_stats 
        SET ended_at = ?, duration = ?, updated_at = ?
        WHERE session_id = ?
      `).run(now, duration, now, sessionId);
      
      return true;
    } catch (error) {
      console.error('Failed to end session:', error);
      return false;
    }
  },

  /**
   * 开始功能使用
   */
  startFeatureUsage: (sessionId: string, featureId: string): boolean => {
    const db = getDatabase();
    const now = Date.now();
    const date = new Date(now);
    
    const dateKey = parseInt(date.getFullYear().toString() + 
      (date.getMonth() + 1).toString().padStart(2, '0') + 
      date.getDate().toString().padStart(2, '0'));
    
    const weekKey = parseInt(date.getFullYear().toString() + 
      getISOWeek(date).toString().padStart(2, '0'));
    
    const monthKey = parseInt(date.getFullYear().toString() + 
      (date.getMonth() + 1).toString().padStart(2, '0'));
    
    const yearKey = date.getFullYear();
    
    try {
      db.prepare(`
        INSERT INTO feature_usage_stats 
        (feature_id, session_id, started_at, duration, date_key, week_key, month_key, year_key, created_at)
        VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)
      `).run(featureId, sessionId, now, dateKey, weekKey, monthKey, yearKey, now);
      
      return true;
    } catch (error) {
      console.error('Failed to start feature usage:', error);
      return false;
    }
  },

  /**
   * 结束功能使用
   */
  endFeatureUsage: (featureId: string): boolean => {
    const db = getDatabase();
    const now = Date.now();
    
    try {
      // 获取最新的未结束的功能使用记录
      const featureUsage = db.prepare(`
        SELECT id, started_at FROM feature_usage_stats 
        WHERE feature_id = ? AND ended_at IS NULL 
        ORDER BY started_at DESC LIMIT 1
      `).get(featureId) as { id: number; started_at: number } | undefined;
      
      if (!featureUsage) {
        console.warn('Feature usage not found or already ended:', featureId);
        return false;
      }
      
      const duration = now - featureUsage.started_at;
      
      // 更新功能使用记录
      db.prepare(`
        UPDATE feature_usage_stats 
        SET ended_at = ?, duration = ?, updated_at = ?
        WHERE id = ?
      `).run(now, duration, now, featureUsage.id);
      
      return true;
    } catch (error) {
      console.error('Failed to end feature usage:', error);
      return false;
    }
  },

  /**
   * 获取应用使用统计
   */
  getAppUsage: (dimension: string = 'all'): AppUsageStats => {
    const db = getDatabase();
    const now = new Date();
    
    const dateKey = parseInt(now.getFullYear().toString() + 
      (now.getMonth() + 1).toString().padStart(2, '0') + 
      now.getDate().toString().padStart(2, '0'));
    
    const weekKey = parseInt(now.getFullYear().toString() + 
      getISOWeek(now).toString().padStart(2, '0'));
    
    const monthKey = parseInt(now.getFullYear().toString() + 
      (now.getMonth() + 1).toString().padStart(2, '0'));
    
    const yearKey = now.getFullYear();
    
    // 查询各时间段使用时长
    const todayDuration = db.prepare(`
      SELECT COALESCE(SUM(duration), 0) as total FROM app_usage_stats WHERE date_key = ?
    `).get(dateKey) as { total: number };
    
    const thisWeekDuration = db.prepare(`
      SELECT COALESCE(SUM(duration), 0) as total FROM app_usage_stats WHERE week_key = ?
    `).get(weekKey) as { total: number };
    
    const thisMonthDuration = db.prepare(`
      SELECT COALESCE(SUM(duration), 0) as total FROM app_usage_stats WHERE month_key = ?
    `).get(monthKey) as { total: number };
    
    const thisYearDuration = db.prepare(`
      SELECT COALESCE(SUM(duration), 0) as total FROM app_usage_stats WHERE year_key = ?
    `).get(yearKey) as { total: number };
    
    const totalDuration = db.prepare(`
      SELECT COALESCE(SUM(duration), 0) as total FROM app_usage_stats
    `).get() as { total: number };
    
    // 查询会话次数（只统计已完成的会话）
    const sessions = db.prepare(`
      SELECT COUNT(*) as count FROM app_usage_stats WHERE ended_at IS NOT NULL
    `).get() as { count: number };
    
    return {
      today: todayDuration.total,
      thisWeek: thisWeekDuration.total,
      thisMonth: thisMonthDuration.total,
      thisYear: thisYearDuration.total,
      total: totalDuration.total,
      sessions: sessions.count
    };
  },

  /**
   * 获取功能使用统计
   */
  getFeatureUsage: (featureId?: string, dimension: string = 'all'): FeatureUsageStats[] => {
    const db = getDatabase();
    const now = new Date();
    
    const dateKey = parseInt(now.getFullYear().toString() + 
      (now.getMonth() + 1).toString().padStart(2, '0') + 
      now.getDate().toString().padStart(2, '0'));
    
    const weekKey = parseInt(now.getFullYear().toString() + 
      getISOWeek(now).toString().padStart(2, '0'));
    
    const monthKey = parseInt(now.getFullYear().toString() + 
      (now.getMonth() + 1).toString().padStart(2, '0'));
    
    const featureNames: Record<string, string> = {
      'rss': 'RSS 订阅',
      'notes': '记事本',
      'todo': '待办清单',
      'webpages': '网页收藏',
      'recording': '录音'
    };
    
    let query = `
      SELECT 
        feature_id,
        COALESCE(SUM(duration), 0) as duration,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN date_key = ? THEN duration ELSE 0 END), 0) as today_duration,
        COALESCE(SUM(CASE WHEN date_key = ? THEN 1 ELSE 0 END), 0) as today_count,
        COALESCE(SUM(CASE WHEN week_key = ? THEN duration ELSE 0 END), 0) as week_duration,
        COALESCE(SUM(CASE WHEN week_key = ? THEN 1 ELSE 0 END), 0) as week_count,
        COALESCE(SUM(CASE WHEN month_key = ? THEN duration ELSE 0 END), 0) as month_duration,
        COALESCE(SUM(CASE WHEN month_key = ? THEN 1 ELSE 0 END), 0) as month_count
      FROM feature_usage_stats
    `;
    
    const params: any[] = [dateKey, dateKey, weekKey, weekKey, monthKey, monthKey];
    
    if (featureId) {
      query += ` WHERE feature_id = ?`;
      params.push(featureId);
    }
    
    query += ` GROUP BY feature_id ORDER BY duration DESC`;
    
    const results = db.prepare(query).all(...params) as any[];
    
    return results.map(row => ({
      featureId: row.feature_id,
      featureName: featureNames[row.feature_id] || row.feature_id,
      duration: row.duration,
      count: row.count,
      todayDuration: row.today_duration,
      todayCount: row.today_count,
      thisWeekDuration: row.week_duration,
      thisWeekCount: row.week_count,
      thisMonthDuration: row.month_duration,
      thisMonthCount: row.month_count
    }));
  },

  /**
   * 获取历史趋势数据
   */
  getHistoryTrend: (dimension: string = 'day', days: number = 30): HistoryTrendData[] => {
    const db = getDatabase();
    
    let dateCondition = '';
    let dateFormat = '';
    
    switch (dimension) {
      case 'day':
        dateCondition = `date('now', '-${days} days')`;
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateCondition = `date('now', '-${days * 7} days')`;
        dateFormat = '%Y-W%W';
        break;
      case 'month':
        dateCondition = `date('now', '-${days * 30} days')`;
        dateFormat = '%Y-%m';
        break;
      default:
        dateCondition = `date('now', '-30 days')`;
        dateFormat = '%Y-%m-%d';
    }
    
    const query = `
      SELECT 
        strftime('${dateFormat}', datetime(started_at / 1000, 'unixepoch')) as date,
        COALESCE(SUM(duration), 0) as duration,
        COUNT(*) as sessions
      FROM app_usage_stats
      WHERE started_at >= strftime('%s', ${dateCondition}) * 1000
      GROUP BY date
      ORDER BY date ASC
    `;
    
    return db.prepare(query).all() as HistoryTrendData[];
  }
};

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