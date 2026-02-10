import React from 'react';
import { Trash2 } from 'lucide-react';
import { SyncLog } from '@shared/types/electron';

interface SyncLoggerProps {
  logs: SyncLog[];
  onClear: () => void;
}

const SyncLogger: React.FC<SyncLoggerProps> = ({ logs, onClear }) => {
  return (
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
          onClick={onClear}
          className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" />
          CLEAR_CONSOLE
        </button>
      </div>
      <div className="h-64 overflow-y-auto font-mono text-[11px] leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
        {logs.length === 0 ? (
          <p className="text-slate-700 italic">等待系统就绪...</p>
        ) : (
          logs.map((log, i) => (
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
  );
};

export default SyncLogger;
