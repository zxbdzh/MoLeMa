import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface AnimatedButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'gradient'
  size?: 'sm' | 'md' | 'lg'
  icon?: LucideIcon
  disabled?: boolean
  loading?: boolean
  className?: string
  glow?: boolean
  ripple?: boolean
}

export default function AnimatedButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  disabled = false,
  loading = false,
  className = '',
  glow = true,
  ripple = true
}: AnimatedButtonProps) {
  const variants = {
    primary: 'bg-purple-500 hover:bg-purple-600 text-white',
    secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/20',
    success: 'bg-green-500 hover:bg-green-600 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    gradient: 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  }

  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.05 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.95 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        relative overflow-hidden
        rounded-lg font-medium
        transition-all duration-300
        ${variants[variant]}
        ${sizes[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${glow && !disabled ? 'hover:shadow-lg hover:shadow-purple-500/25' : ''}
        ${className}
      `}
    >
      {/* 波纹效果 */}
      {ripple && !disabled && !loading && (
        <motion.span
          className="absolute inset-0 bg-white/20"
          initial={{ scale: 0, opacity: 0.5 }}
          whileHover={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      )}

      {/* 加载状态 */}
      {loading && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-black/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      )}

      {/* 内容 */}
      <span className={`relative z-10 flex items-center justify-center gap-2 ${loading ? 'opacity-0' : ''}`}>
        {Icon && <Icon className="w-4 h-4" />}
        {children}
      </span>
    </motion.button>
  )
}

// 发光按钮
export function GlowButton({ children, onClick, className = '' }: { children: React.ReactNode, onClick?: () => void, className?: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        relative px-6 py-3
        bg-gradient-to-r from-purple-500 to-pink-500
        text-white font-medium rounded-lg
        transition-all duration-300
        ${className}
      `}
    >
      <motion.div
        className="absolute inset-0 rounded-lg"
        animate={{
          boxShadow: [
            '0 0 20px rgba(147, 51, 234, 0.3)',
            '0 0 40px rgba(147, 51, 234, 0.6)',
            '0 0 20px rgba(147, 51, 234, 0.3)'
          ]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}

// 3D 按钮效果
export function Button3D({ children, onClick, className = '' }: { children: React.ReactNode, onClick?: () => void, className?: string }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ y: 0 }}
      onClick={onClick}
      className={`
        relative px-6 py-3
        bg-gradient-to-b from-purple-500 to-purple-600
        text-white font-medium rounded-lg
        shadow-[0_4px_0_0_rgba(126,58,242,1)]
        active:shadow-[0_2px_0_0_rgba(126,58,242,1)]
        active:translate-y-[2px]
        transition-all duration-150
        ${className}
      `}
    >
      {children}
    </motion.button>
  )
}

// 霓虹按钮
export function NeonButton({ children, onClick, className = '' }: { children: React.ReactNode, onClick?: () => void, className?: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        relative px-6 py-3
        bg-transparent
        text-purple-400 font-medium rounded-lg
        border-2 border-purple-500
        transition-all duration-300
        hover:bg-purple-500/10
        hover:shadow-[0_0_20px_rgba(147,51,234,0.5)]
        ${className}
      `}
    >
      <motion.span
        className="absolute inset-0 rounded-lg"
        animate={{
          boxShadow: [
            'inset 0 0 20px rgba(147, 51, 234, 0)',
            'inset 0 0 20px rgba(147, 51, 234, 0.2)',
            'inset 0 0 20px rgba(147, 51, 234, 0)'
          ]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}

// 渐变边框按钮
export function GradientBorderButton({ children, onClick, className = '' }: { children: React.ReactNode, onClick?: () => void, className?: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        relative px-6 py-3
        bg-white/5 backdrop-blur-sm
        text-white font-medium rounded-lg
        transition-all duration-300
        ${className}
      `}
    >
      <motion.div
        className="absolute inset-0 rounded-lg p-[2px]"
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
        }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{
          background: 'linear-gradient(90deg, #a855f7, #ec4899, #3b82f6, #a855f7)',
          backgroundSize: '300% 300%'
        }}
      >
        <div className="absolute inset-[2px] bg-white/5 rounded-lg" />
      </motion.div>
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}