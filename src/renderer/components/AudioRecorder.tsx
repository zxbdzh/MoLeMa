import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Trash2 } from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';

interface AudioRecorderProps {
  onClose?: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onClose }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [duration, setDuration] = useState(0);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [devices, setDevices] = useState<{ deviceId: string; label: string }[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // 获取麦克风设备列表
  useEffect(() => {
    const getMicrophones = async () => {
      try {
        // 首先请求音频权限
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        const microphones = mediaDevices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            deviceId: device.deviceId,
            label: device.label || `麦克风 ${device.deviceId.slice(0, 8)}...`
          }));
        
        setDevices(microphones);
        
        // 获取默认设备
        const defaultDeviceResult = await window.electronAPI?.recordings?.getDefaultDevice();
        const defaultDeviceId = defaultDeviceResult?.success ? defaultDeviceResult.deviceId : '';
        
        if (defaultDeviceId && microphones.find(d => d.deviceId === defaultDeviceId)) {
          setSelectedDeviceId(defaultDeviceId);
        } else if (microphones.length > 0) {
          setSelectedDeviceId(microphones[0].deviceId);
        }
      } catch (error) {
        console.error('Failed to get microphones:', error);
      }
    };

    getMicrophones();
    loadRecordings();
    
    // 监听录音切换快捷键
    const handleToggleRecording = () => {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    };
    
    const cleanup = window.electronAPI?.recording?.onToggle?.(handleToggleRecording);
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [isRecording]);

  // 加载录音列表
  const loadRecordings = async () => {
    try {
      const result = await window.electronAPI?.recordings?.getAll(50, 0);
      if (result?.success) {
        setRecordings(result.recordings || []);
      }
    } catch (error) {
      console.error('Failed to load recordings:', error);
    }
  };

  // 格式化时间
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // 开始录音
  const startRecording = async () => {
    if (isRecording) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDeviceId || undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      audioStreamRef.current = stream;
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // 转换为 WAV 格式
        const arrayBuffer = await blob.arrayBuffer();
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // 转换为 WAV
        const wavArrayBuffer = audioBufferToWav(audioBuffer);
        
        // 生成文件名
        const fileNameResult = await window.electronAPI?.recordings?.generateFileName();
        const fileName = fileNameResult?.success ? fileNameResult.fileName : 'recording.wav';
        
        // 获取保存路径
        const savePathResult = await window.electronAPI?.recordings?.getSavePath();
        const savePath = savePathResult?.success ? savePathResult.savePath : undefined;
        
        // 保存录音文件到磁盘
        const saveResult = await window.electronAPI?.recordings?.saveFile(fileName, wavArrayBuffer, savePath);
        
        if (saveResult?.success) {
          // 保存录音记录到数据库
          await window.electronAPI?.recordings?.create({
            file_name: fileName,
            file_path: saveResult.filePath || `/recordings/${fileName}`,
            duration: audioBuffer.duration * 1000,
            file_size: wavArrayBuffer.byteLength,
            device_name: devices.find(d => d.deviceId === selectedDeviceId)?.label || '未知设备',
            device_id: selectedDeviceId,
            notes: ''
          });
          
          await loadRecordings();
        }
        
        // 停止所有轨道
        stream.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setDuration(0);

      // 启动计时器
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1000);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('录音失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // AudioBuffer 转 WAV
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;
    
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);
    
    // WAV 头部
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    
    // 写入音频数据
    const channels = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }
    
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  };
  
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // 删除录音
  const deleteRecording = async (id: number) => {
    if (confirm('确定要删除这条录音吗？')) {
      try {
        const result = await window.electronAPI?.recordings?.delete(id);
        if (result?.success) {
          await loadRecordings();
        }
      } catch (error) {
        console.error('Failed to delete recording:', error);
      }
    }
  };

  // 设备变更时保存为默认设备
  const handleDeviceChange = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    try {
      await window.electronAPI?.recordings?.setDefaultDevice(deviceId);
    } catch (error) {
      console.error('Failed to set default device:', error);
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
          onClick={isRecording ? stopRecording : startRecording}
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

      {/* 音频可视化 */}
      {audioStreamRef.current && (
        <AudioVisualizer stream={audioStreamRef.current} isRecording={isRecording} />
      )}

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
                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-slate-900 dark:text-white">
                    {recording.file_name}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {recording.device_name} • {formatTime(recording.duration || 0)} • {new Date(recording.created_at).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => deleteRecording(recording.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};