import React from 'react';
import { Rss, Clock, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Feed, RSSItem } from '../../../store/rssStore';

interface ArticleListProps {
  feed: Feed | null;
  onSelectArticle: (item: RSSItem) => void;
}

export function ArticleList({ feed, onSelectArticle }: ArticleListProps) {
  if (!feed) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-500 text-slate-600">
        <Rss className="w-16 h-16 mx-auto mb-4 opacity-50"/>
        <p>选择一个 RSS 源查看文章</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold dark:text-white text-slate-900">{feed.title}</h2>
        <span className="text-sm text-slate-400 dark:text-slate-400 text-slate-600">{feed.items.length} 篇文章</span>
      </div>

      {feed.items.map((item) => (
        <article
          key={item.guid}
          onClick={() => onSelectArticle(item)}
          className="p-4 bg-slate-900/60 dark:bg-slate-900/60 bg-white/60 backdrop-blur-md rounded-xl border border-slate-700/50 dark:border-slate-700/50 border-slate-200 hover:border-primary/50 cursor-pointer transition-all"
        >
          <h3 className="font-bold mb-2 hover:text-primary transition-colors">
            {item.title}
          </h3>
          <p className="text-sm text-slate-400 dark:text-slate-400 text-slate-600 line-clamp-2 mb-3">
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
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-primary hover:text-primary/80"
            >
              <ExternalLink className="w-3 h-3"/>
              查看原文
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}
