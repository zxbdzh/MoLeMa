import { useState, useEffect } from 'react'
import { Keyboard, Save, RotateCcw, FolderOpen, Info, Check, X, RefreshCw, RotateCcw as UpdateIcon } from 'lucide-react'
import { Card3D } from './3DCard'

interface ShortcutConfig {
  toggleWindow: string
}

export default function Settings() {
  const [shortcuts, setShortcuts] = useState<ShortcutConfig>({
    toggleWindow: 'CommandOrControl+Alt+M'
  })
  const [isRecording, setIsRecording] = useState<keyof ShortcutConfig | null>(null)
  const [saved, setSaved] = useState(false)
  const [dataPath, setDataPath] = useState<string>('')
  const [pathSaved, setPathSaved] = useState(false)
  const [pathError, setPathError] = useState<string | null>(null)
  const [migrationResult, setMigrationResult] = useState<any>(null)

  // 代理设置
  const [proxyUrl, setProxyUrl] = useState('')
  const [proxyEnabled, setProxyEnabled] = useState(false)
  const [proxyTesting, setProxyTesting] = useState(false)
  const [proxyTestResult, setProxyTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)

  // 自动更新设置
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);
  const [autoUpdateSaved, setAutoUpdateSaved] = useState(false);

  // 应用更新
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded'>('idle')
  const [updateInfo, setUpdateInfo] = useState<any>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)

  // 开机自启设置
  const [autoLaunchEnabled, setAutoLaunchEnabled] = useState(false);
  const [autoLaunchSaved, setAutoLaunchSaved] = useState(false);

  useEffect(() => {
    window.electronAPI?.shortcuts?.get().then((config) => {
      if (config) {
        setShortcuts(config)
      }
    })

    window.electronAPI?.database?.getPath().then((result) => {
      if (result?.success) {
        setDataPath(result.path || '')
      }
    })

    // 获取自动更新设置状态
    window.electronAPI?.autoUpdate?.getEnabled().then((result) => {
      if (result?.success) {
        setAutoUpdateEnabled(result.enabled);
      }
    });

    // 获取开机自启设置状态
    window.electronAPI?.autoLaunch?.getEnabled().then((result) => {
      if (result?.success) {
        setAutoLaunchEnabled(result.enabled);
      }
    });
  }, [])

  // 监听更新事件
  useEffect(() => {
    const unsubscribeAvailable = window.electronAPI?.updater?.onAvailable?.((info) => {
      setUpdateInfo(info)
      setUpdateStatus('available')
    })

    const unsubscribeNotAvailable = window.electronAPI?.updater?.onNotAvailable?.(() => {
      setUpdateStatus('not-available')
      setUpdateInfo(null)
    })

    const unsubscribeDownloaded = window.electronAPI?.updater?.onDownloaded?.(() => {
      setUpdateStatus('downloaded')
    })

    const unsubscribeProgress = window.electronAPI?.updater?.onProgress?.((progress) => {
      setDownloadProgress(progress.percent || 0)
    })

    return () => {
      unsubscribeAvailable?.()
      unsubscribeNotAvailable?.()
      unsubscribeDownloaded?.()
      unsubscribeProgress?.()
    }
  }, [])

  const handleRecordShortcut = (key: keyof ShortcutConfig) => {
    setIsRecording(key)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isRecording) return

    e.preventDefault()
    e.stopPropagation()

    const modifiers: string[] = []
    if (e.ctrlKey || e.metaKey) modifiers.push('CommandOrControl')
    if (e.altKey) modifiers.push('Alt')
    if (e.shiftKey) modifiers.push('Shift')

    const key = e.key.toUpperCase()
    if (key === 'CONTROL' || key === 'ALT' || key === 'SHIFT' || key === 'META') {
      return
    }

    const shortcut = [...modifiers, key].join('+')
    setShortcuts((prev) => ({ ...prev, [isRecording]: shortcut }))
    setIsRecording(null)
    setSaved(false)
  }

  const handleReset = () => {
    setShortcuts({
      toggleWindow: 'CommandOrControl+Alt+M'
    })
    setSaved(false)
  }

  const handleSave = async () => {
    try {
      await window.electronAPI?.shortcuts?.set(shortcuts)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('保存快捷键失败:', error)
    }
  }

  const handleSelectDataPath = async () => {
    try {
      const result = await window.electronAPI?.dialog?.selectDirectory()
      if (result?.success && result.path) {
        const setResult = await window.electronAPI?.database?.setPath(result.path)
        if (setResult?.success) {
          setDataPath(result.path)
          setPathSaved(true)
          setPathError(null)
          setMigrationResult(setResult.migratedRecords)
          setTimeout(() => setPathSaved(false), 5000)
        } else {
          setPathError('设置数据库路径失败')
          setMigrationResult(null)
        }
      }
    } catch (error) {
      console.error('选择数据库文件夹失败:', error)
      setPathError('选择数据库文件夹失败')
      setMigrationResult(null)
    }
  }

  const handleTestProxy = async () => {
    if (!proxyUrl.trim()) {
      setProxyTestResult({ success: false, error: '请输入代理地址' })
      return
    }

    setProxyTesting(true)
    setProxyTestResult(null)

    try {
      const result = await window.electronAPI?.proxy?.test?.(proxyUrl)
      setProxyTestResult(result)
    } catch (error) {
      setProxyTestResult({ success: false, error: '测试失败' })
    } finally {
      setProxyTesting(false)
    }
  }

  const handleSaveProxy = async () => {
    try {
      const url = proxyEnabled ? proxyUrl : null
      await window.electronAPI?.proxy?.set?.(url)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('保存代理设置失败:', error)
    }
  }

  const handleAutoUpdateChange = async () => {
    try {
      const newEnabled = !autoUpdateEnabled;
      setAutoUpdateEnabled(newEnabled);
      await window.electronAPI?.autoUpdate?.setEnabled?.(newEnabled);
      setAutoUpdateSaved(true);
      setTimeout(() => setAutoUpdateSaved(false), 2000);
    } catch (error) {
      console.error('保存自动更新设置失败:', error);
    }
  }

  // 应用更新函数
  const handleCheckForUpdates = async () => {
    try {
      setUpdateStatus('checking')
      setUpdateInfo(null)
      await window.electronAPI?.updater?.checkForUpdates()
    } catch (error) {
      console.error('检查更新失败:', error)
      setUpdateStatus('not-available')
      setUpdateInfo(null)
    }
  }

  const handleDownloadUpdate = async () => {
    try {
      setUpdateStatus('downloading')
      await window.electronAPI?.updater?.downloadUpdate()
    } catch (error) {
      console.error('下载更新失败:', error)
      setUpdateStatus('available')
    }
  }

  const handleInstallUpdate = () => {
    window.electronAPI?.updater?.quitAndInstall()
  }

  const handleAutoLaunchChange = async () => {
    try {
      const newEnabled = !autoLaunchEnabled;
      setAutoLaunchEnabled(newEnabled);
      const result = await window.electronAPI?.autoLaunch?.setEnabled?.(newEnabled);
      if (result?.success) {
        setAutoLaunchSaved(true);
        setTimeout(() => setAutoLaunchSaved(false), 2000);
      } else {
        console.error('保存开机自启设置失败:', result?.error);
        alert(result?.error || '保存开机自启设置失败');
        // 恢复状态
        setAutoLaunchEnabled(!newEnabled);
      }
    } catch (error) {
      console.error('保存开机自启设置失败:', error);
      alert('保存开机自启设置失败');
      // 恢复状态
      setAutoLaunchEnabled(!autoLaunchEnabled);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold font-heading mb-2 dark:text-white text-slate-900">
          快捷键设置
        </h2>
        <p className="text-slate-400 dark:text-slate-400 text-slate-600">自定义您的快捷键，提升使用体验</p>
      </div>

      <div className="space-y-4">
        <Card3D className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold mb-1 dark:text-white text-slate-900">显示/隐藏窗口</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">快速显示或隐藏主窗口</p>
            </div>
            <button
              onClick={() => handleRecordShortcut('toggleWindow')}
              onKeyDown={handleKeyDown}
              className={`px-6 py-3 rounded-xl font-mono font-medium transition-all cursor-pointer ${
                isRecording === 'toggleWindow'
                  ? 'bg-purple-500 text-white animate-pulse'
                  : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-purple-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4" />
                {isRecording === 'toggleWindow' ? '按下按键...' : shortcuts.toggleWindow}
              </div>
            </button>
          </div>
        </Card3D>

        <div className="flex gap-4">
          <button
            onClick={handleReset}
            className="flex-1 py-3 bg-white dark:bg-slate-800 backdrop-blur-md border border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-600 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            重置默认
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className={`flex-1 py-3 backdrop-blur-md border rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              saved ? 'cursor-not-allowed' : 'cursor-pointer'
            } ${
              saved
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-blue-600 hover:bg-blue-700 border-blue-600 dark:bg-primary/80 dark:hover:bg-primary dark:border-primary/50 text-white'
            }`}
          >
            <Save className="w-4 h-4" />
            {saved ? '已保存' : '保存设置'}
          </button>
        </div>

        {isRecording && (
          <div className="bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-500/30 rounded-xl p-4 text-center">
            <p className="text-purple-700 dark:text-purple-300">
              按下您想要的快捷键组合（Ctrl/Alt/Shift + 字母/数字）即可
            </p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="text-center mb-4">
          <h2 className="text-3xl font-bold font-heading mb-2 dark:text-white text-slate-900">
            数据库设置
          </h2>
          <p className="text-slate-400 dark:text-slate-400 text-slate-600">配置数据库存储位置</p>
        </div>

        <Card3D className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold mb-1 dark:text-white text-slate-900">当前数据库路径</h3>
              <p className="text-slate-400 dark:text-slate-400 text-slate-600 text-sm">SQLite 数据库文件，存储所有应用数据</p>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-4">
              <code className="text-sm text-slate-700 dark:text-slate-300 break-all">
                {dataPath || '加载中...'}
              </code>
            </div>

            <button
              onClick={handleSelectDataPath}
              className="w-full py-3 bg-white dark:bg-slate-800 backdrop-blur-md border border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-600 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              选择数据库存储文件夹
            </button>

            {pathSaved && migrationResult && (
              <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-500/30 rounded-xl p-4">
                <p className="text-green-700 dark:text-green-300 font-medium mb-2">
                  数据库已成功迁移到新位置
                </p>
                <p className="text-green-600 dark:text-green-400 text-sm mb-2">
                  请重启应用以使更改生效
                </p>
                <div className="text-sm text-green-600 dark:text-green-400">
                  <p>已迁移记录：</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>笔记: {migrationResult.notes} 条</li>
                    <li>待办事项: {migrationResult.todos} 条</li>
                    <li>新闻分类: {migrationResult.news_categories} 条</li>
                    <li>新闻源: {migrationResult.news_sources} 条</li>
                    <li>新闻条目: {migrationResult.news_items} 条</li>
                    <li>收藏: {migrationResult.favorites} 条</li>
                    <li>设置: {migrationResult.settings} 条</li>
                  </ul>
                </div>
              </div>
            )}

            {pathSaved && !migrationResult && (
              <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-500/30 rounded-xl p-4 text-center">
                <p className="text-green-700 dark:text-green-300">
                  数据库路径已成功更新
                </p>
              </div>
            )}

            {pathError && (
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-500/30 rounded-xl p-4">
                <p className="text-red-700 dark:text-red-300">
                  {pathError}
                </p>
              </div>
            )}

            <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">注意事项：</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>选择一个文件夹作为数据库存储位置</li>
                    <li>系统会在该文件夹中自动创建 moyu.db 数据库文件</li>
                    <li>更换位置后，现有数据会自动迁移到新位置</li>
                    <li>迁移完成后需要重启应用才能生效</li>
                    <li>建议定期备份数据库文件以防数据丢失</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card3D>
      </div>

      {/* 代理设置 */}
      <div className="space-y-4">
        <div className="text-center mb-4">
          <h2 className="text-3xl font-bold font-heading mb-2 dark:text-white text-slate-900">
            代理设置
          </h2>
          <p className="text-slate-400 dark:text-slate-400 text-slate-600">配置网络代理，用于访问 RSS 源</p>
        </div>

        <Card3D className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold mb-1 dark:text-white text-slate-900">HTTP/HTTPS 代理</h3>
              <p className="text-slate-400 dark:text-slate-400 text-slate-600 text-sm">用于访问需要代理的 RSS 源或网页</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="proxy-enabled"
                checked={proxyEnabled}
                onChange={(e) => setProxyEnabled(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="proxy-enabled" className="text-slate-700 dark:text-slate-300 cursor-pointer">
                启用代理
              </label>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={proxyUrl}
                onChange={(e) => setProxyUrl(e.target.value)}
                placeholder="http://127.0.0.1:7890"
                disabled={!proxyEnabled}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500/50 dark:text-white text-slate-900 placeholder-slate-400 dark:placeholder-slate-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              />
              <button
                onClick={handleTestProxy}
                disabled={!proxyEnabled || proxyTesting}
                className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-600 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {proxyTesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    测试中...
                  </>
                ) : (
                  '测试'
                )}
              </button>
            </div>

            {proxyTestResult && (
              <div className={`flex items-center gap-2 p-4 rounded-xl ${
                proxyTestResult.success
                  ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-500/30'
                  : 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-500/30'
              }`}>
                {proxyTestResult.success ? (
                  <>
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-green-700 dark:text-green-300">
                      {proxyTestResult.message}
                    </span>
                  </>
                ) : (
                  <>
                    <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <span className="text-red-700 dark:text-red-300">
                      {proxyTestResult.error}
                    </span>
                  </>
                )}
              </div>
            )}

            <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">注意事项：</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>代理格式：http://host:port 或 https://host:port</li>
                    <li>如果 RSS 源或网页无法访问，可以尝试启用代理</li>
                    <li>建议使用可靠的代理服务以确保稳定性</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card3D>

        <button
          onClick={handleSaveProxy}
          disabled={saved}
          className={`w-full py-3 backdrop-blur-md border rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
            saved ? 'cursor-not-allowed' : 'cursor-pointer'
          } ${
            saved
              ? 'bg-green-500 text-white border-green-500'
              : 'bg-blue-600 hover:bg-blue-700 border-blue-600 dark:bg-primary/80 dark:hover:bg-primary dark:border-primary/50 text-white'
          }`}
        >
          <Save className="w-4 h-4" />
          {saved ? '已保存' : '保存代理设置'}
        </button>
      </div>

      {/* 自动更新设置 */}
      <div className="space-y-4">
        <div className="text-center mb-4">
          <h2 className="text-3xl font-bold font-heading mb-2 dark:text-white text-slate-900">
            自动更新设置
          </h2>
          <p className="text-slate-400 dark:text-slate-400 text-slate-600">配置应用自动更新行为</p>
        </div>

        <Card3D className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold mb-1 dark:text-white text-slate-900">自动更新</h3>
              <p className="text-slate-400 dark:text-slate-400 text-slate-600 text-sm">允许应用自动检查并下载更新</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="auto-update-enabled"
                  checked={autoUpdateEnabled}
                  onChange={handleAutoUpdateChange}
                  className="w-5 h-5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="auto-update-enabled" className="text-slate-700 dark:text-slate-300 cursor-pointer">
                  启用自动更新
                </label>
              </div>

              {autoUpdateSaved && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                  <Check className="w-4 h-4" />
                  已保存
                </div>
              )}
            </div>

            <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">注意事项：</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>启用自动更新后，应用会在启动时自动检查新版本</li>
                    <li>发现新版本时，应用会自动下载并提示安装</li>
                    <li>禁用后，您需要手动检查并安装更新</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card3D>

        {/* 应用更新 */}
        <Card3D className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold mb-1 dark:text-white text-slate-900">应用更新</h3>
            <p className="text-slate-400 dark:text-slate-400 text-slate-600 text-sm">检查并安装应用更新</p>

            {/* 版本信息 */}
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm dark:text-slate-300 text-slate-700">当前版本</span>
                <span className="text-sm font-medium dark:text-white text-slate-900">v{window.electronAPI.versions.app}</span>
              </div>
              {updateInfo && (
                <div className="flex items-center justify-between">
                  <span className="text-sm dark:text-slate-300 text-slate-700">最新版本</span>
                  <span className="text-sm font-medium dark:text-white text-slate-900">v{updateInfo.version}</span>
                </div>
              )}
            </div>

            {/* 更新状态提示 */}
            {updateStatus === 'available' && (
              <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-500/20 rounded-lg p-4">
                <p className="text-sm dark:text-slate-300 text-slate-700">发现新版本 v{updateInfo?.version}</p>
              </div>
            )}

            {updateStatus === 'downloading' && (
              <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-500/20 rounded-lg p-4">
                <p className="text-sm dark:text-slate-300 text-slate-700 mb-2">下载更新中... {downloadProgress}%</p>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all" 
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {updateStatus === 'downloaded' && (
              <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-500/20 rounded-lg p-4">
                <p className="text-sm dark:text-slate-300 text-slate-700">更新已下载，点击下方按钮安装</p>
              </div>
            )}

            {updateStatus === 'not-available' && (
              <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-500/20 rounded-lg p-4">
                <p className="text-sm dark:text-slate-300 text-slate-700">当前已是最新版本</p>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={handleCheckForUpdates}
                disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg font-medium text-white transition-colors cursor-pointer"
              >
                {updateStatus === 'checking' ? '检查中...' : '检查更新'}
              </button>
              
              {updateStatus === 'available' && (
                <button
                  onClick={handleDownloadUpdate}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium text-white transition-colors cursor-pointer"
                >
                  下载更新
                </button>
              )}
              
              {updateStatus === 'downloaded' && (
                <button
                  onClick={handleInstallUpdate}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium text-white transition-colors cursor-pointer"
                >
                  安装更新
                </button>
              )}
            </div>
          </div>
        </Card3D>
      </div>

      {/* 开机自启设置 */}
      <div className="space-y-4">
        <div className="text-center mb-4">
          <h2 className="text-3xl font-bold font-heading mb-2 dark:text-white text-slate-900">
            开机自启设置
          </h2>
          <p className="text-slate-400 dark:text-slate-400 text-slate-600">配置应用开机自动启动</p>
        </div>

        <Card3D className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold mb-1 dark:text-white text-slate-900">开机自启</h3>
              <p className="text-slate-400 dark:text-slate-400 text-slate-600 text-sm">允许应用在系统启动时自动运行</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="auto-launch-enabled"
                  checked={autoLaunchEnabled}
                  onChange={handleAutoLaunchChange}
                  className="w-5 h-5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="auto-launch-enabled" className="text-slate-700 dark:text-slate-300 cursor-pointer">
                  启用开机自启
                </label>
              </div>

              {autoLaunchSaved && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                  <Check className="w-4 h-4" />
                  已保存
                </div>
              )}
            </div>

            <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">注意事项：</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>启用后，应用会在系统启动时自动运行</li>
                    <li>此功能仅在打包后的应用中可用</li>
                    <li>您可以在系统设置中管理开机自启应用</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card3D>
      </div>
    </div>
  )
}
