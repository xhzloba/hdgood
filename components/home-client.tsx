"use client";

import { useState, useEffect } from "react";
import { HeaderCategories } from "./header-categories";
import { TrendingSection } from "./trending-section";
import { UhdSection } from "./uhd-section";
import { MoviesSection } from "./movies-section";
import { SerialsSection } from "./serials-section";
import { CATEGORIES } from "@/lib/categories";
import type { Category } from "@/lib/categories";
import Link from "next/link";
import { PosterBackground } from "@/components/poster-background";
import { APP_SETTINGS } from "@/lib/settings";
import { getCountryLabel } from "@/lib/country-flags";
import { ratingColor, formatRatingLabel } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { DesktopHome } from "@/components/desktop-home";
import { useIsMobile } from "@/hooks/use-mobile";

type HomeClientProps = {
  initialSelectedTitle?: string;
  initialOverridesMap?: Record<string, any>;
};

export default function HomeClient({
  initialSelectedTitle,
  initialOverridesMap,
}: HomeClientProps) {
  const isMobile = useIsMobile();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  try {
    if (initialOverridesMap && Object.keys(initialOverridesMap).length > 0) {
      const ref: any = globalThis as any;
      const cache = (ref.__movieOverridesCache ||= {});
      Object.assign(cache, initialOverridesMap);
    }
  } catch {}
  const [selected, setSelected] = useState<Category | null>(() => {
    if (!initialSelectedTitle) return null;
    return CATEGORIES.find((c) => c.title === initialSelectedTitle) ?? null;
  });
  const [bgPairs, setBgPairs] = useState<
    {
      bg: string;
      poster: string;
      colors?: any;
      logo?: string | null;
      id?: string | null;
    }[]
  >([]);
  const [bgIndex, setBgIndex] = useState(0);
  const current = bgPairs.length > 0 ? bgPairs[bgIndex % bgPairs.length] : null;
  const currentBg = current ? current.bg : null;
  const currentPoster = current ? current.poster : null;
  // На главной цвета из постера больше не используем
  // const currentColors = current ? current.colors : null
  const currentLogo = current ? current.logo ?? null : null;
  const currentId = current ? current.id ?? null : null;
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [logoId, setLogoId] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    ratingKP?: number | null;
    ratingIMDb?: number | null;
    year?: string | null;
    country?: string | null;
    genre?: string | null;
    duration?: string | null;
  } | null>(null);
  const [metaMap, setMetaMap] = useState<
    Record<
      string,
      {
        ratingKP?: number | null;
        ratingIMDb?: number | null;
        year?: string | null;
        country?: string | null;
        genre?: string | null;
        duration?: string | null;
      }
    >
  >({});
  const [overrideBg, setOverrideBg] = useState<string | null>(null);
  const [overridePoster, setOverridePoster] = useState<string | null>(null);
  const [overrideHeroMeta, setOverrideHeroMeta] = useState<{
    ratingKP?: number | null;
    ratingIMDb?: number | null;
    year?: string | null;
    country?: string | null;
    genre?: string | null;
    duration?: string | null;
  } | null>(null);
  const [overrideHeroLogoSrc, setOverrideHeroLogoSrc] = useState<string | null>(null);
  const [overrideHeroLogoId, setOverrideHeroLogoId] = useState<string | null>(null);
  const [overrideHeroTitle, setOverrideHeroTitle] = useState<string | null>(null);

  const handleSelect = (cat: Category | null) => {
    setSelected(cat);
  };

  const isUhdMode = selected?.title === "4K UHD";
  const isMoviesMode = selected?.title === "Фильмы";
  const isSerialsMode = selected?.title === "Сериалы";
  const activeIndex = selected
    ? CATEGORIES.findIndex((c) => c.title === selected.title)
    : null;
  const sectionMarginClass = "mt-[1vh] md:mt-[4vh]";
  const handleActiveIndexChange = (index: number | null) => {
    if (index == null) {
      setSelected(null);
      return;
    }
    const cat = CATEGORIES[index];
    // Только локально управляемые категории без маршрута должны менять selected сразу
    if (!cat.route) {
      setSelected(cat);
    }
  };

  useEffect(() => {
    try {
      const ss = typeof window !== "undefined" ? window.sessionStorage : null;
      if (!ss) return;
      const raw = ss.getItem("homeBackdrop:lastMeta");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && data.meta) {
        setMeta(data.meta);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const ss = typeof window !== "undefined" ? window.sessionStorage : null;
      if (!ss) return;
      const src = ss.getItem("homeBackdrop:lastLogoSrc");
      const id = ss.getItem("homeBackdrop:lastLogoId");
      if (src && id) {
        setLogoSrc(src);
        setLogoId(id);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const src = currentLogo;
    const id = currentId;
    if (!id) return;
    if (!src) {
      if (logoId !== id) {
        setLogoSrc(null);
        setLogoId(null);
        try {
          const ss =
            typeof window !== "undefined" ? window.sessionStorage : null;
          if (ss) {
            ss.removeItem("homeBackdrop:lastLogoSrc");
            ss.removeItem("homeBackdrop:lastLogoId");
          }
        } catch {}
      }
      return;
    }
    if (src === logoSrc && id === logoId) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setLogoSrc(src);
      setLogoId(id);
      try {
        const ss = typeof window !== "undefined" ? window.sessionStorage : null;
        if (ss) {
          ss.setItem("homeBackdrop:lastLogoSrc", src);
          ss.setItem("homeBackdrop:lastLogoId", id);
        }
      } catch {}
    };
    img.onerror = () => {};
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [currentLogo, currentId, logoSrc, logoId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("https://api.vokino.pro/v2/list?sort=watching", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const items: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.channels)
          ? data.channels
          : [];
        const ids: string[] = [];
        for (const it of items) {
          const d = it?.details || it;
          const id = d?.id || it?.id;
          if (id) ids.push(String(id));
        }
        let overridesMap: Record<string, any> = {};
        if (ids.length > 0) {
          try {
            const or = await fetch(
              `/api/overrides/movies?ids=${encodeURIComponent(ids.join(","))}`,
              {
                headers: { Accept: "application/json" },
                cache: "no-store",
              }
            );
            if (or.ok) {
              overridesMap = (await or.json()) || {};
              try {
                const ref: any = globalThis as any;
                if (ref) {
                  const cache = (ref.__movieOverridesCache ||= {});
                  Object.assign(cache, overridesMap);
                }
              } catch {}
            }
          } catch {}
        }

        const pairsMap = new Map<
          string,
          {
            bg: string;
            poster: string;
            colors?: any;
            logo?: string | null;
            id?: string | null;
          }
        >();
        for (const it of items) {
          const d = it?.details || it;
          const id = d?.id || it?.id;
          const ov = id
            ? overridesMap[String(id)] ??
              (globalThis as any).__movieOverridesCache?.[String(id)] ??
              null
            : null;
          const bg =
            (ov?.backdrop as string) ||
            (ov?.bg_poster?.backdrop as string) ||
            (d?.backdrop as string) ||
            (d?.bg_poster?.backdrop as string) ||
            (it?.backdrop as string) ||
            (it?.bg_poster?.backdrop as string) ||
            "";
          const poster =
            (ov?.poster as string) ||
            (ov?.bg_poster?.poster as string) ||
            (d?.poster as string) ||
            (d?.bg_poster?.poster as string) ||
            (it?.poster as string) ||
            (it?.bg_poster?.poster as string) ||
            bg;
          if (typeof bg === "string" && bg.trim().length > 0) {
            const key = bg.trim();
            const p =
              typeof poster === "string" && poster.trim().length > 0
                ? poster.trim()
                : key;
            const colors =
              (ov as any)?.poster_colors || (ov as any)?.colors || undefined;
            const logo = (ov as any)?.poster_logo ?? null;
            const gid = id ? String(id) : null;
            const next = { bg: key, poster: p, colors, logo, id: gid };
            const prev = pairsMap.get(key);
            if (!prev) {
              pairsMap.set(key, next);
            } else {
              const shouldReplace =
                (!!logo && !prev.logo) || (!!colors && !prev.colors);
              if (shouldReplace) pairsMap.set(key, next);
            }
          }
        }
        const resultPairs = Array.from(pairsMap.values());
        const finalPairs = APP_SETTINGS.backdrop.showOnlyTopTrendingMovie
          ? resultPairs.slice(
              0,
              Math.max(1, APP_SETTINGS.backdrop.topTrendingCount)
            )
          : resultPairs;
        if (!cancelled) setBgPairs(finalPairs);
        if (!cancelled) {
          let idx = 0;
          try {
            const ss =
              typeof window !== "undefined" ? window.sessionStorage : null;
            const lastKey = ss ? ss.getItem("homeBackdrop:lastKey") : null;
            const lastIndexRaw = ss
              ? ss.getItem("homeBackdrop:lastIndex")
              : null;
            const lastIndex = lastIndexRaw ? parseInt(lastIndexRaw, 10) : 0;
            if (lastKey) {
              const found = finalPairs.findIndex((p) => p.bg === lastKey);
              if (found >= 0) idx = found;
              else if (
                Number.isFinite(lastIndex) &&
                lastIndex >= 0 &&
                lastIndex < finalPairs.length
              )
                idx = lastIndex;
            } else if (
              Number.isFinite(lastIndex) &&
              lastIndex >= 0 &&
              lastIndex < finalPairs.length
            ) {
              idx = lastIndex;
            }
          } catch {}
          setBgIndex(idx);
        }
        const idsToPrefetch = finalPairs
          .map((p) => p.id)
          .filter((v): v is string => !!v);
        if (idsToPrefetch.length > 0 && !cancelled) {
          const nextMap: Record<
            string,
            {
              ratingKP?: number | null;
              ratingIMDb?: number | null;
              year?: string | null;
              country?: string | null;
              genre?: string | null;
              duration?: string | null;
            }
          > = {};
          for (const mid of idsToPrefetch) {
            try {
              const resp = await fetch(
                `https://api.vokino.pro/v2/view/${mid}`,
                {
                  headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                  },
                }
              );
              if (!resp.ok) continue;
              const data = await resp.json();
              const d = (data?.details ?? data) || {};
              const yrRaw =
                d.year ?? d.released ?? d.release_year ?? d.releaseYear;
              const year = (() => {
                if (yrRaw == null) return null;
                const s = String(yrRaw).trim();
                if (!s || s === "0") return null;
                const m = s.match(/\d{4}/);
                return m ? m[0] : s;
              })();
              const countryLabel = getCountryLabel(d.country) || null;
              const genreVal = (() => {
                if (Array.isArray(d.genre)) {
                  const first = d.genre[0];
                  return first != null ? String(first).trim() : null;
                }
                const g =
                  d.genre ??
                  (Array.isArray(d.tags) ? d.tags.join(", ") : d.tags);
                if (g == null) return null;
                const s = String(g);
                const first = s
                  .split(/[,/|]/)
                  .map((p) => p.trim())
                  .filter(Boolean)[0];
                return first || null;
              })();
              const getValidRating = (r: any): number | null => {
                if (r == null) return null;
                const v = parseFloat(String(r));
                if (Number.isNaN(v)) return null;
                if (String(r) === "0.0" || v === 0) return null;
                return v;
              };
              const ratingKP = getValidRating((d as any).rating_kp);
              const ratingIMDb = getValidRating((d as any).rating_imdb);
              const durationStr = (() => {
                const raw = d.duration ?? d.time ?? d.runtime ?? d.length;
                const toMinutes = (val: any): number | null => {
                  if (val == null) return null;
                  if (typeof val === "number" && !Number.isNaN(val))
                    return Math.round(val);
                  if (typeof val === "string") {
                    const s = val.trim().toLowerCase();
                    if (s.includes(":")) {
                      const parts = s.split(":").map((p) => parseInt(p, 10));
                      if (parts.every((n) => !Number.isNaN(n))) {
                        if (parts.length === 3) {
                          const [h, m] = parts;
                          return h * 60 + m;
                        }
                        if (parts.length === 2) {
                          const [h, m] = parts;
                          return h * 60 + m;
                        }
                      }
                    }
                    const hoursMatch = s.match(
                      /(\d+)\s*(ч|час|часа|часов|h|hr|hour|hours)/
                    );
                    const minutesMatch = s.match(
                      /(\d+)\s*(мин|м|m|min|minute|minutes)/
                    );
                    if (hoursMatch || minutesMatch) {
                      const h = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
                      const m = minutesMatch
                        ? parseInt(minutesMatch[1], 10)
                        : 0;
                      return h * 60 + m;
                    }
                    const num = parseInt(s.replace(/[^0-9]/g, ""), 10);
                    if (!Number.isNaN(num)) return num;
                  }
                  return null;
                };
                const mins = toMinutes(raw);
                if (mins == null) return null;
                if (mins % 60 === 0) return `${mins} мин`;
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                return h > 0 ? `${h}ч ${m} мин` : `${m} мин`;
              })();
              nextMap[mid] = {
                ratingKP,
                ratingIMDb,
                year,
                country: countryLabel,
                genre: genreVal || null,
                duration: durationStr,
              };
            } catch {}
          }
          if (!cancelled) setMetaMap((prev) => ({ ...prev, ...nextMap }));
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (bgPairs.length === 0) return;
    const intervalMs = Math.max(
      1000,
      (APP_SETTINGS.backdrop.rotationIntervalSeconds ?? 10) * 1000
    );
    let mounted = true;
    const ss = typeof window !== "undefined" ? window.sessionStorage : null;
    const lastTickAtRaw = ss ? ss.getItem("homeBackdrop:lastTickAt") : null;
    const lastTickAt = lastTickAtRaw ? parseInt(lastTickAtRaw, 10) : 0;
    const now = Date.now();
    const elapsed = lastTickAt ? Math.max(0, now - lastTickAt) : 0;
    const delay = Math.min(intervalMs, Math.max(100, intervalMs - elapsed));
    let timeoutId: any = null;
    let intervalId: any = null;
    const startInterval = () => {
      intervalId = setInterval(() => {
        setBgIndex((i) => {
          const next = (i + 1) % bgPairs.length;
          try {
            if (ss) ss.setItem("homeBackdrop:lastTickAt", String(Date.now()));
          } catch {}
          return next;
        });
      }, intervalMs);
    };
    timeoutId = setTimeout(() => {
      if (!mounted) return;
      setBgIndex((i) => {
        const next = (i + 1) % bgPairs.length;
        try {
          if (ss) ss.setItem("homeBackdrop:lastTickAt", String(Date.now()));
        } catch {}
        return next;
      });
      startInterval();
    }, delay);
    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [bgPairs]);

  useEffect(() => {
    try {
      const ss = typeof window !== "undefined" ? window.sessionStorage : null;
      if (!ss) return;
      const key = currentBg || "";
      ss.setItem("homeBackdrop:lastIndex", String(bgIndex));
      if (key) ss.setItem("homeBackdrop:lastKey", key);
    } catch {}
  }, [bgIndex, currentBg]);

  useEffect(() => {
    if (!currentId) return;
    const m = metaMap[currentId];
    if (m) {
      setMeta(m);
      try {
        const ss = typeof window !== "undefined" ? window.sessionStorage : null;
        if (ss)
          ss.setItem(
            "homeBackdrop:lastMeta",
            JSON.stringify({ id: currentId, meta: m })
          );
      } catch {}
    }
  }, [currentId, metaMap]);

  const hasOverrideBg = overrideBg != null;
  const effLogoSrc = hasOverrideBg ? overrideHeroLogoSrc : logoSrc;
  const effLogoId = hasOverrideBg ? overrideHeroLogoId : logoId;
  const effMeta = hasOverrideBg ? overrideHeroMeta : meta;
  
  const isMainPage = !selected;

  if (isMounted && !isMobile && !initialSelectedTitle) {
    return <DesktopHome />;
  }

  return (
    <PosterBackground
      posterUrl={overridePoster ?? currentPoster}
      bgPosterUrl={overrideBg ?? currentBg}
      disableMobileBackdrop
      // colorOverrides={currentColors}
      simpleDarkCorners
      softBottomFade={!hasOverrideBg}
      strongUpperCorners={hasOverrideBg}
      className="min-h-[100dvh] min-h-screen"
    >
      {/* Desktop Skeleton for Main Page (Prevent Flash of Mobile Layout) */}
      {isMainPage && (
        <div className="hidden md:block fixed inset-0 z-50 bg-zinc-950">
           {/* Sidebar Skeleton */}
           <aside className="fixed left-0 top-0 bottom-0 w-24 z-50 flex flex-col items-center py-10 gap-10 glass-panel border-r border-white/5 bg-black/20 backdrop-blur-sm">
              <div className="text-orange-500 font-black text-2xl mb-4 tracking-tighter">HD</div>
              <nav className="flex flex-col gap-8 flex-1 justify-center">
                  <div className="p-3 rounded-xl text-zinc-400"><div className="w-6 h-6 bg-white/10 rounded animate-pulse" /></div>
                  <div className="p-3 rounded-xl text-white bg-white/10"><div className="w-6 h-6 bg-white/20 rounded animate-pulse" /></div>
                  <div className="p-3 rounded-xl text-zinc-400"><div className="w-6 h-6 bg-white/10 rounded animate-pulse" /></div>
                  <div className="p-3 rounded-xl text-zinc-400"><div className="w-6 h-6 bg-white/10 rounded animate-pulse" /></div>
                  <div className="p-3 rounded-xl text-zinc-400"><div className="w-6 h-6 bg-white/10 rounded animate-pulse" /></div>
              </nav>
           </aside>
           
           {/* Content Skeleton */}
           <main className="relative z-10 ml-24 h-full flex flex-col pb-12 px-0 pt-24 overflow-y-auto scrollbar-hide">
             <div className="min-h-full w-full flex flex-col justify-end">
                <div className="mb-20 max-w-3xl mt-auto px-16">
                    <div className="mb-6"><div className="h-[100px] w-[300px] bg-white/5 rounded-lg animate-pulse" /></div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-6 w-12 bg-white/5 rounded animate-pulse" />
                        <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
                        <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
                    </div>
                    <div className="mb-8 space-y-2 max-w-2xl">
                        <div className="h-5 w-full bg-white/5 rounded animate-pulse" />
                        <div className="h-5 w-[90%] bg-white/5 rounded animate-pulse" />
                        <div className="h-5 w-[80%] bg-white/5 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="h-[52px] w-[160px] bg-white/5 rounded-xl animate-pulse" />
                        <div className="h-[52px] w-[140px] bg-white/5 rounded-xl animate-pulse" />
                        <div className="h-[52px] w-[52px] bg-white/5 rounded-xl animate-pulse" />
                    </div>
                </div>
                
                {/* Trending Slider Skeleton */}
                <div className="w-full mb-8 px-4 md:px-12">
                    <div className="h-8 w-32 bg-white/5 rounded mb-4 animate-pulse" />
                    <div className="flex gap-2 overflow-hidden">
                        {[...Array(9)].map((_, i) => (
                            <div key={i} className="w-[12.5%] aspect-[2/3] bg-white/5 rounded-xl shrink-0 animate-pulse" />
                        ))}
                    </div>
                </div>
             </div>
           </main>
        </div>
      )}

      {/* Mobile/Responsive Layout (Hidden on Desktop Main Page) */}
      <div className={isMainPage ? "md:hidden" : ""}>
      <main className="w-full min-h-screen pb-16 relative z-10">
        <div className="mx-auto max-w-[1800px] px-4 md:px-12 pt-0 md:pt-8">
          {selected && (
            <div className="mb-8 hidden md:block px-4 md:px-12 max-w-[1800px] mx-auto -mx-4 md:-mx-12">
              <HeaderCategories
                variant="horizontal"
                className="!bg-transparent !border-transparent relative z-40"
                onSelect={handleSelect}
                activeIndex={activeIndex}
                onActiveIndexChange={handleActiveIndexChange}
              />
            </div>
          )}
          <div className="relative z-30 hidden md:flex flex-col items-center justify-center mt-[8vh] min-h-[200px] space-y-6">
            {effLogoSrc && effLogoId ? (
              <Link href={`/movie/${effLogoId}`} className="block transition-transform hover:scale-105 duration-300">
                <img
                  src={effLogoSrc}
                  alt="Логотип"
                  className="h-24 md:h-28 w-auto max-w-[280px] md:max-w-[400px] object-contain drop-shadow-2xl"
                />
              </Link>
            ) : hasOverrideBg && overrideHeroTitle ? (
              <div className="flex items-center justify-center px-4">
                <span className="text-3xl md:text-5xl font-bold text-zinc-100 truncate max-w-[80vw] drop-shadow-xl tracking-tight">
                  {overrideHeroTitle}
                </span>
              </div>
            ) : null}
            
            <div className="text-base md:text-xl font-medium text-zinc-200/90 px-4 text-center leading-relaxed flex items-center justify-center drop-shadow-md">
            {hasOverrideBg && effMeta ? (
              (() => {
                const yearVal =
                  effMeta.year && String(effMeta.year).trim()
                    ? String(effMeta.year).trim()
                    : null;
                const restArr = [
                  effMeta.country,
                  effMeta.genre,
                  effMeta.duration,
                ].filter((v) => v && String(v).trim().length > 0) as string[];
                return (
                  <span className="inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-2 max-w-[80vw]">
                    {(effMeta.ratingKP != null || effMeta.ratingIMDb != null) && (
                      <div className="flex items-center gap-4 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                        {effMeta.ratingKP != null && (
                        <span className="inline-flex items-center gap-2 align-middle">
                          <img
                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Kinopoisk_colored_square_icon.svg/2048px-Kinopoisk_colored_square_icon.svg.png"
                            alt="Кинопоиск"
                            className="w-5 h-5 rounded-sm"
                          />
                          <span
                            className={
                              effMeta.ratingKP != null && effMeta.ratingKP > 8.5
                                ? "font-bold text-lg bg-clip-text text-transparent"
                                : `${ratingColor(
                                    effMeta.ratingKP ?? undefined
                                  )} font-bold text-lg`
                            }
                            style={
                              effMeta.ratingKP != null && effMeta.ratingKP > 8.5
                                ? {
                                    backgroundImage:
                                      "linear-gradient(165deg, #ffd25e 16.44%, #b59646 63.42%)",
                                    WebkitBackgroundClip: "text",
                                    backgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                  }
                                : undefined
                            }
                          >
                            {effMeta.ratingKP != null
                              ? formatRatingLabel(effMeta.ratingKP)
                              : "—"}
                          </span>
                        </span>
                        )}
                        {effMeta.ratingIMDb != null && (
                          <span className="inline-flex items-center gap-2 align-middle">
                            <img
                              src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/IMDB_Logo_2016.svg/1280px-IMDB_Logo_2016.svg.png"
                              alt="IMDb"
                              className="w-5 h-5 object-contain"
                            />
                            <span
                              className={
                                effMeta.ratingIMDb != null && effMeta.ratingIMDb > 8.5
                                  ? "font-bold text-lg bg-clip-text text-transparent"
                                  : `${ratingColor(
                                      effMeta.ratingIMDb ?? undefined
                                    )} font-bold text-lg`
                              }
                              style={
                                effMeta.ratingIMDb != null && effMeta.ratingIMDb > 8.5
                                  ? {
                                      backgroundImage:
                                        "linear-gradient(165deg, #ffd25e 16.44%, #b59646 63.42%)",
                                      WebkitBackgroundClip: "text",
                                      backgroundClip: "text",
                                      WebkitTextFillColor: "transparent",
                                    }
                                  : undefined
                              }
                            >
                              {formatRatingLabel(effMeta.ratingIMDb)}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 text-zinc-300 font-medium">
                    {yearVal && (
                      <span className="inline-flex items-center rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 text-white border border-white/10">
                        <span className="truncate">{yearVal}</span>
                      </span>
                    )}
                    {restArr.length > 0 && (
                      <span className="truncate max-w-[60vw] drop-shadow-sm">
                        {restArr.join(" • ")}
                      </span>
                    )}
                    </div>
                  </span>
                );
              })()
            ) : null}
            </div>
          </div>
        </div>

        <section className="w-full mt-[1vh] md:mt-4">
          <div className={`relative z-20 w-full`}>
            {isUhdMode ? (
              <div className="px-4 md:px-12 max-w-[1800px] mx-auto">
                <UhdSection onBackdropOverrideChange={(bg, poster) => { setOverrideBg(bg ?? null); setOverridePoster(poster ?? null); }} onHeroInfoOverrideChange={(info) => { setOverrideHeroMeta(info?.meta ?? null); setOverrideHeroLogoSrc(info?.logo ?? null); setOverrideHeroLogoId(info?.logoId ?? null); setOverrideHeroTitle(info?.title ?? null); }} />
              </div>
            ) : isMoviesMode ? (
              <div className="px-4 md:px-12 max-w-[1800px] mx-auto">
                <MoviesSection onBackdropOverrideChange={(bg, poster) => { setOverrideBg(bg ?? null); setOverridePoster(poster ?? null); }} onHeroInfoOverrideChange={(info) => { setOverrideHeroMeta(info?.meta ?? null); setOverrideHeroLogoSrc(info?.logo ?? null); setOverrideHeroLogoId(info?.logoId ?? null); setOverrideHeroTitle(info?.title ?? null); }} />
              </div>
            ) : isSerialsMode ? (
              <div className="px-4 md:px-12 max-w-[1800px] mx-auto">
                <SerialsSection onBackdropOverrideChange={(bg, poster) => { setOverrideBg(bg ?? null); setOverridePoster(poster ?? null); }} onHeroInfoOverrideChange={(info) => { setOverrideHeroMeta(info?.meta ?? null); setOverrideHeroLogoSrc(info?.logo ?? null); setOverrideHeroLogoId(info?.logoId ?? null); setOverrideHeroTitle(info?.title ?? null); }} />
              </div>
            ) : (
              <div className="px-4 md:px-12 max-w-[1800px] mx-auto">
                <TrendingSection activeBackdropId={currentId ?? undefined} />
              </div>
            )}
          </div>
        </section>
        
      </main>
      </div>
    </PosterBackground>
  );
}
