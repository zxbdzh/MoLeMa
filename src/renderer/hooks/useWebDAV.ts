import { useState, useEffect } from 'react';
import { WebDAVConfig, SyncStatus, SyncLog } from '@shared/types/electron';

export interface WebDAVUIStatus {
  status: 'idle' | 'connecting' | 'success' | 'error';
  message: string;
}

export const useWebDAV = () => {
  const [config, setConfig] = useState<WebDAVConfig>({
    serverUrl: '',
    username: '',
    password: '',
    remoteConfigPath: '/MoLeMa-config/',
    remoteRecordingPath: '/MoLeMa-recordings/',
    enableSyncConfig: true,
    enableSyncDatabase: true,
    enableSyncRecordings: true,
    lastSyncTime: 0,
  });

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncTime: 0
  });

  const [uiStatus, setUiStatus] = useState<WebDAVUIStatus>({
    status: 'idle',
    message: '准备就绪',
  });

  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  useEffect(() => {
    loadConfig();

    const unsubscribeStatus = window.electronAPI.webdav.onStatusChange((status: Partial<SyncStatus>) => {
      setSyncStatus(prev => ({ ...prev, ...status }));
      if (status.lastSyncTime) {
          setConfig(prev => ({ ...prev, lastSyncTime: status.lastSyncTime! }));
      }
    });

    const unsubscribeNewLog = window.electronAPI.webdav.onLogUpdate((logs: SyncLog[]) => {
        setSyncLogs([...logs].reverse());
    });

    return () => {
      unsubscribeStatus?.();
      unsubscribeNewLog?.();
    };
  }, []);

  const loadConfig = async () => {
    try {
      const result = await window.electronAPI.webdav.getConfig();
      if (result?.success && result.config) {
        setConfig(result.config);
        setSyncStatus(prev => ({ ...prev, lastSyncTime: result.config.lastSyncTime }));
      }
    } catch (error) {
      console.error('Failed to load WebDAV config:', error);
    }
  };

  const handleSaveConfig = async (silent = false) => {
    try {
      if (!silent) setUiStatus({ status: 'connecting', message: '正在保存配置...' });
      const result = await window.electronAPI.webdav.setConfig(config);
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

  const testAndSave = async () => {
    setUiStatus({ status: 'connecting', message: '正在保存并测试...' });
    try {
      const saveSuccess = await handleSaveConfig(true);
      if (!saveSuccess) {
          setUiStatus({ status: 'error', message: '配置保存失败' });
          return;
      }

      const testResult = await window.electronAPI.webdav.testConnection();
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

  const upload = async () => {
    if (syncStatus.isSyncing) return;
    try {
      await window.electronAPI.webdav.upload();
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const download = async () => {
    if (syncStatus.isSyncing) return;
    try {
      await window.electronAPI.webdav.download();
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const clearLogs = async () => {
    try {
      await window.electronAPI.webdav.clearLogs();
      setSyncLogs([]);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const updateConfigField = (field: keyof WebDAVConfig, value: any) => {
      setConfig(prev => ({ ...prev, [field]: value }));
  };

  return {
    config,
    syncStatus,
    uiStatus,
    syncLogs,
    updateConfigField,
    testAndSave,
    upload,
    download,
    clearLogs
  };
};
