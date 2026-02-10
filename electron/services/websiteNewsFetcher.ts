import { newsApi } from '../api/newsApi';
import { networkService } from './base/networkService';
import { newsParser } from '@shared/utils/newsParser';

interface FetchResult {
  success: boolean;
  sourceId: number;
  error?: string;
  itemCount?: number;
}

/**
 * 从网站抓取新闻
 */
export async function fetchWebsiteNews(sourceId: number): Promise<FetchResult> {
  try {
    const source = newsApi.getSourceById(sourceId);
    if (!source) return { success: false, sourceId, error: '网站新闻源不存在' };

    console.log(`[WebNews] Fetching: ${source.name} (${source.url})`);

    const response = await networkService.proxyFetch(source.url, { timeout: 10000 });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const html = await response.text();
    const items = newsParser.extractNewsLinks(html, source.url);

    let itemCount = 0;
    for (const item of items) {
      try {
        const resultId = newsApi.createNewsItem({
          title: item.title,
          link: item.url,
          description: `来自 ${new URL(source.url).hostname} 的新闻`,
          content: '',
          pubDate: Date.now(),
          author: '',
          image_url: null,
          source_id: sourceId,
          category_id: source.category_id || null,
          is_read: 0
        });
        if (resultId > 0) itemCount++;
      } catch (e) {
        console.error(`[WebNews] Failed to insert: ${item.title}`, e);
      }
    }

    newsApi.updateSourceLastFetched(sourceId);
    return { success: true, sourceId, itemCount };
  } catch (error: any) {
    console.error(`[WebNews] Failed ${sourceId}:`, error.message);
    return { success: false, sourceId, error: error.message };
  }
}

/**
 * 测试网站可用性
 */
export async function testWebsiteNews(url: string): Promise<{ success: boolean; error?: string; websiteInfo?: any }> {
  try {
    const response = await networkService.proxyFetch(url, { timeout: 10000 });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const sampleLinks = newsParser.extractNewsLinks(html, url).slice(0, 3);

    return {
      success: true,
      websiteInfo: {
        title: titleMatch ? titleMatch[1] : 'Unknown Site',
        url,
        sampleLinks
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * 抓取所有活跃网站源
 */
export async function fetchAllActiveWebsiteSources(): Promise<FetchResult[]> {
  const sources = newsApi.getActiveSources();
  const results = [];
  for (const source of sources) {
    results.push(await fetchWebsiteNews(source.id));
  }
  return results;
}