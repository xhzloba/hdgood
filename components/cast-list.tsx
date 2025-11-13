"use client"

import { useState } from "react"

interface CastListProps {
  casts: any[]
  maxInitial?: number
}

export function CastList({ casts, maxInitial = 11 }: CastListProps) {
  const [expanded, setExpanded] = useState(false)
  const normalized = Array.isArray(casts)
    ? casts.filter((actor: any) => {
        const title = String(actor?.title ?? '').trim()
        const name = String(actor?.name ?? '').trim()
        return !!(title || name)
      })
    : []
  const hasMore = normalized.length > maxInitial
  const visible = expanded || !hasMore ? normalized : normalized.slice(0, maxInitial)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-3 gap-y-1 md:flex-col md:gap-1">
        {visible.map((actor: any, index: number) => {
          const title = String(actor?.title ?? '').trim()
          const name = String(actor?.name ?? '').trim()
          const display = title || name
          return (
            <div key={actor?.id ?? index} className="text-sm text-zinc-300">
              {display}
            </div>
          )
        })}
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
