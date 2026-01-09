import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Keyboard, Save, RotateCcw, FolderOpen, Info, ToggleLeft, ToggleRight } from 'lucide-react'
import Card3D from './3DCard'

interface ShortcutConfig {
  toggleWindow: string
}

export default function Settings() {
  const [shortcuts, setShortcuts] = useState<ShortcutConfig>({
    toggleWindow: 'CommandOrControl+Alt+M'
  })
  const [isRecording, setIsRecording] = useState<keyof ShortcutConfig | null>(null)
  const [saved, setSaved] = useState(false)
  const [dataPath, setDataPath] = useState<string>('')
  const [pathSaved, setPathSaved] = useState(false)
  const [pathError, setPathError] = useState<string | null>(null)
  const [typingEffectEnabled, setTypingEffectEnabled] = useState(true)
  const [typingEffectSaved, setTypingEffectSaved] = useState(false)

  useEffect(() => {
    // 从主进程加载快捷键配置
    window.electronAPI?.shortcuts?.get().then((config) => {
      if (config) {
        setShortcuts(config)
      }
    })

    // 加载数据存储路径（SQLite 数据库）
    window.electronAPI?.database?.getPath().then((result) => {
      if (result?.success) {
        setDataPath(result.path)
      }
    })

    // 加载打字特效设置
    window.electronAPI?.store?.get('typingEffectEnabled').then((result) => {
      if (result?.success) {
        setTypingEffectEnabled(result.value !== undefined ? result.value : true)
      }
    })
  }, [])

  const handleRecordShortcut = (key: keyof ShortcutConfig) => {
    setIsRecording(key)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isRecording) return

    e.preventDefault()
    e.stopPropagation()

    const modifiers: string[] = []
    if (e.ctrlKey || e.metaKey) modifiers.push('CommandOrControl')
    if (e.altKey) modifiers.push('Alt')
    if (e.shiftKey) modifiers.push('Shift')

    const key = e.key.toUpperCase()
    if (key === 'CONTROL' || key === 'ALT' || key === 'SHIFT' || key === 'META') {
      return
    }

    const shortcut = [...modifiers, key].join('+')
    setShortcuts((prev) => ({ ...prev, [isRecording]: shortcut }))
    setIsRecording(null)
    setSaved(false)
  }

  const handleReset = () => {
    setShortcuts({
      toggleWindow: 'CommandOrControl+Alt+M'
    })
    setSaved(false)
  }

  const handleSave = async () => {
    try {
      await window.electronAPI?.shortcuts?.set(shortcuts)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('保存快捷键失败:', error)
    }
  }
  
  const handleSelectDataPath = async () => {
    try {
      const result = await window.electronAPI?.dialog?.selectDirectory()
      if (result?.success && result.path) {
        const setResult = await window.electronAPI?.store?.setDataPath(result.path)
        if (setResult?.success) {
          setDataPath(result.path)
          setPathSaved(true)
          setPathError(null)
          setTimeout(() => setPathSaved(false), 3000)
          
          if (setResult.requiresRestart) {
            alert(setResult.message)
          }
        } else {
          setPathError(setResult?.error || '设置存储路径失败')
        }
      }
    } catch (error) {
      console.error('选择数据存储路径失败:', error)
      setPathError('选择数据存储路径失败')
    }
  }
  
  const handleToggleTypingEffect = async () => {
    const newValue = !typingEffectEnabled
    setTypingEffectEnabled(newValue)
    
    try {
      await window.electronAPI?.store?.set('typingEffectEnabled', newValue)
      setTypingEffectSaved(true)
      setTimeout(() => setTypingEffectSaved(false), 2000)
    } catch (error) {
      console.error('保存打字特效设置失败:', error)
      setTypingEffectEnabled(!newValue) // 恢复原值
    }
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          快捷键设置
        </h2>
        <p className="text-gray-400">自定义您的快捷键，提升使用体验</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        {/* 显示/隐藏窗口 */}
        <Card3D className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold mb-1">显示/隐藏窗口</h3>
              <p className="text-gray-400 text-sm">快速显示或隐藏主窗口</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleRecordShortcut('toggleWindow')}
              onKeyDown={handleKeyDown}
              className={`px-6 py-3 rounded-xl font-mono font-medium transition-all ${
                isRecording === 'toggleWindow'
                  ? 'bg-purple-500 text-white animate-pulse'
                  : 'bg-white/5 border border-white/10 hover:border-purple-500/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4" />
                {isRecording === 'toggleWindow' ? '按下按键...' : shortcuts.toggleWindow}
              </div>
            </motion.button>
          </div>
        </Card3D>

        {/* 操作按钮 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleReset}
            className="flex-1 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/30 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            重置默认
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saved}
            className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/50'
            }`}
          >
            <Save className="w-4 h-4" />
            {saved ? '已保存' : '保存设置'}
          </motion.button>
        </motion.div>

        {/* 提示信息 */}
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4 text-center"
          >
            <p className="text-purple-300">
              💡 按下您想要的快捷键组合（Ctrl/Alt/Shift + 字母/数字）即可
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* 数据存储设置 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            数据存储
          </h2>
          <p className="text-gray-400">配置数据存储路径</p>
        </motion.div>

        {/* 当前存储路径 */}
        <Card3D className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold mb-1">当前存储路径</h3>
              <p className="text-gray-400 text-sm">所有数据（笔记、待办、RSS、收藏等）的存储位置</p>
            </div>
            
            <div className="bg-black/30 border border-white/10 rounded-xl p-4">
              <code className="text-sm text-gray-300 break-all">
                {dataPath || '加载中...'}
              </code>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSelectDataPath}
              className="w-full py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/30 transition-all flex items-center justify-center gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              更改存储路径
            </motion.button>

            {pathSaved && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 text-center"
              >
                <p className="text-green-300">
                  ✅ 存储路径已成功更新
                </p>
              </motion.div>
            )}

            {pathError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/20 border border-red-500/30 rounded-xl p-4"
              >
                <p className="text-red-300">
                  ❌ {pathError}
                </p>
              </motion.div>
            )}

            {/* 提示信息 */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">注意事项：</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>更改存储路径后，数据会自动迁移到新路径</li>
                    <li>建议选择一个有足够空间且不易被清理的目录</li>
                    <li>迁移完成后，建议重启应用以确保新路径生效</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </Card3D>
      </motion.div>

      {/* 界面设置 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            界面设置
          </h2>
          <p className="text-gray-400">自定义界面效果</p>
        </motion.div>

        <Card3D className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold mb-1">打字特效</h3>
              <p className="text-gray-400 text-sm">在笔记编辑时启用打字动画效果</p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleToggleTypingEffect}
              className="w-full py-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl hover:border-white/30 transition-all flex items-center justify-between px-6"
            >
              <div className="flex items-center gap-3">
                {typingEffectEnabled ? (
                  <ToggleRight className="w-6 h-6 text-purple-400" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-gray-400" />
                )}
                <span className="text-gray-300">
                  {typingEffectEnabled ? '已启用' : '已禁用'}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {typingEffectEnabled ? '编辑时会有动画效果' : '编辑时无动画效果'}
              </div>
            </motion.button>

            {typingEffectSaved && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 text-center"
              >
                <p className="text-green-300">
                  ✅ 打字特效设置已保存
                </p>
              </motion.div>
            )}

            {/* 提示信息 */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-300">
                  <p className="font-medium mb-1">提示：</p>
                  <p>关闭打字特效可以提升编辑时的输入流畅度，特别是在性能较低的设备上。</p>
                </div>
              </div>
            </div>
          </div>
        </Card3D>
      </motion.div>
    </div>
  )
}