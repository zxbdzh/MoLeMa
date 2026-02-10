import { ipcMain } from 'electron';
import { newsApi } from '../api/newsApi';
import { testRSSFeed } from "../services/rssFetcher";
import { testWebsiteNews } from "../services/websiteNewsFetcher";

export function registerNewsHandlers() {
    ipcMain.handle("news:getDomesticNews", async (_event, category?: string) => {
        try {
            let categoryId: number | undefined;
            if (category && category !== "all") {
                const categories = newsApi.getAllCategories();
                let categoryName: string | undefined;
                switch (category) {
                    case "tech": categoryName = "科技"; break;
                    case "news": categoryName = "资讯"; break;
                    case "startup": categoryName = "创业"; break;
                    case "ai": categoryName = "AI"; break;
                    default: categoryName = category;
                }
                if (categoryName) {
                    for (const cat of categories) {
                        if (cat.name.includes(categoryName) || categoryName.includes(cat.name)) {
                            categoryId = cat.id;
                            break;
                        }
                    }
                }
            }
            const newsItems = newsApi.getNewsItems(50, 0, categoryId);
            const allNews = newsItems.map((item: any) => {
                const sourceName = item.source_name || `Source ${item.source_id}`;
                let categoryLabel = "news";
                if (item.category_name) {
                    if (item.category_name.includes("技术")) categoryLabel = "tech";
                    else if (item.category_name.includes("创业")) categoryLabel = "startup";
                    else if (item.category_name.includes("AI")) categoryLabel = "ai";
                }
                return {
                    id: item.id?.toString() || `db-${item.link}`,
                    title: item.title,
                    description: item.description || item.content || "",
                    url: item.link,
                    publishedAt: item.pub_date ? new Date(item.pub_date).toISOString() : new Date().toISOString(),
                    source: sourceName,
                    category: categoryLabel,
                    image: item.image_url,
                };
            });
            allNews.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
            return { success: true, news: allNews.slice(0, 50) };
        } catch (error) {
            console.error("Failed to get domestic news:", error);
            return { success: false, error: "Failed to get domestic news" };
        }
    });

    ipcMain.handle("newsSources:test", async (_event, url: string) => {
        try {
            const rssPattern = /\.(xml|rss|rdf|atom|feed|feed\.xml)$/i;
            const isRSS = rssPattern.test(url) || url.includes("/rss") || url.includes("/feed");
            let result;
            if (isRSS) {
                result = await testRSSFeed(url);
            } else {
                result = await testWebsiteNews(url);
            }
            return result;
        } catch (error) {
            console.error("Failed to test news source:", error);
            return { success: false, error: error instanceof Error ? error.message : "Failed to test news source" };
        }
    });
}
