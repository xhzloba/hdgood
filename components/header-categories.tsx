"use client"

import { useState, useEffect } from "react"
import { CATEGORIES } from "@/lib/categories"
import type { Category } from "@/lib/categories"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
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
} from "@tabler/icons-react"

type HeaderCategoriesProps = {
  variant?: "horizontal" | "vertical"
  className?: string
  onSelect?: (category: Category | null, index: number | null) => void
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

export function HeaderCategories({ variant = "horizontal", className, onSelect }: HeaderCategoriesProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const isHomeActive = activeIndex === null

  // Sync active state with route
  const index4k = CATEGORIES.findIndex((c) => c.title === "4K UHD")
  useEffect(() => {
    if (pathname === "/uhd" && index4k !== -1) {
      setActiveIndex(index4k)
    } else if (pathname === "/") {
      setActiveIndex(null)
    }
  }, [pathname, index4k])

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
                setActiveIndex(null)
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
                  setActiveIndex(idx)
                  if (cat.title === "4K UHD") {
                    router.push("/uhd")
                  } else {
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
          </div>
        </div>
      ) : (
        <div className={`bg-zinc-900/40 border border-zinc-800/50 rounded-sm p-1 ${className ?? ""}`.trim()}>
          <div className={`${containerBase}`}>
            <Link
              href="/"
              aria-current={isHomeActive ? "page" : undefined}
              onClick={() => {
                setActiveIndex(null)
                onSelect?.(null, null)
              }}
              className={`${buttonBase} ${
                isHomeActive
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-md shadow-blue-600/20"
                  : "bg-transparent border-transparent text-zinc-300 hover:bg-zinc-800/60 hover:border-zinc-700/50"
              }`}
            >
              <IconHome className="w-4 h-4 shrink-0" size={16} stroke={1.5} />
              <span>Главная</span>
            </Link>
            {CATEGORIES.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveIndex(idx)
                  if (cat.title === "4K UHD") {
                    router.push("/uhd")
                  } else {
                    onSelect?.(cat, idx)
                  }
                }}
                aria-current={activeIndex === idx ? "page" : undefined}
                className={`${buttonBase} ${
                  activeIndex === idx
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-md shadow-blue-600/20"
                    : "bg-transparent border-transparent text-zinc-300 hover:bg-zinc-800/60 hover:border-zinc-700/50"
                }`}
              >
                <CategoryIcon name={cat.ico} className="w-4 h-4 shrink-0" />
                <span>{cat.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}