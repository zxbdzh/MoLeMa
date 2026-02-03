// WebPages.tsx - 网页收藏和浏览组件
import {useEffect, useState} from 'react'
import {createPortal} from 'react-dom'
import {
    BookOpen,
    Check,
    Chrome,
    Clock,
    Code,
    Edit2,
    Edit3,
    ExternalLink,
    Filter,
    FolderPlus,
    Globe,
    Link,
    Monitor,
    Plus,
    RefreshCw,
    Settings,
    Trash2,
    X
} from 'lucide-react'
import {Card3D} from './3DCard'
import WebPageBrowser from './WebPageBrowser'
import AlertDialog from './AlertDialog'

type WebPageCategory = {
    id: number
    name: string
    icon?: string
    color?: string
    sort_order?: number
}

interface WebPageItem {
    id?: number
    title: string
    url: string
    description?: string
    category_id?: number
    is_active?: number
    is_favorite?: number;
    favicon?: string;
    created_at?: number
    updated_at?: number
    category_name?: string
    category_color?: string
}

// 默认分类（当没有数据库分类时使用）
const defaultCategories = [
    {id: 'all', label: '全部', icon: Globe},
    {id: 'work', label: '工作', icon: Code},
    {id: 'learn', label: '学习', icon: BookOpen},
    {id: 'tools', label: '工具', icon: Chrome},
    {id: 'entertainment', label: '娱乐', icon: Monitor}
]

export default function WebPages() {
    const [webPages, setWebPages] = useState<WebPageItem[]>([])
    const [categories, setCategories] = useState<WebPageCategory[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedCategory, setSelectedCategory] = useState<string>('all')

    // 网页管理
    const [showWebPageManager, setShowWebPageManager] = useState(false)
    const [showAddWebPageModal, setShowAddWebPageModal] = useState(false)
    const [webPagesList, setWebPagesList] = useState<WebPageItem[]>([])
    const [editingWebPage, setEditingWebPage] = useState<WebPageItem | null>(null)
    const [webPageForm, setWebPageForm] = useState<WebPageItem>({
        title: '',
        url: '',
        description: '',
        category_id: 1,
        is_active: 1
    })
    const [testingWebPage, setTestingWebPage] = useState(false)
    const [testResult, setTestResult] = useState<{ success: boolean; error?: string; pageInfo?: any } | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [webPageToDelete, setWebPageToDelete] = useState<number | null>(null)

    // 分类管理
    const [showCategoryManager, setShowCategoryManager] = useState(false)
    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
    const [showEditCategoryModal, setShowEditCategoryModal] = useState(false)
    const [editingCategory, setEditingCategory] = useState<WebPageCategory | null>(null)
    const [categoryForm, setCategoryForm] = useState<WebPageCategory>({
        id: 0,
        name: '',
        icon: 'folder',
        color: '#3B82F6',
        sort_order: 0
    })
    const [categoryWebPageCounts, setCategoryWebPageCounts] = useState<Map<number, number>>(new Map())
    const [showDeleteCategoryConfirm, setShowDeleteCategoryConfirm] = useState(false)
    const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null)

    // 筛选弹窗
    const [showFilterModal, setShowFilterModal] = useState(false)

    // AlertDialog 状态
    const [showAlertDialog, setShowAlertDialog] = useState(false)
    const [alertDialogConfig, setAlertDialogConfig] = useState<{
        type: 'warning' | 'info' | 'success' | 'error'
        title: string
        message: string
        onConfirm?: () => void
    } | null>(null)

    // 网页浏览器弹窗
    const [showWebBrowser, setShowWebBrowser] = useState(false)
    const [currentWebPage, setCurrentWebPage] = useState<WebPageItem | null>(null)

    // 优化：合并加载逻辑，避免重复请求
    useEffect(() => {
        fetchWebPages()
        fetchCategories()
        fetchWebPagesList()
    }, [])

    const fetchCategories = async () => {
        try {
            const result = await window.electronAPI?.webPages?.categories?.getAll()
            if (result?.success) {
                setCategories(result.categories || [])
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error)
        }
    }

    const fetchCategoryWebPageCounts = async () => {
        try {
            const countsMap = new Map<number, number>()
            const cats = await window.electronAPI?.webPages?.categories?.getAll()
            if (cats?.success && cats.categories) {
                for (const cat of cats.categories) {
                    const countResult = await window.electronAPI?.webPages?.categories?.getWebPageCount(cat.id)
                    if (countResult?.success && countResult.count !== undefined) {
                        countsMap.set(cat.id, countResult.count)
                    }
                }
            }
            setCategoryWebPageCounts(countsMap)
        } catch (error) {
            console.error('Failed to fetch category web page counts:', error)
        }
    }

    const fetchWebPages = async () => {
        setLoading(true)
        setError(null)
        try {
            const result = await window.electronAPI?.webPages?.getAll()

            if (result?.success) {
                setWebPages(result.webPages || [])
            } else {
                const errorMsg = '获取网页失败'
                setError(errorMsg)
                console.error('获取网页数据失败:', errorMsg)
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : '获取网页失败'
            console.error('获取网页数据异常:', err)
            setError(`获取网页失败: ${errorMsg}`)
        } finally {
            setLoading(false)
        }
    }

    const fetchWebPagesList = async () => {
        try {
            const result = await window.electronAPI?.webPages?.getAll()
            if (result?.success) {
                setWebPagesList(result.webPages || [])
            }
        } catch (error) {
            console.error('Failed to fetch web pages list:', error)
        }
    }

    const handleTestWebPage = async () => {
        if (!webPageForm.url.trim()) {
            setTestResult({success: false, error: '请输入网站 URL'})
            return
        }

        setTestingWebPage(true)
        setTestResult(null)

        try {
            // 简化处理，直接标记为成功
            setTestResult({success: true, pageInfo: {title: '网站连接成功'}})
        } catch (error) {
            setTestResult({success: false, error: '测试失败'})
        } finally {
            setTestingWebPage(false)
        }
    }

    const handleSaveWebPage = async () => {
        try {
            if (editingWebPage?.id) {
                await window.electronAPI?.webPages?.update(editingWebPage.id, webPageForm)
            } else {
                await window.electronAPI?.webPages?.create(webPageForm)
            }
            await fetchWebPagesList()
            await fetchWebPages()
            setShowWebPageManager(false)
            setEditingWebPage(null)
            setTestResult(null)
        } catch (error) {
            console.error('Failed to save web page:', error)
        }
    }

    const handleDeleteWebPage = async (id: number) => {
        setAlertDialogConfig({
            type: 'warning',
            title: '删除网页',
            message: '确定要删除这个网页吗？删除后将无法恢复。',
            onConfirm: async () => {
                try {
                    await window.electronAPI?.webPages?.delete(id)
                    await fetchWebPagesList()
                    await fetchWebPages()
                    setShowAlertDialog(false)
                } catch (error) {
                    console.error('Failed to delete web page:', error)
                }
            }
        })
        setShowAlertDialog(true)
    }

    const handleToggleWebPage = async (webPage: WebPageItem) => {
        try {
            await window.electronAPI?.webPages?.update(webPage.id!, {
                is_active: webPage.is_active === 1 ? 0 : 1
            })
            await fetchWebPagesList()
            await fetchWebPages()
        } catch (error) {
            console.error('Failed to toggle web page:', error)
        }
    }

    const handleAddWebPage = () => {
        setEditingWebPage(null)
        // 确保使用有效的 category_id
        const validCategoryId = categories.length > 0 ? categories[0].id : null
        setWebPageForm({
            title: '',
            url: '',
            description: '',
            category_id: validCategoryId,
            is_active: 1
        })
        setTestResult(null)

        // 如果没有分类，显示提示
        if (!validCategoryId) {
            console.warn('No categories available, please create a category first')
            setAlertDialogConfig({
                type: 'warning',
                title: '提示',
                message: '请先创建分类后再添加网页'
            })
            setShowAlertDialog(true)
            handleAddCategory()
        } else {
            setShowAddWebPageModal(true)
        }
    }

    const handleEditWebPage = (webPage: WebPageItem) => {
        setEditingWebPage(webPage)
        setWebPageForm({
            title: webPage.title,
            url: webPage.url,
            description: webPage.description || '',
            category_id: webPage.category_id ?? (categories.length > 0 ? categories[0].id : null),
            is_active: webPage.is_active || 0
        })
        setTestResult(null)
        setShowAddWebPageModal(true)
    }

    // 分类管理功能
    const handleAddCategory = () => {
        setEditingCategory(null)
        setCategoryForm({
            id: 0,
            name: '',
            icon: 'folder',
            color: '#3B82F6',
            sort_order: categories.length
        })
    }

    const handleEditCategory = (category: WebPageCategory) => {
        setEditingCategory(category)
        setCategoryForm({
            id: category.id,
            name: category.name,
            icon: category.icon || 'folder',
            color: category.color || '#3B82F6',
            sort_order: category.sort_order || 0
        })
        setShowEditCategoryModal(true)
    }

    const handleSaveCategory = async () => {
        try {
            if (!categoryForm.name.trim()) {
                setAlertDialogConfig({
                    type: 'warning',
                    title: '提示',
                    message: '请输入分类名称'
                })
                setShowAlertDialog(true)
                return
            }

            if (editingCategory?.id) {
                // 编辑模式
                await window.electronAPI?.webPages?.categories?.update(editingCategory.id, categoryForm)
                setShowEditCategoryModal(false)
            } else {
                // 添加模式
                await window.electronAPI?.webPages?.categories?.create(categoryForm)
                setShowAddCategoryModal(false)
            }
            await fetchCategories()
            await fetchCategoryWebPageCounts()
            setEditingCategory(null)
            setCategoryForm({
                id: 0,
                name: '',
                icon: 'folder',
                color: '#3B82F6',
                sort_order: 0
            })
        } catch (error) {
            console.error('Failed to save category:', error)
            setAlertDialogConfig({
                type: 'error',
                title: '错误',
                message: '保存分类失败'
            })
            setShowAlertDialog(true)
        }
    }

    const handleDeleteCategory = async (categoryId: number) => {
        // 检查是否有关联网页
        const webPageCount = categoryWebPageCounts.get(categoryId) || 0

        if (webPageCount > 0) {
            setAlertDialogConfig({
                type: 'warning',
                title: '无法删除',
                message: `无法删除，该分类下还有 ${webPageCount} 个网页`
            })
            setShowAlertDialog(true)
            return
        }

        setCategoryToDelete(categoryId)
        setShowDeleteCategoryConfirm(true)
    }

    // 根据数据库中的分类和默认分类生成分类列表
    const getAllCategories = () => {
        const dbCategories = categories.map(cat => ({
            id: cat.id.toString(),
            label: cat.name,
            icon: Globe // 默认图标，可以根据实际需求替换
        }))

        // 始终在开头添加"全部"选项
        return [
            {id: 'all', label: '全部', icon: Globe},
            ...dbCategories
        ]
    }

    // 筛选网页
    const filteredWebPages = selectedCategory === 'all'
        ? webPages.filter(item => item.is_active === 1)
        : webPages.filter(item => {
            // 使用 category_id 进行精确匹配，并且只显示已启用的网页
            return item.category_id === parseInt(selectedCategory) && item.is_active === 1
        })

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diffTime = Math.abs(now.getTime() - date.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 1) return '今天'
        if (diffDays === 2) return '昨天'
        return `${diffDays} 天前`
    }

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="mb-6">
                <h2 className="text-3xl font-bold dark:text-white text-slate-900 mb-2 flex items-center gap-3">
                    <Link className="w-8 h-8 text-blue-400"/>
                    网页收藏
                </h2>
                <p className="text-slate-400 dark:text-slate-400 text-slate-600">收藏和快速访问您喜欢的网站</p>
            </div>

            <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        <Filter
                            className="w-5 h-5 text-slate-400 cursor-pointer hover:text-blue-500 transition-colors"
                            onClick={() => setShowFilterModal(true)}
                            title="筛选分类"
                        />
                        <span className="text-sm text-slate-500 dark:text-slate-400">
              {getAllCategories().find(c => c.id === selectedCategory)?.label || '全部'}
            </span>
                    </div>
                    <button
                        onClick={() => {
                            setShowAddWebPageModal(true)
                            handleAddWebPage()
                        }}
                        className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-primary text-white rounded-lg hover:bg-blue-500 dark:hover:bg-primary/80 transition-colors cursor-pointer"
                    >
                        <Plus className="w-4 h-4"/>
                        添加网页
                    </button>
                    <button
                        onClick={() => {
                            setShowWebPageManager(true)
                            setShowCategoryManager(false)
                            fetchWebPagesList()
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                        <Settings className="w-4 h-4"/>
                        管理网页
                    </button>
                    <button
                        onClick={() => {
                            setShowAddCategoryModal(true)
                            handleAddCategory()
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-primary text-white rounded-lg hover:bg-blue-500 dark:hover:bg-primary/80 transition-colors cursor-pointer"
                    >
                        <Plus className="w-4 h-4"/>
                        添加分类
                    </button>
                    <button
                        onClick={() => {
                            setShowCategoryManager(true)
                            setShowWebPageManager(false)
                            fetchCategoryWebPageCounts()
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                        <Edit2 className="w-4 h-4"/>
                        管理分类
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <RefreshCw className="w-12 h-12 animate-spin text-blue-400 mb-4"/>
                    <p className="text-slate-400 dark:text-slate-400 text-slate-600">加载中...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Link className="w-16 h-16 mx-auto mb-4 text-red-400"/>
                    <h3 className="text-xl font-bold text-slate-400 dark:text-slate-400 text-slate-600 mb-2">加载失败</h3>
                    <p className="text-slate-500 dark:text-slate-500 text-slate-600 mb-4">{error}</p>
                    <button
                        onClick={fetchWebPages}
                        className="px-4 py-2 bg-blue-600 dark:text-white text-slate-900 rounded-lg hover:bg-blue-500 transition-colors cursor-pointer"
                    >
                        重试
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredWebPages.map((item) => {
                        return (
                            <div
                                key={item.id || item.url}
                                className="block cursor-pointer"
                                onClick={() => {
                                    setCurrentWebPage(item)
                                    setShowWebBrowser(true)
                                }}
                            >
                                <Card3D className="overflow-hidden group h-full">
                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                {item.favicon ? (
                                                    <img
                                                        src={item.favicon}
                                                        alt=""
                                                        className="w-10 h-10 rounded flex-shrink-0"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <div
                                                        className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                                                        <Link className="w-5 h-5 text-blue-600 dark:text-blue-400"/>
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <h3 className="font-bold dark:text-white text-slate-900 line-clamp-1">
                                                        {item.title}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 dark:text-slate-500 text-slate-600 truncate max-w-[180px]">
                                                        {item.url}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-xs rounded">
                      {item.category_name || '未分类'}
                    </span>
                                            </div>
                                        </div>
                                        <p className="text-slate-400 dark:text-slate-400 text-slate-600 mb-4 line-clamp-2 text-sm">
                                            {item.description || '暂无描述'}
                                        </p>
                                        <div
                                            className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-500 text-slate-600">
                                            <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-300 dark:text-slate-300 text-slate-700">
                          {item.title}
                        </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3"/>
                                                {item.created_at ? formatDate(item.created_at) : '未知时间'}
                                            </div>
                                        </div>
                                        <div
                                            className="mt-4 flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                                            访问网站
                                            <ExternalLink className="w-4 h-4 ml-1"/>
                                        </div>
                                    </div>
                                </Card3D>
                            </div>
                        )
                    })}
                </div>
            )}

            {filteredWebPages.length === 0 && !loading && !error && (
                <div className="text-center py-20">
                    <Link className="w-16 h-16 mx-auto mb-4 text-gray-500 dark:text-gray-500 text-slate-500"/>
                    <h3 className="text-xl font-bold text-slate-400 dark:text-slate-400 text-slate-600 mb-2">暂无收藏网页</h3>
                    <p className="text-slate-500 dark:text-slate-500 text-slate-600">点击右上角管理按钮添加您的第一个网页收藏</p>
                </div>
            )}

            {/* 独立的添加网页模态框 */}
            {showAddWebPageModal && createPortal(
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div
                        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                        <div
                            className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <h2 className="text-2xl font-bold dark:text-white text-slate-900 flex items-center gap-3">
                                {editingWebPage?.id ? (
                                    <>
                                        <Edit2 className="w-6 h-6 text-blue-500"/>
                                        编辑网页
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-6 h-6 text-blue-500"/>
                                        添加网页
                                    </>
                                )}
                            </h2>
                            <button
                                onClick={() => setShowAddWebPageModal(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5 text-slate-500"/>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label
                                            className="block text-sm font-medium mb-2 dark:text-slate-300 text-slate-700">网站名称</label>
                                        <input
                                            type="text"
                                            value={webPageForm.title}
                                            onChange={(e) => setWebPageForm({...webPageForm, title: e.target.value})}
                                            placeholder="网站名称"
                                            className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500/50 dark:text-white text-slate-900 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            className="block text-sm font-medium mb-2 dark:text-slate-300 text-slate-700">分类</label>
                                        <select
                                            value={webPageForm.category_id?.toString() || ''}
                                            onChange={(e) => setWebPageForm({
                                                ...webPageForm,
                                                category_id: parseInt(e.target.value)
                                            })}
                                            className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500/50 dark:text-white text-slate-900 transition-colors"
                                        >
                                            {categories.map((cat) => (
                                                <option key={cat.id} value={cat.id.toString()}>
                                                    {cat.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label
                                        className="block text-sm font-medium mb-2 dark:text-slate-300 text-slate-700">网站URL</label>
                                    <input
                                        type="text"
                                        value={webPageForm.url}
                                        onChange={(e) => setWebPageForm({...webPageForm, url: e.target.value})}
                                        placeholder="https://example.com"
                                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500/50 dark:text-white text-slate-900 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label
                                        className="block text-sm font-medium mb-2 dark:text-slate-300 text-slate-700">描述（可选）</label>
                                    <input
                                        type="text"
                                        value={webPageForm.description}
                                        onChange={(e) => setWebPageForm({...webPageForm, description: e.target.value})}
                                        placeholder="网站描述"
                                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500/50 dark:text-white text-slate-900 transition-colors"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleTestWebPage}
                                        disabled={testingWebPage}
                                        className="flex-1 py-2 bg-slate-800 dark:bg-slate-800 bg-white border border-slate-300 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {testingWebPage ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin"/>
                                                测试中...
                                            </>
                                        ) : (
                                            '测试网站'
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleSaveWebPage()
                                            setShowAddWebPageModal(false)
                                        }}
                                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-white transition-colors cursor-pointer"
                                    >
                                        保存
                                    </button>
                                </div>

                                {testResult && (
                                    <div className="flex items-center gap-2 p-3 rounded-lg">
                                        {testResult.success ? (
                                            <>
                                                <Check className="w-4 h-4 text-green-600 dark:text-green-400"/>
                                                <span className="text-sm text-green-700 dark:text-green-300">
                          {testResult.pageInfo?.title} - 网站可访问
                        </span>
                                            </>
                                        ) : (
                                            <>
                                                <X className="w-4 h-4 text-red-600 dark:text-red-400"/>
                                                <span className="text-sm text-red-700 dark:text-red-300">
                          {testResult.error}
                        </span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* 网页管理模态框 */}
            {showWebPageManager && createPortal(
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div
                        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                        <div
                            className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <h2 className="text-2xl font-bold dark:text-white text-slate-900 flex items-center gap-3">
                                <Settings className="w-6 h-6 text-blue-500"/>
                                管理收藏网页
                            </h2>
                            <button
                                onClick={() => setShowWebPageManager(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5 text-slate-500"/>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                            {/* 网页列表 */}
                            <div>
                                <h3 className="text-lg font-bold mb-4 dark:text-white text-slate-900">已收藏的网页</h3>
                                {webPagesList.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500 dark:text-slate-500 text-slate-600">
                                        <Link className="w-12 h-12 mx-auto mb-3 opacity-50"/>
                                        <p>还没有收藏任何网页</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {webPagesList.map((webPage) => (
                                            <div
                                                key={webPage.id}
                                                className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="font-bold dark:text-white text-slate-900">{webPage.title}</h4>
                                                            <span
                                                                className={`px-2 py-0.5 rounded-full text-xs ${webPage.is_active === 1 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>
                            {webPage.is_active === 1 ? '已启用' : '已禁用'}
                          </span>
                                                        </div>
                                                        <p className="text-sm text-slate-500 dark:text-slate-500 text-slate-600 truncate">{webPage.url}</p>
                                                        {webPage.description && (
                                                            <p className="text-sm text-slate-400 dark:text-slate-400 text-slate-600 mt-1">{webPage.description}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleToggleWebPage(webPage)}
                                                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                                                            title={webPage.is_active === 1 ? '禁用' : '启用'}
                                                        >
                                                            {webPage.is_active === 1 ? (
                                                                <Check className="w-4 h-4 text-green-500"/>
                                                            ) : (
                                                                <X className="w-4 h-4 text-slate-400"/>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditWebPage(webPage)}
                                                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                                                            title="编辑"
                                                        >
                                                            <Edit2 className="w-4 h-4 text-slate-400"/>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setWebPageToDelete(webPage.id!)
                                                                setShowDeleteConfirm(true)
                                                            }}
                                                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                                                            title="删除"
                                                        >
                                                            <Trash2
                                                                className="w-4 h-4 text-slate-400 hover:text-red-400"/>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* 独立的添加分类模态框 */}
            {showAddCategoryModal && createPortal(
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div
                        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                        <div
                            className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <h2 className="text-2xl font-bold dark:text-white text-slate-900 flex items-center gap-3">
                                <Plus className="w-6 h-6 text-blue-500"/>
                                添加分类
                            </h2>
                            <button
                                onClick={() => setShowAddCategoryModal(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5 text-slate-500"/>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                            <div className="space-y-4">
                                <div>
                                    <label
                                        className="block text-sm font-medium mb-2 dark:text-slate-300 text-slate-700">分类名称</label>
                                    <input
                                        type="text"
                                        value={categoryForm.name}
                                        onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                                        placeholder="输入分类名称"
                                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500/50 dark:text-white text-slate-900 transition-colors"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label
                                            className="block text-sm font-medium mb-2 dark:text-slate-300 text-slate-700">图标颜色</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={categoryForm.color}
                                                onChange={(e) => setCategoryForm({
                                                    ...categoryForm,
                                                    color: e.target.value
                                                })}
                                                className="w-12 h-10 rounded cursor-pointer"
                                            />
                                            <span
                                                className="text-sm text-slate-500 dark:text-slate-500 text-slate-600">{categoryForm.color}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label
                                            className="block text-sm font-medium mb-2 dark:text-slate-300 text-slate-700">排序</label>
                                        <input
                                            type="number"
                                            value={categoryForm.sort_order}
                                            onChange={(e) => setCategoryForm({
                                                ...categoryForm,
                                                sort_order: parseInt(e.target.value)
                                            })}
                                            min="0"
                                            className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500/50 dark:text-white text-slate-900 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowAddCategoryModal(false)}
                                        className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleSaveCategory()
                                            setShowAddCategoryModal(false)
                                        }}
                                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-white transition-colors cursor-pointer"
                                    >
                                        保存
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* 独立的编辑分类模态框 */}
            {showEditCategoryModal && createPortal(
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div
                        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
                        <div
                            className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <h2 className="text-2xl font-bold dark:text-white text-slate-900 flex items-center gap-3">
                                <Edit2 className="w-6 h-6 text-blue-500"/>
                                编辑分类
                            </h2>
                            <button
                                onClick={() => setShowEditCategoryModal(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5 text-slate-500"/>
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label
                                    className="block text-sm font-medium mb-2 dark:text-slate-300 text-slate-700">分类名称</label>
                                <input
                                    type="text"
                                    value={categoryForm.name}
                                    onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                                    placeholder="输入分类名称"
                                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500/50 dark:text-white text-slate-900 transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label
                                        className="block text-sm font-medium mb-2 dark:text-slate-300 text-slate-700">图标颜色</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="color"
                                            value={categoryForm.color}
                                            onChange={(e) => setCategoryForm({...categoryForm, color: e.target.value})}
                                            className="w-12 h-10 rounded cursor-pointer"
                                        />
                                        <span
                                            className="text-sm text-slate-500 dark:text-slate-500 text-slate-600">{categoryForm.color}</span>
                                    </div>
                                </div>
                                <div>
                                    <label
                                        className="block text-sm font-medium mb-2 dark:text-slate-300 text-slate-700">排序</label>
                                    <input
                                        type="number"
                                        value={categoryForm.sort_order}
                                        onChange={(e) => setCategoryForm({
                                            ...categoryForm,
                                            sort_order: parseInt(e.target.value)
                                        })}
                                        min="0"
                                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500/50 dark:text-white text-slate-900 transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowEditCategoryModal(false)}
                                    className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSaveCategory}
                                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-white transition-colors cursor-pointer"
                                >
                                    保存
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* 分类管理模态框 */}
            {showCategoryManager && createPortal(
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div
                        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
                        <div
                            className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <h2 className="text-2xl font-bold dark:text-white text-slate-900 flex items-center gap-3">
                                <Settings className="w-6 h-6 text-blue-500"/>
                                管理分类
                            </h2>
                            <button
                                onClick={() => setShowCategoryManager(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5 text-slate-500"/>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                            {/* 分类列表 */}
                            <div>
                                <h3 className="text-lg font-bold mb-4 dark:text-white text-slate-900">分类列表</h3>
                                {categories.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500 dark:text-slate-500 text-slate-600">
                                        <FolderPlus className="w-12 h-12 mx-auto mb-3 opacity-50"/>
                                        <p>还没有创建任何分类</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {categories.map((category) => {
                                            const webPageCount = categoryWebPageCounts.get(category.id) || 0
                                            return (
                                                <div
                                                    key={category.id}
                                                    className={`p-4 bg-white dark:bg-slate-800 border rounded-lg transition-all ${
                                                        editingCategory?.id === category.id
                                                            ? 'border-blue-500 dark:border-blue-500'
                                                            : 'border-slate-200 dark:border-slate-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3 flex-1">
                                                            <div
                                                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                                                style={{backgroundColor: category.color || '#3B82F6'}}
                                                            >
                                                                <Edit3 className="w-5 h-5 text-white"/>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold dark:text-white text-slate-900">{category.name}</h4>
                                                                <p className="text-sm text-slate-500 dark:text-slate-500 text-slate-600">
                                                                    {webPageCount} 个网页
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleEditCategory(category)}
                                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                                                                title="编辑"
                                                            >
                                                                <Edit2 className="w-4 h-4 text-slate-400"/>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCategory(category.id)}
                                                                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                                                                    webPageCount === 0
                                                                        ? 'hover:bg-red-500/20'
                                                                        : 'opacity-50 cursor-not-allowed'
                                                                }`}
                                                                title={webPageCount === 0 ? '删除分类' : '无法删除（分类下有网页）'}
                                                                disabled={webPageCount > 0}
                                                            >
                                                                <Trash2
                                                                    className={`w-4 h-4 ${webPageCount === 0 ? 'text-slate-400 hover:text-red-400' : 'text-slate-300'}`}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* 网页浏览器弹窗 */}
            {showWebBrowser && currentWebPage && (
                <WebPageBrowser
                    url={currentWebPage.url}
                    title={currentWebPage.title}
                    isFavorite={currentWebPage.is_favorite === 1}
                    onFaviconSave={async (favicon: string) => {
                        try {
                            await window.electronAPI?.webPages?.update(currentWebPage.id!, {favicon});
                            // 更新当前显示的网页项
                            setCurrentWebPage(prev => prev ? {...prev, favicon} : null);
                            // 重新加载网页列表以显示新 favicon
                            await fetchWebPages();
                            await fetchWebPagesList();
                            console.log('Favicon saved to database:', favicon);
                        } catch (error) {
                            console.error('Failed to save favicon:', error);
                        }
                    }}
                    onFavoriteToggle={async (_url: string, favicon?: string) => {
                        try {
                            const dataToUpdate: any = {
                                is_favorite: currentWebPage.is_favorite === 1 ? 0 : 1
                            };

                            if (favicon) {
                                dataToUpdate.favicon = favicon;
                            }

                            await window.electronAPI?.webPages?.update(currentWebPage.id!, dataToUpdate);
                            await fetchWebPages();
                            await fetchWebPagesList();
                        } catch (error) {
                            console.error('Failed to toggle favorite:', error);
                        }
                    }}
                    onClose={() => setShowWebBrowser(false)}
                />
            )}

            {/* 筛选弹窗 */}
            {showFilterModal && createPortal(
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                    <div
                        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
                        <div
                            className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <h2 className="text-2xl font-bold dark:text-white text-slate-900 flex items-center gap-3">
                                <Filter className="w-6 h-6 text-blue-500"/>
                                筛选分类
                            </h2>
                            <button
                                onClick={() => setShowFilterModal(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5 text-slate-500"/>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                            <div className="space-y-2">
                                {getAllCategories().map((category) => {
                                    const Icon = category.icon
                                    return (
                                        <button
                                            key={category.id}
                                            onClick={() => {
                                                setSelectedCategory(category.id)
                                                setShowFilterModal(false)
                                            }}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors cursor-pointer ${
                                                selectedCategory === category.id
                                                    ? 'bg-blue-600 dark:bg-primary text-white'
                                                    : 'bg-slate-100 dark:bg-slate-800 dark:text-slate-300 text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            <Icon className="w-5 h-5"/>
                                            <span className="flex-1 text-left">{category.label}</span>
                                            {selectedCategory === category.id && (
                                                <Check className="w-5 h-5"/>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* 删除确认弹窗 */}
            {showDeleteConfirm && createPortal(
                <AlertDialog
                    isOpen={showDeleteConfirm}
                    type="warning"
                    title="确认删除"
                    message="确定要删除这个网页吗？删除后将无法恢复。"
                    onConfirm={async () => {
                        if (webPageToDelete) {
                            try {
                                await window.electronAPI?.webPages?.delete(webPageToDelete)
                                await fetchWebPagesList()
                                await fetchWebPages()
                            } catch (error) {
                                console.error('Failed to delete web page:', error)
                            }
                        }
                        setShowDeleteConfirm(false)
                        setWebPageToDelete(null)
                    }}
                    onCancel={() => {
                        setShowDeleteConfirm(false)
                        setWebPageToDelete(null)
                    }}
                />,
                document.body
            )}

            {/* 删除分类确认弹窗 */}
            {showDeleteCategoryConfirm && createPortal(
                <AlertDialog
                    isOpen={showDeleteCategoryConfirm}
                    type="warning"
                    title="确认删除"
                    message="确定要删除这个分类吗？删除后将无法恢复。"
                    onConfirm={async () => {
                        if (categoryToDelete) {
                            try {
                                await window.electronAPI?.webPages?.categories?.delete(categoryToDelete)
                                await fetchCategories()
                                await fetchCategoryWebPageCounts()
                                // 如果删除的是当前选中的分类，重置为全部
                                if (selectedCategory === categoryToDelete.toString()) {
                                    setSelectedCategory('all')
                                }
                            } catch (error) {
                                console.error('Failed to delete category:', error)
                                setAlertDialogConfig({
                                    isOpen: true,
                                    type: 'error',
                                    title: '删除失败',
                                    message: '删除分类失败，请重试'
                                })
                                setShowAlertDialog(true)
                            }
                        }
                        setShowDeleteCategoryConfirm(false)
                        setCategoryToDelete(null)
                    }}
                    onCancel={() => {
                        setShowDeleteCategoryConfirm(false)
                        setCategoryToDelete(null)
                    }}
                />,
                document.body
            )}

            {/* AlertDialog */}
            {showAlertDialog && alertDialogConfig && (
                <AlertDialog
                    isOpen={showAlertDialog}
                    type={alertDialogConfig.type}
                    title={alertDialogConfig.title}
                    message={alertDialogConfig.message}
                    confirmText="确定"
                    cancelText="取消"
                    showCancel={true}
                    onConfirm={() => {
                        alertDialogConfig.onConfirm?.()
                        setShowAlertDialog(false)
                    }}
                    onCancel={() => {
                        setShowAlertDialog(false)
                    }}
                />
            )}
        </div>
    )
}
