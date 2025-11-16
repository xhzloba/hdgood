"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import NProgress from "nprogress"
import { IconHome, IconSearch, IconBadge4k, IconMovie, IconDeviceTv, IconHeart, IconCategory } from "@tabler/icons-react"
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
  const isSearchMode = pathname?.startsWith("/search")
  const isMoviesMode = pathname === "/movies"
  const isSerialsMode = pathname === "/serials"
  const isUhdMode = pathname === "/uhd"

  const isDetailPage = pathname?.startsWith("/movie/")

  if (isDetailPage) return null

  return (
    <>
      <nav className="md:hidden fixed bottom-4 inset-x-0 z-50 flex justify-center pointer-events-none">
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-zinc-900/80 px-3 py-1.5 border border-zinc-800/70 shadow-[0_18px_45px_rgba(0,0,0,0.9)] backdrop-blur-sm">
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
            className={[
              "inline-flex items-center justify-center h-10 w-10 rounded-full transition-all duration-200",
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
                NProgress.start()
                router.push(href)
              }
            }}
            className={[
              "inline-flex items-center justify-center h-10 w-10 rounded-full transition-all duration-200",
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
                  NProgress.start()
                  router.push(href)
                }
              }
            }}
            className={[
              "inline-flex items-center justify-center h-10 w-10 rounded-full transition-all duration-200",
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
                  NProgress.start()
                  router.push(href)
                }
              }
            }}
            className={[
              "inline-flex items-center justify-center h-10 w-10 rounded-full transition-all duration-200",
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
                  NProgress.start()
                  router.push(href)
                }
              }
            }}
            className={[
              "inline-flex items-center justify-center h-10 w-10 rounded-full transition-all duration-200",
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
            className="inline-flex items-center justify-center h-10 w-10 rounded-full text-zinc-300/90 hover:text-white transition-all duration-200"
          >
            <IconHeart className="w-5 h-5" stroke={1.6} />
          </button>
          <button
            type="button"
            aria-label="Ещё"
            onClick={() => setIsMoreOpen(true)}
            className="inline-flex items-center justify-center h-10 w-10 rounded-full text-zinc-300/90 hover:text-white transition-all duration-200"
          >
            <IconCategory className="w-5 h-5" stroke={1.6} />
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
