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
      <div className="p-5 rounded-sm">
        <div className="sticky top-0 z-20 -mx-5 md:-mt-5 px-5 pt-0 md:pt-5 pb-3 rounded-t-sm">
          <div className="inline-flex items-center rounded-full px-1.5 py-0.5">
            {SERIAL_CHANNELS.map((ch, idx) => (
              <button
                key={idx}
                onClick={() => preserveScroll(() => setActive(idx))}
                className={`inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-medium transition-all duration-200 ${
                  active === idx
                    ? "bg-blue-600 text-white h-10 shadow-[0_20px_40px_rgba(0,0,0,0.9)] -my-[5px] scale-[1.12]"
                    : "text-zinc-300/90 hover:text-white"
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
