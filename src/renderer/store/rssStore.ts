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
            set({ feeds: result.feeds })
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
          const result = await window.electronAPI.rss.addFeed(url)
          if (result.success) {
            set((state) => ({
              feeds: [...state.feeds, result.feed]
            }))
          } else {
            throw new Error(result.error || 'Failed to add RSS feed')
          }
        }
      },

      removeFeed: async (url: string) => {
        if (window.electronAPI && window.electronAPI.rss) {
          const result = await window.electronAPI.rss.removeFeed(url)
          if (result.success) {
            set((state) => ({
              feeds: state.feeds.filter((feed) => feed.url !== url),
              currentFeed: state.currentFeed?.url === url ? null : state.currentFeed
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
          const result = await window.electronAPI.rss.refreshFeed(url)
          if (result.success) {
            set((state) => ({
              feeds: state.feeds.map((f) => (f.url === url ? result.feed : f)),
              currentFeed: state.currentFeed?.url === url ? result.feed : state.currentFeed
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