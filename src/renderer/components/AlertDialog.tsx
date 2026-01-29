import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react'

interface AlertDialogProps {
  isOpen: boolean
  type?: 'warning' | 'info' | 'success' | 'error'
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  type = 'warning',
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  showCancel = true,
  onConfirm,
  onCancel
}) => {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-amber-500" />
      case 'info':
        return <Info className="w-6 h-6 text-blue-500" />
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />
      case 'error':
        return <XCircle className="w-6 h-6 text-red-500" />
    }
  }

  const getIconBg = () => {
    switch (type) {
      case 'warning':
        return 'bg-amber-100 dark:bg-amber-900/30'
      case 'info':
        return 'bg-blue-100 dark:bg-blue-900/30'
      case 'success':
        return 'bg-green-100 dark:bg-green-900/30'
      case 'error':
        return 'bg-red-100 dark:bg-red-900/30'
    }
  }

  const getConfirmBtnClass = () => {
    switch (type) {
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'
      case 'info':
        return 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/30'
      case 'success':
        return 'bg-green-500 hover:bg-green-600 shadow-green-500/30'
      case 'error':
        return 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
            onClick={onCancel}
          >
            {/* 弹窗 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 头部 */}
              <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${getIconBg()} rounded-full flex items-center justify-center flex-shrink-0`}>
                    {getIcon()}
                  </div>
                  <h3 className="text-lg font-bold font-heading dark:text-white text-slate-900">
                    {title}
                  </h3>
                </div>
                <button
                  onClick={onCancel}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 内容 */}
              {message && (
                <div className="p-5">
                  <p className="text-base dark:text-slate-300 text-slate-700 leading-relaxed">
                    {message}
                  </p>
                </div>
              )}

              {/* 底部按钮 */}
              <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                {showCancel && (
                  <button
                    onClick={onCancel}
                    className="px-4 py-2.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 dark:text-white text-slate-700 font-medium text-sm transition-all duration-200 cursor-pointer"
                  >
                    {cancelText}
                  </button>
                )}
                <button
                  onClick={onConfirm}
                  className={`px-4 py-2.5 rounded-lg text-white font-medium text-sm transition-all duration-200 cursor-pointer shadow-lg ${getConfirmBtnClass()}`}
                >
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default AlertDialog