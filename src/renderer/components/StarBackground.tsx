import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  size: number
  speed: number
  opacity: number
  twinkleSpeed: number
}

export default function StarBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const checkTheme = () => {
      const html = document.documentElement
      return html.classList.contains('dark') ? 'dark' : 'light'
    }

    let currentTheme = checkTheme()

    const handleThemeChange = () => {
      const newTheme = checkTheme()
      if (newTheme !== currentTheme) {
        currentTheme = newTheme
        drawBackground()
      }
    }

    // 监听主题变化
    const observer = new MutationObserver(handleThemeChange)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let stars: Star[] = []
    let time = 0

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initStars()
    }

    const initStars = () => {
      stars = []
      const starCount = Math.floor((canvas.width * canvas.height) / 6000)
      
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.2 + 0.5,
          speed: Math.random() * 0.08 + 0.02,
          opacity: Math.random() * 0.5 + 0.3,
          twinkleSpeed: Math.random() * 0.03 + 0.01
        })
      }
    }

    const drawBackground = () => {
      if (currentTheme === 'dark') {
        // 深色模式：深色星空背景
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
        gradient.addColorStop(0, '#020617')
        gradient.addColorStop(1, '#0f172a')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      } else {
        // 浅色模式：浅色渐变背景
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
        gradient.addColorStop(0, '#f8fafc')
        gradient.addColorStop(1, '#e2e8f0')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
    }

    const drawStar = (star: Star) => {
      const twinkle = Math.sin(time * star.twinkleSpeed * 80) * 0.15
      const currentOpacity = star.opacity + twinkle

      ctx.beginPath()
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
      
      if (currentTheme === 'dark') {
        // 深色模式：白色星星
        ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`
      } else {
        // 浅色模式：浅蓝色装饰点
        ctx.fillStyle = `rgba(100, 116, 139, ${currentOpacity * 0.4})`
      }
      
      ctx.fill()
    }

    const animate = () => {
      drawBackground()

      stars.forEach((star) => {
        drawStar(star)

        star.y += star.speed
        if (star.y > canvas.height) {
          star.y = 0
          star.x = Math.random() * canvas.width
        }
      })

      time += 0.01
      animationFrameId = requestAnimationFrame(animate)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      observer.disconnect()
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  )
}
