"use client"

import { useState } from "react"
import { HeaderCategories } from "./header-categories"
import { TrendingSection } from "./trending-section"
import { UhdSection } from "./uhd-section"
import { MoviesSection } from "./movies-section"
import { SerialsSection } from "./serials-section"
import FranchiseSlider from "./franchise-slider"
import { CATEGORIES } from "@/lib/categories"
import type { Category } from "@/lib/categories"

type HomeClientProps = {
  initialSelectedTitle?: string
}

export default function HomeClient({ initialSelectedTitle }: HomeClientProps) {
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

  return (
    <div className="min-h-[100dvh] min-h-screen">
      <main className="mx-auto max-w-7xl px-0 md:px-6 pt-6 pb-6">
        {/* Баннер франшизы сверху */}
        <section className="mb-6">
          <FranchiseSlider />
        </section>
        {/* Хедер категорий сразу после баннера */}
        <div className="mb-4">
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