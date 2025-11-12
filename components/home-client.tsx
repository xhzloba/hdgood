"use client"

import { useState, useEffect } from "react"
import { HeaderCategories } from "./header-categories"
import { TrendingSection } from "./trending-section"
import { UhdSection } from "./uhd-section"
import { MoviesSection } from "./movies-section"
import { SerialsSection } from "./serials-section"
import { CATEGORIES } from "@/lib/categories"
import type { Category } from "@/lib/categories"
import { IconHome, IconBadge4k, IconMovie, IconDeviceTv, IconHeart, IconCategory } from "@tabler/icons-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { MovieGrid } from "./movie-grid"
import { useRouter, usePathname } from "next/navigation"
import NProgress from "nprogress"

type HomeClientProps = {
  initialSelectedTitle?: string
}

export default function HomeClient({ initialSelectedTitle }: HomeClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [selected, setSelected] = useState<Category | null>(() => {
    if (!initialSelectedTitle) return null
    return CATEGORIES.find((c) => c.title === initialSelectedTitle) ?? null
  })
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [moreSelectedIndex, setMoreSelectedIndex] = useState<number | null>(null)

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

  return (
    <div className="min-h-[100dvh] min-h-screen">
      <main className="mx-auto max-w-7xl px-0 md:px-6 pt-0 md:pt-6 pb-16 md:pb-6">
        <div className="mb-4 hidden md:block">
          <HeaderCategories
            variant="horizontal"
            onSelect={handleSelect}
            activeIndex={activeIndex}
            onActiveIndexChange={handleActiveIndexChange}
          />
        </div>
        <section>
          {isUhdMode ? (
            <UhdSection />
          ) : isMoviesMode ? (
            <MoviesSection />
          ) : isSerialsMode ? (
            <SerialsSection />
          ) : (
            <TrendingSection />
          )}
        </section>
      </main>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-zinc-900/80 backdrop-blur-sm border-t border-zinc-800/50 rounded-t-[50px] shadow-[0_-10px_28px_rgba(0,0,0,0.45)]">
        <div className="mx-auto max-w-7xl px-4 py-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Главная"
              onClick={() => {
                setSelected(null)
                const href = "/"
                if (pathname !== href) {
                  NProgress.start()
                  router.push(href)
                }
              }}
              className={`${!selected ? "text-white" : "text-zinc-300"} flex items-center justify-center w-12 h-12 rounded-md transition-colors`}
            >
              <IconHome className="w-6 h-6" stroke={1.5} />
            </button>
            <button
              type="button"
              aria-label="Фильмы"
              onClick={() => {
                const cat = CATEGORIES.find((c) => c.title === "Фильмы")
                if (cat?.route) {
                  const href = cat.route
                  if (pathname !== href) {
                    NProgress.start()
                    router.push(href)
                  }
                } else {
                  setSelected(cat ?? null)
                }
              }}
              className={`${isMoviesMode ? "text-white" : "text-zinc-300"} flex items-center justify-center w-12 h-12 rounded-md transition-colors`}
            >
              <IconMovie className="w-6 h-6" stroke={1.5} />
            </button>
            <button
              type="button"
              aria-label="Сериалы"
              onClick={() => {
                const cat = CATEGORIES.find((c) => c.title === "Сериалы")
                if (cat?.route) {
                  const href = cat.route
                  if (pathname !== href) {
                    NProgress.start()
                    router.push(href)
                  }
                } else {
                  setSelected(cat ?? null)
                }
              }}
              className={`${isSerialsMode ? "text-white" : "text-zinc-300"} flex items-center justify-center w-12 h-12 rounded-md transition-colors`}
            >
              <IconDeviceTv className="w-6 h-6" stroke={1.5} />
            </button>
            <button
              type="button"
              aria-label="4K UHD"
              onClick={() => {
                const cat = CATEGORIES.find((c) => c.title === "4K UHD")
                if (cat?.route) {
                  const href = cat.route
                  if (pathname !== href) {
                    NProgress.start()
                    router.push(href)
                  }
                } else {
                  setSelected(cat ?? null)
                }
              }}
              className={`${isUhdMode ? "text-white" : "text-zinc-300"} flex items-center justify-center w-12 h-12 rounded-md transition-colors`}
            >
              <IconBadge4k className="w-6 h-6" stroke={1.5} />
            </button>
            <button
              type="button"
              aria-label="Избранное"
              className={`text-zinc-300 flex items-center justify-center w-12 h-12 rounded-md transition-colors`}
            >
              <IconHeart className="w-6 h-6" stroke={1.5} />
            </button>
            <button
              type="button"
              aria-label="Ещё"
              onClick={() => setIsMoreOpen(true)}
              className={`text-zinc-300 flex items-center justify-center w-12 h-12 rounded-md transition-colors`}
            >
              <IconCategory className="w-6 h-6" stroke={1.5} />
            </button>
          </div>
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
                        NProgress.start()
                        router.push(href)
                      }
                    } else {
                      setMoreSelectedIndex(idx)
                    }
                  }}
                  className={`p-3 border text-left transition-all duration-200 rounded-sm ${moreSelectedIndex === idx ? "bg-blue-600 text-white border-blue-600" : "bg-zinc-900/40 border-zinc-800/50 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60"}`}
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
    </div>
  )
}
