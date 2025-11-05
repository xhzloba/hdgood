"use client"

import { useState } from "react"
import { HeaderCategories } from "./header-categories"
import { TrendingSection } from "./trending-section"
import { UhdSection } from "./uhd-section"
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

  return (
    <div className="min-h-[100dvh] min-h-screen">
      <main className="mx-auto max-w-7xl px-0 md:px-6 pt-6 pb-6">
        {/* Баннер франшизы сверху */}
        <section className="mb-6">
          <FranchiseSlider />
        </section>
        {/* Хедер категорий сразу после баннера */}
        <div className="mb-4">
          <HeaderCategories variant="horizontal" onSelect={handleSelect} />
        </div>
        <section>
          {isUhdMode ? <UhdSection /> : <TrendingSection />}
        </section>
      </main>
    </div>
  )
}