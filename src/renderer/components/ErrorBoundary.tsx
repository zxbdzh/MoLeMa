import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 dark:bg-slate-900 p-4">
          <div className="max-w-2xl w-full">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-200 dark:border-slate-700">
              {/* 图标 */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
              </div>

              {/* 标题 */}
              <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-4">
                哎呀，出错了
              </h1>

              {/* 错误信息 */}
              <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">
                  {this.state.error?.toString()}
                </p>
              </div>

              {/* 错误详情（仅在开发环境显示） */}
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mb-6">
                  <summary className="cursor-pointer text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 mb-2">
                    查看错误详情
                  </summary>
                  <div className="bg-slate-100 dark:bg-slate-900/50 rounded-lg p-4 mt-2">
                    <pre className="text-xs text-slate-600 dark:text-slate-400 font-mono overflow-x-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                </details>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                  重新加载
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  刷新页面
                </button>
              </div>

              {/* 提示信息 */}
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
                如果问题持续存在，请尝试重启应用
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary