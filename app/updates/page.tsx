"use client"

import { HeaderCategories } from "@/components/header-categories"
import { UpdatesSection } from "@/components/updates-section"

export default function UpdatesPage() {
  return (
    <div className="min-h-[100dvh] min-h-screen">
      <main className="mx-auto max-w-7xl px-0 md:px-6 pt-0 md:pt-6 pb-6">
        <div className="mb-4 hidden md:block">
          <HeaderCategories variant="horizontal" />
        </div>
        <UpdatesSection />
      </main>
    </div>
  )
}
