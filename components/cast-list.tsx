"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"

interface CastListProps {
  casts: any[]
  maxInitial?: number
}

export function CastList({ casts, maxInitial = 11 }: CastListProps) {
  const [expanded, setExpanded] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [popover, setPopover] = useState<{ name: string; photo: string | null; x: number; y: number } | null>(null)
  useEffect(() => {
    try {
      const mq = typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)") : null
      const update = () => setIsDesktop(!!mq?.matches)
      update()
      mq?.addEventListener("change", update)
      return () => mq?.removeEventListener("change", update)
    } catch {}
  }, [])
  const normalized = Array.isArray(casts)
    ? casts.filter((actor: any) => {
      const title = String(actor?.title ?? '').trim()
      const name = String(actor?.name ?? '').trim()
      return !!(title || name)
    })
    : []
  const hasMore = normalized.length > maxInitial
  const visible = expanded || !hasMore ? normalized : normalized.slice(0, maxInitial)
  const getPhoto = (actor: any): string | null => {
    const posterCandidate = actor?.poster ?? actor?.photo ?? actor?.image ?? actor?.avatar ?? actor?.picture ?? actor?.pic
    const src = String(posterCandidate ?? '').trim()
    const invalids = ['null','undefined','—','none','n/a','no-image']
    const isImageLike = src.startsWith('data:image') || /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(src) || src.startsWith('/') || src.startsWith('http')
    return (!!src && !invalids.includes(src.toLowerCase()) && isImageLike) ? src : null
  }
  const openTidRef = useRef<number | null>(null)
  const closeTidRef = useRef<number | null>(null)
  const scheduleOpen = (fn: () => void) => {
    if (openTidRef.current) {
      window.clearTimeout(openTidRef.current)
      openTidRef.current = null
    }
    openTidRef.current = window.setTimeout(() => {
      openTidRef.current = null
      fn()
    }, 140)
  }
  const scheduleClose = () => {
    if (closeTidRef.current) {
      window.clearTimeout(closeTidRef.current)
      closeTidRef.current = null
    }
    closeTidRef.current = window.setTimeout(() => {
      closeTidRef.current = null
      setPopover(null)
    }, 180)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-3 gap-y-1 md:flex-col md:gap-1">
        {visible.map((actor: any, index: number) => {
          const title = String(actor?.title ?? '').trim()
          const name = String(actor?.name ?? '').trim()
          const display = title || name
          return (
            <div
              key={actor?.id ?? index}
              className="text-sm text-zinc-300"
            >
              <span
                className="hover:underline underline-offset-4 cursor-default"
                onMouseEnter={(e) => {
                  if (!isDesktop) return
                  if (closeTidRef.current) {
                    window.clearTimeout(closeTidRef.current)
                    closeTidRef.current = null
                  }
                  const rect = e.currentTarget.getBoundingClientRect()
                  const width = 240
                  const gap = 12
                  const vw = typeof window !== 'undefined' ? window.innerWidth : 0
                  const vh = typeof window !== 'undefined' ? window.innerHeight : 0
                  const left = Math.max(8, rect.left - width - gap)
                  const top = Math.max(8, Math.min(rect.top, vh > 0 ? (vh - 180) : rect.top))
                  const photo = getPhoto(actor)
                  const nm = name || title || ''
                  scheduleOpen(() => setPopover({ name: nm, photo, x: left, y: top }))
                }}
                onMouseLeave={() => {
                  if (!isDesktop) return
                  scheduleClose()
                }}
              >
                {display}
              </span>
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
      {isDesktop && popover && (
        <div
          className="fixed z-50 bg-zinc-900/90 rounded-[10px] shadow-lg backdrop-blur-sm p-3 w-[240px]"
          style={{ left: popover.x, top: popover.y }}
          onMouseEnter={() => {
            if (closeTidRef.current) {
              window.clearTimeout(closeTidRef.current)
              closeTidRef.current = null
            }
          }}
          onMouseLeave={() => {
            scheduleClose()
          }}
        >
          <div className="flex items-start gap-3">
            <div className="relative aspect-[2/3] w-[80px] rounded-[8px] overflow-hidden bg-zinc-800/60">
              {popover.photo ? (
                <img src={popover.photo} alt={popover.name} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-400">нет фото</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-zinc-100 break-words whitespace-normal leading-tight">{popover.name}</div>
              <div className="mt-2">
                {(() => {
                  const actorId = (popover && (visible.find((a) => (a?.name ?? a?.title) === popover.name)?.id)) ?? null
                  const href = actorId ? `/actor/${actorId}` : null
                  if (!href) {
                    return (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 h-8 px-3 rounded-full text-[12px] font-medium text-white bg-zinc-700/80 ring-1 ring-zinc-500/40 shadow-xs cursor-not-allowed"
                        disabled
                      >
                        Профиль
                      </button>
                    )
                  }
                  return (
                    <Link
                      href={href}
                      className="inline-flex items-center gap-2 h-8 px-3 rounded-full text-[12px] font-medium text-white border border-transparent bg-gradient-to-r from-[rgba(var(--ui-accent-rgb),1)] to-[rgba(var(--ui-accent-rgb),0.85)] ring-1 ring-[rgba(var(--ui-accent-rgb),0.25)] shadow-xs hover:shadow-md hover:opacity-95 transition-all duration-200"
                      onClick={() => {
                        try {
                          const raw = localStorage.getItem("__actorInfo")
                          const map = raw ? JSON.parse(raw) : {}
                          map[String(actorId)] = { name: popover.name, photo: popover.photo }
                          localStorage.setItem("__actorInfo", JSON.stringify(map))
                        } catch {}
                      }}
                    >
                      Профиль
                    </Link>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
