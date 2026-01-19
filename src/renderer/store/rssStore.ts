import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface RSSItem {
  title: string
  link: string
  pubDate: string
  content: string
  contentSnippet: string
  guid: string
}

interface RSSFeed {
  url: string
  title: string
  description: string
  items: RSSItem[]
}

interface RSSStore {
  feeds: RSSFeed[]
  currentFeed: RSSFeed | null
  currentArticle: RSSItem | null
  favorites: RSSItem[]
  addFeed: (url: string) => Promise<void>
  removeFeed: (url: string) => Promise<void>
  setCurrentFeed: (feed: RSSFeed | null) => void
  setCurrentArticle: (article: RSSItem | null) => void
  refreshFeed: (url: string) => Promise<void>
  loadFeeds: () => Promise<void>
  toggleFavorite: (article: RSSItem) => Promise<void>
  isFavorite: (article: RSSItem) => boolean
  removeFavorite: (article: RSSItem) => Promise<void>
  loadFavorites: () => Promise<void>
}

export const useRSSStore = create<RSSStore>()(
  persist(
    (set, get) => ({
      feeds: [],
      currentFeed: null,
      currentArticle: null,
      favorites: [],

      loadFeeds: async () => {
        if (window.electronAPI && window.electronAPI.rss) {
          const result = await window.electronAPI.rss.getFeeds()
          if (result.success) {
            // 处理每个feed的URL，去除前后空格
            const processedFeeds = (result.feeds as RSSFeed[]).map((feed: RSSFeed) => ({
              ...feed,
              url: feed.url.trim()
            }))

            // 去重处理，避免重复feed
            const uniqueFeeds = Array.from(
              new Map(processedFeeds.map((feed: RSSFeed) => [feed.url, feed])).values()
            )
            set({ feeds: uniqueFeeds })
          }
        }
      },

      loadFavorites: async () => {
        try {
          const result = await window.electronAPI?.store?.get('favorites')
          if (result?.success) {
            set({ favorites: result.value || [] })
          }
        } catch (error) {
          console.error('Failed to load favorites:', error)
        }
      },

      addFeed: async (url: string) => {
        if (window.electronAPI && window.electronAPI.rss) {
          // 去除URL前后空格
          const trimmedUrl = url.trim()

          // 检查feed是否已存在
          const existingFeeds = get().feeds
          if (existingFeeds.some(feed => feed.url === trimmedUrl)) {
            window.alert('该RSS订阅已存在，请不要重复添加！')
            return
          }

          const result = await window.electronAPI.rss.addFeed(trimmedUrl)
          if (result.success) {
            // 确保返回的feed url也没有空格
            const processedFeed = {
              ...result.feed,
              url: result.feed.url.trim()
            }
            set((state) => ({
              feeds: [...state.feeds, processedFeed]
            }))
          } else {
            throw new Error(result.error || 'Failed to add RSS feed')
          }
        }
      },

      removeFeed: async (url: string) => {
        if (window.electronAPI && window.electronAPI.rss) {
          // 去除URL前后空格
          const trimmedUrl = url.trim()
          
          const result = await window.electronAPI.rss.removeFeed(trimmedUrl)
          if (result.success) {
            set((state) => ({
              feeds: state.feeds.filter((feed) => feed.url !== trimmedUrl),
              currentFeed: state.currentFeed?.url === trimmedUrl ? null : state.currentFeed
            }))
          } else {
            throw new Error(result.error || 'Failed to remove RSS feed')
          }
        }
      },

      setCurrentFeed: (feed: RSSFeed | null) => {
        set({ currentFeed: feed })
      },

      setCurrentArticle: (article: RSSItem | null) => {
        set({ currentArticle: article })
      },

      refreshFeed: async (url: string) => {
        if (window.electronAPI && window.electronAPI.rss) {
          // 去除URL前后空格
          const trimmedUrl = url.trim()
          
          const result = await window.electronAPI.rss.refreshFeed(trimmedUrl)
          if (result.success) {
            // 确保返回的feed url也没有空格
            const processedFeed = {
              ...result.feed,
              url: result.feed.url.trim()
            }
            
            set((state) => ({
              feeds: state.feeds.map((f) => (f.url === trimmedUrl ? processedFeed : f)),
              currentFeed: state.currentFeed?.url === trimmedUrl ? processedFeed : state.currentFeed
            }))
          } else {
            throw new Error(result.error || 'Failed to refresh RSS feed')
          }
        }
      },

      isFavorite: (article: RSSItem) => {
        return get().favorites.some(fav => fav.guid === article.guid || fav.link === article.link)
      },

      toggleFavorite: async (article: RSSItem) => {
        const favorites = get().favorites
        const isFav = favorites.some(fav => fav.guid === article.guid || fav.link === article.link)
        
        let newFavorites
        if (isFav) {
          newFavorites = favorites.filter(fav => fav.guid !== article.guid && fav.link !== article.link)
        } else {
          newFavorites = [...favorites, article]
        }
        
        set({ favorites: newFavorites })
        
        try {
          await window.electronAPI?.store?.set('favorites', newFavorites)
        } catch (error) {
          console.error('Failed to save favorites:', error)
        }
      },

      removeFavorite: async (article: RSSItem) => {
        const newFavorites = get().favorites.filter(fav => fav.guid !== article.guid && fav.link !== article.link)
        set({ favorites: newFavorites })
        
        try {
          await window.electronAPI?.store?.set('favorites', newFavorites)
        } catch (error) {
          console.error('Failed to save favorites:', error)
        }
      }
    }),
    {
      name: 'rss-storage',
      partialize: (state) => ({
        feeds: state.feeds,
        currentFeed: state.currentFeed,
        currentArticle: state.currentArticle
      })
    }
  )
)

// 初始化收藏列表
useRSSStore.getState().loadFavorites()