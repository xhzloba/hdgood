"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

type UpdateEntry = {
  id: string
  timestamp: string
  poster?: string | null
  title?: string | null
  changedPaths?: string[]
  addedPaths?: string[]
}

type DateGroup = {
  date: string
  items: UpdateEntry[]
}

export function UpdatesSection() {
  const [groups, setGroups] = useState<DateGroup[]>([])
  const [page, setPage] = useState<number>(1)
  const [hasMore, setHasMore] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({})
  const [columns, setColumns] = useState<number>(2)

  const FIELD_LABELS: Record<string, string> = {
    // Основные
    "title": "Название",
    "name": "Название",
    "poster": "Постер",
    "backdrop": "Фон",
    "bg_poster": "Фон постера",
    "bg_poster.backdrop": "Фон постера",

    // Детали / рейтинги
    "rating_mpaa": "Рейтинг MPAA",
    "rate_mpaa": "Рейтинг MPAA",
    "kp_rating": "Рейтинг КиноПоиск",
    "rating_kp": "Рейтинг КиноПоиск",
    "imdb_rating": "Рейтинг IMDb",

    // Франшиза / метаданные
    "iframe_url": "Встроенный плеер",
    "producer": "Продюсер",
    "screenwriter": "Сценарист",
    "design": "Художник-постановщик",
    "operator": "Оператор",
    "budget": "Бюджет",
    "fees_use": "Сборы США",
    "fees_world": "Сборы мира",
    "fees_rus": "Сборы России",
    "premier": "Премьера (мировая)",
    "premier_rus": "Премьера (Россия)",
    "serial_status": "Статус сериала",
    "slogan": "Слоган",
    "quality": "Качество",
    "voiceActing": "Озвучивание",
    "seasons": "Сезоны",
    "actors_dubl": "Актёры дубляжа",
    "trivia": "Факты",
  }

  function humanizePath(path: string): string {
    // Сначала пытаемся точное совпадение
    if (FIELD_LABELS[path]) return FIELD_LABELS[path]
    // Затем — по последнему ключу
    const parts = path.split(".")
    const leaf = parts[parts.length - 1]
    if (FIELD_LABELS[leaf]) return FIELD_LABELS[leaf]
    // Общее правило: подчёркивания/точки → пробелы, капитализация слов
    const normalized = leaf
      .replace(/_/g, " ")
      .replace(/\bmpaa\b/i, "MPAA")
      .replace(/\burl\b/i, "URL")
    return normalized
      .split(" ")
      .map((w) => w ? w[0].toUpperCase() + w.slice(1) : w)
      .join(" ")
  }

  function formatDate(dateStr: string): string {
    // dateStr вида YYYY-MM-DD
    const [y, m, d] = dateStr.split("-").map((x) => parseInt(x, 10))
    const dt = new Date(y, (m || 1) - 1, d || 1)
    return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" })
      .format(dt)
      .replace(/\s?г\.$/, "")
  }

  function formatTime(ts: string): string {
    const dt = new Date(ts)
    return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(dt)
  }

  async function loadPage(p: number) {
    setLoading(true)
    try {
      const res = await fetch(`/api/overrides/updates?page=${p}&pageSize=15`, { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      const newGroups: DateGroup[] = data?.groups ?? []
      setGroups((prev) => (p === 1 ? newGroups : [...prev, ...newGroups]))
      setHasMore(Boolean(data?.hasMore))
    } catch {}
    finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPage(1)
  }, [])

  useEffect(() => {
    const updateColumns = () => {
      const w = typeof window !== "undefined" ? window.innerWidth : 1024
      if (w >= 1280) setColumns(6)
      else if (w >= 1024) setColumns(5)
      else if (w >= 768) setColumns(4)
      else setColumns(2)
    }
    updateColumns()
    window.addEventListener("resize", updateColumns)
    return () => window.removeEventListener("resize", updateColumns)
  }, [])

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    loadPage(next)
  }

  const toggleGroupExpand = (date: string) => {
    setExpandedDates((prev) => ({ ...prev, [date]: true }))
  }

  return (
    <section className="bg-zinc-900/60 border border-zinc-800 rounded-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Последние обновления</h2>
        <div className="text-xs text-zinc-400">Показываются последние даты, максимум 15 на страницу</div>
      </div>

      <div className="space-y-6">
        {groups.length === 0 && !loading && (
          <div className="text-sm text-zinc-400">Нет данных об обновлениях</div>
        )}

        {groups.length === 0 && loading && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {Array.from({ length: Math.min(15, columns * 3) }).map((_, idx) => (
              <div
                key={`skeleton-${idx}`}
                className="group block bg-zinc-900/60 overflow-hidden rounded-sm"
              >
                <div className="aspect-[2/3] bg-zinc-950">
                  <Skeleton className="w-full h-full" />
                </div>
                <div className="p-2 md:p-3 space-y-2">
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {groups.map((group) => (
          <div key={group.date} className="space-y-3">
            <div className="text-sm font-medium text-zinc-200">{formatDate(group.date)}</div>
            {/* Сетка и размеры карточек приведены к стилю MovieGrid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {(expandedDates[group.date] ? group.items : group.items.slice(0, 15)).map((item) => {
                const time = formatTime(item.timestamp)
                // Показываем постер всегда, если он доступен (если poster не менялся — API вернёт дефолт из view‑API)
                const poster = item.poster ?? null
                const title = item.title ?? "Без названия"
                return (
                  <div
                    key={`${item.id}-${item.timestamp}`}
                    className="group block bg-transparent hover:bg-transparent outline-none hover:outline hover:outline-[1.5px] hover:outline-zinc-700 focus-visible:outline focus-visible:outline-[2px] focus-visible:outline-zinc-700 transition-all duration-200 cursor-pointer overflow-hidden rounded-sm"
                  >
                    <div className="aspect-[2/3] bg-zinc-950 flex items-center justify-center relative">
                      {poster ? (
                        <img
                          src={poster}
                          alt={title || "Постер"}
                          decoding="async"
                          loading="lazy"
                          fetchPriority="low"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Фолбэк если постер не грузится
                            (e.currentTarget as HTMLImageElement).style.display = "none"
                            const parent = (e.currentTarget as HTMLImageElement).parentElement
                            if (parent) {
                              parent.innerHTML = '<div class="text-zinc-600 text-[10px] text-center p-1">Нет постера</div>'
                            }
                          }}
                        />
                      ) : (
                        <div className="text-zinc-600 text-[10px] text-center p-1">Нет постера</div>
                      )}
                    </div>
                    <div className="p-2 md:p-3">
                      <h3
                        className="text-[11px] md:text-[12px] font-medium truncate mb-1 leading-tight text-zinc-300/60 transition-colors duration-200 group-hover:text-zinc-300"
                        title={title}
                      >
                        {title}
                      </h3>
                      <div className="text-[10px] md:text-[11px] text-zinc-400/60 mb-1">
                        {time}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {!expandedDates[group.date] && group.items.length > 15 && (
              <div className="flex justify-center">
                <button
                  onClick={() => toggleGroupExpand(group.date)}
                  className="h-8 px-3 rounded-sm bg-zinc-800/80 border border-zinc-700/60 text-xs hover:bg-zinc-700/80"
                >
                  Показать ещё за день
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-center">
        {hasMore && (
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="h-9 px-4 rounded-sm bg-zinc-800/80 border border-zinc-700/60 text-sm hover:bg-zinc-700/80"
          >
            {loading ? "Загрузка..." : "Загрузить ещё"}
          </button>
        )}
      </div>
    </section>
  )
}