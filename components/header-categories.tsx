"use client"

import { useState, useEffect, useRef } from "react"
import { CATEGORIES } from "@/lib/categories"
import type { Category } from "@/lib/categories"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { LogoParticles } from "@/components/logo-particles"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  IconClock,
  IconBadge4k,
  IconMovie,
  IconDeviceTv,
  IconMoodKid,
  IconLayoutGrid,
  IconPokeball,
  IconFileText,
  IconFiles,
  IconMicrophone,
  IconCategory,
  IconHome,
  IconMaximize,
  IconMinimize,
  IconSearch,
} from "@tabler/icons-react"
import NProgress from "nprogress"

type HeaderCategoriesProps = {
  variant?: "horizontal" | "vertical"
  className?: string
  onSelect?: (category: Category | null, index: number | null) => void
  activeIndex?: number | null
  onActiveIndexChange?: (index: number | null) => void
}

function CategoryIcon({ name, className = "" }: { name: string; className?: string }) {
  const props = { className, size: 16, stroke: 1.5 } as const
  switch (name) {
    case "clock":
      return <IconClock {...props} />
    case "4k":
      return <IconBadge4k {...props} />
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

export function HeaderCategories({ variant = "horizontal", className, onSelect, activeIndex: activeIndexProp, onActiveIndexChange }: HeaderCategoriesProps) {
  const router = useRouter()
  const pathname = usePathname()
  // Универсальная инициализация активной вкладки по route категории
  const indexFromRoute = CATEGORIES.findIndex((c) => c.route && pathname.startsWith(c.route))
  const [stateActiveIndex, setStateActiveIndex] = useState<number | null>(() => {
    if (pathname === "/") return null
    if (indexFromRoute !== -1) return indexFromRoute
    return null
  })
  const activeIndex = activeIndexProp ?? stateActiveIndex
  const isHomeActive = pathname === "/" && activeIndex === null
  const isSearchActive = pathname.startsWith("/search")
  const isMoviesTabActive = pathname.startsWith("/movies")
  const isSerialsTabActive = pathname.startsWith("/serials")
  const isUhdTabActive = pathname.startsWith("/uhd")

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [indicator, setIndicator] = useState({ left: 0, top: 0, width: 0, height: 0, visible: false })
  const EXTRA_Y = 10
  const EXTRA_X = 2
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

  const [accentTheme, setAccentTheme] = useState<"blue" | "red" | "purple">("blue")
  const applyAccentTheme = (t: "blue" | "red" | "purple") => {
    const v = t === "red" ? "220, 38, 38" : t === "purple" ? "79, 70, 229" : "37, 99, 235"
    try {
      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty("--ui-accent-rgb", v)
      }
    } catch {}
  }
  const themeColors: Record<string, string> = { blue: "37, 99, 235", red: "220, 38, 38", purple: "79, 70, 229" }
  useEffect(() => {
    try {
      const ls = typeof window !== "undefined" ? window.localStorage : null
      const t = ls?.getItem("ui:accentTheme") as any
      const valid = (t === "red" || t === "blue" || t === "purple") ? (t as any) : "blue"
      setAccentTheme(valid)
      applyAccentTheme(valid)
    } catch {}
  }, [])
  const changeAccentTheme = (t: "blue" | "red" | "purple") => {
    setAccentTheme(t)
    applyAccentTheme(t)
    try {
      const ls = typeof window !== "undefined" ? window.localStorage : null
      ls?.setItem("ui:accentTheme", t)
      if (typeof document !== "undefined") {
        document.cookie = `ui:accentTheme=${t}; path=/; max-age=${60 * 60 * 24 * 365}`
      }
    } catch {}
  }

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
              <IconHome className="w-4 h-4 shrink-0" size={16} stroke={1.5} />
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
          <div className="relative flex items-center gap-3">
            {/* Лого слева */}
            <Link
              href="/"
              className="hidden md:inline-flex items-center gap-2 pr-3 border-r border-zinc-800/70 logo-hdgood"
            >
              <LogoParticles />
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold tracking-wide text-white" style={{ backgroundColor: "rgb(var(--ui-accent-rgb))" }}>
                HD
              </span>
              <span className="text-sm font-semibold tracking-tight text-zinc-100">
                GOOD
              </span>
            </Link>

            {/* Центрированный контейнер табов */}
            <div className="absolute left-1/2 -translate-x-1/2">
              {/* Пилюльный таб в стиле Apple TV: Главная / Фильмы / Сериалы / 4K UHD / Поиск */}
              <div
                ref={containerRef}
                className="inline-flex items-center rounded-full bg-zinc-900/35 px-1.5 py-0.5 relative"
              >
                {indicator.visible && (
                  <div
                    className="absolute left-0 top-0 z-0 rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.9)] transition-none pointer-events-none"
                    style={{
                      backgroundColor: "rgb(var(--ui-accent-rgb))",
                      transform: `translate3d(${indicator.left}px, ${indicator.top}px, 0)`,
                      width: indicator.width,
                      height: indicator.height,
                      willChange: "transform,width,height",
                    }}
                  />
                )}
                {/* Главная */}
                <Link
                  href="/"
                  aria-current={isHomeActive ? "page" : undefined}
                  onClick={(e) => {
                    onTabClick("/", e)
                  }}
                  className={[
                    "relative z-10 inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-medium transition-all duration-200",
                    isHomeActive ? "text-white" : "text-zinc-300/90 hover:text-white",
                  ].join(" ")}
                >
                  <IconHome className="w-4 h-4 shrink-0" size={16} stroke={1.6} />
                  <span>Главная</span>
                </Link>

                {/* Фильмы */}
                <Link
                  href="/movies"
                  aria-current={isMoviesTabActive ? "page" : undefined}
                  onClick={(e) => onTabClick("/movies", e)}
                  className={[
                    "relative z-10 inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-medium transition-all duration-200",
                    isMoviesTabActive ? "text-white" : "text-zinc-300/90 hover:text-white",
                  ].join(" ")}
                >
                  <IconMovie className="w-4 h-4 shrink-0" size={16} stroke={1.6} />
                  <span>Фильмы</span>
                </Link>

                {/* Сериалы */}
                <Link
                  href="/serials"
                  aria-current={isSerialsTabActive ? "page" : undefined}
                  onClick={(e) => onTabClick("/serials", e)}
                  className={[
                    "relative z-10 inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-medium transition-all duration-200",
                    isSerialsTabActive ? "text-white" : "text-zinc-300/90 hover:text-white",
                  ].join(" ")}
                >
                  <IconDeviceTv className="w-4 h-4 shrink-0" size={16} stroke={1.6} />
                  <span>Сериалы</span>
                </Link>

                {/* 4K UHD */}
                <Link
                  href="/uhd"
                  aria-current={isUhdTabActive ? "page" : undefined}
                  onClick={(e) => onTabClick("/uhd", e)}
                  className={[
                    "relative z-10 inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-medium transition-all duration-200",
                    isUhdTabActive ? "text-white" : "text-zinc-300/90 hover:text-white",
                  ].join(" ")}
                >
                  <IconBadge4k className="w-5 h-5 shrink-0" size={18} stroke={1.7} />
                  <span>4K UHD</span>
                </Link>

                {/* Поиск как последний таб */}
                <Link
                  href="/search"
                  aria-current={isSearchActive ? "page" : undefined}
                  onClick={(e) => onTabClick("/search", e)}
                  className={[
                    "relative z-10 inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-medium transition-all duration-200",
                    isSearchActive ? "text-white" : "text-zinc-300/90 hover:text-white",
                  ].join(" ")}
                >
                  <IconSearch className="w-4 h-4 shrink-0" size={16} stroke={1.7} />
                  <span>Поиск</span>
                </Link>
              </div>
            </div>

            {/* Круглая кнопка справа — полноэкранный режим */}
            <div className="hidden md:flex items-center ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Тема акцента"
                    className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-zinc-700/70 bg-zinc-900/80 text-zinc-300/90 hover:text-white hover:bg-zinc-800/90 shadow-md shadow-black/40 transition-colors mr-2"
                  >
                    <span
                      style={{ backgroundColor: "rgb(var(--ui-accent-rgb))" }}
                      className="inline-block w-3.5 h-3.5 rounded-full"
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl border-0 bg-zinc-900/60 p-2 shadow-xl backdrop-blur-md min-w-[12rem]">
                  <DropdownMenuItem
                    onClick={() => changeAccentTheme("blue")}
                    className="rounded-full px-3 py-2 flex items-center gap-3 hover:bg-white/5 transition-colors"
                  >
                    <span className="inline-block w-4 h-4 rounded-full" style={{ backgroundColor: `rgb(${themeColors.blue})` }} />
                    <span>Синий</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => changeAccentTheme("red")}
                    className="rounded-full px-3 py-2 flex items-center gap-3 hover:bg-white/5 transition-colors"
                  >
                    <span className="inline-block w-4 h-4 rounded-full" style={{ backgroundColor: `rgb(${themeColors.red})` }} />
                    <span>Алый</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => changeAccentTheme("purple")}
                    className="rounded-full px-3 py-2 flex items-center gap-3 hover:bg-white/5 transition-colors"
                  >
                    <span className="inline-block w-4 h-4 rounded-full" style={{ backgroundColor: `rgb(${themeColors.purple})` }} />
                    <span>Фиолетовый</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                type="button"
                aria-label={isFullscreen ? "Обычный режим" : "Полноэкранный режим"}
                onClick={toggleFullscreen}
                className={[
                  "inline-flex items-center justify-center h-9 w-9 rounded-full border border-zinc-700/70 bg-zinc-900/80 text-zinc-300/90 hover:text-white hover:bg-zinc-800/90 shadow-md shadow-black/40 transition-colors",
                  isFullscreen ? "ring-1" : "",
                ].join(" ")}
                style={isFullscreen ? { boxShadow: "0 0 0 1px rgba(var(--ui-accent-rgb), 0.5)", borderColor: `rgba(var(--ui-accent-rgb), 0.6)` } : undefined}
              >
                {isFullscreen ? (
                  <IconMinimize className="w-4 h-4" size={16} stroke={1.7} />
                ) : (
                  <IconMaximize className="w-4 h-4" size={16} stroke={1.7} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
