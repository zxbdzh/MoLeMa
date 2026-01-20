import React, { useState, useEffect } from 'react'
import { Clock, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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
  const [showHistory, setShowHistory] = useState(false)
  
  const [appUsage, setAppUsage] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    thisYear: 0,
    total: 0,
    sessions: 0
  })
  
  const [featureUsage, setFeatureUsage] = useState([])
  const [historyTrend, setHistoryTrend] = useState([])

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

      // 获取功能使用统计
      const featureResult = await window.electronAPI?.stats?.getFeatureUsage?.(undefined, timeDimension)
      if (featureResult?.success) {
        setFeatureUsage(featureResult.stats)
      }

      // 获取历史趋势
      const historyResult = await window.electronAPI?.stats?.getHistoryTrend?.(timeDimension, 30)
      if (historyResult?.success) {
        setHistoryTrend(historyResult.data)
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

  const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B']

  const pieData = featureUsage.map((item: any, index: number) => ({
    name: item.featureName,
    value: item.duration,
    color: COLORS[index % COLORS.length]
  }))

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

      {/* 功能使用统计 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold dark:text-white text-slate-900">功能使用统计</h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 功能摸鱼时长饼图 */}
          <div className="h-64">
            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">摸鱼时长分布</h4>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => (
                      <text
                        fill={entry.color}
                        fontSize={12}
                        fontWeight={500}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        {entry.name} {(entry.percent * 100).toFixed(0)}%
                      </text>
                    )}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatDuration(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                暂无数据，请使用各功能后查看统计
              </div>
            )}
          </div>

          {/* 功能使用次数柱状图 */}
          <div className="h-64">
            <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">使用次数</h4>
            {featureUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={featureUsage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="featureName" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                  <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                    itemStyle={{ color: '#F3F4F6' }}
                  />
                  <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                暂无数据，请使用各功能后查看统计
              </div>
            )}
          </div>
        </div>

        {/* 功能使用详情表格 */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 dark:text-white text-slate-900 font-medium">功能</th>
                <th className="text-right py-3 px-4 dark:text-white text-slate-900 font-medium">总摸鱼时长</th>
                <th className="text-right py-3 px-4 dark:text-white text-slate-900 font-medium">使用次数</th>
                <th className="text-right py-3 px-4 dark:text-white text-slate-900 font-medium">今日摸鱼时长</th>
                <th className="text-right py-3 px-4 dark:text-white text-slate-900 font-medium">本周摸鱼时长</th>
              </tr>
            </thead>
            <tbody>
              {featureUsage.map((item: any, index: number) => (
                <tr key={index} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="py-3 px-4 dark:text-white text-slate-900">{item.featureName}</td>
                  <td className="text-right py-3 px-4 dark:text-white text-slate-900">{formatDuration(item.duration)}</td>
                  <td className="text-right py-3 px-4 dark:text-white text-slate-900">{item.count}</td>
                  <td className="text-right py-3 px-4 dark:text-white text-slate-900">{formatDuration(item.todayDuration)}</td>
                  <td className="text-right py-3 px-4 dark:text-white text-slate-900">{formatDuration(item.thisWeekDuration)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 历史趋势 */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold dark:text-white text-slate-900">历史趋势</h3>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          >
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showHistory ? '收起' : '展开'}
          </button>
        </div>
        
        {showHistory && (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyTrend}>
                <defs>
                  <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} tickFormatter={(value) => formatDuration(value)} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: '#F3F4F6' }}
                  formatter={(value: number) => formatDuration(value)}
                />
                <Area type="monotone" dataKey="duration" stroke="#3B82F6" fillOpacity={1} fill="url(#colorDuration)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}