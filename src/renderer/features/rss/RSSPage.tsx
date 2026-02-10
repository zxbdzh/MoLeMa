import { useState } from 'react';
import { Rss, Star } from 'lucide-react';
import { useRSSStore } from '../../store/rssStore';
import AlertDialog from '../../components/ui/AlertDialog';
import { AddFeedForm } from './components/AddFeedForm';
import { FeedList } from './components/FeedList';
import { ArticleList } from './components/ArticleList';
import { FavoritesList } from './components/FavoritesList';
import ArticleReader from './ArticleReader';

export default function RSSPage() {
    const {
        feeds,
        currentFeed,
        favorites,
        addFeed,
        removeFeed,
        setCurrentFeed,
        setCurrentArticle,
        refreshFeed,
        toggleFavorite,
        currentArticle
    } = useRSSStore();

    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState<'feeds' | 'favorites'>('feeds');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [feedToDelete, setFeedToDelete] = useState<string | null>(null);

    const setLoading = (key: string, value: boolean) => {
        setLoadingStates(prev => ({ ...prev, [key]: value }));
    };

    const handleAddFeed = async (url: string) => {
        setLoading('add', true);
        setError('');
        try {
            await addFeed(url);
        } catch (err) {
            setError('添加 RSS 源失败，请检查 URL 是否正确');
        } finally {
            setLoading('add', false);
        }
    };

    const handleAddPresetFeed = async (url: string) => {
        setLoading(`preset-${url}`, true);
        setError('');
        try {
            await addFeed(url);
        } catch (err) {
            setError('添加 RSS 源失败，请检查 URL 是否正确');
        } finally {
            setLoading(`preset-${url}`, false);
        }
    };

    const handleRefreshFeed = async (url: string) => {
        setLoading(`refresh-${url}`, true);
        setError('');
        try {
            await refreshFeed(url);
        } catch (err) {
            setError('刷新 RSS 源失败');
        } finally {
            setLoading(`refresh-${url}`, false);
        }
    };

    const handleRemoveFeed = (url: string) => {
        setFeedToDelete(url);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteFeed = () => {
        if (feedToDelete) {
            removeFeed(feedToDelete);
            setShowDeleteConfirm(false);
            setFeedToDelete(null);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-3xl font-bold font-heading flex items-center gap-3 dark:text-white text-slate-900">
                        <Rss className="w-8 h-8 text-primary"/>
                        RSS 订阅
                    </h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('feeds')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                                viewMode === 'feeds'
                                    ? 'font-bold text-slate-900 dark:text-white'
                                    : 'text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            订阅源
                        </button>
                        <button
                            onClick={() => setViewMode('favorites')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 cursor-pointer ${
                                viewMode === 'favorites'
                                    ? 'font-bold text-slate-900 dark:text-white'
                                    : 'text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            <Star className="w-4 h-4"/>
                            收藏夹
                            {favorites.length > 0 && (
                                <span className="bg-slate-200 dark:bg-slate-700/50 text-slate-900 dark:text-white px-2 py-0.5 rounded-full text-xs">
                                    {favorites.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
                <p className="text-slate-400 dark:text-slate-400 text-slate-600">订阅你喜欢的技术博客，实时获取最新文章</p>
            </div>

            {/* 添加 RSS 源 */}
            <AddFeedForm 
                onAdd={handleAddFeed} 
                onAddPreset={handleAddPresetFeed} 
                loadingStates={loadingStates} 
                error={error} 
            />

            {/* RSS 源列表视图 */}
            {viewMode === 'feeds' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 左侧：RSS 源列表 */}
                    <div className="lg:col-span-1">
                        <FeedList 
                            feeds={feeds}
                            currentFeedUrl={currentFeed?.url}
                            loadingStates={loadingStates}
                            onSelect={setCurrentFeed}
                            onRefresh={handleRefreshFeed}
                            onRemove={handleRemoveFeed}
                        />
                    </div>

                    {/* 右侧：文章列表 */}
                    <div className="lg:col-span-2">
                        <ArticleList 
                            feed={currentFeed}
                            onSelectArticle={setCurrentArticle}
                        />
                    </div>
                </div>
            )}

            {/* 收藏夹视图 */}
            {viewMode === 'favorites' && (
                <FavoritesList 
                    favorites={favorites}
                    onSelectArticle={setCurrentArticle}
                    onToggleFavorite={toggleFavorite}
                />
            )}

            {/* 阅读器 (Portal) */}
            {currentArticle && (
                <ArticleReader onClose={() => setCurrentArticle(null)} />
            )}

            {/* 删除确认对话框 */}
            <AlertDialog
                isOpen={showDeleteConfirm}
                type="warning"
                title="删除 RSS 源"
                message="确定要删除这个 RSS 源吗？删除后将无法恢复。"
                confirmText="删除"
                cancelText="取消"
                showCancel={true}
                onConfirm={confirmDeleteFeed}
                onCancel={() => {
                    setShowDeleteConfirm(false);
                    setFeedToDelete(null);
                }}
            />
        </div>
    );
}
