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
import { APP_SETTINGS } from "@/lib/settings"
import { getCountryLabel } from "@/lib/country-flags"
import { ratingColor, formatRatingLabel } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

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
  // На главной цвета из постера больше не используем
  // const currentColors = current ? current.colors : null
  const currentLogo = current ? current.logo ?? null : null
  const currentId = current ? current.id ?? null : null
  const [logoSrc, setLogoSrc] = useState<string | null>(null)
  const [logoId, setLogoId] = useState<string | null>(null)
  const [meta, setMeta] = useState<{ ratingKP?: number | null; ratingIMDb?: number | null; year?: string | null; country?: string | null; genre?: string | null; duration?: string | null } | null>(null)
  const [metaMap, setMetaMap] = useState<Record<string, { ratingKP?: number | null; ratingIMDb?: number | null; year?: string | null; country?: string | null; genre?: string | null; duration?: string | null }>>({})
  

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
    try {
      const ss = typeof window !== "undefined" ? window.sessionStorage : null
      if (!ss) return
      const raw = ss.getItem("homeBackdrop:lastMeta")
      if (!raw) return
      const data = JSON.parse(raw)
      if (data && data.meta) {
        setMeta(data.meta)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      const ss = typeof window !== "undefined" ? window.sessionStorage : null
      if (!ss) return
      const src = ss.getItem("homeBackdrop:lastLogoSrc")
      const id = ss.getItem("homeBackdrop:lastLogoId")
      if (src && id) {
        setLogoSrc(src)
        setLogoId(id)
      }
    } catch {}
  }, [])

  useEffect(() => {
    const src = currentLogo
    const id = currentId
    if (!id) return
    if (!src) {
      if (logoId !== id) {
        setLogoSrc(null)
        setLogoId(null)
        try {
          const ss = typeof window !== "undefined" ? window.sessionStorage : null
          if (ss) {
            ss.removeItem("homeBackdrop:lastLogoSrc")
            ss.removeItem("homeBackdrop:lastLogoId")
          }
        } catch {}
      }
      return
    }
    if (src === logoSrc && id === logoId) return
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      setLogoSrc(src)
      setLogoId(id)
      try {
        const ss = typeof window !== "undefined" ? window.sessionStorage : null
        if (ss) {
          ss.setItem("homeBackdrop:lastLogoSrc", src)
          ss.setItem("homeBackdrop:lastLogoId", id)
        }
      } catch {}
    }
    img.onerror = () => {}
    img.src = src
    return () => {
      cancelled = true
    }
  }, [currentLogo, currentId, logoSrc, logoId])

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
        const finalPairs = APP_SETTINGS.backdrop.showOnlyTopTrendingMovie
          ? resultPairs.slice(0, Math.max(1, APP_SETTINGS.backdrop.topTrendingCount))
          : resultPairs
        if (!cancelled) setBgPairs(finalPairs)
        if (!cancelled) {
          let idx = 0
          try {
            const ss = typeof window !== "undefined" ? window.sessionStorage : null
            const lastKey = ss ? ss.getItem("homeBackdrop:lastKey") : null
            const lastIndexRaw = ss ? ss.getItem("homeBackdrop:lastIndex") : null
            const lastIndex = lastIndexRaw ? parseInt(lastIndexRaw, 10) : 0
            if (lastKey) {
              const found = finalPairs.findIndex((p) => p.bg === lastKey)
              if (found >= 0) idx = found
              else if (Number.isFinite(lastIndex) && lastIndex >= 0 && lastIndex < finalPairs.length) idx = lastIndex
            } else if (Number.isFinite(lastIndex) && lastIndex >= 0 && lastIndex < finalPairs.length) {
              idx = lastIndex
            }
          } catch {}
          setBgIndex(idx)
        }
        const idsToPrefetch = finalPairs.map((p) => p.id).filter((v): v is string => !!v)
        if (idsToPrefetch.length > 0 && !cancelled) {
          const nextMap: Record<string, { ratingKP?: number | null; ratingIMDb?: number | null; year?: string | null; country?: string | null; genre?: string | null; duration?: string | null }> = {}
          for (const mid of idsToPrefetch) {
            try {
              const resp = await fetch(`https://api.vokino.pro/v2/view/${mid}`, { headers: { Accept: "application/json", "Content-Type": "application/json" } })
              if (!resp.ok) continue
              const data = await resp.json()
              const d = (data?.details ?? data) || {}
              const yrRaw = d.year ?? d.released ?? d.release_year ?? d.releaseYear
              const year = (() => {
                if (yrRaw == null) return null
                const s = String(yrRaw).trim()
                if (!s || s === "0") return null
                const m = s.match(/\d{4}/)
                return m ? m[0] : s
              })()
              const countryLabel = getCountryLabel(d.country) || null
              const genreVal = (() => {
                if (Array.isArray(d.genre)) {
                  const first = d.genre[0]
                  return first != null ? String(first).trim() : null
                }
                const g = d.genre ?? (Array.isArray(d.tags) ? d.tags.join(", ") : d.tags)
                if (g == null) return null
                const s = String(g)
                const first = s.split(/[,/|]/).map((p) => p.trim()).filter(Boolean)[0]
                return first || null
              })()
              const getValidRating = (r: any): number | null => {
                if (r == null) return null
                const v = parseFloat(String(r))
                if (Number.isNaN(v)) return null
                if (String(r) === "0.0" || v === 0) return null
                return v
              }
              const ratingKP = getValidRating((d as any).rating_kp)
              const ratingIMDb = getValidRating((d as any).rating_imdb)
              const durationStr = (() => {
                const raw = d.duration ?? d.time ?? d.runtime ?? d.length
                const toMinutes = (val: any): number | null => {
                  if (val == null) return null
                  if (typeof val === "number" && !Number.isNaN(val)) return Math.round(val)
                  if (typeof val === "string") {
                    const s = val.trim().toLowerCase()
                    if (s.includes(":")) {
                      const parts = s.split(":").map((p) => parseInt(p, 10))
                      if (parts.every((n) => !Number.isNaN(n))) {
                        if (parts.length === 3) {
                          const [h, m] = parts
                          return h * 60 + m
                        }
                        if (parts.length === 2) {
                          const [h, m] = parts
                          return h * 60 + m
                        }
                      }
                    }
                    const hoursMatch = s.match(/(\d+)\s*(ч|час|часа|часов|h|hr|hour|hours)/)
                    const minutesMatch = s.match(/(\d+)\s*(мин|м|m|min|minute|minutes)/)
                    if (hoursMatch || minutesMatch) {
                      const h = hoursMatch ? parseInt(hoursMatch[1], 10) : 0
                      const m = minutesMatch ? parseInt(minutesMatch[1], 10) : 0
                      return h * 60 + m
                    }
                    const num = parseInt(s.replace(/[^0-9]/g, ""), 10)
                    if (!Number.isNaN(num)) return num
                  }
                  return null
                }
                const mins = toMinutes(raw)
                if (mins == null) return null
                if (mins % 60 === 0) return `${mins} мин`
                const h = Math.floor(mins / 60)
                const m = mins % 60
                return h > 0 ? `${h}ч ${m} мин` : `${m} мин`
              })()
              nextMap[mid] = { ratingKP, ratingIMDb, year, country: countryLabel, genre: genreVal || null, duration: durationStr }
            } catch {}
          }
          if (!cancelled) setMetaMap((prev) => ({ ...prev, ...nextMap }))
        }
      } catch {}
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (bgPairs.length === 0) return
    const intervalMs = Math.max(1000, (APP_SETTINGS.backdrop.rotationIntervalSeconds ?? 10) * 1000)
    let mounted = true
    const ss = typeof window !== "undefined" ? window.sessionStorage : null
    const lastTickAtRaw = ss ? ss.getItem("homeBackdrop:lastTickAt") : null
    const lastTickAt = lastTickAtRaw ? parseInt(lastTickAtRaw, 10) : 0
    const now = Date.now()
    const elapsed = lastTickAt ? Math.max(0, now - lastTickAt) : 0
    const delay = Math.min(intervalMs, Math.max(100, intervalMs - elapsed))
    let timeoutId: any = null
    let intervalId: any = null
    const startInterval = () => {
      intervalId = setInterval(() => {
        setBgIndex((i) => {
          const next = (i + 1) % bgPairs.length
          try { if (ss) ss.setItem("homeBackdrop:lastTickAt", String(Date.now())) } catch {}
          return next
        })
      }, intervalMs)
    }
    timeoutId = setTimeout(() => {
      if (!mounted) return
      setBgIndex((i) => {
        const next = (i + 1) % bgPairs.length
        try { if (ss) ss.setItem("homeBackdrop:lastTickAt", String(Date.now())) } catch {}
        return next
      })
      startInterval()
    }, delay)
    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
      if (intervalId) clearInterval(intervalId)
    }
  }, [bgPairs])

  useEffect(() => {
    try {
      const ss = typeof window !== "undefined" ? window.sessionStorage : null
      if (!ss) return
      const key = currentBg || ""
      ss.setItem("homeBackdrop:lastIndex", String(bgIndex))
      if (key) ss.setItem("homeBackdrop:lastKey", key)
    } catch {}
  }, [bgIndex, currentBg])

  useEffect(() => {
    if (!currentId) return
    const m = metaMap[currentId]
    if (m) {
      setMeta(m)
      try {
        const ss = typeof window !== "undefined" ? window.sessionStorage : null
        if (ss) ss.setItem("homeBackdrop:lastMeta", JSON.stringify({ id: currentId, meta: m }))
      } catch {}
    }
  }, [currentId, metaMap])

  return (
    <PosterBackground
      posterUrl={currentPoster}
      bgPosterUrl={currentBg}
      // colorOverrides={currentColors}
      disableMobileBackdrop
      simpleDarkCorners
      className="min-h-[100dvh] min-h-screen"
    >
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
        <div className="relative z-30 hidden md:flex justify-center mt-[22vh] h-[96px]">
          {logoSrc && logoId ? (
            <Link href={`/movie/${logoId}`} className="block">
              <img src={logoSrc} alt="Логотип" className="h-[96px] w-auto max-w-[80vw]" />
            </Link>
          ) : null}
        </div>
        <div className="relative z-30 hidden md:flex justify-center mt-3">
          <div className="text-base md:text-lg font-semibold text-zinc-100 px-4 text-center h-6 md:h-7 leading-none w-full flex items-center justify-center">
            {meta ? (
              (() => {
                const yearVal = meta.year && String(meta.year).trim() ? String(meta.year).trim() : null
                const restArr = [meta.country, meta.genre, meta.duration]
                  .filter((v) => v && String(v).trim().length > 0) as string[]
                return (
                  <span className="inline-block max-w-[80vw] truncate whitespace-nowrap">
                    {(meta.ratingKP != null || meta.ratingIMDb != null) && (
                      <>
                        <span className="inline-flex items-center gap-2 align-middle">
                          <img
                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Kinopoisk_colored_square_icon.svg/2048px-Kinopoisk_colored_square_icon.svg.png"
                            alt="Кинопоиск"
                            className="w-5 h-5 rounded-sm"
                          />
                          <span
                            className={
                              meta.ratingKP != null && meta.ratingKP > 8.5
                                ? "font-semibold bg-clip-text text-transparent"
                                : `${ratingColor(meta.ratingKP ?? undefined)} font-semibold`
                            }
                            style={
                              meta.ratingKP != null && meta.ratingKP > 8.5
                                ? {
                                    backgroundImage:
                                      "linear-gradient(165deg, #ffd25e 16.44%, #b59646 63.42%)",
                                    WebkitBackgroundClip: "text",
                                    backgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                  }
                                : undefined
                            }
                          >
                            {meta.ratingKP != null ? formatRatingLabel(meta.ratingKP) : "—"}
                          </span>
                        </span>
                        {meta.ratingIMDb != null && (
                          <span className="inline-flex items-center gap-2 align-middle ml-3">
                            <img
                              src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/IMDB_Logo_2016.svg/1280px-IMDB_Logo_2016.svg.png"
                              alt="IMDb"
                              className="w-5 h-5 object-contain"
                            />
                            <span
                              className={
                                meta.ratingIMDb != null && meta.ratingIMDb > 8.5
                                  ? "font-semibold bg-clip-text text-transparent"
                                  : `${ratingColor(meta.ratingIMDb ?? undefined)} font-semibold`
                              }
                              style={
                                meta.ratingIMDb != null && meta.ratingIMDb > 8.5
                                  ? {
                                      backgroundImage:
                                        "linear-gradient(165deg, #ffd25e 16.44%, #b59646 63.42%)",
                                      WebkitBackgroundClip: "text",
                                      backgroundClip: "text",
                                      WebkitTextFillColor: "transparent",
                                    }
                                  : undefined
                              }
                            >
                              {formatRatingLabel(meta.ratingIMDb)}
                            </span>
                          </span>
                        )}
                      </>
                    )}
                    {(meta.ratingKP != null || meta.ratingIMDb != null) && (yearVal || restArr.length > 0) && (
                      <span className="text-zinc-400/60"> / </span>
                    )}
                    {yearVal && (
                      <span className="inline-flex items-center rounded-full bg-blue-600 text-white px-3 py-[3px] mr-2">
                        <span className="truncate">{yearVal}</span>
                      </span>
                    )}
                    {yearVal && restArr.length > 0 && (
                      <span className="text-zinc-400/60"> / </span>
                    )}
                    {restArr.length > 0 && (
                      <span className="truncate max-w-[60vw]">{restArr.join(" / ")}</span>
                    )}
                  </span>
                )
              })()
            ) : (
              <div className="flex justify-center">
                <Skeleton className="h-5 md:h-6 w-[40vw] max-w-[540px]" />
              </div>
            )}
          </div>
        </div>
        <section>
          <div className="relative z-20 mt-[2vh] md:mt-[10vh]">
            {isUhdMode ? (
              <UhdSection />
            ) : isMoviesMode ? (
              <MoviesSection />
            ) : isSerialsMode ? (
              <SerialsSection />
            ) : (
            <TrendingSection activeBackdropId={currentId ?? undefined} />
            )}
          </div>
        </section>
      </main>
    </PosterBackground>
  )
}
