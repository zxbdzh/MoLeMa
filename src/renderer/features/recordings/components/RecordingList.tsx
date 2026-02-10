import React from 'react';
import { Play, Folder, Trash2 } from 'lucide-react';
import { Recording } from '../../../hooks/useAudioRecorder';

interface RecordingListProps {
  recordings: Recording[];
  onDelete: (id: string) => void;
}

export function RecordingList({ recordings, onDelete }: RecordingListProps) {
  return (
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
                    onClick={() => window.electronAPI.shell.openPath(recording.file_path)}
                    className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="用系统默认应用播放"
                  >
                    <Play size={18}/>
                  </button>
                  <button
                    onClick={() => window.electronAPI.shell.showItemInFolder(recording.file_path)}
                    className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                    title="打开文件所在文件夹"
                  >
                    <Folder size={18}/>
                  </button>
                  <button
                    onClick={() => onDelete(recording.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 size={18}/>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
