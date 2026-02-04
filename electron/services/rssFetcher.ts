import Parser from 'rss-parser';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { newsApi } from '../api/newsApi';
import { getProxy } from '../database';

const parser = new Parser();

interface FetchResult {
  success: boolean;
  sourceId: number;
  error?: string;
  itemCount?: number;
}

/**
 * 从 HTML 内容中提取图片 URL
 */
function extractImageUrl(item: any): string | null {
  // 尝试从多个字段提取图片 URL
  if (item.enclosure && item.enclosure.url) {
    return item.enclosure.url;
  }
  if (item['media:thumbnail'] && item['media:thumbnail'].$) {
    return item['media:thumbnail'].$.url;
  }
  if (item['media:content'] && item['media:content'].$) {
    return item['media:content'].$.url;
  }

  // 尝试从 content 中提取 img 标签
  if (item.content) {
    const imgMatch = item.content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) {
      return imgMatch[1];
    }
  }

  return null;
}

/**
 * 获取代理代理配置
 */
function getProxyAgent() {
  const proxyUrl = getProxy();
  if (proxyUrl) {
    return new HttpsProxyAgent(proxyUrl);
  }
  return undefined;
}

/**
 * 抓取单个 RSS 源
 */
export async function fetchRSSFeed(sourceId: number): Promise<FetchResult> {
  try {
    const source = newsApi.getSourceById(sourceId);
    if (!source) {
      return { success: false, sourceId, error: 'RSS 源不存在' };
    }

    console.log(`Fetching RSS feed: ${source.name} (${source.url})`);

    const proxyAgent = getProxyAgent();
    const feed = await parser.parseURL(source.url, {
      timeout: 10000,
      customFields: {
        item: ['media:thumbnail', 'media:content']
      }
    });

    let itemCount = 0;
    for (const item of feed.items) {
      try {
        const pubDate = item.pubDate ? new Date(item.pubDate).getTime() : Date.now();

        newsApi.createNewsItem({
          title: item.title || '无标题',
          link: item.link || '',
          description: item.contentSnippet || item.description || '',
          content: item.content || '',
          pubDate: pubDate,
          author: item.creator || item.author || '',
          image: extractImageUrl(item),
          sourceId: sourceId,
          categoryId: source.category_id
        });
        itemCount++;
      } catch (error) {
        console.error('Failed to insert news item:', error);
      }
    }

    // 更新最后抓取时间
    newsApi.updateSourceLastFetched(sourceId);

    console.log(`✓ Fetched ${itemCount} items from ${source.name}`);
    return { success: true, sourceId, itemCount };
  } catch (error: any) {
    const errorMessage = error.message || '抓取 RSS 源失败';
    console.error(`✗ Failed to fetch RSS feed ${sourceId}:`, errorMessage);
    return {
      success: false,
      sourceId,
      error: errorMessage
    };
  }
}

/**
 * 测试 RSS 源是否有效
 */
export async function testRSSFeed(url: string): Promise<{ success: boolean; error?: string; feedInfo?: any }> {
  try {
    console.log(`Testing RSS feed: ${url}`);
    const proxyAgent = getProxyAgent();
    const feed = await parser.parseURL(url, {
      timeout: 10000,
      customFields: {
        item: ['media:thumbnail', 'media:content']
      }
    });

    return {
      success: true,
      feedInfo: {
        title: feed.title,
        description: feed.description,
        itemCount: feed.items?.length || 0
      }
    };
  } catch (error: any) {
    const errorMessage = error.message || 'RSS 源无效或无法访问';
    console.error(`✗ RSS feed test failed:`, errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * 抓取所有活跃的 RSS 源
 */
async function fetchAllActiveSources(): Promise<FetchResult[]> {
  console.log('Fetching all active RSS sources...');

  const sources = newsApi.getActiveSources();
  const results: FetchResult[] = [];

  for (const source of sources) {
    const result = await fetchRSSFeed(source.id);
    results.push(result);
  }

  // 统计结果
  const successCount = results.filter(r => r.success).length;
  const totalItems = results.reduce((sum, r) => sum + (r.itemCount || 0), 0);

  console.log(`\n=== RSS Fetch Summary ===`);
  console.log(`Total sources: ${sources.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${sources.length - successCount}`);
  console.log(`Total items fetched: ${totalItems}`);
  console.log('========================\n');

  return results;
}

/**
 * 抓取指定分类的 RSS 源
 */
async function fetchSourcesByCategory(categoryId: number): Promise<FetchResult[]> {
  console.log(`Fetching RSS sources for category ${categoryId}...`);

  const allSources = newsApi.getAllSources();
  const categorySources = allSources.filter(s => s.category_id === categoryId && s.is_active === 1);

  const results: FetchResult[] = [];

  for (const source of categorySources) {
    const result = await fetchRSSFeed(source.id);
    results.push(result);
  }

  return results;
}