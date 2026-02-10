import { useState } from 'react';
import { Server, Lock, User, Check, X, RefreshCw, FileText, Database, Music, CloudUpload, CloudDownload } from 'lucide-react';
import { useWebDAV } from '../../hooks/useWebDAV';
import SyncLogger from './components/SyncLogger';

const WebDAVSettings = () => {
  const {
    config,
    syncStatus,
    uiStatus,
    syncLogs,
    updateConfigField,
    testAndSave,
    upload,
    download,
    clearLogs
  } = useWebDAV();

  const [showPassword, setShowPassword] = useState(false);

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
        <p className="text-slate-500 dark:text-slate-400">简单可靠的手动同步方案，确保数据一致性</p>
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
                  onChange={(e) => updateConfigField('serverUrl', e.target.value)}
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
                      onChange={(e) => updateConfigField('username', e.target.value)}
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
                      onChange={(e) => updateConfigField('password', e.target.value)}
                      className="w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    <button 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                    >
                      {showPassword ? <X className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
                <button
                onClick={testAndSave}
                disabled={uiStatus.status === 'connecting' || syncStatus.isSyncing}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
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
                  onClick={() => updateConfigField(item.key as any, !(config as any)[item.key])}
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
            <h3 className="text-lg font-bold mb-4 dark:text-white text-slate-900">同步控制台</h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">最近同步时间</div>
                <div className="text-sm font-mono font-bold dark:text-white text-slate-900">
                    {formatDate(syncStatus.lastSyncTime || config.lastSyncTime)}
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <button
                    onClick={upload}
                    disabled={syncStatus.isSyncing}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-700 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
                >
                    {syncStatus.isSyncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CloudUpload className="w-5 h-5" />}
                    上传本地数据至云端
                </button>
                <button
                    onClick={download}
                    disabled={syncStatus.isSyncing}
                    className="w-full py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-bold flex items-center justify-center gap-3 hover:opacity-90 transition-all disabled:opacity-50 shadow-xl shadow-slate-900/20 dark:shadow-none"
                >
                    {syncStatus.isSyncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CloudDownload className="w-5 h-5" />}
                    从云端下载数据覆盖本地
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center px-2">
                提示：上传将清空云端对应目录后重新写入，下载将直接覆盖本地文件。
              </p>
            </div>
          </section>
        </div>
      </div>

      <SyncLogger logs={syncLogs} onClear={clearLogs} />
    </div>
  );
};

export default WebDAVSettings;