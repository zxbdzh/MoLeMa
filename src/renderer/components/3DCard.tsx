import React from 'react'
import { motion } from 'framer-motion'

interface Card3DProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export default function Card3D({ children, className = '', onClick }: Card3DProps) {
  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-md border border-white/10 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{
        scale: 1.02,
        rotateX: 5,
        rotateY: 5,
        boxShadow: '0 20px 40px rgba(147, 51, 234, 0.3)'
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 opacity-0 hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}