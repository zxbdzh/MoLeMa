import { useState, useEffect, useCallback } from 'react';
import recordingService from '@renderer/services/recordingService';

export interface Recording {
  id: string;
  file_name: string;
  file_path: string;
  created_at: number;
}

export interface Device {
  deviceId: string;
  label: string;
}

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Load recordings list
  const loadRecordings = useCallback(async () => {
    try {
      const result = await window.electronAPI.recordings.scanDirectory();
      if (result?.success) {
        setRecordings(result.files as Recording[]);
      }
    } catch (err) {
      console.error('加载录音列表失败:', err);
      setError('加载录音列表失败');
    }
  }, []);

  // Initialize devices and default device
  useEffect(() => {
    const initDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({audio: true});
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        const microphones = mediaDevices
            .filter(device => device.kind === 'audioinput')
            .map(device => ({
                deviceId: device.deviceId,
                label: device.label || `麦克风 ${device.deviceId.slice(0, 8)}...`
            }));
        setDevices(microphones);

        const defaultDeviceResult = await window.electronAPI.recordings.getDefaultDevice();
        const defaultDeviceId = defaultDeviceResult?.success ? defaultDeviceResult.deviceId : '';

        if (defaultDeviceId && microphones.find(d => d.deviceId === defaultDeviceId)) {
            setSelectedDeviceId(defaultDeviceId);
        } else if (microphones.length > 0) {
            setSelectedDeviceId(microphones[0].deviceId);
        }
      } catch (err) {
        console.error('获取麦克风失败:', err);
        setError('获取麦克风失败');
      }
    };

    initDevices();
    loadRecordings();

    // Listeners
    const unsubscribeRecording = recordingService.onRecordingChanged((recording) => {
        setIsRecording(recording);
        if (!recording) loadRecordings();
    });

    const unsubscribeDuration = recordingService.onDurationChanged((dur) => {
        setDuration(dur);
    });

    return () => {
        unsubscribeRecording();
        unsubscribeDuration();
    };
  }, [loadRecordings]);

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
    } catch (err) {
        console.error('播放提示音失败:', err);
    }
  };

  const startRecording = async () => {
    playBeepSound();
    try {
        await recordingService.startRecording(selectedDeviceId || undefined);
    } catch (err) {
        console.error('录音失败:', err);
        setError('启动录音失败');
    }
  };

  const stopRecording = () => {
    playBeepSound();
    recordingService.stopRecording();
  };

  const deleteRecording = async (filePath: string) => {
    try {
        const result = await window.electronAPI.recordings.deleteFile(filePath);
        if (result?.success) {
            await loadRecordings();
            return true;
        }
        return false;
    } catch (err) {
        console.error('删除录音失败:', err);
        return false;
    }
  };

  const setDevice = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    try {
        await window.electronAPI.recordings.setDefaultDevice(deviceId);
    } catch (err) {
        console.error('设置默认设备失败:', err);
    }
  };

  return {
    isRecording,
    duration,
    recordings,
    devices,
    selectedDeviceId,
    error,
    startRecording,
    stopRecording,
    deleteRecording,
    setDevice
  };
};
