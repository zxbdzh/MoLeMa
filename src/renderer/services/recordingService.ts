/**
 * 全局录音服务（单例模式）
 * 统一管理录音状态和 MediaRecorder 实例
 */

class RecordingService {
  private static instance: RecordingService;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioStream: MediaStream | null = null;
  private timer: number | null = null;
  private listeners: Set<(isRecording: boolean) => void> = new Set();
  private durationListeners: Set<(duration: number) => void> = new Set();
  private _duration: number = 0;
  private _durationInterval: number | null = null;

  private constructor() {}

  static getInstance(): RecordingService {
    if (!RecordingService.instance) {
      RecordingService.instance = new RecordingService();
    }
    return RecordingService.instance;
  }

  /**
   * 开始录音
   */
  async startRecording(deviceId?: string): Promise<void> {
    if (this.mediaRecorder?.state === 'recording') {
      console.log('>>> RecordingService: 已在录音中，忽略');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: deviceId ? { deviceId } : true
      };

      this.audioStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mediaRecorder = new MediaRecorder(this.audioStream);
      this.audioChunks = [];
      this._duration = 0;

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        // 保存录音
        await this.saveRecording();
        
        // 清理资源
        this.cleanup();
        
        // 通知监听器
        this.notifyListeners(false);
      };

      this.mediaRecorder.start();
      
      // 启动计时器
      this._durationInterval = window.setInterval(() => {
        this._duration += 1000;
        this.notifyDurationListeners(this._duration);
      }, 1000);

      // 通知监听器
      this.notifyListeners(true);
      console.log('>>> RecordingService: 开始录音');
    } catch (error) {
      console.error('>>> RecordingService: 开始录音失败', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * 停止录音
   */
  stopRecording(): void {
    if (this.mediaRecorder?.state === 'recording') {
      console.log('>>> RecordingService: 停止录音');
      this.mediaRecorder.stop();
    }
  }

  /**
   * 获取当前录音状态
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  /**
   * 获取当前录音时长
   */
  getDuration(): number {
    return this._duration;
  }

  /**
   * 监听录音状态变化
   */
  onRecordingChanged(callback: (isRecording: boolean) => void): () => void {
    this.listeners.add(callback);
    // 立即返回当前状态
    callback(this.isRecording());
    
    // 返回清理函数
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * 监听录音时长变化
   */
  onDurationChanged(callback: (duration: number) => void): () => void {
    this.durationListeners.add(callback);
    callback(this._duration);
    
    return () => {
      this.durationListeners.delete(callback);
    };
  }

  /**
   * 保存录音
   */
  private async saveRecording(): Promise<void> {
    try {
      if (this.audioChunks.length === 0) {
        console.log('>>> RecordingService: 没有录音数据');
        return;
      }

      const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
      const arrayBuffer = await blob.arrayBuffer();
      
      // 转换为 WAV 格式
      const audioContext = new AudioContext();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const wavArrayBuffer = this.audioBufferToWav(audioBuffer);
      
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
          device_name: '默认设备',
          device_id: '',
          notes: ''
        });
        
        console.log('>>> RecordingService: 录音保存成功');
      }
    } catch (error) {
      console.error('>>> RecordingService: 保存录音失败', error);
    }
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    if (this._durationInterval) {
      clearInterval(this._durationInterval);
      this._durationInterval = null;
    }
    
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
    
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  /**
   * 通知录音状态监听器
   */
  private notifyListeners(isRecording: boolean): void {
    this.listeners.forEach(listener => listener(isRecording));
  }

  /**
   * 通知时长监听器
   */
  private notifyDurationListeners(duration: number): void {
    this.durationListeners.forEach(listener => listener(duration));
  }

  /**
   * AudioBuffer 转 WAV
   */
  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;
    
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);
    
    // WAV 头部
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    this.writeString(view, 36, 'data');
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
  }
  
  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

export default RecordingService.getInstance();