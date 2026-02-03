import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Mic, MicOff, Trash2, Play, Folder } from 'lucide-react';
import AlertDialog from './AlertDialog';
import recordingService from '../services/recordingService';

interface AudioRecorderProps {
  onClose?: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onClose }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [duration, setDuration] = useState(0);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [devices, setDevices] = useState<{ deviceId: string; label: string }[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{id: string | null}>({id: null});

  // 播放提示音（使用 Web Audio API）
  const playBeepSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();

      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      const startTime = audioContext.currentTime;
      oscillator.start(startTime);
      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
      oscillator.stop(startTime + 0.15);
    } catch (error) {
      console.error('播放提示音失败:', error);
    }
  };

  // 开始录音
  const startRecording = async () => {
    playBeepSound();
    try {
      await recordingService.startRecording(selectedDeviceId || undefined);
    } catch (error) {
      console.error('录音失败:', error);
    }
  };

  // 停止录音
  const stopRecording = () => {
    playBeepSound();
    recordingService.stopRecording();
  };

  // 加载录音列表
  const loadRecordings = async () => {
    try {
      const result = await window.electronAPI?.recordings?.scanDirectory();
      if (result?.success) {
        setRecordings(result.files || []);
      }
    } catch (error) {
      console.error('加载录音列表失败:', error);
    }
  };

  // 格式化时间
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // 获取麦克风设备列表
  useEffect(() => {
    const getMicrophones = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });

        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        const microphones = mediaDevices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `麦克风 ${device.deviceId.slice(0, 8)}...`
          }));

        setDevices(microphones);

        const defaultDeviceResult = await window.electronAPI?.recordings?.getDefaultDevice();
        const defaultDeviceId = defaultDeviceResult?.success ? defaultDeviceResult.deviceId : '';

        if (defaultDeviceId && microphones.find(d => d.deviceId === defaultDeviceId)) {
          setSelectedDeviceId(defaultDeviceId);
        } else if (microphones.length > 0) {
          setSelectedDeviceId(microphones[0].deviceId);
        }
      } catch (error) {
        console.error('获取麦克风失败:', error);
      }
    };

    getMicrophones();
    loadRecordings();
  }, []);

  // 监听录音状态变化
  useEffect(() => {
    const unsubscribe = recordingService.onRecordingChanged((recording) => {
      setIsRecording(recording);
      if (!recording) {
        // 录音停止后，重新加载列表
        loadRecordings();
      }
    });

    return unsubscribe;
  }, []);

  // 监听录音时长变化
  useEffect(() => {
    const unsubscribe = recordingService.onDurationChanged((dur) => {
      setDuration(dur);
    });

    return unsubscribe;
  }, []);

  // 删除录音
  const deleteRecording = (id: string) => {
    setDeleteConfirm({id});
  };

  // 确认删除录音
  const confirmDeleteRecording = async () => {
    if (deleteConfirm.id !== null) {
      try {
        // 获取要删除的录音文件
        const recording = recordings.find(r => r.id === deleteConfirm.id);
        if (recording && recording.file_path) {
          // 通过 IPC 调用 main 进程删除文件
          const result = await window.electronAPI?.recordings?.deleteFile(recording.file_path);
          if (result?.success) {
            console.log(`>>> 删除录音文件成功: ${recording.file_path}`);
          }
          // 重新加载录音列表
          await loadRecordings();
        }
      } catch (error) {
        console.error('删除录音失败:', error);
      }
      setDeleteConfirm({id: null});
    }
  };

  // 取消删除
  const cancelDeleteRecording = () => {
    setDeleteConfirm({id: null});
  };

  // 设备变更时保存为默认设备
  const handleDeviceChange = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    try {
      await window.electronAPI?.recordings?.setDefaultDevice(deviceId);
    } catch (error) {
      console.error('设置默认设备失败:', error);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">录音器</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* 设备选择 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          选择麦克风
        </label>
        <select
          value={selectedDeviceId}
          onChange={(e) => handleDeviceChange(e.target.value)}
          className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
        >
          {devices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
      </div>

      {/* 录音控制 */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="text-4xl font-mono text-slate-900 dark:text-white">
          {formatTime(duration)}
        </div>
        <button
          onClick={() => {
            if (isRecording) {
              stopRecording();
            } else {
              startRecording();
            }
          }}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isRecording ? (
            <>
              <MicOff size={20} />
              停止录音
            </>
          ) : (
            <>
              <Mic size={20} />
              开始录音
            </>
          )}
        </button>
      </div>

      {/* 录音列表 */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">录音历史</h3>
        {recordings.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-center py-8">暂无录音</p>
        ) : (
          <div className="space-y-3">
            {recordings.map(recording => (
              <div
                key={recording.id}
                className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 dark:text-white truncate">
                      {recording.file_name}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {new Date(recording.created_at).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 ml-4">
                    <button
                      onClick={() => window.electronAPI?.shell?.openPath(recording.file_path)}
                      className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="用系统默认应用播放"
                    >
                      <Play size={18} />
                    </button>
                    <button
                      onClick={() => window.electronAPI?.shell?.showItemInFolder(recording.file_path)}
                      className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                      title="打开文件所在文件夹"
                    >
                      <Folder size={18} />
                    </button>
                    <button
                      onClick={() => deleteRecording(recording.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      {deleteConfirm.id !== null && ReactDOM.createPortal(
        <AlertDialog
          isOpen={true}
          type="warning"
          title="确认删除"
          message="确定要删除这条录音吗？"
          onConfirm={confirmDeleteRecording}
          onCancel={cancelDeleteRecording}
        />,
        document.body
      )}
    </div>
  );
};