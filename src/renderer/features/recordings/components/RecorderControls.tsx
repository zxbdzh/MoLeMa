import React from 'react';
import { Mic, MicOff } from 'lucide-react';

interface RecorderControlsProps {
  isRecording: boolean;
  duration: number;
  onStart: () => void;
  onStop: () => void;
}

export function RecorderControls({ isRecording, duration, onStart, onStop }: RecorderControlsProps) {
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center justify-center gap-4 mb-6">
      <div className="text-4xl font-mono text-slate-900 dark:text-white">
        {formatTime(duration)}
      </div>
      <button
        onClick={isRecording ? onStop : onStart}
        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        {isRecording ? (
          <>
            <MicOff size={20}/>
            停止录音
          </>
        ) : (
          <>
            <Mic size={20}/>
            开始录音
          </>
        )}
      </button>
    </div>
  );
}
