import { useEffect, useRef } from 'react'

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let particles: Particle[] = []
    let animationFrameId: number
    let mouse: { x: number; y: number } = { x: 0, y: 0 }

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
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
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.vx = (Math.random() - 0.5) * 0.5
        this.vy = (Math.random() - 0.5) * 0.5
        this.size = Math.random() * 3 + 1
        this.originalSize = this.size
        this.color = this.getRandomColor()
      }

      getRandomColor() {
        const colors = [
          'rgba(147, 51, 234, 0.5)',  // purple
          'rgba(236, 72, 153, 0.5)',  // pink
          'rgba(59, 130, 246, 0.5)',  // blue
          'rgba(16, 185, 129, 0.5)',  // green
          'rgba(245, 158, 11, 0.5)',  // amber
        ]
        return colors[Math.floor(Math.random() * colors.length)]
      }

      update() {
        // 鼠标交互
        const dx = mouse.x - this.x
        const dy = mouse.y - this.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 150) {
          const force = (150 - distance) / 150
          this.vx -= (dx / distance) * force * 0.02
          this.vy -= (dy / distance) * force * 0.02
          this.size = this.originalSize * (1 + force * 2)
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
        if (this.x < 0 || this.x > canvas.width) {
          this.vx *= -1
          this.x = Math.max(0, Math.min(canvas.width, this.x))
        }
        if (this.y < 0 || this.y > canvas.height) {
          this.vy *= -1
          this.y = Math.max(0, Math.min(canvas.height, this.y))
        }
      }

      draw() {
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fillStyle = this.color
        ctx.fill()

        // 发光效果
        ctx.shadowBlur = 15
        ctx.shadowColor = this.color
      }
    }

    const initParticles = () => {
      particles = []
      const particleCount = Math.floor((canvas.width * canvas.height) / 15000)
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

          if (distance < 150) {
            const opacity = (1 - distance / 150) * 0.3
            ctx.beginPath()
            ctx.strokeStyle = `rgba(147, 51, 234, ${opacity})`
            ctx.lineWidth = 1
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

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
      style={{ opacity: 0.6 }}
    />
  )
}