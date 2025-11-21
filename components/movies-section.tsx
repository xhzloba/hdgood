"use client"

import { useState, useRef, useLayoutEffect, useCallback, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { MovieGrid } from "./movie-grid"

interface Channel {
  title: string
  ico: string
  playlist_url: string
}

const MOVIE_CHANNELS: Channel[] = [
  {
    title: "Обновления",
    ico: "updated",
    playlist_url: "https://api.vokino.pro/v2/list?sort=updatings&type=movie",
  },
  {
    title: "Новинки",
    ico: "newyear",
    playlist_url: "https://api.vokino.pro/v2/list?sort=new&type=movie",
  },
  {
    title: "Популярное",
    ico: "popular",
    playlist_url: "https://api.vokino.pro/v2/list?sort=popular&type=movie",
  },
  {
    title: "Лучшее",
    ico: "viewing",
    playlist_url: "https://api.vokino.pro/v2/list?sort=rating&type=movie",
  },
]

export function MoviesSection({ onBackdropOverrideChange, onHeroInfoOverrideChange }: { onBackdropOverrideChange?: (bg: string | null, poster?: string | null) => void; onHeroInfoOverrideChange?: (info: { title?: string | null; logo?: string | null; logoId?: string | null; meta?: { ratingKP?: number | null; ratingIMDb?: number | null; year?: string | null; country?: string | null; genre?: string | null; duration?: string | null } | null } | null) => void }) {
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const preferPopular = sp?.get("tab") === "popular"
  const popularIndex = MOVIE_CHANNELS.findIndex((c) => c.title === "Популярное")
  const initialIdx = preferPopular && popularIndex >= 0 ? popularIndex : 0
  const [active, setActive] = useState(initialIdx)

  useEffect(() => {
    if (!preferPopular) return
    const id = setTimeout(() => {
      try { router.replace(pathname) } catch {}
    }, 0)
    return () => clearTimeout(id)
  }, [preferPopular, router, pathname])
  const prevYRef = useRef<number | null>(null)
  const [paging, setPaging] = useState<{ page: number; scrolledCount: number } | null>(null)
  const [watchOpen, setWatchOpen] = useState(false)
  const handlePagingInfo = useCallback((info: { page: number; scrolledCount: number; isArrowMode: boolean }) => {
    setPaging((prev) => {
      if (!info.isArrowMode) return null;
      if (prev && prev.page === info.page && prev.scrolledCount === info.scrolledCount) return prev;
      return { page: info.page, scrolledCount: info.scrolledCount };
    });
  }, [])

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

  useEffect(() => {
    setPaging({ page: 1, scrolledCount: 5 })
  }, [active])

  return (
    <section>
      <div className="p-5 rounded-sm">
        <div className={`sticky top-0 z-20 -mx-5 md:-mt-5 px-5 pt-0 md:pt-5 pb-3 rounded-t-sm transition-all duration-300 ${watchOpen ? "opacity-0 pointer-events-none -translate-y-2" : "opacity-100 translate-y-0"}`}>
          <div className="channel-tabs flex flex-wrap md:flex md:flex-nowrap items-center rounded-full px-1.5 py-0.5 gap-1.5 w-full">
            {MOVIE_CHANNELS.map((ch, idx) => (
              <button
                key={idx}
                data-active={active === idx ? "true" : "false"}
                onClick={() => preserveScroll(() => setActive(idx))}
                className={`channel-tab-btn inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-medium transition-all duration-200 ${
                  active === idx
                    ? "text-white h-10 shadow-[0_20px_40px_rgba(0,0,0,0.9)] -my-[5px] scale-[1.12]"
                    : "text-zinc-300/90 hover:text-white"
                }`}
                style={active === idx ? { backgroundColor: "rgb(var(--ui-accent-rgb))" } : undefined}
              >
                {ch.title}
              </button>
            ))}
            <span className="hidden md:inline-flex items-center gap-2 ml-auto text-[13px] text-white font-medium">
              {paging && (
                <>
                  <span className="text-white">Стр.</span>
                  <span
                    className="inline-flex items-center rounded-full text-white px-2 py-[2px]"
                    style={{ backgroundColor: "rgb(var(--ui-accent-rgb))" }}
                  >
                    {paging.page}
                  </span>
                  <span className="text-white">•</span>
                  <span className="text-white">Пролистано</span>
                  <span className="text-white">{paging.scrolledCount}</span>
                </>
              )}
            </span>
          </div>
        </div>
        <div className="mt-4 overflow-anchor-none">
          <MovieGrid
            url={MOVIE_CHANNELS[active].playlist_url}
            onPagingInfo={handlePagingInfo}
            onWatchOpenChange={setWatchOpen}
            onBackdropOverrideChange={onBackdropOverrideChange}
            onHeroInfoOverrideChange={onHeroInfoOverrideChange}
          />
        </div>
      </div>
    </section>
  )
}
