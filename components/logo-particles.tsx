"use client"

import { useEffect, useRef } from "react"

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
}

const PARTICLE_COUNT = 18

export function LogoParticles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let frameId: number | null = null
    let particles: Particle[] = []
    let marginX = 0
    let marginY = 0

    const init = () => {
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
      const rect = canvas.parentElement?.getBoundingClientRect()
      const width = (rect?.width || 140) * dpr
      const height = (rect?.height || 48) * dpr
      canvas.width = width
      canvas.height = height
      canvas.style.width = `${width / dpr}px`
      canvas.style.height = `${height / dpr}px`

      marginX = width * 0.18
      marginY = height * 0.4

      particles = Array.from({ length: PARTICLE_COUNT }).map(() => {
        const baseSpeed = 0.08
        const maxSpeed = 0.22
        const vx = (Math.random() * (maxSpeed - baseSpeed) + baseSpeed) * (Math.random() > 0.5 ? 1 : -1)
        const vy = (Math.random() * (maxSpeed - baseSpeed) + baseSpeed) * (Math.random() > 0.5 ? 1 : -1)
        return {
          x: Math.random() * (width + 2 * marginX) - marginX,
          y: Math.random() * (height + 2 * marginY) - marginY,
          vx,
          vy,
          radius: Math.random() * 1.0 + 0.5,
          alpha: Math.random() * 0.4 + 0.22,
        }
      })
    }

    init()

    const draw = () => {
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)

      // лёгкий общий tint, чтобы частицы чуть «светились» в глубине
      ctx.globalCompositeOperation = "lighter"

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy

        // мягкое хаотичное движение: если вышли за расширенные границы — возвращаем с противоположной стороны
        if (p.x < -marginX) p.x = width + marginX
        if (p.x > width + marginX) p.x = -marginX
        if (p.y < -marginY) p.y = height + marginY
        if (p.y > height + marginY) p.y = -marginY

        // лёгкое дрожание прозрачности для живости
        p.alpha += (Math.random() - 0.5) * 0.02
        p.alpha = Math.min(0.55, Math.max(0.18, p.alpha))

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2.4)
        gradient.addColorStop(0, `rgba(191, 219, 254, ${p.alpha})`)
        gradient.addColorStop(0.4, `rgba(96, 165, 250, ${p.alpha * 0.9})`)
        gradient.addColorStop(1, "rgba(15, 23, 42, 0)")

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius * 2.4, 0, Math.PI * 2)
        ctx.fill()
      }

      frameId = window.requestAnimationFrame(draw)
    }

    frameId = window.requestAnimationFrame(draw)

    const onResize = () => {
      init()
    }
    window.addEventListener("resize", onResize)

    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId)
      window.removeEventListener("resize", onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute -inset-3 -z-10"
    />
  )
}


