import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  delay?: number
  hover?: boolean
  glow?: boolean
  tilt?: boolean
  onClick?: () => void
}

export default function AnimatedCard({
  children,
  className = '',
  delay = 0,
  hover = true,
  glow = true,
  tilt = false,
  onClick
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={hover ? {
        scale: 1.02,
        y: -5,
        boxShadow: glow ? '0 20px 40px rgba(147, 51, 234, 0.3)' : undefined
      } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={`
        bg-white/5 backdrop-blur-xl rounded-2xl p-6
        border border-white/10
        transition-all duration-300
        ${hover ? 'hover:border-purple-500/50' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}

// 玻璃态卡片
export function GlassCard({ children, className = '' }: { children: ReactNode, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      className={`
        bg-white/10 backdrop-blur-lg rounded-2xl p-6
        border border-white/20
        shadow-xl
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}

// 发光卡片
export function GlowCard({ children, className = '' }: { children: ReactNode, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={{
        boxShadow: [
          '0 0 20px rgba(147, 51, 234, 0.3)',
          '0 0 40px rgba(147, 51, 234, 0.6)',
          '0 0 20px rgba(147, 51, 234, 0.3)'
        ]
      }}
      transition={{ duration: 2, repeat: Infinity }}
      className={`
        bg-gradient-to-br from-purple-500/10 to-pink-500/10
        backdrop-blur-xl rounded-2xl p-6
        border border-purple-500/30
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}

// 渐变卡片
export function GradientCard({ children, className = '' }: { children: ReactNode, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className={`
        relative overflow-hidden
        bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-blue-500/20
        backdrop-blur-xl rounded-2xl p-6
        border border-white/20
        ${className}
      `}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10"
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
        }}
        transition={{ duration: 5, repeat: Infinity }}
        style={{
          backgroundSize: '200% 200%'
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}

// 浮动卡片
export function FloatingCard({ children, delay = 0, className = '' }: { children: ReactNode, delay?: number, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: [0, -10, 0]
      }}
      transition={{ 
        opacity: { delay },
        y: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
      }}
      className={`
        bg-white/5 backdrop-blur-xl rounded-2xl p-6
        border border-white/10
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}

// 3D 倾斜卡片
export function TiltCard({ children, className = '' }: { children: ReactNode, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ 
        rotateX: 5,
        rotateY: 5,
        scale: 1.02
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{ transformStyle: 'preserve-3d' }}
      className={`
        bg-gradient-to-br from-purple-500/10 to-pink-500/10
        backdrop-blur-xl rounded-2xl p-6
        border border-white/10
        perspective-1000
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}

// 霓虹卡片
export function NeonCard({ children, className = '' }: { children: ReactNode, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={{
        boxShadow: [
          '0 0 20px rgba(147, 51, 234, 0.3)',
          '0 0 40px rgba(147, 51, 234, 0.6)',
          '0 0 20px rgba(147, 51, 234, 0.3)'
        ],
        borderColor: 'rgba(147, 51, 234, 0.8)'
      }}
      transition={{ duration: 2, repeat: Infinity }}
      className={`
        bg-black/40 backdrop-blur-xl rounded-2xl p-6
        border-2 border-purple-500/50
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}

// 脉冲卡片
export function PulseCard({ children, className = '' }: { children: ReactNode, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        scale: [1, 1.02, 1]
      }}
      transition={{ 
        scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
      }}
      className={`
        bg-gradient-to-br from-purple-500/10 to-pink-500/10
        backdrop-blur-xl rounded-2xl p-6
        border border-purple-500/30
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}