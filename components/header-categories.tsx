"use client"

import { useState, useEffect } from "react"
import NProgress from "nprogress"
import { CATEGORIES } from "@/lib/categories"
import type { Category } from "@/lib/categories"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
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

  // Останавливаем верхний лоадер после завершения навигации
  useEffect(() => {
    NProgress.done()
  }, [pathname])

  const [isFullscreen, setIsFullscreen] = useState(false)
  useEffect(() => {
    const onChange = () => {
      const d: any = document
      setIsFullscreen(!!(d.fullscreenElement || d.webkitFullscreenElement))
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
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent ring-1 ring-blue-500/20 before:absolute before:inset-y-1 before:left-0 before:w-[4px] before:rounded before:bg-blue-400"
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
                    NProgress.start()
                    router.push(cat.route)
                  } else {
                    // Иначе — локально выбираем категорию (главная/нестатичная)
                    onSelect?.(cat, idx)
                  }
                }}
                aria-current={activeIndex === idx ? "page" : undefined}
                className={`${buttonBase} ${
                  activeIndex === idx
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent ring-1 ring-blue-500/20 before:absolute before:inset-y-1 before:left-0 before:w-[4px] before:rounded before:bg-blue-400"
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
          <div className="flex items-center justify-between gap-3">
            {/* Пилюльный таб в стиле Apple TV: Главная / Фильмы / Сериалы / 4K UHD / Поиск */}
            <div className="inline-flex items-center rounded-full bg-zinc-900/35 px-1.5 py-0.5">
              {/* Главная */}
              <Link
                href="/"
                aria-current={isHomeActive ? "page" : undefined}
                onClick={() => {
                  setStateActiveIndex(null)
                  onActiveIndexChange?.(null)
                  onSelect?.(null, null)
                }}
                className={[
                  "inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-medium transition-all duration-200",
                  isHomeActive
                    ? "bg-zinc-100 text-zinc-900 h-10 shadow-[0_20px_40px_rgba(0,0,0,0.9)] -my-[5px] scale-[1.12]"
                    : "text-zinc-300/90 hover:text-white",
                ].join(" ")}
              >
                <IconHome className="w-4 h-4 shrink-0" size={16} stroke={1.6} />
                <span>Главная</span>
              </Link>

              {/* Фильмы */}
              <Link
                href="/movies"
                aria-current={isMoviesTabActive ? "page" : undefined}
                className={[
                  "inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-medium transition-all duration-200",
                  isMoviesTabActive
                    ? "bg-zinc-100 text-zinc-900 h-10 shadow-[0_20px_40px_rgba(0,0,0,0.9)] -my-[5px] scale-[1.12]"
                    : "text-zinc-300/90 hover:text-white",
                ].join(" ")}
              >
                <IconMovie className="w-4 h-4 shrink-0" size={16} stroke={1.6} />
                <span>Фильмы</span>
              </Link>

              {/* Сериалы */}
              <Link
                href="/serials"
                aria-current={isSerialsTabActive ? "page" : undefined}
                className={[
                  "inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-medium transition-all duration-200",
                  isSerialsTabActive
                    ? "bg-zinc-100 text-zinc-900 h-10 shadow-[0_20px_40px_rgba(0,0,0,0.9)] -my-[5px] scale-[1.12]"
                    : "text-zinc-300/90 hover:text-white",
                ].join(" ")}
              >
                <IconDeviceTv className="w-4 h-4 shrink-0" size={16} stroke={1.6} />
                <span>Сериалы</span>
              </Link>

              {/* 4K UHD */}
              <Link
                href="/uhd"
                aria-current={isUhdTabActive ? "page" : undefined}
                className={[
                  "inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-medium transition-all duration-200",
                  isUhdTabActive
                    ? "bg-zinc-100 text-zinc-900 h-10 shadow-[0_20px_40px_rgba(0,0,0,0.9)] -my-[5px] scale-[1.12]"
                    : "text-zinc-300/90 hover:text-white",
                ].join(" ")}
              >
                <IconBadge4k className="w-5 h-5 shrink-0" size={18} stroke={1.7} />
                <span>4K UHD</span>
              </Link>

              {/* Поиск как последний таб */}
              <Link
                href="/search"
                aria-current={isSearchActive ? "page" : undefined}
                className={[
                  "inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-medium transition-all duration-200",
                  isSearchActive
                    ? "bg-zinc-100 text-зinc-900 h-10 shadow-[0_20px_40px_rgба(0,0,0,0.9)] -my-[5px] scale-[1.12]"
                    : "text-zinc-300/90 hover:text-white",
                ].join(" ")}
              >
                <IconSearch className="w-4 h-4 shrink-0" size={16} stroke={1.7} />
                <span>Поиск</span>
              </Link>
            </div>

            {/* Круглая кнопка справа — полноэкранный режим */}
            <div className="hidden md:flex items-center">
              <button
                type="button"
                aria-label={isFullscreen ? "Обычный режим" : "Полноэкранный режим"}
                onClick={toggleFullscreen}
                className={[
                  "inline-flex items-center justify-center h-9 w-9 rounded-full border border-zinc-700/70 bg-zinc-900/80 text-zinc-300/90 hover:text-white hover:bg-zinc-800/90 shadow-md shadow-black/40 transition-colors",
                  isFullscreen ? "ring-1 ring-blue-500/50 border-blue-500/60" : "",
                ].join(" ")}
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
