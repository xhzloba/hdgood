"use client"

import { useEffect, useState } from "react"

type CursorState = {
  x: number
  y: number
  visible: boolean
}

export function CursorPopcorn() {
  const [state, setState] = useState<CursorState>({ x: 0, y: 0, visible: false })

  useEffect(() => {
    // Не показываем на устройствах с тач-указателем
    if (typeof window !== "undefined") {
      // @ts-ignore
      if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
        return
      }
    }

    let frame: number | null = null

    const handleMove = (e: MouseEvent) => {
      const { clientX, clientY } = e
      if (frame != null) {
        cancelAnimationFrame(frame)
      }
      frame = requestAnimationFrame(() => {
        setState({
          x: clientX,
          y: clientY,
          visible: true,
        })
      })
    }

    window.addEventListener("mousemove", handleMove)
    window.addEventListener("mousedown", handleMove)

    return () => {
      if (frame != null) cancelAnimationFrame(frame)
      window.removeEventListener("mousemove", handleMove)
      window.removeEventListener("mousedown", handleMove)
    }
  }, [])

  if (!state.visible) return null

  const offsetX = 18
  const offsetY = 20

  return (
    <img
      src="/free-icon-popcorn-3259075.png"
      alt=""
      aria-hidden="true"
      className="pointer-events-none fixed z-[9999] select-none opacity-90"
      style={{
        transform: `translate3d(${state.x + offsetX}px, ${state.y + offsetY}px, 0)`,
        width: "32px",
        height: "32px",
      }}
    />
  )
}


