import { useState, useEffect, useCallback, useRef } from 'react';
import { Server, Lock, User, Check, X, RefreshCw, FileText, Database, Music, Clock, Save, Download } from 'lucide-react';

interface WebDAVConfig {
  serverUrl: string;
  username: string;
  password: string;
  remoteConfigPath: string;
  remoteRecordingPath: string;
  enableSyncConfig: boolean;
  enableSyncDatabase: boolean;
  enableSyncRecordings: boolean;
  syncMode: 'manual' | 'scheduled';
  enableScheduledSync: boolean;
  scheduledSyncInterval: number;
  scheduledSyncType: 'all' | 'config' | 'database' | 'recordings';
  debounceTime: number;
  lastSyncTime: number;
  nextSyncTime: number;
}

interface SyncStatus {
  status: 'idle' | 'connecting' | 'syncing' | 'success' | 'error';
  message: string;
}

const WebDAVSettings = () => {
  const migratePath = (path: string | undefined) => {
    if (path?.startsWith('/moyu-')) {
      return path.replace('/moyu-', '/MoLeMa-')
    }
    return path
  }
  const [config, setConfig] = useState<WebDAVConfig>({
    serverUrl: '',
    username: '',
    password: '',
    remoteConfigPath: '/MoLeMa-config/',
    remoteRecordingPath: '/MoLeMa-recordings/',
    enableSyncConfig: true,
    enableSyncDatabase: true,
    enableSyncRecordings: true,
    syncMode: 'manual',
    enableScheduledSync: false,
    scheduledSyncInterval: 30,
    scheduledSyncType: 'all',
    debounceTime: 5,
    lastSyncTime: 0,
    nextSyncTime: 0,
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: 'idle',
    message: '准备就绪',
  });

  const [downloadStatus, setDownloadStatus] = useState<SyncStatus>({
    status: 'idle',
    message: '准备就绪',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [scheduledSyncStatus, setScheduledSyncStatus] = useState<{
    isRunning: boolean;
    nextSyncTime?: number;
    error?: string;
  }>({
    isRunning: false,
    nextSyncTime: undefined,
    error: undefined
  });

  useEffect(() => {
    loadConfig();
    loadLogs();

    const unsubscribeStatus = window.electronAPI?.webdav?.onStatusChange?.((status) => {
      setSyncStatus(status);
    });

    const unsubscribeScheduledStatus = window.electronAPI?.webdav?.onScheduledSyncStatusChange?.((status) => {
      setScheduledSyncStatus(status);
    });

    const unsubscribeLogUpdate = window.electronAPI?.webdav?.onLogUpdate?.((logs) => {
      console.log('WebDAV: 收到日志更新事件，日志数量:', logs.length);
      setSyncLogs(logs);
    });

    return () => {
      unsubscribeStatus?.();
      unsubscribeScheduledStatus?.();
      unsubscribeLogUpdate?.();
    };
  }, []);

  const loadConfig = async () => {
    try {
      const result = await window.electronAPI?.webdav?.getConfig?.();
      if (result?.success && result.config) {
        let loadedConfig = result.config;

        loadedConfig = {
          serverUrl: loadedConfig.serverUrl || '',
          username: loadedConfig.username || '',
          password: loadedConfig.password || '',
          remoteConfigPath: loadedConfig.remoteConfigPath || '/MoLeMa-config/',
          remoteRecordingPath: loadedConfig.remoteRecordingPath || '/MoLeMa-recordings/',
          enableSyncConfig: loadedConfig.enableSyncConfig ?? true,
          enableSyncDatabase: loadedConfig.enableSyncDatabase ?? true,
          enableSyncRecordings: loadedConfig.enableSyncRecordings ?? true,
          syncMode: loadedConfig.syncMode || 'manual',
          enableScheduledSync: loadedConfig.enableScheduledSync ?? false,
          scheduledSyncInterval: loadedConfig.scheduledSyncInterval || 30,
          scheduledSyncType: loadedConfig.scheduledSyncType || 'all',
          debounceTime: loadedConfig.debounceTime || 5,
          lastSyncTime: loadedConfig.lastSyncTime || 0,
          nextSyncTime: loadedConfig.nextSyncTime || 0,
        };

        const migratedConfig = {
          ...loadedConfig,
          remoteConfigPath: migratePath(loadedConfig.remoteConfigPath) || '/MoLeMa-config/',
          remoteRecordingPath: migratePath(loadedConfig.remoteRecordingPath) || '/MoLeMa-recordings/',
        };

        const needsMigration = (
          loadedConfig.remoteConfigPath?.startsWith('/moyu-') ||
          loadedConfig.remoteRecordingPath?.startsWith('/moyu-')
        );

        if (needsMigration) {
          await window.electronAPI?.webdav?.setConfig?.(migratedConfig);
        }

        setConfig(migratedConfig);
      }
    } catch (error) {
      console.error('加载 WebDAV 配置失败:', error);
    }
  };

  const loadLogs = useCallback(async () => {
    try {
      console.log('WebDAV: 开始加载日志...');
      const result = await window.electronAPI?.webdav?.getSyncLogs?.();
      if (result?.success && result.logs) {
        console.log('WebDAV: 日志加载成功，数量:', result.logs.length);
        setSyncLogs(result.logs);
      } else {
        console.log('WebDAV: 日志加载失败或无日志');
      }
    } catch (error) {
      console.error('加载同步日志失败:', error);
    }
  }, []);

  const handleSaveConfig = async () => {
    try {
      setSyncStatus({ status: 'connecting', message: '正在保存配置...' });
      const result = await window.electronAPI?.webdav?.setConfig?.(config);
      if (result?.success) {
        setSyncStatus({ status: 'success', message: '配置已保存' });
      } else {
        setSyncStatus({ status: 'error', message: '配置保存失败' });
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      setSyncStatus({ status: 'error', message: '配置保存失败' });
    }
  };

  const handleTestConnection = async () => {
    setSyncStatus({ status: 'connecting', message: '正在保存配置...' });
    try {
      const saveResult = await window.electronAPI?.webdav?.setConfig?.(config);
      if (!saveResult?.success) {
        setSyncStatus({ status: 'error', message: '配置保存失败' });
        return;
      }

      setSyncStatus({ status: 'connecting', message: '正在测试连接...' });
      const testResult = await window.electronAPI?.webdav?.testConnection?.();
      if (testResult?.success) {
        setSyncStatus({ status: 'success', message: '连接成功！' });
      } else {
        setSyncStatus({ status: 'error', message: '连接失败' });
      }
    } catch (error) {
      console.error('测试连接失败:', error);
      setSyncStatus({ status: 'error', message: '连接失败' });
    }
  };

  const handleSyncAll = async () => {
    setSyncStatus({ status: 'syncing', message: '开始上传...' });
    try {
      const result = await window.electronAPI?.webdav?.syncAll?.();
      console.log('WebDAV: 上传结果', result);
      if (result?.success) {
        console.log('WebDAV: 上传成功，刷新配置');
        await loadConfig();
        setSyncStatus({ status: 'success', message: '上传完成' });
      } else {
        setSyncStatus({ status: 'error', message: '上传失败' });
      }
    } catch (error) {
      console.error('上传失败:', error);
      setSyncStatus({ status: 'error', message: '上传失败' });
    }
  };

  const handleDownloadAll = async () => {
    setDownloadStatus({ status: 'syncing', message: '正在检查冲突...' });
    try {
      const result = await window.electronAPI?.webdav?.checkConflicts?.();
      if (result?.success && result.conflicts) {
        if (result.conflicts.length > 0) {
          setDownloadStatus({ status: 'idle', message: '准备就绪' });

          // 调用全局冲突弹窗
          (window as any).showConflictDialog(
            result.conflicts,
            new Map(),
            async (actions: any[]) => {
              await executeDownload(actions);
            }
          );
        } else {
          await executeDownload([]);
        }
      } else {
        setDownloadStatus({ status: 'error', message: '检查冲突失败' });
      }
    } catch (error) {
      console.error('检查冲突失败:', error);
      setDownloadStatus({ status: 'error', message: '检查冲突失败' });
    }
  };

  const executeDownload = async (actions: any[]) => {
    setDownloadStatus({ status: 'syncing', message: '开始下载...' });
    try {
      const overwrite: string[] = actions.filter(a => a.action === 'overwrite').map(a => a.remotePath);
      const skip: string[] = actions.filter(a => a.action === 'skip').map(a => a.remotePath);
      const rename: string[] = actions.filter(a => a.action === 'rename').map(a => a.remotePath);

      const result = await window.electronAPI?.webdav?.downloadAll?.({ overwrite, skip, rename });
      if (result?.success) {
        setDownloadStatus({ status: 'success', message: '下载完成，请重启应用' });
      } else {
        setDownloadStatus({ status: 'error', message: '下载失败' });
      }
    } catch (error) {
      console.error('下载失败:', error);
      setDownloadStatus({ status: 'error', message: '下载失败' });
    }
  };

  const handleRefreshLogs = async () => {
    console.log('WebDAV: 手动刷新日志');
    await loadLogs();
  };

  // 防抖刷新日志
  const lastLoadedRecordingPathRef = useRef(config.remoteRecordingPath);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    const timer = setTimeout(async () => {
      // 首次加载时直接刷新
      if (isInitialLoadRef.current) {
        console.log('WebDAV: 首次加载，刷新日志');
        isInitialLoadRef.current = false;
        await loadLogs();
      }
      // 路径改变时刷新
      else if (lastLoadedRecordingPathRef.current !== config.remoteRecordingPath) {
        console.log('WebDAV: 路径变化，刷新日志', lastLoadedRecordingPathRef.current, '->', config.remoteRecordingPath);
        lastLoadedRecordingPathRef.current = config.remoteRecordingPath;
        await loadLogs();
      }
    }, 500); // 500ms 防抖

    return () => clearTimeout(timer);
  }, [config.remoteRecordingPath, loadLogs]);

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '从未';
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const formatNextSync = (timestamp: number) => {
    if (!timestamp) return '未知';
    const now = Date.now();
    const diff = timestamp - now;
    if (diff <= 0) return '即将执行';
    if (diff < 5000) return '5秒内';
    if (diff < 60000) return `${Math.ceil(diff / 1000)}秒后`;
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h2 className="text-3xl font-bold font-heading mb-2 dark:text-white text-slate-900">
          WebDAV 上传
        </h2>
        <p className="text-slate-400 dark:text-slate-400 text-slate-600">配置 WebDAV 云上传功能</p>
      </div>

      {/* 服务器配置 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-bold mb-4 dark:text-white text-slate-900 flex items-center gap-2">
          <Server className="w-5 h-5" />
          服务器配置
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">服务器地址</label>
            <input
              type="url"
              value={config.serverUrl}
              onChange={(e) => setConfig({ ...config, serverUrl: e.target.value })}
              placeholder="https://dav.example.com/dav/"
              className="mt-1 w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">用户名</label>
            <div className="mt-1 relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={config.username}
                onChange={(e) => setConfig({ ...config, username: e.target.value })}
                placeholder="请输入用户名"
                className="w-full pl-10 px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">密码</label>
            <div className="mt-1 relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={config.password}
                onChange={(e) => setConfig({ ...config, password: e.target.value })}
                placeholder="请输入密码"
                className="w-full pl-10 pr-10 px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPassword ? '隐藏' : '显示'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={handleTestConnection}
            disabled={syncStatus.status === 'connecting' || syncStatus.status === 'syncing'}
            className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncStatus.status === 'connecting' ? 'animate-spin' : ''}`} />
            {syncStatus.status === 'connecting' ? '保存并测试中...' : '测试连接并保存'}
          </button>
        </div>
      </div>

      {/* 上传目录设置 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-bold mb-4 dark:text-white text-slate-900">上传目录设置</h3>

        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableSyncConfig}
              onChange={(e) => setConfig({ ...config, enableSyncConfig: e.target.checked })}
              className="w-4 h-4"
            />
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">上传配置文件</span>
            </div>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableSyncDatabase}
              onChange={(e) => setConfig({ ...config, enableSyncDatabase: e.target.checked })}
              className="w-4 h-4"
            />
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-green-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">上传数据库 (moyu.db)</span>
            </div>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableSyncRecordings}
              onChange={(e) => setConfig({ ...config, enableSyncRecordings: e.target.checked })}
              className="w-4 h-4"
            />
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">上传录音文件</span>
            </div>
          </label>

          {config.enableSyncRecordings && (
            <div className="mt-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">远端录音目录</label>
              <input
                type="text"
                value={config.remoteRecordingPath}
                onChange={(e) => setConfig({ ...config, remoteRecordingPath: e.target.value })}
                className="mt-1 w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* 上传模式 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-bold mb-4 dark:text-white text-slate-900">上传模式</h3>

        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="syncMode"
              value="manual"
              checked={config.syncMode === 'manual'}
              onChange={() => setConfig({ ...config, syncMode: 'manual', enableScheduledSync: false })}
              className="w-4 h-4"
            />
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-500" />
              <div>
                <span className="text-sm text-slate-700 dark:text-slate-300">手动上传</span>
                <p className="text-xs text-slate-500">手动触发上传</p>
              </div>
            </div>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="syncMode"
              value="scheduled"
              checked={config.syncMode === 'scheduled'}
              onChange={() => setConfig({ ...config, syncMode: 'scheduled', enableScheduledSync: true })}
              className="w-4 h-4"
            />
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <div>
                <span className="text-sm text-slate-700 dark:text-slate-300">定时上传</span>
                <p className="text-xs text-slate-500">自动定期上传</p>
              </div>
            </div>
          </label>
        </div>

        {config.syncMode === 'scheduled' ? (
          <div className="mt-4">
            {import.meta.env.DEV && (
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="debugMode"
                  checked={config.scheduledSyncInterval === 1}
                  onChange={(e) => setConfig({ ...config, scheduledSyncInterval: e.target.checked ? 1 : 30 })}
                  className="w-4 h-4"
                />
                <label htmlFor="debugMode" className="text-sm text-red-500 font-medium">
                  调试模式 (5秒间隔)
                </label>
              </div>
            )}

            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              上传间隔: {config.scheduledSyncInterval === 1 ? '5 秒' : `${config.scheduledSyncInterval} 分钟`}
            </label>
            <input
              type="range"
              min={config.scheduledSyncInterval === 1 ? 1 : 5}
              max="120"
              step={config.scheduledSyncInterval === 1 ? 1 : 5}
              value={config.scheduledSyncInterval === 1 ? 1 : config.scheduledSyncInterval}
              disabled={config.scheduledSyncInterval === 1}
              onChange={(e) => setConfig({ ...config, scheduledSyncInterval: Number(e.target.value) })}
              className="w-full mt-2 disabled:opacity-50"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>5 分钟</span>
              <span>120 分钟</span>
            </div>
          </div>
        ) : (
          <div className="mt-4 text-sm text-slate-500">
            选择"手动上传"后点击下方按钮保存配置
          </div>
        )}
        <button
          onClick={handleSaveConfig}
          className="mt-3 w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {config.syncMode === 'scheduled' ? '保存并启动定时上传' : '保存配置'}
        </button>
      </div>

      {/* 上传操作 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-bold mb-4 dark:text-white text-slate-900">上传操作</h3>

        <div className="flex gap-2">
          <button
            onClick={handleSyncAll}
            disabled={syncStatus.status === 'syncing' || downloadStatus.status === 'syncing'}
            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncStatus.status === 'syncing' ? 'animate-spin' : ''}`} />
            {syncStatus.status === 'syncing' ? '上传中...' : '立即上传'}
          </button>
          <button
            onClick={handleRefreshLogs}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 rounded-lg transition-colors"
          >
            刷新日志
          </button>
        </div>

        {/* 上传状态 */}
        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
           <div className="flex items-center gap-2 mb-2">
            {syncStatus.status === 'success' && <Check className="w-4 h-4 text-green-500" />}
            {syncStatus.status === 'error' && <X className="w-4 h-4 text-red-500" />}
            {(syncStatus.status === 'syncing' || syncStatus.status === 'connecting') && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              状态: {syncStatus.message}
            </span>
          </div>

          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <div>最近上传: {formatDate(config.lastSyncTime)}</div>
            {scheduledSyncStatus.nextSyncTime && config.syncMode === 'scheduled' && (
              <div>下次上传: {formatNextSync(scheduledSyncStatus.nextSyncTime)}</div>
            )}
          </div>
        </div>
      </div>

      {/* 下载操作 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-bold mb-4 dark:text-white text-slate-900">下载操作</h3>
        <p className="text-sm text-slate-500 mb-4">从 WebDAV 服务器下载数据，用于数据恢复和多设备同步</p>

        <button
          onClick={handleDownloadAll}
          disabled={downloadStatus.status === 'syncing' || syncStatus.status === 'syncing'}
          className="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          {downloadStatus.status === 'syncing' ? '下载中...' : '从远程下载'}
        </button>

        {/* 下载状态 */}
        {downloadStatus.status !== 'idle' && (
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <div className="flex items-center gap-2">
              {downloadStatus.status === 'success' && <Check className="w-4 h-4 text-green-500" />}
              {downloadStatus.status === 'error' && <X className="w-4 h-4 text-red-500" />}
              {downloadStatus.status === 'syncing' && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                状态: {downloadStatus.message}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 上传日志 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-bold mb-4 dark:text-white text-slate-900">上传日志</h3>

        <div className="max-h-64 overflow-y-auto bg-slate-900 dark:bg-slate-900 rounded-lg p-4">
          {syncLogs.length === 0 ? (
            <p className="text-sm text-slate-400">暂无日志</p>
          ) : (
            syncLogs.slice(-20).reverse().map((log, index) => (
              <div key={index} className="text-xs font-mono text-green-400 mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default WebDAVSettings;
