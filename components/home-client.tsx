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
import NProgress from "nprogress"

type HomeClientProps = {
  initialSelectedTitle?: string
}

export default function HomeClient({ initialSelectedTitle }: HomeClientProps) {
  const pathname = usePathname()
  const [selected, setSelected] = useState<Category | null>(() => {
    if (!initialSelectedTitle) return null
    return CATEGORIES.find((c) => c.title === initialSelectedTitle) ?? null
  })
  

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
      
    </div>
  )
}
