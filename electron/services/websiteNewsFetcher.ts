import { newsApi } from '../api/newsApi';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { getProxy } from '../database';

interface FetchResult {
  success: boolean;
  sourceId: number;
  error?: string;
  itemCount?: number;
}

interface WebsiteNewsItem {
  title: string;
  url: string;
  description?: string;
  pubDate?: number;
  author?: string;
  image?: string;
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
 * 从网站HTML中提取新闻链接和信息
 */
async function extractNewsFromWebsite(url: string): Promise<WebsiteNewsItem[]> {
  try {
    const proxyAgent = getProxyAgent();
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000,
      agent: proxyAgent
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // 使用正则表达式提取新闻链接和标题
    // 匹配 <a> 标签中的链接和标题
    const linkRegex = /<a[^>]+href\s*=\s*["']([^"']+)['"][^>]*>([^<]+)<\/a>/gi;
    const links: { href: string; text: string }[] = [];
    let match;
    
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const text = match[2].trim();
      
      // 过滤掉导航链接等，只保留可能是新闻的链接
      if (text && text.length > 10 && !text.includes('首页') && !text.includes('关于我们') && 
          !text.includes('联系方式') && !text.includes('服务条款') && !text.includes('隐私政策') &&
          (href.includes('/news/') || href.includes('/article/') || href.includes('/post/') || 
           href.includes('.html') || href.includes('?') || href.length > 10)) {
        links.push({ href, text });
      }
    }
    
    // 过滤重复链接并构建新闻项
    const uniqueLinks = new Map();
    for (const link of links) {
      const absoluteUrl = new URL(link.href, url).href;
      if (!uniqueLinks.has(absoluteUrl)) {
        uniqueLinks.set(absoluteUrl, {
          title: link.text,
          url: absoluteUrl
        });
      }
    }
    
    // 只返回前20个链接以避免过多数据
    return Array.from(uniqueLinks.values()).slice(0, 20).map(item => ({
      title: item.title,
      url: item.url,
      description: `来自 ${new URL(url).hostname} 的新闻`
    }));
  } catch (error) {
    console.error(`Failed to extract news from website ${url}:`, error);
    throw error;
  }
}

/**
 * 从网站抓取新闻
 */
export async function fetchWebsiteNews(sourceId: number): Promise<FetchResult> {
  try {
    const source = newsApi.getSourceById(sourceId);
    if (!source) {
      return { success: false, sourceId, error: '网站新闻源不存在' };
    }

    console.log(`Fetching news from website: ${source.name} (${source.url})`);

    const websiteNewsItems = await extractNewsFromWebsite(source.url);

    let itemCount = 0;
    for (const item of websiteNewsItems) {
      try {
        const resultId = newsApi.createNewsItem({
          title: item.title,
          link: item.url,
          description: item.description || '',
          content: '',
          pubDate: item.pubDate || Date.now(),
          author: item.author || '',
          image_url: item.image || null,
          source_id: sourceId,
          category_id: source.category_id || null,
          is_read: 0
        });
        
        if (resultId > 0) {
          itemCount++;
        }
      } catch (error) {
        console.error('Failed to insert website news item:', error);
      }
    }

    // 更新最后抓取时间
    newsApi.updateSourceLastFetched(sourceId);

    console.log(`✓ Fetched ${itemCount} items from website ${source.name}`);
    return { success: true, sourceId, itemCount };
  } catch (error: any) {
    const errorMessage = error.message || '抓取网站新闻失败';
    console.error(`✗ Failed to fetch website news ${sourceId}:`, errorMessage);
    return {
      success: false,
      sourceId,
      error: errorMessage
    };
  }
}

/**
 * 测试网站是否可以用于新闻抓取
 */
export async function testWebsiteNews(url: string): Promise<{ success: boolean; error?: string; websiteInfo?: any }> {
  try {
    console.log(`Testing website for news: ${url}`);
    
    const proxyAgent = getProxyAgent();
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000,
      agent: proxyAgent
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const html = await response.text();
    
    // 检查HTML长度和一些常见内容标记
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : 'Unknown Site';
    
    // 提取部分新闻链接用于预览
    const linkRegex = /<a[^>]+href\s*=\s*["']([^"']+)['"][^>]*>([^<]+)<\/a>/gi;
    const sampleLinks = [];
    let match;
    let count = 0;
    
    while ((match = linkRegex.exec(html)) !== null && count < 3) {
      const text = match[2].trim();
      if (text && text.length > 10 && !text.includes('首页') && !text.includes('关于我们')) {
        sampleLinks.push({ text, url: match[1] });
        count++;
      }
    }

    return {
      success: true,
      websiteInfo: {
        title: title,
        url: url,
        sampleLinks: sampleLinks
      }
    };
  } catch (error: any) {
    const errorMessage = error.message || '网站无法访问或不适用于新闻抓取';
    console.error(`✗ Website test failed:`, errorMessage);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * 抓取所有活跃的网站新闻源
 */
export async function fetchAllActiveWebsiteSources(): Promise<FetchResult[]> {
  console.log('Fetching all active website sources...');

  // 获取所有非RSS类型的新闻源（可以扩展一个字段来区分RSS源和网站源）
  // 目前我们假设所有源都可以作为网站源处理
  const sources = newsApi.getActiveSources();
  const results: FetchResult[] = [];

  for (const source of sources) {
    const result = await fetchWebsiteNews(source.id);
    results.push(result);
  }

  // 统计结果
  const successCount = results.filter(r => r.success).length;
  const totalItems = results.reduce((sum, r) => sum + (r.itemCount || 0), 0);

  console.log(`\n=== Website News Fetch Summary ===`);
  console.log(`Total sources: ${sources.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${sources.length - successCount}`);
  console.log(`Total items fetched: ${totalItems}`);
  console.log('========================\n');

  return results;
}
