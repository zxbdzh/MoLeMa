/**
 * 新闻内容解析通用工具 (可被主进程和渲染进程共享)
 */

export const newsParser = {
    /**
     * 从 RSS 项中提取图片 URL
     */
    extractImageUrl(item: any): string | null {
        if (item.enclosure && item.enclosure.url) {
            return item.enclosure.url;
        }
        if (item['media:thumbnail'] && item['media:thumbnail'].$) {
            return item['media:thumbnail'].$.url;
        }
        if (item['media:content'] && item['media:content'].$) {
            return item['media:content'].$.url;
        }

        if (item.content) {
            const imgMatch = item.content.match(/<img[^>]+src=["']([^"']+)["']/i);
            if (imgMatch) {
                return imgMatch[1];
            }
        }
        return null;
    },

    /**
     * 简单的 HTML 链接清洗，提取可能是新闻的内容
     */
    extractNewsLinks(html: string, baseUrl: string): { title: string, url: string }[] {
        const linkRegex = /<a[^>]+href\s*=\s*["']([^"']+)['"][^>]*>([^<]+)<\/a>/gi;
        const links: { title: string, url: string }[] = [];
        let match;

        while ((match = linkRegex.exec(html)) !== null) {
            const href = match[1];
            const text = match[2].trim();

            if (text && text.length > 10 && this.isLikelyNewsLink(href, text)) {
                try {
                    const absoluteUrl = new URL(href, baseUrl).href;
                    links.push({ title: text, url: absoluteUrl });
                } catch (e) {
                    // Ignore invalid URLs
                }
            }
        }

        // 去重
        const unique = new Map();
        links.forEach(l => unique.set(l.url, l));
        return Array.from(unique.values()).slice(0, 20);
    },

    isLikelyNewsLink(href: string, text: string): boolean {
        const blacklist = ['首页', '关于我们', '联系方式', '服务条款', '隐私政策', '登录', '注册'];
        if (blacklist.some(item => text.includes(item))) return false;

        const patterns = ['/news/', '/article/', '/post/', '.html', '?', 'view'];
        return patterns.some(p => href.includes(p)) || href.length > 15;
    }
};
