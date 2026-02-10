import React from 'react';
import { Rss, Clock, RefreshCw, Trash2 } from 'lucide-react';
import { Feed } from '../../../store/rssStore';

interface FeedListProps {
  feeds: Feed[];
  currentFeedUrl?: string;
  loadingStates: Record<string, boolean>;
  onSelect: (feed: Feed) => void;
  onRefresh: (url: string) => Promise<void>;
  onRemove: (url: string) => void;
}

export function FeedList({ feeds, currentFeedUrl, loadingStates, onSelect, onRefresh, onRemove }: FeedListProps) {
  if (feeds.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-500 text-slate-600">
        <Rss className="w-16 h-16 mx-auto mb-4 opacity-50"/>
        <p>还没有订阅任何 RSS 源</p>
        <p className="text-sm">添加一个 RSS 源开始阅读吧！</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {feeds.map((feed) => {
        const trimmedUrl = feed.url.trim();
        return (
          <div
            key={trimmedUrl}
            onClick={() => onSelect(feed)}
            className={`p-4 rounded-xl cursor-pointer transition-all ${
              currentFeedUrl === trimmedUrl
                ? 'bg-primary/30 border-primary/70'
                : 'bg-slate-800/40 dark:bg-slate-800/40 bg-white/40 border-slate-700/50 dark:border-slate-700/50 border-slate-200 hover:bg-slate-800/60 dark:hover:bg-slate-800/60 hover:bg-slate-100/50'
            } border`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate mb-1 dark:text-white text-slate-900">{feed.title}</h3>
                <p className="text-sm text-slate-400 dark:text-slate-400 text-slate-600 truncate">{feed.description}</p>
                <p className="text-xs text-slate-500 dark:text-slate-500 text-slate-600 mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3"/>
                  {feed.items.length} 篇文章
                </p>
              </div>
              <div className="flex gap-1 ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRefresh(trimmedUrl);
                  }}
                  disabled={loadingStates[`refresh-${trimmedUrl}`]}
                  className="p-1.5 hover:bg-slate-800/50 dark:hover:bg-slate-800/50 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw
                    className={`w-4 h-4 text-slate-600 dark:text-slate-400 ${loadingStates[`refresh-${trimmedUrl}`] ? 'animate-spin' : ''}`}/>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(trimmedUrl);
                  }}
                  className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2
                    className="w-4 h-4 text-slate-600 dark:text-slate-400 hover:text-red-400"/>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
