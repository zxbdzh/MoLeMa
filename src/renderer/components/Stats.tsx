import React, { useState, useEffect } from 'react'
import { Clock, Calendar } from 'lucide-react'

type TimeDimension = 'day' | 'week' | 'month' | 'year' | 'all'

interface StatCardProps {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  color: string
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
      <div className="flex items-start gap-4 mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
      <h3 className="text-2xl font-bold mb-1 dark:text-white text-slate-900">{value}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>
    </div>
  )
}

export default function Stats() {
  const [timeDimension, setTimeDimension] = useState<TimeDimension>('day')
  
  const [appUsage, setAppUsage] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    thisYear: 0,
    total: 0,
    sessions: 0
  })

  useEffect(() => {
    loadStats()
  }, [timeDimension])

  const loadStats = async () => {
    try {
      // 获取应用使用统计
      const appResult = await window.electronAPI?.stats?.getAppUsage?.(timeDimension)
      if (appResult?.success) {
        setAppUsage(appResult.stats)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const formatDuration = (ms: number): string => {
    if (!ms || ms === undefined || ms === null || isNaN(ms)) {
      return '0s'
    }
    const hours = Math.floor(ms / 3600000)
    const minutes = Math.floor((ms % 3600000) / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  const getDimensionValue = (dimension: TimeDimension): number => {
    const mapping: Record<TimeDimension, keyof typeof appUsage> = {
      'day': 'today',
      'week': 'thisWeek',
      'month': 'thisMonth',
      'year': 'thisYear',
      'all': 'total'
    }
    const key = mapping[dimension]
    return appUsage[key] || 0
  }

  const dimensionOptions = [
    { value: 'day', label: '今日' },
    { value: 'week', label: '本周' },
    { value: 'month', label: '本月' },
    { value: 'year', label: '今年' },
    { value: 'all', label: '累计' }
  ]

  return (
    <div className="space-y-6">
      {/* 标题和时间维度选择 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold dark:text-white text-slate-900">数据统计</h2>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <select
            value={timeDimension}
            onChange={(e) => setTimeDimension(e.target.value as TimeDimension)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm dark:text-white text-slate-900"
          >
            {dimensionOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-4">
        <StatCard
          title={dimensionOptions.find(d => d.value === timeDimension)?.label + '摸鱼时长'}
          value={formatDuration(getDimensionValue(timeDimension))}
          subtitle="当前时间段"
          icon={<Clock className="w-6 h-6 text-white" />}
          color="bg-blue-500"
        />
      </div>
    </div>
  )
}