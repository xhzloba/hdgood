"use client"

import { useMemo, useState, useEffect } from "react"
import { AspectRatio } from "@/components/ui/aspect-ratio"

type Trailer = {
  id?: string
  name?: string
  url?: string
  site?: string
  provider?: string
  key?: string
}

function extractYoutubeId(url: string | undefined): string | null {
  if (!url) return null
  const u = String(url)
  const idFromParam = u.match(/[?&]v=([^&]+)/)?.[1]
  const idFromShort = u.match(/youtu\.be\/([^?]+)/)?.[1]
  return idFromParam || idFromShort || null
}

function getEmbedSrcFromTrailer(t: any): string | null {
  if (!t) return null
  const id = t?.id ?? t?.key ?? t?.youtubeId
  const url = t?.url ?? t?.link ?? t?.src
  const site = String(t?.site ?? t?.provider ?? "").toLowerCase()

  // YouTube by id
  const yid = id || extractYoutubeId(url)
  if (yid || site.includes("youtube") || (url && (url.includes("youtube.com") || url.includes("youtu.be")))) {
    if (yid) {
      const params = new URLSearchParams({
        modestbranding: "1",
        rel: "0",
        playsinline: "1",
        iv_load_policy: "3",
        color: "white",
        controls: "1",
        fs: "1",
        cc_load_policy: "0",
        // disablekb removed to allow keyboard shortcuts
      })
      return `https://www.youtube.com/embed/${yid}?${params.toString()}`
    }
  }

  // Rutube by id from url or id
  if (site.includes("rutube") || (url && url.includes("rutube.ru"))) {
    const rid = id || url?.match(/rutube\.ru\/video\/([a-zA-Z0-9-]+)/)?.[1]
    if (rid) return `https://rutube.ru/play/embed/${rid}`
  }

  // Fallback to raw url
  return url || null
}

export function TrailerPlayer({ trailers }: { trailers?: Trailer[] | Trailer }) {
  const list: Trailer[] = useMemo(() => {
    if (Array.isArray(trailers)) return trailers
    return trailers ? [trailers] : []
  }, [trailers])

  // Start with no trailer selected; show player only after click
  const [index, setIndex] = useState<number | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  if (!list || list.length === 0) return null

  const current = index != null ? list[Math.max(0, Math.min(index, list.length - 1))] : undefined
  const src = current ? getEmbedSrcFromTrailer(current) : null

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-zinc-200">Трейлеры</h2>

      {/* Player appears only after selecting a trailer */}
      {src ? (
        <div className="relative">
          <AspectRatio ratio={16 / 9}>
            <iframe
              src={src}
              className="w-full h-full rounded border border-zinc-800/50"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </AspectRatio>
        </div>
      ) : (
        <div className="text-sm text-zinc-400">Выберите трейлер ниже, чтобы воспроизвести</div>
      )}

      {fullscreen && src && (
        <div className="fixed inset-0 z-50 bg-black/90">
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            aria-label="Закрыть"
            className="absolute right-4 top-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-3 py-1.5 rounded"
          >
            Закрыть
          </button>
          <div className="w-full h-full flex items-center justify-center p-4">
            <div className="w-[90vw] max-w-[1200px]">
              <AspectRatio ratio={16 / 9}>
                <iframe
                  src={src}
                  className="w-full h-full rounded border border-zinc-700"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </AspectRatio>
            </div>
          </div>
        </div>
      )}

      {/* Trailer list */}
      <div className="flex flex-wrap gap-2">
        {list.map((t, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={
              "text-[12px] px-3 py-1.5 rounded border transition-colors " +
              (index === i
                ? "bg-zinc-800 border-zinc-700 text-zinc-200"
                : "bg-zinc-900/60 border-zinc-800/50 text-zinc-300 hover:bg-zinc-800/60")
            }
          >
            {t.name || `Трейлер ${i + 1}`}
          </button>
        ))}
      </div>
    </div>
  )
}