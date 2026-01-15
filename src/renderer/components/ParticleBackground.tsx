import { useEffect, useRef } from 'react'

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // TypeScript 非空断言，因为上面已经检查了 null
    const nonNullCanvas = canvas as HTMLCanvasElement
    const nonNullCtx = ctx as CanvasRenderingContext2D

    let particles: Particle[] = []
    let animationFrameId: number
    let mouse: { x: number; y: number } = { x: 0, y: 0 }

    const resizeCanvas = () => {
      nonNullCanvas.width = window.innerWidth
      nonNullCanvas.height = window.innerHeight
    }

    class Particle {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      color: string
      originalSize: number

      constructor() {
        this.x = Math.random() * nonNullCanvas.width
        this.y = Math.random() * nonNullCanvas.height
        this.vx = (Math.random() - 0.5) * 0.5
        this.vy = (Math.random() - 0.5) * 0.5
        this.size = Math.random() * 3 + 1
        this.originalSize = this.size
        this.color = this.getRandomColor()
      }

      getRandomColor() {
        const colors = [
          'rgba(148, 163, 184, 0.3)',  // slate-400
          'rgba(100, 116, 139, 0.25)',  // slate-500
          'rgba(71, 85, 105, 0.2)',   // slate-600
        ]
        return colors[Math.floor(Math.random() * colors.length)]
      }

      update() {
        // 鼠标交互 - 减弱效果
        const dx = mouse.x - this.x
        const dy = mouse.y - this.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 100) {
          const force = (100 - distance) / 100
          this.vx -= (dx / distance) * force * 0.01
          this.vy -= (dy / distance) * force * 0.01
          this.size = this.originalSize * (1 + force * 0.5)
        } else {
          this.size = this.originalSize
        }

        // 速度限制
        const maxSpeed = 2
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy)
        if (speed > maxSpeed) {
          this.vx = (this.vx / speed) * maxSpeed
          this.vy = (this.vy / speed) * maxSpeed
        }

        this.x += this.vx
        this.y += this.vy

        // 边界反弹
        if (this.x < 0 || this.x > nonNullCanvas.width) {
          this.vx *= -1
          this.x = Math.max(0, Math.min(nonNullCanvas.width, this.x))
        }
        if (this.y < 0 || this.y > nonNullCanvas.height) {
          this.vy *= -1
          this.y = Math.max(0, Math.min(nonNullCanvas.height, this.y))
        }
      }

      draw() {
        nonNullCtx.beginPath()
        nonNullCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        nonNullCtx.fillStyle = this.color
        nonNullCtx.fill()
      }
    }

    const initParticles = () => {
      particles = []
      const particleCount = Math.floor((nonNullCanvas.width * nonNullCanvas.height) / 25000)
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle())
      }
    }

    const connectParticles = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 120) {
            const opacity = (1 - distance / 120) * 0.15
            nonNullCtx.beginPath()
            nonNullCtx.strokeStyle = `rgba(148, 163, 184, ${opacity})`
            nonNullCtx.lineWidth = 0.5
            nonNullCtx.moveTo(particles[i].x, particles[i].y)
            nonNullCtx.lineTo(particles[j].x, particles[j].y)
            nonNullCtx.stroke()
          }
        }
      }
    }

    const animate = () => {
      nonNullCtx.clearRect(0, 0, nonNullCanvas.width, nonNullCanvas.height)

      particles.forEach((particle) => {
        particle.update()
        particle.draw()
      })

      connectParticles()

      animationFrameId = requestAnimationFrame(animate)
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }

    resizeCanvas()
    initParticles()
    animate()

    window.addEventListener('resize', () => {
      resizeCanvas()
      initParticles()
    })
    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.3 }}
    />
  )
}
