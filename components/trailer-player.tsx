"use client"

import { useMemo, useEffect, useState } from "react"
import { Spinner } from "@/components/ui/spinner"
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel"
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

export function getEmbedSrcFromTrailer(t: any): string | null {
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

export function TrailerPlayer({ trailers, mode }: { trailers?: Trailer[] | Trailer; mode?: "stack" | "carousel" }) {
  const list: Trailer[] = useMemo(() => {
    if (Array.isArray(trailers)) return trailers
    return trailers ? [trailers] : []
  }, [trailers])

  const sources: string[] = useMemo(() => {
    return list
      .map((t) => getEmbedSrcFromTrailer(t))
      .filter((src): src is string => Boolean(src))
      .filter((src) => src.includes("youtube.com/embed"))
  }, [list])

  const [statusMap, setStatusMap] = useState<Record<number, "loading" | "ok" | "timeout">>({})

  useEffect(() => {
    const initial: Record<number, "loading" | "ok" | "timeout"> = {}
    const timers: number[] = []
    sources.forEach((_, i) => {
      initial[i] = "loading"
      const tid = window.setTimeout(() => {
        setStatusMap((prev) => ({ ...prev, [i]: prev[i] === "ok" ? "ok" : "timeout" }))
      }, 3500)
      timers.push(tid)
    })
    setStatusMap(initial)
    return () => {
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [sources])

  if (!sources || sources.length === 0) {
    if (mode === "carousel") {
      const desktopCarouselRatio = 16 / 9.5
      return (
        <div className="relative">
          <AspectRatio ratio={desktopCarouselRatio}>
            <div className="w-full h-full rounded border border-zinc-800/50 bg-zinc-900/50 flex items-center justify-center text-zinc-400 text-sm select-none">
              нет трейлеров
            </div>
          </AspectRatio>
        </div>
      )
    }
    return (
      <div className="space-y-3">
        <AspectRatio ratio={16 / 9}>
          <div className="w-full h-full rounded border border-zinc-800/50 bg-zinc-900/50 flex items-center justify-center text-zinc-400 text-sm select-none">
            нет трейлеров
          </div>
        </AspectRatio>
      </div>
    )
  }

  if (mode === "carousel") {
    const desktopCarouselRatio = 16 / 9.5
    return (
      <div className="relative">
        <Carousel opts={{ align: "start", loop: false }}>
          <CarouselContent>
            {sources.map((src, i) => (
              <CarouselItem key={i}>
                <AspectRatio ratio={desktopCarouselRatio}>
                  <div className="relative w-full h-full">
                    <iframe
                      src={src}
                      className="w-full h-full rounded border border-zinc-800/50"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      onLoad={() => setStatusMap((prev) => ({ ...prev, [i]: "ok" }))}
                    />
                    {statusMap[i] !== "ok" && (
                      <div className="absolute inset-0 rounded border border-zinc-800/50 bg-zinc-900/80 flex items-center justify-center">
                        {statusMap[i] === "timeout" ? (
                          <span className="text-zinc-300 text-sm">YouTube недоступен без VPN</span>
                        ) : (
                          <Spinner className="size-6 text-zinc-300" />
                        )}
                      </div>
                    )}
                  </div>
                </AspectRatio>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="w-12 h-12 !left-[-32px] [&>svg]:w-8 [&>svg]:h-8" />
          <CarouselNext className="w-12 h-12 !right-[-32px] [&>svg]:w-8 [&>svg]:h-8" />
        </Carousel>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sources.map((src, i) => (
        <div key={i} className="relative">
          <AspectRatio ratio={16 / 9}>
            <div className="relative w-full h-full">
              <iframe
                src={src}
                className="w-full h-full rounded border border-zinc-800/50"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={() => setStatusMap((prev) => ({ ...prev, [i]: "ok" }))}
              />
              {statusMap[i] !== "ok" && (
                <div className="absolute inset-0 rounded border border-zinc-800/50 bg-zinc-900/80 flex items-center justify-center">
                  {statusMap[i] === "timeout" ? (
                    <span className="text-zinc-300 text-sm">YouTube недоступен без VPN</span>
                  ) : (
                    <Spinner className="size-6 text-zinc-300" />
                  )}
                </div>
              )}
            </div>
          </AspectRatio>
        </div>
      ))}
    </div>
  )
}