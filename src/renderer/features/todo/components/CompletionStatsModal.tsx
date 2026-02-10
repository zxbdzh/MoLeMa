import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { BarChart3, Calendar, CalendarDays, CalendarClock, X } from 'lucide-react';
import { TodoCompletionStats } from '../../../../shared/types/electron';

interface CompletionStatsModalProps {
  stats: TodoCompletionStats | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CompletionStatsModal({ stats, isOpen, onClose }: CompletionStatsModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md mx-4 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-blue-500" />
                <Dialog.Title className="text-xl font-bold text-slate-900 dark:text-white">完成统计</Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </Dialog.Close>
            </div>
            
            <div className="space-y-4">
              <StatItem 
                icon={<Calendar className="w-5 h-5 text-green-500" />}
                label="今日完成"
                value={stats?.today || 0}
                color="text-green-500"
                bgColor="bg-green-50 dark:bg-green-950/30"
              />
              <StatItem 
                icon={<CalendarDays className="w-5 h-5 text-blue-500" />}
                label="本周完成"
                value={stats?.thisWeek || 0}
                color="text-blue-500"
                bgColor="bg-blue-50 dark:bg-blue-950/30"
              />
              <StatItem 
                icon={<CalendarClock className="w-5 h-5 text-purple-500" />}
                label="本月完成"
                value={stats?.thisMonth || 0}
                color="text-purple-500"
                bgColor="bg-purple-50 dark:bg-purple-950/30"
              />
              <StatItem 
                icon={<Calendar className="w-5 h-5 text-orange-500" />}
                label="本年完成"
                value={stats?.thisYear || 0}
                color="text-orange-500"
                bgColor="bg-orange-50 dark:bg-orange-950/30"
              />
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <StatItem 
                  icon={<BarChart3 className="w-5 h-5 text-yellow-500" />}
                  label="累计完成"
                  value={stats?.total || 0}
                  color="text-yellow-600 dark:text-yellow-400"
                  bgColor="bg-yellow-50 dark:bg-yellow-950/30"
                />
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function StatItem({ icon, label, value, color, bgColor }: { icon: React.ReactNode, label: string, value: number, color: string, bgColor?: string }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-xl ${bgColor || 'bg-slate-100 dark:bg-slate-700/30'}`}>
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-slate-700 dark:text-slate-300">{label}</span>
      </div>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
  );
}
