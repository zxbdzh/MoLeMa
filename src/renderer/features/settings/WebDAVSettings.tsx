import { useState, useEffect, useCallback } from 'react';
import { Server, Lock, User, Check, X, RefreshCw, FileText, Database, Music, Clock, Save, Download, Activity } from 'lucide-react';
import { WebDAVConfig, SyncLog, SyncStatus } from '@shared/types/electron';

const WebDAVSettings = () => {
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
    isSyncing: false,
    lastSyncTime: 0
  });

  const [uiStatus, setUiStatus] = useState<{
    status: 'idle' | 'connecting' | 'success' | 'error';
    message: string;
  }>({
    status: 'idle',
    message: '准备就绪',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  useEffect(() => {
    loadConfig();

    const unsubscribeStatus = window.electronAPI?.webdav?.onStatusChange?.((status) => {
      setSyncStatus(prev => ({ ...prev, ...status }));
    });

    const unsubscribeLogUpdate = window.electronAPI?.webdav?.onLogUpdate?.((logs) => {
        // Handle both old and new log formats
        if (Array.isArray(logs)) {
           const formattedLogs = logs.map(l => typeof l === 'string' ? { timestamp: Date.now(), level: 'info' as const, message: l } : l);
           setSyncLogs(formattedLogs);
        }
    });

    // Listen for the new structured log event
    const unsubscribeNewLog = (window.electronAPI as any).webdav?.onLogUpdate?.((log: any) => {
       if (log && typeof log === 'object' && 'message' in log) {
          setSyncLogs(prev => [log, ...prev].slice(0, 100));
       } else if (Array.isArray(log)) {
          setSyncLogs(log);
       }
    });

    return () => {
      unsubscribeStatus?.();
      unsubscribeLogUpdate?.();
      unsubscribeNewLog?.();
    };
  }, []);

  const loadConfig = async () => {
    try {
      const result = await window.electronAPI?.webdav?.getConfig?.();
      if (result?.success && result.config) {
        setConfig(result.config);
        setSyncStatus(prev => ({ ...prev, lastSyncTime: result.config.lastSyncTime }));
      }
    } catch (error) {
      console.error('Failed to load WebDAV config:', error);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setUiStatus({ status: 'connecting', message: '正在保存配置...' });
      const result = await window.electronAPI?.webdav?.setConfig?.(config);
      if (result?.success) {
        setUiStatus({ status: 'success', message: '配置已保存' });
        setTimeout(() => setUiStatus({ status: 'idle', message: '准备就绪' }), 3000);
      } else {
        setUiStatus({ status: 'error', message: '配置保存失败' });
      }
    } catch (error) {
      setUiStatus({ status: 'error', message: '配置保存失败' });
    }
  };

  const handleTestConnection = async () => {
    setUiStatus({ status: 'connecting', message: '正在测试连接...' });
    try {
      const result = await window.electronAPI?.webdav?.testConnection?.();
      if (result?.success) {
        setUiStatus({ status: 'success', message: '连接成功！' });
        await handleSaveConfig();
      } else {
        setUiStatus({ status: 'error', message: '连接失败' });
      }
    } catch (error) {
      setUiStatus({ status: 'error', message: '连接失败' });
    }
  };

  const handleSyncAll = async () => {
    try {
      await window.electronAPI?.webdav?.syncAll?.();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '从未';
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold font-heading mb-2 dark:text-white text-slate-900">
          WebDAV 同步重构版
        </h2>
        <p className="text-slate-500 dark:text-slate-400">支持双向同步与实时监控的新一代同步引擎</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 左侧：配置 */}
        <div className="space-y-6">
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold mb-4 dark:text-white text-slate-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-500" />
              服务器设置
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">URL</label>
                <input
                  type="url"
                  value={config.serverUrl}
                  onChange={(e) => setConfig({ ...config, serverUrl: e.target.value })}
                  placeholder="https://dav.example.com/"
                  className="mt-1 w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">用户名</label>
                  <input
                    type="text"
                    value={config.username}
                    onChange={(e) => setConfig({ ...config, username: e.target.value })}
                    className="mt-1 w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">密码</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={config.password}
                      onChange={(e) => setConfig({ ...config, password: e.target.value })}
                      className="mt-1 w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm pr-10"
                    />
                    <button 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPassword ? <X className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleTestConnection}
              disabled={uiStatus.status === 'connecting'}
              className="mt-6 w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              {uiStatus.status === 'connecting' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
              测试并保存
            </button>
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold mb-4 dark:text-white text-slate-900">同步内容</h3>
            <div className="space-y-3">
              {[
                { key: 'enableSyncConfig', label: '同步配置', icon: <FileText className="w-4 h-4 text-blue-400" /> },
                { key: 'enableSyncDatabase', label: '同步数据库', icon: <Database className="w-4 h-4 text-green-400" /> },
                { key: 'enableSyncRecordings', label: '同步录音', icon: <Music className="w-4 h-4 text-purple-400" /> }
              ].map(item => (
                <label key={item.key} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl cursor-pointer">
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={(config as any)[item.key]}
                    onChange={(e) => setConfig({ ...config, [item.key]: e.target.checked })}
                    className="w-5 h-5 rounded-lg border-slate-300 text-blue-500 focus:ring-blue-500"
                  />
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* 右侧：状态与模式 */}
        <div className="space-y-6">
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold mb-4 dark:text-white text-slate-900">同步模式</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'manual', label: '手动同步', desc: '按需手动触发' },
                { id: 'scheduled', label: '定时同步', desc: '周期性自动运行' },
                { id: 'realtime', label: '实时监控', desc: '检测本地改动并上传' }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setConfig({ ...config, syncMode: mode.id as any })}
                  className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all ${
                    config.syncMode === mode.id 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-slate-100 dark:border-slate-700 hover:border-slate-200'
                  }`}
                >
                  <span className="text-sm font-bold">{mode.label}</span>
                  <span className="text-xs text-slate-500">{mode.desc}</span>
                </button>
              ))}
            </div>

            {config.syncMode === 'scheduled' && (
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <label className="text-xs font-bold text-slate-500 uppercase">同步间隔 (分钟)</label>
                <input
                  type="number"
                  value={config.scheduledSyncInterval}
                  onChange={(e) => setConfig({ ...config, scheduledSyncInterval: parseInt(e.target.value) })}
                  className="mt-1 w-full bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none"
                />
              </div>
            )}
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold mb-4 dark:text-white text-slate-900">同步状态</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">最近同步</span>
                <span className="text-sm font-medium">{formatDate(syncStatus.lastSyncTime || config.lastSyncTime)}</span>
              </div>
              
              <button
                onClick={handleSyncAll}
                disabled={syncStatus.isSyncing}
                className="w-full py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
              >
                {syncStatus.isSyncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                {syncStatus.isSyncing ? '同步中...' : '立即同步全部'}
              </button>

              {uiStatus.message && (
                <p className={`text-center text-xs font-medium ${uiStatus.status === 'error' ? 'text-red-500' : 'text-blue-500'}`}>
                  {uiStatus.message}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* 底部：控制台日志 */}
      <section className="bg-slate-900 rounded-2xl p-6 shadow-inner">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4" />
            同步控制台
          </h3>
          <button 
            onClick={() => setSyncLogs([])}
            className="text-xs text-slate-500 hover:text-white"
          >
            清空日志
          </button>
        </div>
        <div className="h-48 overflow-y-auto font-mono text-xs space-y-1">
          {syncLogs.length === 0 ? (
            <p className="text-slate-600 italic">等待任务开始...</p>
          ) : (
            syncLogs.map((log, i) => (
              <div key={i} className={`flex gap-3 ${
                log.level === 'error' ? 'text-red-400' : 
                log.level === 'warn' ? 'text-yellow-400' : 'text-slate-300'
              }`}>
                <span className="text-slate-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default WebDAVSettings;