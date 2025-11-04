"use client"

import { useState } from "react"

interface CastListProps {
  casts: any[]
  maxInitial?: number
}

export function CastList({ casts, maxInitial = 11 }: CastListProps) {
  const [expanded, setExpanded] = useState(false)
  const hasMore = Array.isArray(casts) && casts.length > maxInitial
  const visible = expanded || !hasMore ? casts : casts.slice(0, maxInitial)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-3 gap-y-1 md:flex-col md:gap-1">
        {visible.map((actor: any, index: number) => (
          <div key={actor?.id ?? index} className="text-sm text-zinc-300">
            {actor?.title ?? actor?.name ?? "Без имени"}
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-zinc-400 hover:text-zinc-200 underline underline-offset-4"
          aria-expanded={expanded}
        >
          {expanded ? "Скрыть" : "Показать ещё"}
        </button>
      )}
    </div>
  )
}