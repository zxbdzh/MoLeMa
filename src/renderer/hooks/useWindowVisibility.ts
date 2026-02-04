import { useEffect } from 'react'

/**
 * 窗口可见性监听器 Hook
 * 当窗口从隐藏变为可见时触发回调
 */
export const useWindowVisibility = (callback: () => void) => {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        callback()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [callback])
}
