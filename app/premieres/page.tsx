"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import { ratingBgColor, formatRatingLabel } from "@/lib/utils"

const parseReleased = (val: any): { y: number; m: number; d: number } | null => {
  if (val == null) return null
  const s = String(val).trim()
  const m1 = s.match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/)
  if (m1) return { y: parseInt(m1[1], 10), m: parseInt(m1[2], 10), d: parseInt(m1[3], 10) }
  const m2 = s.toLowerCase().match(/(\d{1,2})\s+([а-яё]+)\s+(\d{4})/)
  if (m2) {
    const monthMap: Record<string, number> = { января:1, февраля:2, марта:3, апреля:4, мая:5, июня:6, июля:7, августа:8, сентября:9, октября:10, ноября:11, декабря:12 }
    const mm = monthMap[m2[2]]
    if (mm) return { y: parseInt(m2[3], 10), m: mm, d: parseInt(m2[1], 10) }
  }
  const d = new Date(s)
  if (!isNaN(d.getTime())) return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }
  return null
}

const formatRuDate = (val: any): string => {
  const p = parseReleased(val)
  if (!p) return ""
  const monthRu = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"][p.m - 1]
  return `${p.d} ${monthRu} ${p.y}`
}

export default function PremieresPage() {
  const [tab, setTab] = useState<"premieres" | "serials">("premieres")
  const [premieres, setPremieres] = useState<any[]>([])
  const [premieresLoading, setPremieresLoading] = useState(false)
  const [serials, setSerials] = useState<any[]>([])
  const [serialsLoading, setSerialsLoading] = useState(false)

  useEffect(() => {
    const fetchPremieres = async () => {
      setPremieresLoading(true)
      try {
        const controller = new AbortController()
        const tid = setTimeout(() => controller.abort(), 5000)
        const res = await fetch("https://api.vokino.pro/v2/list?sort=popular", { headers: { Accept: "application/json" }, cache: "no-store", signal: controller.signal })
        clearTimeout(tid)
        if (!res.ok) throw new Error(String(res.status))
        const data = await res.json()
        const items: any[] = Array.isArray(data) ? data : Array.isArray(data?.channels) ? data.channels : []
        const now = new Date()
        const lookbackDays = 30
        const nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        const filtered = items.filter((it) => {
          const d = (it as any)?.details || (it as any) || {}
          const rel = (d as any).release_date ?? (d as any).released ?? (d as any).releaseDate ?? null
          const p = parseReleased(rel)
          if (!p) return false
          const relMid = new Date(p.y, p.m - 1, p.d).getTime()
          const diffDays = Math.floor((nowMid - relMid) / 86400000)
          return diffDays >= 0 && diffDays <= lookbackDays
        }).sort((a, b) => {
          const da = parseReleased(((a as any)?.details || a || {})?.release_date ?? ((a as any)?.details || a || {})?.released)
          const db = parseReleased(((b as any)?.details || b || {})?.release_date ?? ((b as any)?.details || b || {})?.released)
          const ta = da ? new Date(da.y, da.m - 1, da.d).getTime() : 0
          const tb = db ? new Date(db.y, db.m - 1, db.d).getTime() : 0
          return tb - ta
        })
        const maxCount = 5
        const mapped = filtered.slice(0, maxCount).map((it) => {
          const d = (it as any)?.details || (it as any) || {}
          const toRatingLabel = (r: any): string | null => {
            if (r == null) return null
            const s = String(r).trim()
            if (!s || s === "0" || s === "0.0") return null
            const n = parseFloat(s)
            if (Number.isNaN(n) || n === 0) return null
            return s
          }
          return {
            id: String((d as any).id ?? (it as any).id ?? ""),
            title: (d as any).name ?? (it as any).name ?? (d as any).title ?? null,
            poster: (d as any).poster ?? (it as any).poster ?? (d as any).cover ?? null,
            description: (d as any).about ?? (d as any).plot ?? (d as any).description ?? null,
            released: (d as any).release_date ?? (d as any).released ?? null,
            ratingLabel: toRatingLabel((d as any).rating_kp ?? (d as any).rating ?? (it as any).rating ?? null),
            href: (d as any).id ? `/movie/${String((d as any).id)}` : null,
          }
        })
        // overrides
        try {
          const idsString = mapped.map((m) => String(m.id)).filter(Boolean).join(",")
          if (idsString) {
            const resOv = await fetch(`/api/overrides/movies?ids=${encodeURIComponent(idsString)}`, { headers: { Accept: "application/json" }, cache: "no-store" })
            const okOv = resOv.ok
            const ovMap = okOv ? (await resOv.json()) || {} : {}
            for (let i = 0; i < mapped.length; i++) {
              const id = String(mapped[i].id)
              const ov = (ovMap as any)[id] ?? null
              if (ov && ov.poster) mapped[i].poster = ov.poster
              if (ov && (ov.name || ov.title)) mapped[i].title = ov.name || ov.title
            }
          }
        } catch {}
        // details
        const ids = mapped.map((m) => m.id).filter(Boolean)
        const detailMap: Record<string, any> = {}
        for (const mid of ids) {
          try {
            const controller2 = new AbortController()
            const tid2 = setTimeout(() => controller2.abort(), 4500)
            const resp = await fetch(`https://api.vokino.pro/v2/view/${mid}`, { headers: { Accept: "application/json", "Content-Type": "application/json" }, signal: controller2.signal })
            clearTimeout(tid2)
            if (!resp.ok) continue
            const data2 = await resp.json()
            const d2 = (data2?.details ?? data2) || {}
            const getRating = (r: any): { value: number; label: string } | null => {
              if (r == null) return null
              const label = String(r)
              const value = parseFloat(label)
              if (Number.isNaN(value) || value === 0 || label === "0.0") return null
              return { value, label }
            }
            const yrRaw = (d2 as any).year ?? (d2 as any).released ?? (d2 as any).release_year ?? (d2 as any).releaseDate
            const year = (() => {
              if (yrRaw == null) return null
              const s = String(yrRaw).trim()
              if (!s || s === "0") return null
              const m = s.match(/\d{4}/)
              return m ? m[0] : s
            })()
            const dateStr = (d2 as any).release_date ?? (d2 as any).released ?? null
            const ratingKP = getRating((d2 as any).rating_kp ?? (d2 as any).rating)
            const ratingIMDb = getRating((d2 as any).rating_imdb)
            const description2 = (d2 as any).about ?? (d2 as any).plot ?? (d2 as any).description ?? null
            const countryRaw = (d2 as any).country ?? null
            const countryLabel = (() => {
              if (!countryRaw) return null
              const arr = Array.isArray(countryRaw) ? countryRaw : String(countryRaw).split(",").map((s) => s.trim()).filter(Boolean)
              if (arr.length === 0) return null
              return arr.join(", ")
            })()
            const ratingLabelFromList = mapped.find((m) => String(m.id) === mid)?.ratingLabel ?? null
            const ratingLabel = ratingLabelFromList ?? (ratingKP?.label ?? ratingIMDb?.label) ?? null
            const ratingValue = ratingLabel != null ? parseFloat(String(ratingLabel)) : (ratingKP?.value ?? ratingIMDb?.value) ?? null
            const typeLabel = "Премьера"
            detailMap[mid] = { year, releaseDate: dateStr, ratingValue, ratingLabel, typeLabel, description: description2, countryLabel }
          } catch {}
        }
        setPremieres(mapped.map((p) => ({ ...p, meta: detailMap[p.id] || null, description: (detailMap[p.id]?.description ?? p.description) || null })))
      } catch {
        setPremieres([])
      } finally {
        setPremieresLoading(false)
      }
    }
    fetchPremieres()
  }, [])

  useEffect(() => {
    const fetchSerials = async () => {
      setSerialsLoading(true)
      try {
        const controller = new AbortController()
        const tid = setTimeout(() => controller.abort(), 5000)
        const res = await fetch("https://api.vokino.pro/v2/list?sort=updatings&type=serial", { headers: { Accept: "application/json" }, cache: "no-store", signal: controller.signal })
        clearTimeout(tid)
        if (!res.ok) throw new Error(String(res.status))
        const data = await res.json()
        const items: any[] = Array.isArray(data) ? data : Array.isArray(data?.channels) ? data.channels : []
        const toRatingLabel = (r: any): string | null => {
          if (r == null) return null
          const s = String(r).trim()
          if (!s || s === "0" || s === "0.0") return null
          const n = parseFloat(s)
          if (Number.isNaN(n) || n === 0) return null
          return s
        }
        const mapped = items.map((it) => {
          const d = (it as any)?.details || (it as any) || {}
          const id = String((d as any).id ?? (it as any).id ?? "")
          const title = (d as any).name ?? (it as any).name ?? (d as any).title ?? null
          const poster = (d as any).poster ?? (it as any).poster ?? (d as any).cover ?? null
          const ratingLabel = toRatingLabel((d as any).rating_kp ?? (d as any).rating ?? (it as any).rating ?? null)
          const description = (d as any).about ?? (d as any).plot ?? (d as any).description ?? null
          return { id, title, poster, ratingLabel, description }
        }).filter((m) => !!m.id && !!m.title && !!m.ratingLabel)
        const top = mapped.slice(0, 15)
        try {
          const idsString = top.map((m) => String(m.id)).filter(Boolean).join(",")
          if (idsString) {
            const resOv = await fetch(`/api/overrides/movies?ids=${encodeURIComponent(idsString)}`, { headers: { Accept: "application/json" }, cache: "no-store" })
            const okOv = resOv.ok
            const ovMap = okOv ? (await resOv.json()) || {} : {}
            for (let i = 0; i < top.length; i++) {
              const id = String(top[i].id)
              const ov = (ovMap as any)[id] ?? null
              if (ov && ov.poster) top[i].poster = ov.poster
              if (ov && (ov.name || ov.title)) top[i].title = ov.name || ov.title
            }
          }
        } catch {}
        // details
        try {
          const ids = top.map((m) => m.id).filter(Boolean)
          const detailMap: Record<string, any> = {}
          for (const mid of ids) {
            try {
              const controller2 = new AbortController()
              const tid2 = setTimeout(() => controller2.abort(), 4500)
              const resp = await fetch(`https://api.vokino.pro/v2/view/${mid}`, { headers: { Accept: "application/json", "Content-Type": "application/json" }, signal: controller2.signal })
              clearTimeout(tid2)
              if (!resp.ok) continue
              const data2 = await resp.json()
              const d2 = (data2?.details ?? data2) || {}
              const getRating = (r: any): { value: number; label: string } | null => {
                if (r == null) return null
                const label = String(r)
                const value = parseFloat(label)
                if (Number.isNaN(value) || value === 0 || label === "0.0") return null
                return { value, label }
              }
              const yrRaw = (d2 as any).year ?? (d2 as any).released ?? (d2 as any).release_year ?? (d2 as any).releaseDate
              const year = (() => {
                if (yrRaw == null) return null
                const s = String(yrRaw).trim()
                if (!s || s === "0") return null
                const m = s.match(/\d{4}/)
                return m ? m[0] : s
              })()
              const ratingKP = getRating((d2 as any).rating_kp ?? (d2 as any).rating)
              const ratingIMDb = getRating((d2 as any).rating_imdb)
              const description2 = (d2 as any).about ?? (d2 as any).plot ?? (d2 as any).description ?? null
              const countryRaw = (d2 as any).country ?? null
              const countryLabel = (() => {
                if (!countryRaw) return null
                const arr = Array.isArray(countryRaw) ? countryRaw : String(countryRaw).split(",").map((s) => s.trim()).filter(Boolean)
                if (arr.length === 0) return null
                return arr.join(", ")
              })()
              const fromList = top.find((m) => String(m.id) === mid)?.ratingLabel ?? null
              const ratingLabel = fromList ?? (ratingKP?.label ?? ratingIMDb?.label) ?? null
              const ratingValue = ratingLabel != null ? parseFloat(String(ratingLabel)) : (ratingKP?.value ?? ratingIMDb?.value) ?? null
              const typeLabel = "Сериал"
              detailMap[mid] = { year, ratingValue, ratingLabel, typeLabel, description: description2, countryLabel }
            } catch {}
          }
          const combined = top.map((p) => ({ ...p, meta: detailMap[p.id] || null, description: (detailMap[p.id]?.description ?? p.description) || null }))
          setSerials(combined)
        } catch {
          setSerials(top)
        }
      } catch {
        setSerials([])
      } finally {
        setSerialsLoading(false)
      }
    }
    fetchSerials()
  }, [])

  return (
    <div className="max-w-2xl mx-auto px-3 py-3 pb-24" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 96px)" }}>
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="bg-zinc-800/70 rounded-full px-1.5 py-1">
          <TabsTrigger value="premieres" className="rounded-full px-3">Премьеры</TabsTrigger>
          <TabsTrigger value="serials" className="rounded-full px-3">Обновление сериалов</TabsTrigger>
        </TabsList>
        <TabsContent value="premieres" className="mt-3">
          <div className="flex flex-col gap-2">
            {premieresLoading ? (
              <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
                <Spinner className="size-6 text-zinc-300" />
              </div>
            ) : premieres.length === 0 ? (
              <div className="text-sm text-zinc-400">За последний месяц премьер нет</div>
            ) : (
              premieres.map((p, idx) => (
                <a key={idx} href={p.href ?? undefined} className="block">
                  <div className="bg-zinc-900/70 rounded-[10px] p-2 flex items-start gap-2">
                    <div className="relative aspect-[2/3] w-[64px] rounded-[6px] overflow-hidden bg-zinc-800/60">
                      {p.poster ? (
                        <img src={p.poster} alt={String(p.title ?? "")} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-400">нет постера</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-2">
                          <div className="text-[13px] md:text-sm font-semibold text-zinc-100 truncate">{p.title ? `${p.meta?.typeLabel ?? "Премьера"}: ${p.title}` : "Премьера"}</div>
                        </div>
                        <div className="text-[11px] text-zinc-400 whitespace-nowrap">{formatRuDate(p.meta?.releaseDate ?? p.released)}</div>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[12px] text-zinc-400">
                        {(() => {
                          const rv = p.meta?.ratingValue
                          const rl = p.meta?.ratingLabel
                          if (rv != null || rl) {
                            return (
                              <span className={["shrink-0 inline-flex items-center rounded-full px-1.5 py-[1px] text-[12px] text-white", ratingBgColor(rv ?? rl)].join(" ")}>{rl ? formatRatingLabel(rl) : formatRatingLabel(rv)}</span>
                            )
                          }
                          return null
                        })()}
                        {(() => {
                          const parts: string[] = []
                          const country = p.meta?.countryLabel ? String(p.meta.countryLabel) : ""
                          const year = p.meta?.year ? String(p.meta.year) : ""
                          if (country) parts.push(country)
                          if (year) parts.push(year)
                          if (parts.length === 0) return null
                          return <span className="truncate">{parts.join(", ")}</span>
                        })()}
                      </div>
                      {p.description && (
                        <div className="mt-1 text-[12px] text-zinc-300 line-clamp-2">{String(p.description)}</div>
                      )}
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="serials" className="mt-3">
          <div className="flex flex-col gap-2">
            {serialsLoading ? (
              <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
                <Spinner className="size-6 text-zinc-300" />
              </div>
            ) : serials.length === 0 ? (
              <div className="text-sm text-zinc-400">Нет обновлений сериалов с рейтингом</div>
            ) : (
              serials.map((p, idx) => (
                <a key={idx} href={p.id ? `/movie/${p.id}` : undefined} className="block">
                  <div className="bg-zinc-900/70 rounded-[10px] p-2 flex items-start gap-2">
                    <div className="relative aspect-[2/3] w-[64px] rounded-[6px] overflow-hidden bg-zinc-800/60">
                      {p.poster ? (
                        <img src={p.poster} alt={String(p.title ?? "")} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-400">нет постера</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex items-center gap-2">
                          <div className="text-[13px] md:text-sm font-semibold text-zinc-100 truncate">Сериал: {p.title ?? "Без названия"}</div>
                        </div>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[12px] text-zinc-400">
                        {(() => {
                          const rv = p?.meta?.ratingValue ?? (p.ratingLabel ? parseFloat(String(p.ratingLabel)) : null)
                          const rl = p?.meta?.ratingLabel ?? p.ratingLabel
                          if (rv != null || rl) {
                            return (
                              <span className={["shrink-0 inline-flex items-center rounded-full px-1.5 py-[1px] text-[12px] text-white", ratingBgColor(rv ?? rl)].join(" ")}>{rl ? formatRatingLabel(rl) : formatRatingLabel(rv)}</span>
                            )
                          }
                          return null
                        })()}
                        {(() => {
                          const parts: string[] = []
                          const country = p?.meta?.countryLabel ? String(p.meta.countryLabel) : ""
                          const year = p?.meta?.year ? String(p.meta.year) : ""
                          if (country) parts.push(country)
                          if (year) parts.push(year)
                          if (parts.length === 0) return null
                          return <span className="truncate">{parts.join(", ")}</span>
                        })()}
                      </div>
                      {p?.description && (
                        <div className="mt-1 text-[12px] text-zinc-300 line-clamp-2">{String(p.description)}</div>
                      )}
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
