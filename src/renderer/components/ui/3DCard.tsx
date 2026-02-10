import React, { useRef, useState } from 'react'

interface Card3DProps {
  children: React.ReactNode
  className?: string
}

export const Card3D: React.FC<Card3DProps> = ({ children, className = '' }) => {
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={cardRef}
      className={`
        relative bg-slate-900/80 dark:bg-slate-900/80 bg-white/60 backdrop-blur-sm border border-slate-800 dark:border-slate-800 border-slate-200 
        rounded-xl p-6 transition-all duration-300
        ${isHovered ? 'bg-slate-900/95 dark:bg-slate-900/95 bg-white/80 border-slate-700 dark:border-slate-700 border-slate-300 shadow-lg' : 'shadow-md'}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </div>
  )
}
