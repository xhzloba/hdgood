"use client"

import Link from "next/link"
import { useState } from "react"

interface CastListProps {
  casts: any[]
  maxInitial?: number
}

export function CastList({ casts }: CastListProps) {
  const getPhoto = (actor: any): string | null => {
    if (!actor || typeof actor !== 'object') return null
    const posterCandidate = actor?.poster ?? actor?.photo ?? actor?.image ?? actor?.avatar ?? actor?.picture ?? actor?.pic ?? actor?.poster_url ?? actor?.cover ?? actor?.icon
    const src = String(posterCandidate ?? '').replace(/[`'"]/g, '').trim()
    const invalids = ['null', 'undefined', '—', 'none', 'n/a', 'no-image']
    const isImageLike = src.startsWith('data:image') || /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(src) || src.startsWith('/') || src.startsWith('http')
    return (!!src && !invalids.includes(src.toLowerCase()) && isImageLike) ? src : null
  }

  const normalized = Array.isArray(casts)
    ? casts.filter((actor: any) => {
      const title = String(actor?.title ?? '').trim()
      const name = String(actor?.name ?? '').trim()
      // Must have name/title AND a valid photo
      return (title || name) && getPhoto(actor)
    })
    : []

  if (normalized.length === 0) return null

  return (
    <div className="flex flex-wrap items-center pl-6 py-2">
      {normalized.map((actor: any, index: number) => (
        <CastItem key={actor?.id ?? index} actor={actor} photo={getPhoto(actor)!} />
      ))}
    </div>
  )
}

function CastItem({ actor, photo }: { actor: any; photo: string }) {
  const [error, setError] = useState(false)
  
  const title = String(actor?.title ?? '').trim()
  const name = String(actor?.name ?? '').trim()
  const display = title || name
  const actorId = actor?.id ?? null
  
  const className = `relative -ml-6 rounded-full ring-4 ring-zinc-950 transition-all duration-300 hover:z-10 hover:scale-110 ${actorId ? 'cursor-pointer' : ''}`
  
  const content = (
    <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center">
      {error ? (
        <span className="text-[10px] font-medium text-zinc-500 text-center leading-tight px-1">
          нет фото
        </span>
      ) : (
        <img 
          src={photo} 
          alt={display} 
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      )}
    </div>
  )

  const handleSaveActorInfo = () => {
    if (!actorId) return
    try {
      const raw = localStorage.getItem("__actorInfo")
      const map = raw ? JSON.parse(raw) : {}
      map[String(actorId)] = { name: display, photo }
      localStorage.setItem("__actorInfo", JSON.stringify(map))
    } catch {}
  }

  if (actorId) {
    return (
      <Link 
        href={`/actor/${actorId}`} 
        title={display} 
        className={className}
        onClick={handleSaveActorInfo}
      >
        {content}
      </Link>
    )
  }

  return (
    <div title={display} className={className}>
      {content}
    </div>
  )
}
