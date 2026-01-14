import React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

interface TooltipProps {
  children: React.ReactNode
  content: string
  enabled?: boolean
}

export default function Tooltip({ children, content, enabled = true }: TooltipProps) {
  if (!enabled) {
    return <>{children}</>
  }

  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root delayDuration={200}>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className="px-3 py-1.5 text-sm font-medium rounded-lg shadow-lg backdrop-blur-sm border bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 z-[99999]"
            side="right"
            sideOffset={12}
            align="center"
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-slate-200 dark:fill-slate-700" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}