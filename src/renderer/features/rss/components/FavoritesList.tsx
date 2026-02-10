import React from 'react';
import { StarOff, Clock, Star, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { RSSItem } from '../../../store/rssStore';

interface FavoritesListProps {
  favorites: RSSItem[];
  onSelectArticle: (item: RSSItem) => void;
  onToggleFavorite: (item: RSSItem) => void;
}

export function FavoritesList({ favorites, onSelectArticle, onToggleFavorite }: FavoritesListProps) {
  if (favorites.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-500 text-slate-600">
        <StarOff className="w-16 h-16 mx-auto mb-4 opacity-50"/>
        <p>还没有收藏文章</p>
        <p className="text-sm mt-2">在阅读文章时点击收藏按钮即可</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {favorites.map((item) => (
        <article
          key={item.guid}
          onClick={() => onSelectArticle(item)}
          className="p-4 bg-slate-900/60 dark:bg-slate-900/60 bg-white/60 backdrop-blur-md rounded-xl border border-slate-700/50 dark:border-slate-700/50 border-slate-200 hover:border-purple-500/50 cursor-pointer transition-all"
        >
          <h3 className="font-bold mb-2 hover:text-primary transition-colors">
            {item.title}
          </h3>
          <p className="text-slate-400 dark:text-slate-400 text-slate-600 text-sm mb-3 line-clamp-2">
            {item.contentSnippet}
          </p>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-500 text-slate-600">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3"/>
              {formatDistanceToNow(new Date(item.pubDate), {
                addSuffix: true,
                locale: zhCN
              })}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(item);
                }}
                className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300 cursor-pointer"
              >
                <Star className="w-3 h-3 fill-current"/>
                取消收藏
              </button>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-primary hover:text-primary/80 cursor-pointer"
              >
                <ExternalLink className="w-3 h-3"/>
                查看原文
              </a>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
