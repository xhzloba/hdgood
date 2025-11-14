"use client"

import { useState, useEffect } from "react"
import { HeaderCategories } from "./header-categories"
import { TrendingSection } from "./trending-section"
import { UhdSection } from "./uhd-section"
import { MoviesSection } from "./movies-section"
import { SerialsSection } from "./serials-section"
import { CATEGORIES } from "@/lib/categories"
import type { Category } from "@/lib/categories"
import { usePathname } from "next/navigation"
import Link from "next/link"
import NProgress from "nprogress"
import { PosterBackground } from "@/components/poster-background"

type HomeClientProps = {
  initialSelectedTitle?: string
}

export default function HomeClient({ initialSelectedTitle }: HomeClientProps) {
  const pathname = usePathname()
  const [selected, setSelected] = useState<Category | null>(() => {
    if (!initialSelectedTitle) return null
    return CATEGORIES.find((c) => c.title === initialSelectedTitle) ?? null
  })
  const [bgPairs, setBgPairs] = useState<{ bg: string; poster: string; colors?: any; logo?: string | null; id?: string | null }[]>([])
  const [bgIndex, setBgIndex] = useState(0)
  const current = bgPairs.length > 0 ? bgPairs[bgIndex % bgPairs.length] : null
  const currentBg = current ? current.bg : null
  const currentPoster = current ? current.poster : null
  const currentColors = current ? current.colors : null
  const currentLogo = current ? current.logo ?? null : null
  const currentId = current ? current.id ?? null : null
  

  const handleSelect = (cat: Category | null) => {
    setSelected(cat)
  }

  const isUhdMode = selected?.title === "4K UHD"
  const isMoviesMode = selected?.title === "Фильмы"
  const isSerialsMode = selected?.title === "Сериалы"
  const activeIndex = selected ? CATEGORIES.findIndex((c) => c.title === selected.title) : null
  const handleActiveIndexChange = (index: number | null) => {
    if (index == null) {
      setSelected(null)
      return
    }
    const cat = CATEGORIES[index]
    // Только локально управляемые категории без маршрута должны менять selected сразу
    if (!cat.route) {
      setSelected(cat)
    }
  }

  useEffect(() => {
    NProgress.done()
  }, [pathname])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("https://api.vokino.pro/v2/list?sort=popular", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        })
        if (!res.ok) return
        const data = await res.json()
        const items: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.channels)
          ? data.channels
          : []
        const ids: string[] = []
        for (const it of items) {
          const d = it?.details || it
          const id = d?.id || it?.id
          if (id) ids.push(String(id))
        }
        let overridesMap: Record<string, any> = {}
        if (ids.length > 0) {
          try {
            const or = await fetch(`/api/overrides/movies?ids=${encodeURIComponent(ids.join(","))}`, {
              headers: { Accept: "application/json" },
              cache: "no-store",
            })
            if (or.ok) {
              overridesMap = (await or.json()) || {}
            }
          } catch {}
        }

        const pairsMap = new Map<string, { bg: string; poster: string; colors?: any; logo?: string | null; id?: string | null }>()
        for (const it of items) {
          const d = it?.details || it
          const id = d?.id || it?.id
          const ov = id ? overridesMap[String(id)] || null : null
          const bg =
            (ov?.backdrop as string) ||
            (ov?.bg_poster?.backdrop as string) ||
            (d?.backdrop as string) ||
            (d?.bg_poster?.backdrop as string) ||
            (it?.backdrop as string) ||
            (it?.bg_poster?.backdrop as string) ||
            ""
          const poster =
            (ov?.poster as string) ||
            (ov?.bg_poster?.poster as string) ||
            (d?.poster as string) ||
            (d?.bg_poster?.poster as string) ||
            (it?.poster as string) ||
            (it?.bg_poster?.poster as string) ||
            bg
          if (typeof bg === "string" && bg.trim().length > 0) {
            const key = bg.trim()
            const p = typeof poster === "string" && poster.trim().length > 0 ? poster.trim() : key
            const colors = (ov as any)?.poster_colors || (ov as any)?.colors || undefined
            const logo = (ov as any)?.poster_logo ?? null
            const gid = id ? String(id) : null
            const next = { bg: key, poster: p, colors, logo, id: gid }
            const prev = pairsMap.get(key)
            if (!prev) {
              pairsMap.set(key, next)
            } else {
              const shouldReplace = (!!logo && !prev.logo) || (!!colors && !prev.colors)
              if (shouldReplace) pairsMap.set(key, next)
            }
          }
        }
        const resultPairs = Array.from(pairsMap.values())
        if (!cancelled) setBgPairs(resultPairs)
        if (!cancelled) setBgIndex(0)
      } catch {}
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (bgPairs.length === 0) return
    const id = setInterval(() => {
      setBgIndex((i) => (i + 1) % bgPairs.length)
    }, 9000)
    return () => clearInterval(id)
  }, [bgPairs])

  return (
    <PosterBackground posterUrl={currentPoster} bgPosterUrl={currentBg} colorOverrides={currentColors} className="min-h-[100dvh] min-h-screen">
      <main className="mx-auto max-w-7xl px-0 md:px-6 pt-0 md:pt-6 pb-16 md:pb-6">
        <div className="mb-4 hidden md:block">
          <HeaderCategories
            variant="horizontal"
            className="!bg-transparent !border-transparent relative z-40"
            onSelect={handleSelect}
            activeIndex={activeIndex}
            onActiveIndexChange={handleActiveIndexChange}
          />
        </div>
        <div className="relative z-30 flex justify-center mt-[14vh] md:mt-[22vh] h-[64px] md:h-[96px]">
          {currentLogo && currentId ? (
            <Link href={`/movie/${currentId}`} className="block">
              <img src={currentLogo} alt="Логотип" className="h-[64px] md:h-[96px] w-auto max-w-[80vw]" />
            </Link>
          ) : null}
        </div>
        <section>
          {isUhdMode ? (
            <UhdSection />
          ) : isMoviesMode ? (
            <MoviesSection />
          ) : isSerialsMode ? (
            <SerialsSection />
          ) : (
            <div className={`relative z-20 mt-[6vh] md:mt-[14vh]`}>
              <TrendingSection />
            </div>
          )}
        </section>
      </main>
    </PosterBackground>
  )
}
