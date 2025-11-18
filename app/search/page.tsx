"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { HeaderCategories } from "@/components/header-categories"
import { MovieGrid } from "@/components/movie-grid"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

function SearchForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [query, setQuery] = useState("")
  useEffect(() => {
    const q = params.get("q") || ""
    setQuery(q)
  }, [params])
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    const url = q ? `/search?q=${encodeURIComponent(q)}` : "/search"
    router.push(url)
  }
  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Введите название фильма или сериала"
      />
      <Button type="submit" disabled={!query.trim()}>Найти</Button>
    </form>
  )
}

function SearchResults() {
  const params = useSearchParams()
  const q = (params.get("q") || "").trim()
  if (!q) return null
  const apiUrl = `/api/search?q=${encodeURIComponent(q)}`
  return (
    <div className="mt-6">
      <MovieGrid url={apiUrl} />
    </div>
  )
}

export default function SearchPage() {
  return (
    <div className="min-h-[100dvh] min-h-screen">
      <main className="mx-auto max-w-7xl px-0 md:px-6 pt-0 md:pt-6 pb-16 md:pb-10">
        <div className="mb-4 hidden md:block">
          <HeaderCategories variant="horizontal" />
        </div>
        <section>
          <div className="md:bg-zinc-900/40 md:backdrop-blur-sm md:border md:border-zinc-800/50 p-5 rounded-sm">
            <div className="-mx-5 md:-mt-5 px-5 pt-0 md:pt-5 pb-3 md:bg-zinc-900/80 md:backdrop-blur-sm md:border-b md:border-zinc-800/50 rounded-t-sm">
              <div className="flex items-center justify-between">
                <h1 className="text-lg md:text-xl font-semibold text-zinc-200">Поиск</h1>
              </div>
            </div>
            <div className="mt-4">
              <Suspense fallback={null}>
                <SearchForm />
              </Suspense>
            </div>
            <Suspense fallback={null}>
              <SearchResults />
            </Suspense>
          </div>
        </section>
        
      </main>
    </div>
  )
}
