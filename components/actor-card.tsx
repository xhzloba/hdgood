"use client"

import { useState } from "react"

interface ActorCardProps {
  id?: string | number
  title?: string
  poster?: string | null
}

export function ActorCard({ id, title, poster }: ActorCardProps) {
  const [error, setError] = useState(false)
  const showFallback = !poster || error

  return (
    <div className="bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/50 hover:border-zinc-700 transition-all duration-200 rounded-sm overflow-hidden text-center">
      <div className="aspect-square bg-zinc-950 flex items-center justify-center">
        {showFallback ? (
          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">Нет фото</div>
        ) : (
          <img
            src={poster || "/placeholder.svg"}
            alt={title || "Актер"}
            decoding="async"
            loading="lazy"
            fetchPriority="low"
            className="w-full h-full object-cover"
            onError={() => setError(true)}
          />
        )}
      </div>
      <div className="p-2">
        <p className="text-[10px] text-zinc-400 line-clamp-2 leading-tight">{title || "Без имени"}</p>
      </div>
    </div>
  )
}