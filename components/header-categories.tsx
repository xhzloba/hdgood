"use client"

import { useState, useEffect, useRef } from "react"
import { CATEGORIES } from "@/lib/categories"
import type { Category } from "@/lib/categories"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import {
  IconClock,
  IconMovie,
  IconDeviceTv,
  IconMoodKid,
  IconLayoutGrid,
  IconPokeball,
  IconFileText,
  IconFiles,
  IconMicrophone,
  IconCategory,
  IconMaximize,
  IconMinimize,
  IconSearch,
} from "@tabler/icons-react"
import { IconBell } from "@tabler/icons-react"
import { ratingBgColor, formatRatingLabel } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import NProgress from "nprogress"

type HeaderCategoriesProps = {
  variant?: "horizontal" | "vertical"
  className?: string
  onSelect?: (category: Category | null, index: number | null) => void
  activeIndex?: number | null
  onActiveIndexChange?: (index: number | null) => void
}

function Icon4kCustom({ className, ...props }: any) {
  // Удаляем size и stroke из пропсов, чтобы они не попадали в DOM (React предупреждение)
  // так как Tabler иконки принимают их, а наш SVG - нет (или мы используем className)
  const { size, stroke, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="currentColor"
      className={className}
      {...rest}
    >
      <path clipRule="evenodd" fillRule="evenodd" d="M31.0012 13.7598C31.0546 13.3494 30.8569 12.9479 30.4999 12.7417C30.1428 12.5355 29.6963 12.5652 29.3675 12.8166L19.0718 20.6938C18.9639 20.7763 18.8699 20.8853 18.802 21.0031C18.734 21.1207 18.6901 21.2507 18.6725 21.3854L16.9985 34.2402C16.9452 34.6508 17.1428 35.0522 17.4999 35.2584C17.8569 35.4645 18.3035 35.435 18.6323 35.1835L28.928 27.3064C29.0358 27.2238 29.1298 27.1148 29.1977 26.9971C29.2656 26.8794 29.3097 26.7494 29.3273 26.6148L31.0012 13.7598ZM26.1649 25.25C25.4746 26.4458 23.9456 26.8554 22.7499 26.1651C21.5541 25.4747 21.1444 23.9458 21.8348 22.75C22.5252 21.5543 24.0541 21.1446 25.2499 21.835C26.4456 22.5253 26.8553 24.0543 26.1649 25.25Z" />
      <path clipRule="evenodd" fillRule="evenodd" d="M45 24C45 35.598 35.598 45 24 45C12.402 45 3 35.598 3 24C3 12.402 12.402 3 24 3C35.598 3 45 12.402 45 24ZM42 24C42 33.9411 33.9411 42 24 42C14.0589 42 6 33.9411 6 24C6 14.0589 14.0589 6 24 6C33.9411 6 42 14.0589 42 24Z" />
    </svg>
  )
}

function IconHomeCustom({ className, ...props }: any) {
  const { size, stroke, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="currentColor"
      className={className}
      {...rest}
    >
      <path
        clipRule="evenodd"
        fillRule="evenodd"
        d="M23.9864 4.00009C24.3242 4.00009 24.6522 4.11294 24.9185 4.32071L45 20V39.636C44.9985 40.4312 44.5623 41.4377 44 42C43.4377 42.5623 42.4311 42.9985 41.6359 43H27V28H21V43H6.5C5.70485 42.9984 4.56226 42.682 4 42.1197C3.43774 41.5575 3.00163 40.7952 3 40V21L23.0544 4.32071C23.3207 4.11294 23.6487 4.00009 23.9864 4.00009ZM30 28V40H42V21.4314L24 7.40726L6 22V40L18 40V28C18.0008 27.2046 18.3171 26.442 18.8796 25.8796C19.442 25.3171 20.2046 25.0008 21 25H27C27.7954 25.0009 28.5579 25.3173 29.1203 25.8797C29.6827 26.4421 29.9991 27.2046 30 28Z"
      />
    </svg>
  )
}

function CategoryIcon({ name, className = "" }: { name: string; className?: string }) {
  const props = { className, size: 16, stroke: 1.5 } as const
  switch (name) {
    case "clock":
      return <IconClock {...props} />
    case "4k":
      return <Icon4kCustom {...props} />
    case "movie":
      return <IconMovie {...props} />
    case "serial":
      return <IconDeviceTv {...props} />
    case "multfilm":
      return <IconMoodKid {...props} />
    case "multserial":
      return <IconLayoutGrid {...props} />
    case "anime":
      return <IconPokeball {...props} />
    case "documovie":
      return <IconFileText {...props} />
    case "docuserial":
      return <IconFiles {...props} />
    case "tvshow":
      return <IconMicrophone {...props} />
    case "compilations":
      return <IconCategory {...props} />
    default:
      return <IconMovie {...props} />
  }
}

type HeaderTabProps = {
  href: string
  isActive: boolean
  icon: React.ElementType
  label: string
  onClick: (href: string, e: any) => void
}

function HeaderTab({ href, isActive, icon: Icon, label, onClick }: HeaderTabProps) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      onClick={(e) => onClick(href, e)}
      className={[
        "relative z-10 inline-flex items-center justify-center gap-2 h-10 px-5 rounded-[6px] text-base transition-colors",
        isActive 
          ? "text-black duration-300 delay-100" 
          : "text-zinc-300/90 hover:text-white duration-200",
      ].join(" ")}
    >
      <Icon className="w-5 h-5 shrink-0" size={20} stroke={1.7} />
      <span className="grid place-items-center md:max-[939px]:hidden">
        <span className="font-bold opacity-0 col-start-1 row-start-1 pointer-events-none select-none">
          {label}
        </span>
        <span className={`col-start-1 row-start-1 ${isActive ? "font-bold" : "font-medium"}`}>
          {label}
        </span>
      </span>
    </Link>
  )
}

export function HeaderCategories({ variant = "horizontal", className, onSelect, activeIndex: activeIndexProp, onActiveIndexChange }: HeaderCategoriesProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [optimisticPath, setOptimisticPath] = useState(pathname)

  useEffect(() => {
    setOptimisticPath(pathname)
  }, [pathname])

  // Универсальная инициализация активной вкладки по route категории
  const indexFromRoute = CATEGORIES.findIndex(
    (c) =>
      c.route &&
      (pathname.startsWith(c.route) ||
        (c.route === "/serials/all" && pathname.startsWith("/serials")))
  );
  const [stateActiveIndex, setStateActiveIndex] = useState<number | null>(() => {
    if (pathname === "/") return null
    if (indexFromRoute !== -1) return indexFromRoute
    return null
  })
  const activeIndex = activeIndexProp ?? stateActiveIndex
  const isHomeActive = optimisticPath === "/" && activeIndex === null
  const isSearchActive = optimisticPath.startsWith("/search")
  const isMoviesTabActive = optimisticPath.startsWith("/movies")
  const isSerialsTabActive = optimisticPath.startsWith("/serials")
  const isUhdTabActive = optimisticPath.startsWith("/uhd") || optimisticPath.startsWith("/4k")

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [indicator, setIndicator] = useState({ left: 0, top: 0, width: 0, height: 0, visible: false })
  const EXTRA_Y = 10
  const EXTRA_X = 3
  const animIdRef = useRef<number | null>(null)
  const baselineRef = useRef<{ top: number; height: number }>({ top: 0, height: 0 })
  const initializedRef = useRef(false)
  const ANIM_DURATION = 900
  const suppressNextAnimationRef = useRef(false)
  const pendingPathRef = useRef<string | null>(null)
  const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
  const animateTo = (from: { left: number; width: number }, to: { left: number; width: number }) => {
    if (animIdRef.current) cancelAnimationFrame(animIdRef.current)
    const startTime = performance.now()
    const duration = ANIM_DURATION
    const { top, height } = baselineRef.current
    const fromLeft = from.left - EXTRA_X / 2
    const toLeft = to.left - EXTRA_X / 2
    const fromWidth = from.width + EXTRA_X
    const toWidth = to.width + EXTRA_X
    setIndicator({ left: fromLeft, top, width: fromWidth, height, visible: true })
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration)
      const p = easeInOutCubic(t)
      setIndicator({
        left: fromLeft + (toLeft - fromLeft) * p,
        top,
        width: fromWidth + (toWidth - fromWidth) * p,
        height,
        visible: true,
      })
      if (t < 1) animIdRef.current = requestAnimationFrame(step)
      else animIdRef.current = null
    }
    animIdRef.current = requestAnimationFrame(step)
  }

  const onTabClick = (href: string, e: any) => {
    e.preventDefault()
    setOptimisticPath(href)
    const c = containerRef.current
    if (!c) {
      NProgress.set(0.2)
      NProgress.start()
      router.push(href)
      return
    }
    const currentEl = c.querySelector('a[aria-current="page"]') as HTMLElement | null
    const targetEl = e.currentTarget as HTMLElement
    const cr = c.getBoundingClientRect()
    const currRect = (currentEl ?? targetEl).getBoundingClientRect()
    const tgtRect = targetEl.getBoundingClientRect()
    const { top, height } = baselineRef.current
    try {
      ;(window as any).__headerIndicatorPrev = { left: currRect.left - cr.left, width: currRect.width, top, height }
      ;(window as any).__headerIndicatorPrevAnimated = true
      ;(window as any).__headerIndicatorPrevPath = href
    } catch {}
    if (!initializedRef.current) {
      setIndicator({ left: currRect.left - cr.left - EXTRA_X / 2, top, width: currRect.width + EXTRA_X, height, visible: true })
      initializedRef.current = true
    }
    animateTo({ left: currRect.left - cr.left, width: currRect.width }, { left: tgtRect.left - cr.left, width: tgtRect.width })
    
    suppressNextAnimationRef.current = true
    pendingPathRef.current = href
    NProgress.set(0.2)
    NProgress.start()
    setTimeout(() => router.push(href), ANIM_DURATION)
  }

  const moveIndicatorToEl = (el: HTMLElement | null) => {
    const c = containerRef.current
    if (!c || !el) return
    const cr = c.getBoundingClientRect()
    const ar = el.getBoundingClientRect()
    const from = { left: indicator.left, width: indicator.width }
    const to = { left: ar.left - cr.left, width: ar.width }
    animateTo(from, to)
  }

  useEffect(() => {
    const update = () => {
      const c = containerRef.current
      if (!c) return
      const sampleEl = c.querySelector('a') as HTMLElement | null
      if (sampleEl) {
        const cr = c.getBoundingClientRect()
        const sr = sampleEl.getBoundingClientRect()
        const h = sr.height + EXTRA_Y
        const t = (cr.height - h) / 2
        baselineRef.current = { top: t, height: h }
      }
      const activeEl = c.querySelector('a[aria-current="page"]') as HTMLElement | null
      if (!activeEl) {
        setIndicator((p) => ({ ...p, visible: false }))
        return
      }
      const cr = c.getBoundingClientRect()
      const ar = activeEl.getBoundingClientRect()
      const next = { left: ar.left - cr.left, width: ar.width }
      const prev = (typeof window !== "undefined" ? (window as any).__headerIndicatorPrev : null)
      const alreadyAnimated = (typeof window !== "undefined" ? (window as any).__headerIndicatorPrevAnimated : false)
      const prevPath = (typeof window !== "undefined" ? (window as any).__headerIndicatorPrevPath : null)
      const shouldSkip = (suppressNextAnimationRef.current || alreadyAnimated) && (!pendingPathRef.current || pathname.startsWith(pendingPathRef.current))
      if (!initializedRef.current) {
        const { top, height } = baselineRef.current
        if (shouldSkip) {
          setIndicator({ left: next.left - EXTRA_X / 2, top, width: next.width + EXTRA_X, height, visible: true })
          initializedRef.current = true
          suppressNextAnimationRef.current = false
          pendingPathRef.current = null
          try {
            try { (window as any).__headerIndicatorPrev = null } catch {}
            ;(window as any).__headerIndicatorPrevAnimated = false
            ;(window as any).__headerIndicatorPrevPath = null
          } catch {}
        } else if (prev && typeof prev.left === "number" && typeof prev.width === "number" && prevPath === pathname) {
          initializedRef.current = true
          animateTo({ left: prev.left, width: prev.width }, next)
          try { (window as any).__headerIndicatorPrev = null } catch {}
        } else {
          setIndicator({ left: next.left - EXTRA_X / 2, top, width: next.width + EXTRA_X, height, visible: true })
          initializedRef.current = true
        }
      } else {
        if (shouldSkip) {
          const { top, height } = baselineRef.current
          setIndicator({ left: next.left - EXTRA_X / 2, top, width: next.width + EXTRA_X, height, visible: true })
          suppressNextAnimationRef.current = false
          pendingPathRef.current = null
          try { ;(window as any).__headerIndicatorPrevAnimated = false; ;(window as any).__headerIndicatorPrevPath = null } catch {}
        } else if (prev && prevPath === pathname && typeof prev.left === "number" && typeof prev.width === "number") {
          animateTo({ left: prev.left, width: prev.width }, next)
          try { ;(window as any).__headerIndicatorPrev = null; ;(window as any).__headerIndicatorPrevPath = null } catch {}
        } else {
          const { top, height } = baselineRef.current
          setIndicator({ left: next.left - EXTRA_X / 2, top, width: next.width + EXTRA_X, height, visible: true })
        }
      }
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [pathname, isHomeActive, isMoviesTabActive, isSerialsTabActive, isUhdTabActive, isSearchActive])

  // Подавляем первую анимацию после смены пути
  useEffect(() => {
    suppressNextAnimationRef.current = true
  }, [pathname])

  useEffect(() => {
    NProgress.done()
  }, [pathname])

  const [isFullscreen, setIsFullscreen] = useState(false)
  useEffect(() => {
    const onChange = () => {
      const d: any = document
      const curr = !!(d.fullscreenElement || d.webkitFullscreenElement)
      if (curr !== isFullscreen) {
        suppressNextAnimationRef.current = true
      }
      setIsFullscreen(curr)
    }
    document.addEventListener("fullscreenchange", onChange)
    document.addEventListener("webkitfullscreenchange", onChange)
    onChange()
    return () => {
      document.removeEventListener("fullscreenchange", onChange)
      document.removeEventListener("webkitfullscreenchange", onChange)
    }
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const el: any = document.documentElement
        if (el.requestFullscreen) await el.requestFullscreen()
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
        setIsFullscreen(true)
      } else {
        const d: any = document
        if (d.exitFullscreen) await d.exitFullscreen()
        else if (d.webkitExitFullscreen) d.webkitExitFullscreen()
        setIsFullscreen(false)
      }
    } catch {}
  }

  const [bellOpen, setBellOpen] = useState(false)
  const [premieres, setPremieres] = useState<any[]>([])
  const [premieresLoading, setPremieresLoading] = useState(false)
  const [premieresError, setPremieresError] = useState<string | null>(null)
  const [hasPremiereUpdates, setHasPremiereUpdates] = useState(false)
  const [activeBellTab, setActiveBellTab] = useState<"premieres" | "serials">("premieres")
  const [serials, setSerials] = useState<any[]>([])
  const [serialsLoading, setSerialsLoading] = useState(false)
  const [serialsError, setSerialsError] = useState<string | null>(null)
  const formatRuDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return ""
    try {
      const s = String(dateStr)
      const m = s.match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/)
      const d = m ? new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)) : new Date(s)
      if (isNaN(d.getTime())) return s
      const months = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"]
      const day = d.getDate()
      const month = months[d.getMonth()] || ""
      return `${day} ${month.charAt(0).toUpperCase()}${month.slice(1)}`
    } catch { return String(dateStr) }
  }
  const parseReleased = (val: any): { y: number; m: number; d: number } | null => {
    if (val == null) return null
    const s = String(val).trim()
    const m1 = s.match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/)
    if (m1) {
      return { y: parseInt(m1[1], 10), m: parseInt(m1[2], 10), d: parseInt(m1[3], 10) }
    }
    const m2 = s.toLowerCase().match(/(\d{1,2})\s+([а-яё]+)\s+(\d{4})/)
    if (m2) {
      const monthMap: Record<string, number> = {
        'января': 1, 'февраля': 2, 'марта': 3, 'апреля': 4, 'мая': 5, 'июня': 6,
        'июля': 7, 'августа': 8, 'сентября': 9, 'октября': 10, 'ноября': 11, 'декабря': 12,
      }
      const mm = monthMap[m2[2]]
      if (mm) return { y: parseInt(m2[3], 10), m: mm, d: parseInt(m2[1], 10) }
    }
    const d = new Date(s)
    if (!isNaN(d.getTime())) return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }
    return null
  }
  const fetchPremieres = async (withDetails: boolean) => {
    setPremieresLoading(true)
    setPremieresError(null)
    try {
      const controller = new AbortController()
      const tid = setTimeout(() => controller.abort(), 5000)
      const res = await fetch("https://api.vokino.pro/v2/list?sort=popular", { headers: { Accept: "application/json" }, cache: "no-store", signal: controller.signal })
      clearTimeout(tid)
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      const items: any[] = Array.isArray(data) ? data : Array.isArray(data?.channels) ? data.channels : []
      const now = new Date()
      const lookbackDays = 30
      const nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      const filtered = items.filter((it) => {
        const d = it?.details || it || {}
        const rel = d.release_date ?? d.released ?? d.releaseDate ?? null
        const p = parseReleased(rel)
        if (!p) return false
        const relMid = new Date(p.y, p.m - 1, p.d).getTime()
        const diffDays = Math.floor((nowMid - relMid) / 86400000)
        return diffDays >= 0 && diffDays <= lookbackDays
      }).sort((a, b) => {
        const da = parseReleased((a?.details || a || {}).release_date ?? (a?.details || a || {}).released)
        const db = parseReleased((b?.details || b || {}).release_date ?? (b?.details || b || {}).released)
        const ta = da ? new Date(da.y, da.m - 1, da.d).getTime() : 0
        const tb = db ? new Date(db.y, db.m - 1, db.d).getTime() : 0
        return tb - ta
      })
      const maxCount = 5
      const ratingLabelFromAny = (r: any): string | null => {
        if (r == null) return null
        const s = String(r).trim()
        if (!s || s === "0" || s === "0.0") return null
        const n = parseFloat(s)
        if (Number.isNaN(n)) return null
        return s
      }
      const mapped = filtered.slice(0, maxCount).map((it) => {
        const d = it?.details || it || {}
        return {
          id: String(d.id ?? it.id ?? ""),
          title: (d.name as any) ?? (it.name as any) ?? (d.title as any) ?? null,
          poster: (d.poster as any) ?? (it.poster as any) ?? (d.cover as any) ?? null,
          description: (d.plot as any) ?? (d.description as any) ?? (it.description as any) ?? null,
          released: (d.release_date as any) ?? (d.released as any) ?? null,
          ratingLabel: ratingLabelFromAny((d as any).rating_kp ?? (d as any).rating ?? (it as any).rating ?? null),
          href: d.id ? `/movie/${String(d.id)}` : null,
        }
      })
      try {
        const idsString = mapped.map((m) => String(m.id)).filter(Boolean).join(",")
        if (idsString) {
          const resOv = await fetch(`/api/overrides/movies?ids=${encodeURIComponent(idsString)}`, { headers: { Accept: "application/json" }, cache: "no-store" })
          const okOv = resOv.ok
          const ovMap = okOv ? (await resOv.json()) || {} : {}
          for (let i = 0; i < mapped.length; i++) {
            const id = String(mapped[i].id)
            const ov = (ovMap as any)[id] ?? null
            if (ov && ov.poster) {
              mapped[i].poster = ov.poster
            }
            if (ov && (ov.name || ov.title)) {
              mapped[i].title = ov.name || ov.title
            }
          }
        }
      } catch {}
      const currKey = JSON.stringify(mapped.map((m) => `${m.id}:${m.released ?? ""}`))
      if (!withDetails) {
        try {
          const ls = typeof window !== "undefined" ? window.localStorage : null
          const prev = ls?.getItem("premieres:lastKey") || null
          if (!prev || prev !== currKey) setHasPremiereUpdates(true)
        } catch {}
        return
      }
      setPremieres(mapped)

      try {
        const ids = mapped.map((m) => m.id).filter(Boolean)
        const detailMap: Record<string, any> = {}
        for (const mid of ids) {
          try {
            const controller = new AbortController()
            const tid2 = setTimeout(() => controller.abort(), 4500)
            const resp = await fetch(`https://api.vokino.pro/v2/view/${mid}`, {
              headers: { Accept: "application/json", "Content-Type": "application/json" },
              signal: controller.signal,
            })
            clearTimeout(tid2)
            if (!resp.ok) continue
            const data = await resp.json()
            const d2 = (data?.details ?? data) || {}
            const getRating = (r: any): { value: number; label: string } | null => {
              if (r == null) return null
              const label = String(r)
              const value = parseFloat(label)
              if (Number.isNaN(value)) return null
              if (label === "0.0" || value === 0) return null
              return { value, label }
            }
            const yrRaw = d2.year ?? d2.released ?? d2.release_year ?? d2.releaseDate
            const year = (() => {
              if (yrRaw == null) return null
              const s = String(yrRaw).trim()
              if (!s || s === "0") return null
              const m = s.match(/\d{4}/)
              return m ? m[0] : s
            })()
            const dateStr = (d2.release_date as any) ?? (d2.released as any) ?? null
            const ratingKP = getRating((d2 as any).rating_kp ?? (d2 as any).rating)
            const ratingIMDb = getRating((d2 as any).rating_imdb)
            const typeStr = String(d2.type ?? d2.category ?? d2.tags ?? "").toLowerCase()
            const isSerial = /serial|series|tv/.test(typeStr)
            const description = (d2 as any)?.about ?? (d2 as any)?.plot ?? (d2 as any)?.description ?? (data as any)?.about ?? (data as any)?.plot ?? (data as any)?.description ?? null
            const ratingLabelFromList = mapped.find((m) => String(m.id) === mid)?.ratingLabel ?? null
            const ratingLabel = ratingLabelFromList ?? (ratingKP?.label ?? ratingIMDb?.label) ?? null
            const ratingValue = ratingLabel != null ? parseFloat(String(ratingLabel)) : (ratingKP?.value ?? ratingIMDb?.value) ?? null
            const countryRaw = (d2 as any)?.country ?? null
            const countryLabel = (() => {
              if (!countryRaw) return null
              const arr = Array.isArray(countryRaw)
                ? countryRaw
                : String(countryRaw)
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
              if (arr.length === 0) return null
              return arr.join(", ")
            })()
            detailMap[mid] = { year, releaseDate: dateStr, ratingValue, ratingLabel, typeLabel: isSerial ? "Сериал" : "Фильм", description, countryLabel }
          } catch {}
        }
        setPremieres((prev) => prev.map((p) => ({ ...p, meta: detailMap[p.id] || null, description: (detailMap[p.id]?.description ?? p.description) || null })))
        try {
          const ls = typeof window !== "undefined" ? window.localStorage : null
          ls?.setItem("premieres:lastKey", currKey)
          setHasPremiereUpdates(false)
        } catch {}
      } catch {}
    } catch (err: any) {
      setPremieresError("error")
      setPremieres([])
    } finally {
      setPremieresLoading(false)
    }
  }

  const fetchSerialUpdates = async () => {
    setSerialsLoading(true)
    setSerialsError(null)
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
      const mapped = items.map((it) => {
        const d = it?.details || it || {}
        const id = String(d.id ?? it.id ?? "")
        const title = (d.name as any) ?? (it.name as any) ?? (d.title as any) ?? null
        const poster = (d.poster as any) ?? (it.poster as any) ?? (d.cover as any) ?? null
        const ratingLabel = toRatingLabel((d as any).rating_kp ?? (d as any).rating ?? (it as any).rating ?? null)
        const description = (d as any)?.about ?? (d as any)?.plot ?? (d as any)?.description ?? null
        return { id, title, poster, ratingLabel, description }
      }).filter((m) => !!m.id && !!m.title && !!m.ratingLabel)
      const top = mapped.slice(0, 15)
      try {
        const idsString = top.map((m) => String(m.id)).filter(Boolean).join(",")
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
      // Доп. детали для страны, года, даты релиза и уточнение рейтинга
      try {
        const ids = top.map((m) => m.id).filter(Boolean)
        const detailMap: Record<string, any> = {}
        for (const mid of ids) {
          try {
            const controller = new AbortController()
            const tid2 = setTimeout(() => controller.abort(), 4500)
            const resp = await fetch(`https://api.vokino.pro/v2/view/${mid}`, {
              headers: { Accept: "application/json", "Content-Type": "application/json" },
              signal: controller.signal,
            })
            clearTimeout(tid2)
            if (!resp.ok) continue
            const data = await resp.json()
            const d2 = (data?.details ?? data) || {}
            const getRating = (r: any): { value: number; label: string } | null => {
              if (r == null) return null
              const label = String(r)
              const value = parseFloat(label)
              if (Number.isNaN(value) || value === 0 || label === "0.0") return null
              return { value, label }
            }
            const yrRaw = d2.year ?? d2.released ?? d2.release_year ?? d2.releaseDate
            const year = (() => {
              if (yrRaw == null) return null
              const s = String(yrRaw).trim()
              if (!s || s === "0") return null
              const m = s.match(/\d{4}/)
              return m ? m[0] : s
            })()
            const dateStr = (d2.release_date as any) ?? (d2.released as any) ?? null
            const ratingKP = getRating((d2 as any).rating_kp ?? (d2 as any).rating)
            const ratingIMDb = getRating((d2 as any).rating_imdb)
            const description = (d2 as any)?.about ?? (d2 as any)?.plot ?? (d2 as any)?.description ?? null
            const countryRaw = (d2 as any)?.country ?? null
            const countryLabel = (() => {
              if (!countryRaw) return null
              const arr = Array.isArray(countryRaw)
                ? countryRaw
                : String(countryRaw)
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
              if (arr.length === 0) return null
              return arr.join(", ")
            })()
            const fromList = top.find((m) => String(m.id) === mid)?.ratingLabel ?? null
            const ratingLabel = fromList ?? (ratingKP?.label ?? ratingIMDb?.label) ?? null
            const ratingValue = ratingLabel != null ? parseFloat(String(ratingLabel)) : (ratingKP?.value ?? ratingIMDb?.value) ?? null
            detailMap[mid] = { year, releaseDate: dateStr, ratingValue, ratingLabel, typeLabel: "Сериал", description, countryLabel }
          } catch {}
        }
        setSerials(top.map((p) => ({ ...p, meta: detailMap[p.id] || null, description: (detailMap[p.id]?.description ?? p.description) || null })))
      } catch {
        setSerials(top)
      }
    } catch (err: any) {
      setSerialsError("error")
      setSerials([])
    } finally {
      setSerialsLoading(false)
    }
  }
  useEffect(() => {
    if (!bellOpen) return
    fetchPremieres(true)
  }, [bellOpen])

  useEffect(() => {
    fetchPremieres(false)
  }, [])

  useEffect(() => {
    if (!bellOpen) return
    if (activeBellTab === "serials" && serials.length === 0 && !serialsLoading) fetchSerialUpdates()
  }, [activeBellTab, bellOpen])

  const containerBase = variant === "vertical"
    ? "flex flex-col gap-1 items-stretch"
    : "flex gap-1 flex-wrap items-center justify-start min-h-[40px]"

  const buttonBase = variant === "vertical"
    ? "relative h-9 w-full px-3 text-[13px] border transition-all duration-200 rounded-sm inline-flex items-center gap-2 font-medium justify-start"
    : "h-9 px-3 text-[13px] border transition-all duration-200 rounded-sm inline-flex items-center gap-2 font-medium"

  return (
    <nav aria-label="Категории" className={variant === "vertical" ? "" : "mt-3"}>
      {variant === "vertical" ? (
        <div className={`bg-zinc-900/80 border border-zinc-700/50 rounded-sm p-2 shadow-lg shadow-black/30 ${className ?? ""}`.trim()}>
          <div className="px-2 pb-2 text-[11px] uppercase tracking-wide text-zinc-400">Категории</div>
          <div className={containerBase}>
            <Link
              href="/"
              aria-current={isHomeActive ? "page" : undefined}
              onClick={(e) => {
                // Keep navigation to home, but also reset local active state and notify parent
                setStateActiveIndex(null)
                onActiveIndexChange?.(null)
                onSelect?.(null, null)
              }}
              className={`${buttonBase} ${
                isHomeActive
                  ? "bg-gradient-to-r from-[rgba(var(--ui-accent-rgb),1)] to-[rgba(var(--ui-accent-rgb),0.85)] text-white border-transparent ring-1 ring-[rgba(var(--ui-accent-rgb),0.2)] before:absolute before:inset-y-1 before:left-0 before:w-[4px] before:rounded before:bg-[rgb(var(--ui-accent-rgb))]"
                  : "bg-zinc-900/40 border-zinc-800/60 text-zinc-300 hover:border-zinc-700/60 hover:bg-zinc-800/70"
              }`}
            >
              <IconHomeCustom className="w-4 h-4 shrink-0" size={16} stroke={1.5} />
              <span>Главная</span>
            </Link>
            {CATEGORIES.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setStateActiveIndex(idx)
                  onActiveIndexChange?.(idx)
                  if (cat.route) {
                    // Если для категории есть маршрут — навигируем туда
                    router.push(cat.route)
                  } else {
                    // Иначе — локально выбираем категорию (главная/нестатичная)
                    onSelect?.(cat, idx)
                  }
                }}
                aria-current={activeIndex === idx ? "page" : undefined}
                className={`${buttonBase} ${
                  activeIndex === idx
                    ? "bg-gradient-to-r from-[rgba(var(--ui-accent-rgb),1)] to-[rgba(var(--ui-accent-rgb),0.85)] text-white border-transparent ring-1 ring-[rgba(var(--ui-accent-rgb),0.2)] before:absolute before:inset-y-1 before:left-0 before:w-[4px] before:rounded before:bg-[rgb(var(--ui-accent-rgb))]"
                    : "bg-zinc-900/40 border-zinc-800/60 text-zinc-300 hover:border-zinc-700/60 hover:bg-zinc-800/70"
                }`}
              >
                <CategoryIcon name={cat.ico} className="w-4 h-4 shrink-0" />
                <span>{cat.title}</span>
              </button>
            ))}
            {/* Админ ссылка скрыта: доступ через хоткей Space+K */}
          </div>
        </div>
      ) : (
        <div className={`bg-transparent ${className ?? ""}`.trim()}>
          <div className="relative flex items-center justify-center gap-3">
            {/* Единый контейнер для табов и инструментов */}
            <div className="inline-flex items-center gap-3 p-1 bg-zinc-900/50 rounded-[12px] backdrop-blur-sm border border-white/5 shadow-lg shadow-black/20">
              
              {/* Группа табов навигации */}
              <div
                ref={containerRef}
                className="inline-flex items-center gap-2 rounded-[8px] pl-1.5 pr-1.5 py-1 relative"
              >
                {indicator.visible && (
                  <div
                    className="absolute left-0 top-0 z-0 rounded-[6px] pointer-events-none"
                    style={{
                      transform: `translate3d(${indicator.left}px, ${indicator.top}px, 0)`,
                      width: indicator.width,
                      height: indicator.height,
                      backgroundColor: "#ffffff",
                      boxShadow: "-2px 8px 7px rgba(0, 0, 0, 0.6), 0 0 0 2px rgba(255, 255, 255, 0.1)",
                      willChange: "transform,width,height",
                    }}
                  />
                )}
                {/* Главная */}
                <HeaderTab
                  href="/"
                  isActive={isHomeActive}
                  icon={IconHomeCustom}
                  label="Главная"
                  onClick={onTabClick}
                />

                {/* Фильмы */}
                <HeaderTab
                  href="/movies"
                  isActive={isMoviesTabActive}
                  icon={IconMovie}
                  label="Фильмы"
                  onClick={onTabClick}
                />

                {/* Сериалы */}
                <HeaderTab
                  href="/serials"
                  isActive={isSerialsTabActive}
                  icon={IconDeviceTv}
                  label="Сериалы"
                  onClick={onTabClick}
                />

                {/* 4K UHD */}
                <HeaderTab
                  href="/uhd"
                  isActive={isUhdTabActive}
                  icon={Icon4kCustom}
                  label="4K UHD"
                  onClick={onTabClick}
                />

                {/* Поиск как последний таб */}
                <HeaderTab
                  href="/search"
                  isActive={isSearchActive}
                  icon={IconSearch}
                  label="Поиск"
                  onClick={onTabClick}
                />
              </div>

              {/* Разделитель */}
              <div className="w-px h-8 bg-zinc-800/50 mx-1" />

              {/* Инструменты (Колокольчик, Тема, Фулскрин) */}
              <div className="flex items-center gap-1 pr-2">
                <Popover open={bellOpen} onOpenChange={setBellOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Премьеры"
                      className="relative inline-flex items-center justify-center h-10 w-10 rounded-[8px] text-zinc-300/90 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <IconBell className="w-5 h-5" size={20} stroke={1.7} />
                      {hasPremiereUpdates && (
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-zinc-900" />
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" sideOffset={8} className="rounded-2xl border-0 bg-zinc-900/90 p-3 shadow-xl backdrop-blur-md w-[520px] max-w-[70vw]" style={{ minHeight: 460 }}>
                      <Tabs value={activeBellTab} onValueChange={(v) => setActiveBellTab(v as any)}>
                        <TabsList className="bg-zinc-800/70 rounded-full px-1.5 py-1">
                          <TabsTrigger value="premieres" className="rounded-full px-3">Премьеры</TabsTrigger>
                          <TabsTrigger value="serials" className="rounded-full px-3">Обновление сериалов</TabsTrigger>
                        </TabsList>
                        <TabsContent value="premieres" className="mt-2">
                          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                            {premieresLoading ? (
                              <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
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
                        <TabsContent value="serials" className="mt-2">
                          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                            {serialsLoading ? (
                              <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
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
                  </PopoverContent>
                </Popover>
                <button
                  type="button"
                  aria-label={isFullscreen ? "Обычный режим" : "Полноэкранный режим"}
                  onClick={toggleFullscreen}
                  className="inline-flex items-center justify-center h-10 w-10 rounded-[8px] text-zinc-300/90 hover:text-white hover:bg-white/10 transition-all"
                >
                  {isFullscreen ? (
                    <IconMinimize className="w-5 h-5" size={20} stroke={1.7} />
                  ) : (
                    <IconMaximize className="w-5 h-5" size={20} stroke={1.7} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
