"use client"

import { useState, useRef, useLayoutEffect } from "react"
import { MovieGrid } from "./movie-grid"

interface Channel {
  title: string
  ico: string
  playlist_url: string
}

const SERIAL_CHANNELS: Channel[] = [
  {
    title: "Обновления",
    ico: "updated",
    playlist_url: "https://api.vokino.pro/v2/list?sort=updatings&type=serial",
  },
  {
    title: "Новинки",
    ico: "newyear",
    playlist_url: "https://api.vokino.pro/v2/list?sort=new&type=serial",
  },
  {
    title: "Популярное",
    ico: "popular",
    playlist_url: "https://api.vokino.pro/v2/list?sort=popular&type=serial",
  },
  {
    title: "Лучшее",
    ico: "viewing",
    playlist_url: "https://api.vokino.pro/v2/list?sort=rating&type=serial",
  },
]

export function SerialsSection() {
  const [active, setActive] = useState(0)
  const prevYRef = useRef<number | null>(null)

  const preserveScroll = (cb: () => void) => {
    if (typeof window !== "undefined") {
      prevYRef.current = window.scrollY
    }
    cb()
  }

  useLayoutEffect(() => {
    const y = prevYRef.current
    if (typeof window !== "undefined" && y != null) {
      prevYRef.current = null
      requestAnimationFrame(() => window.scrollTo({ top: y }))
    }
  }, [active])

  return (
    <section>
      <div className="md:bg-zinc-900/40 md:backdrop-blur-sm md:border border-zinc-800/50 p-5 rounded-sm">
        <div className="sticky top-0 z-20 -mx-5 md:-mt-5 px-5 pt-0 md:pt-5 pb-3 md:bg-zinc-900/80 md:backdrop-blur-sm md:border-b md:border-zinc-800/50 rounded-t-sm">
          <div className="flex gap-3 flex-wrap md:flex-nowrap min-h-[40px]">
            {SERIAL_CHANNELS.map((ch, idx) => (
              <button
                key={idx}
                onClick={() => preserveScroll(() => setActive(idx))}
                className={`h-10 px-4 text-[13px] border transition-all duration-200 rounded-sm inline-flex items-center font-medium ${
                  active === idx
                    ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20"
                    : "bg-zinc-800/50 border-zinc-700/50 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
                }`}
              >
                {ch.title}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 overflow-anchor-none">
          <MovieGrid url={SERIAL_CHANNELS[active].playlist_url} />
        </div>
      </div>
    </section>
  )
}
