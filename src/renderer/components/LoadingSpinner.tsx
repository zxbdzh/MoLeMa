import { motion } from 'framer-motion'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

export default function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="relative">
        {/* 外圈 */}
        <motion.div
          className={`${sizeClasses[size]} border-4 border-purple-500/30 rounded-full`}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        {/* 中圈 */}
        <motion.div
          className={`absolute inset-0 ${sizeClasses[size]} border-4 border-t-pink-500 border-r-transparent border-b-transparent border-l-transparent rounded-full`}
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
        {/* 内圈 */}
        <motion.div
          className={`absolute inset-2 ${sizeClasses[size]} border-4 border-blue-500/50 rounded-full`}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        {/* 中心点 */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <div className="w-2 h-2 bg-purple-500 rounded-full" />
        </motion.div>
      </div>
      {text && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-gray-400 text-sm"
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}

// 波浪加载动画
export function WaveLoader() {
  return (
    <div className="flex items-center justify-center gap-1 py-8">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-8 bg-gradient-to-t from-purple-500 to-pink-500 rounded-full"
          animate={{
            y: [0, -20, 0],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.1,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  )
}

// 点状加载动画
export function DotsLoader({ text = '加载中' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8">
      <span className="text-gray-400">{text}</span>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-purple-500 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.2
            }}
          />
        ))}
      </div>
    </div>
  )
}

// 旋转圆环加载动画
export function RingLoader() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="relative w-16 h-16">
        <motion.div
          className="absolute inset-0 border-4 border-purple-500/20 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-0 border-4 border-transparent border-t-purple-500 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute inset-2 border-4 border-transparent border-t-pink-500 rounded-full"
          animate={{ rotate: -360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    </div>
  )
}