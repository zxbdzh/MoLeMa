import { useState, useEffect, useRef } from 'react';
import { Server, Lock, User, Check, X, RefreshCw, FileText, Database, Music, Clock, Save, Download, Activity, CloudUpload, CloudDownload, Trash2 } from 'lucide-react';
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
    debounceTime: 5,
    lastSyncTime: 0,
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
    loadHistoryLogs();

    const unsubscribeStatus = window.electronAPI?.webdav?.onStatusChange?.((status: Partial<SyncStatus>) => {
      setSyncStatus(prev => ({ ...prev, ...status }));
      if (status.lastSyncTime) {
          setConfig(prev => ({ ...prev, lastSyncTime: status.lastSyncTime! }));
      }
    });

    const unsubscribeNewLog = (window.electronAPI as any).webdav?.onLogUpdate?.((log: any) => {
        if (Array.isArray(log)) {
            setSyncLogs([...log].reverse());
        } else {
            setSyncLogs(prev => [log, ...prev].slice(0, 100));
        }
    });

    return () => {
      unsubscribeStatus?.();
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

  const loadHistoryLogs = async () => {
      try {
          const result = await (window.electronAPI as any).webdav?.getSyncLogs?.();
          if (result?.success && result.logs) {
              setSyncLogs([...result.logs].reverse());
          }
      } catch (error) {
          console.error('Failed to load logs:', error);
      }
  };

  const handleSaveConfig = async (silent = false) => {
    try {
      if (!silent) setUiStatus({ status: 'connecting', message: '正在保存配置...' });
      const result = await window.electronAPI?.webdav?.setConfig?.(config);
      if (result?.success) {
        if (!silent) {
            setUiStatus({ status: 'success', message: '配置已保存' });
            setTimeout(() => setUiStatus({ status: 'idle', message: '准备就绪' }), 2000);
        }
        return true;
      }
      return false;
    } catch (error) {
      if (!silent) setUiStatus({ status: 'error', message: '配置保存失败' });
      return false;
    }
  };

  const handleTestAndSave = async () => {
    setUiStatus({ status: 'connecting', message: '正在保存并测试...' });
    try {
      const saveSuccess = await handleSaveConfig(true);
      if (!saveSuccess) {
          setUiStatus({ status: 'error', message: '配置保存失败' });
          return;
      }

      const testResult = await window.electronAPI?.webdav?.testConnection?.();
      if (testResult?.success) {
        setUiStatus({ status: 'success', message: '连接测试成功并已保存！' });
        setTimeout(() => setUiStatus({ status: 'idle', message: '准备就绪' }), 3000);
      } else {
        setUiStatus({ status: 'error', message: '连接测试失败，请检查配置' });
      }
    } catch (error) {
      setUiStatus({ status: 'error', message: '测试过程出错' });
    }
  };

  const handleSyncAll = async () => {
    if (syncStatus.isSyncing) return;
    try {
      await window.electronAPI?.webdav?.syncAll?.();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const handleForceSync = async (direction: 'upload' | 'download') => {
    if (syncStatus.isSyncing) return;
    try {
      await window.electronAPI?.webdav?.forceSync?.(direction);
    } catch (error) {
      console.error('Force sync failed:', error);
    }
  };

  const handleClearLogs = async () => {
    try {
      await (window.electronAPI as any).webdav?.clearLogs?.();
      setSyncLogs([]);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '从未';
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold font-heading mb-2 dark:text-white text-slate-900">
          WebDAV 同步
        </h2>
        <p className="text-slate-500 dark:text-slate-400">稳定、实时、跨设备的数据同步方案</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold mb-6 dark:text-white text-slate-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-500" />
              服务器设置
            </h3>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">WebDAV 服务器地址</label>
                <input
                  type="url"
                  value={config.serverUrl}
                  onChange={(e) => setConfig({ ...config, serverUrl: e.target.value })}
                  placeholder="https://dav.jianguoyun.com/dav/"
                  className="mt-1.5 w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">账号</label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={config.username}
                      onChange={(e) => setConfig({ ...config, username: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">应用密码</label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={config.password}
                      onChange={(e) => setConfig({ ...config, password: e.target.value })}
                      className="w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    <button 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                    >
                      {showPassword ? <X className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
                <button
                onClick={handleTestAndSave}
                disabled={uiStatus.status === 'connecting' || syncStatus.isSyncing}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                {uiStatus.status === 'connecting' ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                测试连接并保存配置
                </button>
            </div>
            {uiStatus.message && (
                <p className={`mt-3 text-center text-sm font-medium ${uiStatus.status === 'error' ? 'text-red-500' : 'text-blue-500'}`}>
                    {uiStatus.message}
                </p>
            )}
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold mb-4 dark:text-white text-slate-900">同步内容控制</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: 'enableSyncConfig', label: '基础配置', icon: <FileText className="w-5 h-5 text-blue-400" /> },
                { key: 'enableSyncDatabase', label: '核心数据库', icon: <Database className="w-5 h-5 text-green-400" /> },
                { key: 'enableSyncRecordings', label: '录音文件', icon: <Music className="w-5 h-5 text-purple-400" /> }
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => setConfig({ ...config, [item.key]: !(config as any)[item.key] })}
                  className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                    (config as any)[item.key] 
                      ? 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-900/20' 
                      : 'border-transparent bg-slate-50 dark:bg-slate-900 opacity-60'
                  }`}
                >
                  {item.icon}
                  <span className="text-sm font-bold">{item.label}</span>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${ (config as any)[item.key] ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700' }`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${ (config as any)[item.key] ? 'right-1' : 'left-1' }`} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold mb-4 dark:text-white text-slate-900">运行模式</h3>
            <div className="space-y-3">
              {[
                { id: 'manual', label: '手动同步', desc: '点击按钮时执行全量同步', icon: <Download className="w-4 h-4" /> },
                { id: 'realtime', label: '实时监控', desc: '检测本地文件变动即刻上传', icon: <Activity className="w-4 h-4" /> }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setConfig({ ...config, syncMode: mode.id as any })}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    config.syncMode === mode.id 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-slate-100 dark:border-slate-700 hover:border-slate-200'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${config.syncMode === mode.id ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                      {mode.icon}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{mode.label}</div>
                    <div className="text-xs text-slate-500">{mode.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold mb-4 dark:text-white text-slate-900">同步控制台</h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">最近同步时间</div>
                <div className="text-sm font-mono font-bold dark:text-white text-slate-900">
                    {formatDate(syncStatus.lastSyncTime || config.lastSyncTime)}
                </div>
              </div>
              
              <button
                onClick={handleSyncAll}
                disabled={syncStatus.isSyncing}
                className="w-full py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 shadow-xl shadow-slate-900/20 dark:shadow-none"
              >
                {syncStatus.isSyncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                {syncStatus.isSyncing ? '正在同步数据...' : '立即执行全量同步'}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => handleForceSync('upload')}
                    disabled={syncStatus.isSyncing}
                    className="py-3 bg-amber-600/10 hover:bg-amber-600/20 text-amber-600 dark:text-amber-500 border border-amber-600/20 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                    <CloudUpload className="w-4 h-4" />
                    覆盖远程
                </button>
                <button
                    onClick={() => handleForceSync('download')}
                    disabled={syncStatus.isSyncing}
                    className="py-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-600/20 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                    <CloudDownload className="w-4 h-4" />
                    覆盖本地
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="bg-slate-950 rounded-2xl p-6 shadow-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <div className="w-2 h-2 rounded-full bg-green-500" />
            </div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                SYSTEM_SYNC_LOG
            </h3>
          </div>
          <button 
            onClick={handleClearLogs}
            className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            CLEAR_CONSOLE
          </button>
        </div>
        <div className="h-64 overflow-y-auto font-mono text-[11px] leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
          {syncLogs.length === 0 ? (
            <p className="text-slate-700 italic">等待系统就绪...</p>
          ) : (
            syncLogs.map((log, i) => (
              <div key={i} className={`flex gap-3 py-0.5 border-b border-white/[0.03] ${
                log.level === 'error' ? 'text-red-400' : 
                log.level === 'warn' ? 'text-yellow-400' : 'text-emerald-500/80'
              }`}>
                <span className="text-slate-600 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span className="shrink-0 font-bold">[{log.level?.toUpperCase() || 'INFO'}]</span>
                <span className="break-all">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default WebDAVSettings;