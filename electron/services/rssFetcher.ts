import Parser from 'rss-parser';
import { newsApi } from '../api/newsApi';
import { networkService } from './base/networkService';
import { newsParser } from '@shared/utils/newsParser';

const parser = new Parser();

interface FetchResult {
  success: boolean;
  sourceId: number;
  error?: string;
  itemCount?: number;
}

/**
 * 抓取单个 RSS 源
 */
export async function fetchRSSFeed(sourceId: number): Promise<FetchResult> {
  try {
    const source = newsApi.getSourceById(sourceId);
    if (!source) return { success: false, sourceId, error: 'RSS 源不存在' };

    console.log(`[RSS] Fetching: ${source.name} (${source.url})`);

    const agent = networkService.getProxyAgent();
    const feed = await parser.parseURL(source.url, {
      timeout: 10000,
      customFields: {
        item: ['media:thumbnail', 'media:content']
      },
      // rss-parser 支持通过 headers.agent 传递代理
      headers: { agent } as any
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
          image: newsParser.extractImageUrl(item),
          sourceId: sourceId,
          categoryId: source.category_id
        });
        itemCount++;
      } catch (e) {
        console.error(`[RSS] Failed to insert item: ${item.title}`, e);
      }
    }

    newsApi.updateSourceLastFetched(sourceId);
    return { success: true, sourceId, itemCount };
  } catch (error: any) {
    console.error(`[RSS] Failed to fetch source ${sourceId}:`, error.message);
    return { success: false, sourceId, error: error.message };
  }
}

/**
 * 测试 RSS 源是否有效
 */
export async function testRSSFeed(url: string): Promise<{ success: boolean; error?: string; feedInfo?: any }> {
  try {
    const agent = networkService.getProxyAgent();
    const feed = await parser.parseURL(url, {
      timeout: 10000,
      headers: { agent } as any
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
    return { success: false, error: error.message || 'RSS 源无效' };
  }
}

/**
 * 抓取所有活跃的 RSS 源
 */
export async function fetchAllActiveSources(): Promise<FetchResult[]> {
  const sources = newsApi.getActiveSources();
  const results = [];
  for (const source of sources) {
    results.push(await fetchRSSFeed(source.id));
  }
  return results;
}
