"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import NProgress from "nprogress"
import { IconHome, IconBadge4k, IconMovie, IconDeviceTv, IconHeart, IconCategory } from "@tabler/icons-react"
import { CATEGORIES } from "@/lib/categories"
import type { Category } from "@/lib/categories"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { MovieGrid } from "@/components/movie-grid"

export default function MobileBottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [moreSelectedIndex, setMoreSelectedIndex] = useState<number | null>(null)

  const isHome = pathname === "/"
  const isMoviesMode = pathname === "/movies"
  const isSerialsMode = pathname === "/serials"
  const isUhdMode = pathname === "/uhd"

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-zinc-900/80 backdrop-blur-sm border-t border-zinc-800/50 rounded-t-[50px] shadow-[0_-10px_28px_rgba(0,0,0,0.45)]">
        <div className="mx-auto max-w-7xl px-4 py-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Главная"
              onClick={() => {
                const href = "/"
                if (pathname !== href) {
                  NProgress.start()
                  router.push(href)
                }
              }}
              className={`${isHome ? "text-white" : "text-zinc-300"} flex items-center justify-center w-12 h-12 rounded-md transition-colors`}
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
    </>
  )
}

