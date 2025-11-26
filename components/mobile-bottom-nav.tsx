"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import { ratingBgColor, formatRatingLabel } from "@/lib/utils"
import { IconHome, IconSearch, IconBadge4k, IconMovie, IconDeviceTv, IconHeart, IconBell } from "@tabler/icons-react"
import { CATEGORIES } from "@/lib/categories"
import type { Category } from "@/lib/categories"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { MovieGrid } from "@/components/movie-grid"
import NProgress from "nprogress"

export default function MobileBottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [moreSelectedIndex, setMoreSelectedIndex] = useState<number | null>(null)
  const [hasPremiereUpdates, setHasPremiereUpdates] = useState(false)
  const [isBellOpen, setIsBellOpen] = useState(false)
  const [bellTab, setBellTab] = useState<"premieres" | "serials">("premieres")
  const [premieres, setPremieres] = useState<any[]>([])
  const [premieresLoading, setPremieresLoading] = useState(false)
  const [serials, setSerials] = useState<any[]>([])
  const [serialsLoading, setSerialsLoading] = useState(false)

  const isHome = pathname === "/"
  const isSearchMode = pathname?.startsWith("/search")
  const isMoviesMode = pathname === "/movies"
  const isSerialsMode = pathname === "/serials"
  const isUhdMode = pathname === "/uhd"

  const isDetailPage = pathname?.startsWith("/movie/")


  useEffect(() => {
    NProgress.done()
  }, [pathname])

  useEffect(() => {
    let cancelled = false
    const checkUpdates = async () => {
      try {
        const controller = new AbortController()
        const tid = setTimeout(() => controller.abort(), 5000)
        const res = await fetch("https://api.vokino.pro/v2/list?sort=popular", { headers: { Accept: "application/json" }, cache: "no-store", signal: controller.signal })
        clearTimeout(tid)
        if (!res.ok) return
        const data = await res.json()
        const items: any[] = Array.isArray(data) ? data : Array.isArray(data?.channels) ? data.channels : []
        const parseReleased = (val: any): { y: number; m: number; d: number } | null => {
          if (val == null) return null
          const s = String(val).trim()
          const m1 = s.match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/)
          if (m1) return { y: parseInt(m1[1], 10), m: parseInt(m1[2], 10), d: parseInt(m1[3], 10) }
          const m2 = s.toLowerCase().match(/(\d{1,2})\s+([а-яё]+)\s+(\d{4})/)
          if (m2) {
            const monthMap: Record<string, number> = { января:1, февраля:2, марта:3, апреля:4, мая:5, июня:6, июля:7, августа:8, сентября:9, октября:10, ноября:11, декабря:12 }
            const mm = monthMap[m2[2]]
            if (mm) return { y: parseInt(m2[3], 10), m: mm, d: parseInt(m2[1], 10) }
          }
          const d = new Date(s)
          if (!isNaN(d.getTime())) return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }
          return null
        }
        const now = new Date()
        const lookbackDays = 30
        const nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        const filtered = items.filter((it: any) => {
          const d = it?.details || it || {}
          const rel = d.release_date ?? d.released ?? d.releaseDate ?? null
          const p = parseReleased(rel)
          if (!p) return false
          const relMid = new Date(p.y, p.m - 1, p.d).getTime()
          const diffDays = Math.floor((nowMid - relMid) / 86400000)
          return diffDays >= 0 && diffDays <= lookbackDays
        }).sort((a: any, b: any) => {
          const da = parseReleased((a?.details || a || {}).release_date ?? (a?.details || a || {}).released)
          const db = parseReleased((b?.details || b || {}).release_date ?? (b?.details || b || {}).released)
          const ta = da ? new Date(da.y, da.m - 1, da.d).getTime() : 0
          const tb = db ? new Date(db.y, db.m - 1, db.d).getTime() : 0
          return tb - ta
        })
        const maxCount = 5
        const mapped = filtered.slice(0, maxCount).map((it: any) => {
          const d = it?.details || it || {}
          return {
            id: String(d.id ?? it.id ?? ""),
            released: (d.release_date as any) ?? (d.released as any) ?? null,
          }
        })
        const currKey = JSON.stringify(mapped.map((m: any) => `${m.id}:${m.released ?? ""}`))
        const ls = typeof window !== "undefined" ? window.localStorage : null
        const prev = ls?.getItem("premieres:lastKey") || null
        if (!cancelled) setHasPremiereUpdates(!prev || prev !== currKey)
      } catch {}
    }
    checkUpdates()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!isBellOpen) return
    const fetchPremieres = async () => {
      setPremieresLoading(true)
      try {
        const controller = new AbortController()
        const tid = setTimeout(() => controller.abort(), 5000)
        const res = await fetch("https://api.vokino.pro/v2/list?sort=popular", { headers: { Accept: "application/json" }, cache: "no-store", signal: controller.signal })
        clearTimeout(tid)
        if (!res.ok) throw new Error(String(res.status))
        const data = await res.json()
        const items: any[] = Array.isArray(data) ? data : Array.isArray(data?.channels) ? data.channels : []
        const parseReleased = (val: any): { y: number; m: number; d: number } | null => {
          if (val == null) return null
          const s = String(val).trim()
          const m1 = s.match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/)
          if (m1) return { y: parseInt(m1[1], 10), m: parseInt(m1[2], 10), d: parseInt(m1[3], 10) }
          const m2 = s.toLowerCase().match(/(\d{1,2})\s+([а-яё]+)\s+(\d{4})/)
          if (m2) {
            const monthMap: Record<string, number> = { января:1, февраля:2, марта:3, апреля:4, мая:5, июня:6, июля:7, августа:8, сентября:9, октября:10, ноября:11, декабря:12 }
            const mm = monthMap[m2[2]]
            if (mm) return { y: parseInt(m2[3], 10), m: mm, d: parseInt(m2[1], 10) }
          }
          const d = new Date(s)
          if (!isNaN(d.getTime())) return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }
          return null
        }
        const now = new Date()
        const lookbackDays = 30
        const nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        const filtered = items.filter((it: any) => {
          const d = it?.details || it || {}
          const rel = d.release_date ?? d.released ?? d.releaseDate ?? null
          const p = parseReleased(rel)
          if (!p) return false
          const relMid = new Date(p.y, p.m - 1, p.d).getTime()
          const diffDays = Math.floor((nowMid - relMid) / 86400000)
          return diffDays >= 0 && diffDays <= lookbackDays
        }).sort((a: any, b: any) => {
          const da = parseReleased((a?.details || a || {}).release_date ?? (a?.details || a || {}).released)
          const db = parseReleased((b?.details || b || {}).release_date ?? (b?.details || b || {}).released)
          const ta = da ? new Date(da.y, da.m - 1, da.d).getTime() : 0
          const tb = db ? new Date(db.y, db.m - 1, db.d).getTime() : 0
          return tb - ta
        })
        const toRatingLabel = (r: any): string | null => {
          if (r == null) return null
          const s = String(r).trim()
          if (!s || s === "0" || s === "0.0") return null
          const n = parseFloat(s)
          if (Number.isNaN(n) || n === 0) return null
          return s
        }
        const maxCount = 5
        const mapped = filtered.slice(0, maxCount).map((it: any) => {
          const d = it?.details || it || {}
          return {
            id: String(d.id ?? it.id ?? ""),
            title: d.name ?? it.name ?? d.title ?? null,
            poster: d.poster ?? it.poster ?? d.cover ?? null,
            description: d.about ?? d.plot ?? d.description ?? null,
            released: d.release_date ?? d.released ?? null,
            ratingLabel: toRatingLabel(d.rating_kp ?? d.rating ?? it.rating ?? null),
            href: d.id ? `/movie/${String(d.id)}` : null,
          }
        })
        try {
          const idsString = mapped.map((m: any) => String(m.id)).filter(Boolean).join(",")
          if (idsString) {
            const resOv = await fetch(`/api/overrides/movies?ids=${encodeURIComponent(idsString)}`, { headers: { Accept: "application/json" }, cache: "no-store" })
            const okOv = resOv.ok
            const ovMap = okOv ? (await resOv.json()) || {} : {}
            for (let i = 0; i < mapped.length; i++) {
              const id = String(mapped[i].id)
              const ov = (ovMap as any)[id] ?? null
              if (ov && ov.poster) mapped[i].poster = ov.poster
              if (ov && (ov.name || ov.title)) mapped[i].title = ov.name || ov.title
            }
          }
        } catch {}
        // details
        try {
          const ids = mapped.map((m: any) => m.id).filter(Boolean)
          const detailMap: Record<string, any> = {}
          for (const mid of ids) {
            try {
              const controller2 = new AbortController()
              const tid2 = setTimeout(() => controller2.abort(), 4500)
              const resp = await fetch(`https://api.vokino.pro/v2/view/${mid}`, { headers: { Accept: "application/json", "Content-Type": "application/json" }, signal: controller2.signal })
              clearTimeout(tid2)
              if (!resp.ok) continue
              const data2 = await resp.json()
              const d2 = (data2?.details ?? data2) || {}
              const getRating = (r: any): { value: number; label: string } | null => {
                if (r == null) return null
                const label = String(r)
                const value = parseFloat(label)
                if (Number.isNaN(value) || value === 0 || label === "0.0") return null
                return { value, label }
              }
              const yrRaw = (d2 as any).year ?? (d2 as any).released ?? (d2 as any).release_year ?? (d2 as any).releaseDate
              const year = (() => {
                if (yrRaw == null) return null
                const s = String(yrRaw).trim()
                if (!s || s === "0") return null
                const m = s.match(/\d{4}/)
                return m ? m[0] : s
              })()
              const dateStr = (d2 as any).release_date ?? (d2 as any).released ?? null
              const ratingKP = getRating((d2 as any).rating_kp ?? (d2 as any).rating)
              const ratingIMDb = getRating((d2 as any).rating_imdb)
              const description2 = (d2 as any).about ?? (d2 as any).plot ?? (d2 as any).description ?? null
              const countryRaw = (d2 as any).country ?? null
              const countryLabel = (() => {
                if (!countryRaw) return null
                const arr = Array.isArray(countryRaw) ? countryRaw : String(countryRaw).split(",").map((s) => s.trim()).filter(Boolean)
                if (arr.length === 0) return null
                return arr.join(", ")
              })()
              const ratingLabelFromList = mapped.find((m: any) => String(m.id) === mid)?.ratingLabel ?? null
              const ratingLabel = ratingLabelFromList ?? (ratingKP?.label ?? ratingIMDb?.label) ?? null
              const ratingValue = ratingLabel != null ? parseFloat(String(ratingLabel)) : (ratingKP?.value ?? ratingIMDb?.value) ?? null
              const typeLabel = "Премьера"
              detailMap[mid] = { year, releaseDate: dateStr, ratingValue, ratingLabel, typeLabel, description: description2, countryLabel }
            } catch {}
          }
          const combined = mapped.map((p: any) => ({ ...p, meta: detailMap[p.id] || null, description: (detailMap[p.id]?.description ?? p.description) || null }))
          setPremieres(combined)
        } catch {
          setPremieres(mapped)
        }
      } catch {
        setPremieres([])
      } finally {
        setPremieresLoading(false)
      }
    }
    fetchPremieres()
  }, [isBellOpen])

  useEffect(() => {
    if (!isBellOpen) return
    if (bellTab !== "serials") return
    const fetchSerials = async () => {
      setSerialsLoading(true)
      try {
        const controller = new AbortController()
        const tid = setTimeout(() => controller.abort(), 5000)
        const res = await fetch("https://api.vokino.pro/v2/list?sort=updatings&type=serial", { headers: { Accept: "application/json" }, cache: "no-store", signal: controller.signal })
        clearTimeout(tid)
        if (!res.ok) throw new Error(String(res.status))
        const data = await res.json()
        const items: any[] = Array.isArray(data) ? data : Array.isArray(data?.channels) ? data.channels : []
        const toRatingLabel = (r: any): string | null => {
          if (r == null) return null
          const s = String(r).trim()
          if (!s || s === "0" || s === "0.0") return null
          const n = parseFloat(s)
          if (Number.isNaN(n) || n === 0) return null
          return s
        }
        const mapped = items.map((it: any) => {
          const d = it?.details || it || {}
          const id = String(d.id ?? it.id ?? "")
          const title = d.name ?? it.name ?? d.title ?? null
          const poster = d.poster ?? it.poster ?? d.cover ?? null
          const ratingLabel = toRatingLabel(d.rating_kp ?? d.rating ?? it.rating ?? null)
          const description = d.about ?? d.plot ?? d.description ?? null
          return { id, title, poster, ratingLabel, description }
        }).filter((m: any) => !!m.id && !!m.title && !!m.ratingLabel)
        const top = mapped.slice(0, 15)
        try {
          const idsString = top.map((m: any) => String(m.id)).filter(Boolean).join(",")
          if (idsString) {
            const resOv = await fetch(`/api/overrides/movies?ids=${encodeURIComponent(idsString)}`, { headers: { Accept: "application/json" }, cache: "no-store" })
            const okOv = resOv.ok
            const ovMap = okOv ? (await resOv.json()) || {} : {}
            for (let i = 0; i < top.length; i++) {
              const id = String(top[i].id)
              const ov = (ovMap as any)[id] ?? null
              if (ov && ov.poster) top[i].poster = ov.poster
              if (ov && (ov.name || ov.title)) top[i].title = ov.name || ov.title
            }
          }
        } catch {}
        try {
          const ids = top.map((m: any) => m.id).filter(Boolean)
          const detailMap: Record<string, any> = {}
          for (const mid of ids) {
            try {
              const controller2 = new AbortController()
              const tid2 = setTimeout(() => controller2.abort(), 4500)
              const resp = await fetch(`https://api.vokino.pro/v2/view/${mid}`, { headers: { Accept: "application/json", "Content-Type": "application/json" }, signal: controller2.signal })
              clearTimeout(tid2)
              if (!resp.ok) continue
              const data2 = await resp.json()
              const d2 = (data2?.details ?? data2) || {}
              const getRating = (r: any): { value: number; label: string } | null => {
                if (r == null) return null
                const label = String(r)
                const value = parseFloat(label)
                if (Number.isNaN(value) || value === 0 || label === "0.0") return null
                return { value, label }
              }
              const yrRaw = (d2 as any).year ?? (d2 as any).released ?? (d2 as any).release_year ?? (d2 as any).releaseDate
              const year = (() => {
                if (yrRaw == null) return null
                const s = String(yrRaw).trim()
                if (!s || s === "0") return null
                const m = s.match(/\d{4}/)
                return m ? m[0] : s
              })()
              const ratingKP = getRating((d2 as any).rating_kp ?? (d2 as any).rating)
              const ratingIMDb = getRating((d2 as any).rating_imdb)
              const description2 = (d2 as any).about ?? (d2 as any).plot ?? (d2 as any).description ?? null
              const countryRaw = (d2 as any).country ?? null
              const countryLabel = (() => {
                if (!countryRaw) return null
                const arr = Array.isArray(countryRaw) ? countryRaw : String(countryRaw).split(",").map((s) => s.trim()).filter(Boolean)
                if (arr.length === 0) return null
                return arr.join(", ")
              })()
              const fromList = top.find((m: any) => String(m.id) === mid)?.ratingLabel ?? null
              const ratingLabel = fromList ?? (ratingKP?.label ?? ratingIMDb?.label) ?? null
              const ratingValue = ratingLabel != null ? parseFloat(String(ratingLabel)) : (ratingKP?.value ?? ratingIMDb?.value) ?? null
              const typeLabel = "Сериал"
              detailMap[mid] = { year, ratingValue, ratingLabel, typeLabel, description: description2, countryLabel }
            } catch {}
          }
          const combined = top.map((p: any) => ({ ...p, meta: detailMap[p.id] || null, description: (detailMap[p.id]?.description ?? p.description) || null }))
          setSerials(combined)
        } catch {
          setSerials(top)
        }
      } catch {
        setSerials([])
      } finally {
        setSerialsLoading(false)
      }
    }
    fetchSerials()
  }, [isBellOpen, bellTab])

  if (isDetailPage) return null

  return (
    <>
      <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-zinc-900/80 px-3 py-2 border border-zinc-800/70 shadow-[0_18px_45px_rgba(0,0,0,0.9)] backdrop-blur-sm">
          <button
            type="button"
            aria-label="Главная"
            onClick={() => {
              const href = "/"
              if (pathname !== href) {
                NProgress.set(0.2)
                NProgress.start()
                router.push(href)
              }
            }}
            className={[
              "inline-flex items-center justify-center h-11 w-11 rounded-full transition-all duration-200",
              isHome
                ? "bg-zinc-100 text-zinc-900 shadow-[0_20px_40px_rgba(0,0,0,0.9)] -my-[3px] scale-[1.08]"
                : "text-zinc-300/90 hover:text-white",
            ].join(" ")}
          >
            <IconHome className="w-5 h-5" stroke={1.6} />
          </button>
          <button
            type="button"
            aria-label="Поиск"
            onClick={() => {
              const href = "/search"
              if (pathname !== href) {
                NProgress.set(0.2)
                NProgress.start()
                router.push(href)
              }
            }}
            className={[
              "inline-flex items-center justify-center h-11 w-11 rounded-full transition-all duration-200",
              isSearchMode
                ? "bg-zinc-100 text-zinc-900 shadow-[0_20px_40px_rgba(0,0,0,0.9)] -my-[3px] scale-[1.08]"
                : "text-zinc-300/90 hover:text-white",
            ].join(" ")}
          >
            <IconSearch className="w-5 h-5" stroke={1.6} />
          </button>
          <button
            type="button"
            aria-label="Фильмы"
            onClick={() => {
              const cat = CATEGORIES.find((c) => c.title === "Фильмы")
              if (cat?.route) {
                const href = cat.route
                if (pathname !== href) {
                  NProgress.set(0.2)
                  NProgress.start()
                  router.push(href)
                }
              }
            }}
            className={[
              "inline-flex items-center justify-center h-11 w-11 rounded-full transition-all duration-200",
              isMoviesMode
                ? "bg-zinc-100 text-zinc-900 shadow-[0_20px_40px_rgba(0,0,0,0.9)] -my-[3px] scale-[1.08]"
                : "text-zinc-300/90 hover:text-white",
            ].join(" ")}
          >
            <IconMovie className="w-5 h-5" stroke={1.6} />
          </button>
          <button
            type="button"
            aria-label="Сериалы"
            onClick={() => {
              const cat = CATEGORIES.find((c) => c.title === "Сериалы")
              if (cat?.route) {
                const href = cat.route
                if (pathname !== href) {
                  NProgress.set(0.2)
                  NProgress.start()
                  router.push(href)
                }
              }
            }}
            className={[
              "inline-flex items-center justify-center h-11 w-11 rounded-full transition-all duration-200",
              isSerialsMode
                ? "bg-zinc-100 text-zinc-900 shadow-[0_20px_40px_rgba(0,0,0,0.9)] -my-[3px] scale-[1.08]"
                : "text-zinc-300/90 hover:text-white",
            ].join(" ")}
          >
            <IconDeviceTv className="w-5 h-5" stroke={1.6} />
          </button>
          <button
            type="button"
            aria-label="4K UHD"
            onClick={() => {
              const cat = CATEGORIES.find((c) => c.title === "4K UHD")
              if (cat?.route) {
                const href = cat.route
                if (pathname !== href) {
                  NProgress.set(0.2)
                  NProgress.start()
                  router.push(href)
                }
              }
            }}
            className={[
              "inline-flex items-center justify-center h-11 w-11 rounded-full transition-all duration-200",
              isUhdMode
                ? "bg-zinc-100 text-zinc-900 shadow-[0_20px_40px_rgba(0,0,0,0.9)] -my-[3px] scale-[1.08]"
                : "text-zinc-300/90 hover:text-white",
            ].join(" ")}
          >
            <IconBadge4k className="w-5 h-5" stroke={1.6} />
          </button>
          <button
            type="button"
            aria-label="Избранное"
            className="inline-flex items-center justify-center h-11 w-11 rounded-full text-zinc-300/90 hover:text-white transition-all duration-200"
          >
            <IconHeart className="w-5 h-5" stroke={1.6} />
          </button>
          <button
            type="button"
            aria-label="Премьеры"
            onClick={() => setIsBellOpen(true)}
            className="relative inline-flex items-center justify-center h-11 w-11 rounded-full text-zinc-300/90 hover:text-white transition-all duration-200"
          >
            <IconBell className="w-5 h-5" stroke={1.6} />
            {hasPremiereUpdates && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-zinc-900" />
            )}
          </button>
        </div>
      </nav>
      <Drawer open={isMoreOpen} onOpenChange={(o) => { setIsMoreOpen(o); if (!o) setMoreSelectedIndex(null) }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Категории</DrawerTitle>
          </DrawerHeader>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.filter((c) => !["4K UHD", "Фильмы", "Сериалы"].includes(c.title)).map((cat, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (cat.route) {
                      const href = cat.route
                      setIsMoreOpen(false)
                      if (pathname !== href) {
                        NProgress.set(0.2)
                        NProgress.start()
                        router.push(href)
                      }
                    } else {
                      setMoreSelectedIndex(idx)
                    }
                  }}
                  className={`p-3 border text-left transition-all duration-200 rounded-sm ${moreSelectedIndex === idx ? "text-white" : "bg-zinc-900/40 border-zinc-800/50 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60"}`}
                  style={moreSelectedIndex === idx ? { backgroundColor: "rgb(var(--ui-accent-rgb))", borderColor: "rgb(var(--ui-accent-rgb))" } : undefined}
                >
                  <div className="text-[11px] font-medium">{cat.title}</div>
                </button>
              ))}
            </div>
            {(() => {
              const extras = CATEGORIES.filter((c) => !["4K UHD", "Фильмы", "Сериалы"].includes(c.title))
              if (moreSelectedIndex == null) return null
              const chosen = extras[moreSelectedIndex]
              if (!chosen) return null
              return (
                <div className="mt-4">
                  <MovieGrid url={chosen.playlist_url} />
                </div>
              )
            })()}
          </div>
        </DrawerContent>
      </Drawer>
      <Drawer open={isBellOpen} onOpenChange={(o) => setIsBellOpen(o)}>
        <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[50vh] h-[50vh]">
          <DrawerHeader>
            <DrawerTitle>Премьеры</DrawerTitle>
          </DrawerHeader>
          <div className="p-3 flex-1 min-h-0 overflow-y-auto">
            <Tabs value={bellTab} onValueChange={(v) => setBellTab(v as any)}>
              <TabsList className="bg-zinc-800/70 rounded-full px-1.5 py-1">
                <TabsTrigger value="premieres" className="rounded-full px-3">Премьеры</TabsTrigger>
                <TabsTrigger value="serials" className="rounded-full px-3">Обновление сериалов</TabsTrigger>
              </TabsList>
              <TabsContent value="premieres" className="mt-3">
                <div className="flex flex-col gap-2">
                  {premieresLoading ? (
                    <div className="flex items-center justify-center" style={{ minHeight: 300 }}>
                      <Spinner className="size-6 text-zinc-300" />
                    </div>
                  ) : premieres.length === 0 ? (
                    <div className="text-sm text-zinc-400">За последний месяц премьер нет</div>
                  ) : (
                    premieres.map((p, idx) => (
                      <a key={idx} href={p.href ?? undefined} className="block">
                        <div className="bg-zinc-900/70 rounded-[10px] p-2 flex items-start gap-2">
                          <div className="relative aspect-[2/3] w-[64px] rounded-[6px] overflow-hidden bg-zinc-800/60">
                            {p.poster ? (
                              <img src={p.poster} alt={String(p.title ?? "")} className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-400">нет постера</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex items-center gap-2">
                                <div className="text-[13px] md:text-sm font-semibold text-zinc-100 truncate">{p.title ? `${p.meta?.typeLabel ?? "Премьера"}: ${p.title}` : "Премьера"}</div>
                              </div>
                              <div className="text-[11px] text-zinc-400 whitespace-nowrap">{formatRuDate(p.meta?.releaseDate ?? p.released)}</div>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[12px] text-zinc-400">
                              {(() => {
                                const rv = p.meta?.ratingValue
                                const rl = p.meta?.ratingLabel
                                if (rv != null || rl) {
                                  return (
                                    <span className={["shrink-0 inline-flex items-center rounded-full px-1.5 py-[1px] text-[12px] text-white", ratingBgColor(rv ?? rl)].join(" ")}>{rl ? formatRatingLabel(rl) : formatRatingLabel(rv)}</span>
                                  )
                                }
                                return null
                              })()}
                              {(() => {
                                const parts: string[] = []
                                const country = p.meta?.countryLabel ? String(p.meta.countryLabel) : ""
                                const year = p.meta?.year ? String(p.meta.year) : ""
                                if (country) parts.push(country)
                                if (year) parts.push(year)
                                if (parts.length === 0) return null
                                return <span className="truncate">{parts.join(", ")}</span>
                              })()}
                            </div>
                            {p.description && (
                              <div className="mt-1 text-[12px] text-zinc-300 line-clamp-2">{String(p.description)}</div>
                            )}
                          </div>
                        </div>
                      </a>
                    ))
                  )}
                </div>
              </TabsContent>
              <TabsContent value="serials" className="mt-3">
                <div className="flex flex-col gap-2">
                  {serialsLoading ? (
                    <div className="flex items-center justify-center" style={{ minHeight: 300 }}>
                      <Spinner className="size-6 text-zinc-300" />
                    </div>
                  ) : serials.length === 0 ? (
                    <div className="text-sm text-zinc-400">Нет обновлений сериалов с рейтингом</div>
                  ) : (
                    serials.map((p, idx) => (
                      <a key={idx} href={p.id ? `/movie/${p.id}` : undefined} className="block">
                        <div className="bg-zinc-900/70 rounded-[10px] p-2 flex items-start gap-2">
                          <div className="relative aspect-[2/3] w-[64px] rounded-[6px] overflow-hidden bg-zinc-800/60">
                            {p.poster ? (
                              <img src={p.poster} alt={String(p.title ?? "")} className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-400">нет постера</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex items-center gap-2">
                                <div className="text-[13px] md:text-sm font-semibold text-zinc-100 truncate">Сериал: {p.title ?? "Без названия"}</div>
                              </div>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[12px] text-zinc-400">
                              {(() => {
                                const rv = p?.meta?.ratingValue ?? (p.ratingLabel ? parseFloat(String(p.ratingLabel)) : null)
                                const rl = p?.meta?.ratingLabel ?? p.ratingLabel
                                if (rv != null || rl) {
                                  return (
                                    <span className={["shrink-0 inline-flex items-center rounded-full px-1.5 py-[1px] text-[12px] text-white", ratingBgColor(rv ?? rl)].join(" ")}>{rl ? formatRatingLabel(rl) : formatRatingLabel(rv)}</span>
                                  )
                                }
                                return null
                              })()}
                              {(() => {
                                const parts: string[] = []
                                const country = p?.meta?.countryLabel ? String(p.meta.countryLabel) : ""
                                const year = p?.meta?.year ? String(p.meta.year) : ""
                                if (country) parts.push(country)
                                if (year) parts.push(year)
                                if (parts.length === 0) return null
                                return <span className="truncate">{parts.join(", ")}</span>
                              })()}
                            </div>
                            {p?.description && (
                              <div className="mt-1 text-[12px] text-zinc-300 line-clamp-2">{String(p.description)}</div>
                            )}
                          </div>
                        </div>
                      </a>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
const parseReleasedForMobile = (val: any): { y: number; m: number; d: number } | null => {
  if (val == null) return null
  const s = String(val).trim()
  const m1 = s.match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/)
  if (m1) return { y: parseInt(m1[1], 10), m: parseInt(m1[2], 10), d: parseInt(m1[3], 10) }
  const m2 = s.toLowerCase().match(/(\d{1,2})\s+([а-яё]+)\s+(\d{4})/)
  if (m2) {
    const monthMap: Record<string, number> = { января:1, февраля:2, марта:3, апреля:4, мая:5, июня:6, июля:7, августа:8, сентября:9, октября:10, ноября:11, декабря:12 }
    const mm = monthMap[m2[2]]
    if (mm) return { y: parseInt(m2[3], 10), m: mm, d: parseInt(m2[1], 10) }
  }
  const d = new Date(s)
  if (!isNaN(d.getTime())) return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }
  return null
}

const formatRuDate = (val: any): string => {
  const p = parseReleasedForMobile(val)
  if (!p) return ""
  const monthRu = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"][p.m - 1]
  return `${p.d} ${monthRu} ${p.y}`
}
