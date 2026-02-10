import React, { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';

interface AddFeedFormProps {
  onAdd: (url: string) => Promise<void>;
  onAddPreset: (url: string) => Promise<void>;
  loadingStates: Record<string, boolean>;
  error: string;
}

const PRESET_FEEDS = [
    {name: '阮一峰的网络日志', url: 'http://www.ruanyifeng.com/blog/atom.xml'},
    {name: '掘金前端', url: 'https://juejin.cn/rss/fe'},
    {name: 'Hacker News', url: 'https://hnrss.org/frontpage'},
    {name: 'TechCrunch', url: 'https://techcrunch.com/feed/'},
    {name: 'InfoQ 中文', url: 'https://www.infoq.cn/feed'}
];

export function AddFeedForm({ onAdd, onAddPreset, loadingStates, error }: AddFeedFormProps) {
  const [newFeedUrl, setNewFeedUrl] = useState('');

  const handleAdd = async () => {
    if (!newFeedUrl.trim()) return;
    await onAdd(newFeedUrl.trim());
    setNewFeedUrl('');
  };

  return (
    <div className="bg-slate-900/60 dark:bg-slate-900/60 bg-white/60 backdrop-blur-md rounded-xl p-6 border border-slate-700/50 dark:border-slate-700/50 border-slate-200 mb-8">
      <h2 className="text-xl font-bold mb-4 dark:text-white text-slate-900">添加 RSS 源</h2>

      {/* 预设 RSS 源 */}
      <div className="mb-4">
        <p className="text-sm text-slate-400 dark:text-slate-400 text-slate-600 mb-2">推荐订阅：</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_FEEDS.map((feed) => (
            <button
              key={feed.url}
              onClick={() => onAddPreset(feed.url)}
              disabled={loadingStates[`preset-${feed.url}`]}
              className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loadingStates[`preset-${feed.url}`] ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin"/>
                  添加中...
                </>
              ) : (
                feed.name
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 自定义 RSS 源 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newFeedUrl}
          onChange={(e) => setNewFeedUrl(e.target.value)}
          placeholder="输入 RSS 源 URL..."
          className="flex-1 px-4 py-2 bg-slate-800/50 dark:bg-slate-800/50 bg-white/50 border border-slate-700/50 dark:border-slate-700/50 border-slate-200 rounded-lg focus:outline-none focus:border-primary dark:text-white text-slate-900 placeholder-slate-400 dark:placeholder-slate-400 placeholder-slate-500"
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={loadingStates.add}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-white flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loadingStates.add ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin"/>
              添加中...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4"/>
              添加
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-red-400 text-sm">{error}</p>
      )}
    </div>
  );
}
