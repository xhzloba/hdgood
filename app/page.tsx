import { HeaderCategories } from "@/components/header-categories"
import { TrendingSection } from "@/components/trending-section"

export default function Home() {
  return (
    <div className="min-h-[100dvh] min-h-screen">
      <main className="mx-auto max-w-7xl px-6 pt-6 pb-6 safe-top safe-bottom">
        {/* Categories horizontally above movies for all breakpoints */}
        <div className="mb-4">
          <HeaderCategories variant="horizontal" />
        </div>
        <section>
          <TrendingSection />
        </section>
      </main>
    </div>
  )
}
