import { newsApi } from '../api/newsApi';

/**
 * 从网页中提取主要内容
 * 注意：这是一个简单的实现，实际项目中应该使用更强大的内容提取库
 */
function extractMainContent(html: string): string {
  try {
    // 移除 script 和 style 标签
    let content = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // 移除注释
    content = content.replace(/<!--[\s\S]*?-->/g, '');
    
    // 提取所有段落
    const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gis;
    const paragraphs = content.match(paragraphRegex);
    
    if (paragraphs) {
      // 移除 HTML 标签，只保留文本
      const textContent = paragraphs
        .map(p => p.replace(/<[^>]+>/g, '').trim())
        .filter(text => text.length > 50) // 只保留较长的段落
        .join('\n\n');
      
      return textContent;
    }
    
    // 如果没有找到段落，尝试提取所有文本
    const textContent = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return textContent;
  } catch (error) {
    console.error('Failed to extract main content:', error);
    return '';
  }
}

/**
 * 缓存新闻内容
 */
async function cacheNewsContent(newsItemId: number): Promise<boolean> {
  try {
    const item = newsApi.getNewsItemById(newsItemId);
    if (!item || !item.link) {
      console.error('News item not found or has no link');
      return false;
    }

    console.log(`Caching content for news item ${newsItemId}: ${item.title}`);
    
    // 抓取完整内容
    const response = await fetch(item.link, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000 // 10秒超时
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch content: HTTP ${response.status}`);
      return false;
    }
    
    const html = await response.text();
    
    // 提取正文内容
    const content = extractMainContent(html);
    
    if (!content || content.length < 100) {
      console.error('Extracted content is too short');
      return false;
    }
    
    // 更新数据库
    const success = newsApi.updateNewsItemContent(newsItemId, content);
    
    if (success) {
      console.log(`✓ Successfully cached content for news item ${newsItemId}`);
    } else {
      console.error(`✗ Failed to update news item ${newsItemId}`);
    }
    
    return success;
  } catch (error) {
    console.error('Failed to cache news content:', error);
    return false;
  }
}

/**
 * 缓存最近的新闻
 */
async function cacheRecentNews(limit: number = 50): Promise<{ total: number; cached: number; failed: number }> {
  console.log(`Caching recent news (limit: ${limit})...`);
  
  const items = newsApi.getRecentNewsItems(limit);
  let cached = 0;
  let failed = 0;
  
  for (const item of items) {
    // 只缓存没有内容的新闻
    if (!item.content || item.content.length < 100) {
      const success = await cacheNewsContent(item.id);
      if (success) {
        cached++;
      } else {
        failed++;
      }
    }
  }
  
  console.log(`\n=== News Cache Summary ===`);
  console.log(`Total items: ${items.length}`);
  console.log(`Cached: ${cached}`);
  console.log(`Failed: ${failed}`);
  console.log(`Already cached: ${items.length - cached - failed}`);
  console.log('========================\n');
  
  return { total: items.length, cached, failed };
}

/**
 * 批量缓存指定新闻条目
 */
async function cacheMultipleNewsItems(itemIds: number[]): Promise<{ success: number; failed: number }> {
  console.log(`Caching ${itemIds.length} news items...`);
  
  let success = 0;
  let failed = 0;
  
  for (const id of itemIds) {
    const result = await cacheNewsContent(id);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }
  
  console.log(`Batch caching complete: ${success} succeeded, ${failed} failed`);
  
  return { success, failed };
}

/**
 * 清理过期的缓存内容
 */
function cleanOldCache(daysToKeep: number = 30): number {
  console.log(`Cleaning old cache (keeping ${daysToKeep} days)...`);
  
  const count = newsApi.cleanOldNews(daysToKeep);
  
  console.log(`✓ Cleaned ${count} old news items`);
  
  return count;
}