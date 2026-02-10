import { ipcMain } from 'electron';
import Store from 'electron-store';
import Parser from 'rss-parser';

const store = new Store({
    name: "moyu-data",
});

const parser = new Parser();

const getRSSFeeds = () => {
    return store.get("rssFeeds") as Record<string, any>;
};

const saveRSSFeeds = (feeds: Record<string, any>) => {
    store.set("rssFeeds", feeds);
};

export function registerRSSHandlers() {
    ipcMain.handle("rss:addFeed", async (_event, url: string) => {
        try {
            const trimmedUrl = url.trim();
            const feed = await parser.parseURL(trimmedUrl);
            const feedData = {
                url: trimmedUrl,
                title: feed.title || "Unknown Feed",
                description: feed.description || "",
                items: feed.items.map((item) => ({
                    title: item.title || "No Title",
                    link: item.link || "",
                    pubDate: item.pubDate || new Date().toISOString(),
                    content: item.content || item.contentSnippet || "",
                    contentSnippet: item.contentSnippet || "",
                    guid: item.guid || item.link || "",
                })),
            };

            const feeds = getRSSFeeds();
            feeds[trimmedUrl] = feedData;
            saveRSSFeeds(feeds);

            return { success: true, feed: feedData };
        } catch (error) {
            console.error("Failed to parse RSS feed:", error);
            return { success: false, error: "Failed to parse RSS feed" };
        }
    });

    ipcMain.handle("rss:removeFeed", async (_event, url: string) => {
        try {
            const trimmedUrl = url.trim();
            const feeds = getRSSFeeds();
            delete feeds[trimmedUrl];
            saveRSSFeeds(feeds);
            return { success: true };
        } catch (error) {
            console.error("Failed to remove RSS feed:", error);
            return { success: false, error: "Failed to remove RSS feed" };
        }
    });

    ipcMain.handle("rss:refreshFeed", async (_event, url: string) => {
        try {
            const trimmedUrl = url.trim();
            const feed = await parser.parseURL(trimmedUrl);
            const feedData = {
                url: trimmedUrl,
                title: feed.title || "Unknown Feed",
                description: feed.description || "",
                items: feed.items.map((item) => ({
                    title: item.title || "No Title",
                    link: item.link || "",
                    pubDate: item.pubDate || new Date().toISOString(),
                    content: item.content || item.contentSnippet || "",
                    contentSnippet: item.contentSnippet || "",
                    guid: item.guid || item.link || "",
                })),
            };

            const feeds = getRSSFeeds();
            feeds[trimmedUrl] = feedData;
            saveRSSFeeds(feeds);

            return { success: true, feed: feedData };
        } catch (error) {
            console.error("Failed to refresh RSS feed:", error);
            return { success: false, error: "Failed to refresh RSS feed" };
        }
    });

    ipcMain.handle("rss:getFeeds", async () => {
        try {
            const feeds = Object.values(getRSSFeeds()).map((feed) => ({
                ...feed,
                url: feed.url.trim(),
            }));
            return { success: true, feeds };
        } catch (error) {
            console.error("Failed to get RSS feeds:", error);
            return { success: false, error: "Failed to get RSS feeds" };
        }
    });

    ipcMain.handle("rss:getFeed", async (_event, url: string) => {
        try {
            const trimmedUrl = url.trim();
            const feeds = getRSSFeeds();
            const feed = feeds[trimmedUrl];
            if (feed) {
                return { success: true, feed: { ...feed, url: trimmedUrl } };
            } else {
                return { success: false, error: "Feed not found" };
            }
        } catch (error) {
            console.error("Failed to get RSS feed:", error);
            return { success: false, error: "Failed to get RSS feed" };
        }
    });
}
