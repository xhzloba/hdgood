"use client";

import { useState, useEffect } from "react";
import { HeaderCategories } from "./header-categories";
import { TrendingSection } from "./trending-section";
import { UhdSection } from "./uhd-section";
import { MoviesSection } from "./movies-section";
import { SerialsSection } from "./serials-section";
import { CATEGORIES, UHD_CHANNELS } from "@/lib/categories";
import type { Category } from "@/lib/categories";
import Link from "next/link";
import { PosterBackground } from "@/components/poster-background";
import { APP_SETTINGS } from "@/lib/settings";
import { getCountryLabel } from "@/lib/country-flags";
import { ratingColor, formatRatingLabel } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { DesktopHome, DesktopSidebar } from "@/components/desktop-home";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  IconLayoutGrid,
  IconList,
  IconSearch,
  IconMenu2,
  IconMovie,
  IconDeviceTv,
  IconHeart,
} from "@tabler/icons-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useRouter } from "next/navigation";

type HomeClientProps = {
  initialSelectedTitle?: string;
  initialOverridesMap?: Record<string, any>;
  initialCardDisplayMode?: "backdrop" | "poster";
};

function IconHomeCustom({ className, ...props }: any) {
  const { size, stroke, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="currentColor"
      className={className}
      {...rest}
    >
      <path
        clipRule="evenodd"
        fillRule="evenodd"
        d="M23.9864 4.00009C24.3242 4.00009 24.6522 4.11294 24.9185 4.32071L45 20V39.636C44.9985 40.4312 44.5623 41.4377 44 42C43.4377 42.5623 42.4311 42.9985 41.6359 43H27V28H21V43H6.5C5.70485 42.9984 4.56226 42.682 4 42.1197C3.43774 41.5575 3.00163 40.7952 3 40V21L23.0544 4.32071C23.3207 4.11294 23.6487 4.00009 23.9864 4.00009ZM30 28V40H42V21.4314L24 7.40726L6 22V40L18 40V28C18.0008 27.2046 18.3171 26.442 18.8796 25.8796C19.442 25.3171 20.2046 25.0008 21 25H27C27.7954 25.0009 28.5579 25.3173 29.1203 25.8797C29.6827 26.4421 29.9991 27.2046 30 28Z"
      />
    </svg>
  );
}

function Icon4kCustom({ className, ...props }: any) {
  const { size, stroke, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="currentColor"
      className={className}
      {...rest}
    >
      <path
        clipRule="evenodd"
        fillRule="evenodd"
        d="M31.0012 13.7598C31.0546 13.3494 30.8569 12.9479 30.4999 12.7417C30.1428 12.5355 29.6963 12.5652 29.3675 12.8166L19.0718 20.6938C18.9639 20.7763 18.8699 20.8853 18.802 21.0031C18.734 21.1207 18.6901 21.2507 18.6725 21.3854L16.9985 34.2402C16.9452 34.6508 17.1428 35.0522 17.4999 35.2584C17.8569 35.4645 18.3035 35.435 18.6323 35.1835L28.928 27.3064C29.0358 27.2238 29.1298 27.1148 29.1977 26.9971C29.2656 26.8794 29.3097 26.7494 29.3273 26.6148L31.0012 13.7598ZM26.1649 25.25C25.4746 26.4458 23.9456 26.8554 22.7499 26.1651C21.5541 25.4747 21.1444 23.9458 21.8348 22.75C22.5252 21.5543 24.0541 21.1446 25.2499 21.835C26.4456 22.5253 26.8553 24.0543 26.1649 25.25Z"
      />
      <path
        clipRule="evenodd"
        fillRule="evenodd"
        d="M45 24C45 35.598 35.598 45 24 45C12.402 45 3 35.598 3 24C3 12.402 12.402 3 24 3C35.598 3 45 12.402 45 24ZM42 24C42 33.9411 33.9411 42 24 42C14.0589 42 6 33.9411 6 24C6 14.0589 14.0589 6 24 6C33.9411 6 42 14.0589 42 24Z"
      />
    </svg>
  );
}

export default function HomeClient({
  initialSelectedTitle,
  initialOverridesMap,
  initialCardDisplayMode = "backdrop",
}: HomeClientProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isMounted, setIsMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

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
  const [overrideHeroLogoSrc, setOverrideHeroLogoSrc] = useState<string | null>(
    null
  );
  const [overrideHeroLogoId, setOverrideHeroLogoId] = useState<string | null>(
    null
  );
  const [overrideHeroTitle, setOverrideHeroTitle] = useState<string | null>(
    null
  );
  const [uhdActive, setUhdActive] = useState(0);
  const [uhdViewMode, setUhdViewMode] = useState<"pagination" | "loadmore">(
    "pagination"
  );
  const [uhdPaging, setUhdPaging] = useState<{
    page: number;
    scrolledCount: number;
  } | null>(null);

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
        const res = await fetch(
          "https://api.vokino.pro/v2/list?sort=watching",
          {
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );
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

  if (isMounted && isMobile === false && !initialSelectedTitle) {
    return <DesktopHome initialDisplayMode={initialCardDisplayMode} />;
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
          <DesktopSidebar />

          {/* Content Skeleton */}
          <main className="relative z-10 ml-24 h-full flex flex-col px-0 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-zinc-500 animate-spin" />
            </div>
          </main>
        </div>
      )}

      {/* Mobile/Responsive Layout (Hidden on Desktop Main Page) */}
      <div className={isMainPage ? "md:hidden" : ""}>
        <header className="md:hidden sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-zinc-950/90 backdrop-blur-md border-b border-white/5 shadow-md">
             <Link href="/" className="text-zinc-300 hover:text-white transition-colors">
                <IconHomeCustom className="w-6 h-6" stroke={1.5} />
             </Link>
             <div className="font-bold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                HD GOOD
             </div>
             <div className="flex items-center gap-4">
               <Link href="/search" className="text-zinc-300 hover:text-white transition-colors">
                  <IconSearch className="w-6 h-6" stroke={1.5} />
               </Link>
               <button onClick={() => setMobileMenuOpen(true)} className="text-zinc-300 hover:text-white transition-colors">
                  <IconMenu2 className="w-6 h-6" stroke={1.5} />
               </button>
             </div>
        </header>

        <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Меню</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 grid grid-cols-1 gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push("/search");
                }}
                className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl text-left text-zinc-200 hover:bg-zinc-800 hover:text-white transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800 text-zinc-400">
                  <IconSearch className="w-5 h-5" stroke={1.5} />
                </div>
                <div className="font-medium text-lg">Поиск</div>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push("/favorites");
                }}
                className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl text-left text-zinc-200 hover:bg-zinc-800 hover:text-white transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800 text-zinc-400">
                  <IconHeart className="w-5 h-5" stroke={1.5} />
                </div>
                <div className="font-medium text-lg">Избранное</div>
              </button>

              <div className="h-px bg-zinc-800 my-2" />

              {CATEGORIES.filter(
                (cat) => cat.route && cat.title !== "Последние обновления"
              ).map((cat, idx) => {
                let Icon: any = IconMovie;
                if (cat.title === "Сериалы") Icon = IconDeviceTv;
                if (cat.title === "4K UHD") Icon = Icon4kCustom;

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (cat.route) {
                        setMobileMenuOpen(false);
                        router.push(cat.route);
                      } else {
                        setMobileMenuOpen(false);
                        setSelected(cat);
                      }
                    }}
                    className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl text-left text-zinc-200 hover:bg-zinc-800 hover:text-white transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-800 text-zinc-400">
                      <Icon className="w-5 h-5" stroke={1.5} />
                    </div>
                    <div className="font-medium text-lg">{cat.title}</div>
                  </button>
                );
              })}
            </div>
          </DrawerContent>
        </Drawer>

        <main className="w-full min-h-screen pb-16 relative z-10">
          <div
            className={`mx-auto max-w-[1800px] px-0 md:px-12 pt-0 md:pt-8 ${
              isUhdMode ? "md:pl-[clamp(78px,8vw,110px)]" : ""
            }`}
          >
            {isUhdMode ? (
              <div className="md:grid md:grid-cols-[1fr] items-start">
                <div className="hidden md:block fixed left-0 top-0 bottom-0 z-40">
                  <DesktopSidebar />
                </div>
                <div className="md:ml-0">
                  <div className="hidden md:flex items-center gap-2 fixed top-4 left-[clamp(82px,8vw,118px)] right-6 z-50 px-3 py-2">
                    {UHD_CHANNELS.map((ch, idx) => (
                      <button
                        key={idx}
                        data-active={uhdActive === idx ? "true" : "false"}
                        onClick={() => {
                          setUhdActive(idx);
                          if (typeof window !== "undefined") {
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }
                        }}
                        className={`channel-tab-btn inline-flex items-center gap-2 h-9 px-4 rounded-none text-[13px] lg:text-[14px] xl:text-[15px] font-medium transition-all duration-200 ${
                          uhdActive === idx
                            ? "text-white border-b-2"
                            : "text-zinc-300/90 hover:text-white border-b-2 border-transparent"
                        }`}
                        style={
                          uhdActive === idx
                            ? { borderBottomColor: "rgb(var(--ui-accent-rgb))" }
                            : undefined
                        }
                      >
                        {ch.title}
                      </button>
                    ))}
                    <div className="hidden md:flex items-center gap-2 ml-auto">
                      <button
                        onClick={() => setUhdViewMode("pagination")}
                        className={`inline-flex items-center justify-center h-8 w-8 rounded-full text-[12px] font-medium transition-all duration-200 ${
                          uhdViewMode === "pagination"
                            ? "text-white border border-[rgba(var(--ui-accent-rgb),0.6)]"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                        style={
                          uhdViewMode === "pagination"
                            ? {
                                backgroundColor:
                                  "rgba(var(--ui-accent-rgb),0.2)",
                              }
                            : undefined
                        }
                        title="Режим пагинации"
                      >
                        <IconLayoutGrid size={14} />
                      </button>
                      <button
                        onClick={() => setUhdViewMode("loadmore")}
                        className={`inline-flex items-center justify-center h-8 w-8 rounded-full text-[12px] font-medium transition-all duration-200 ${
                          uhdViewMode === "loadmore"
                            ? "text-white border border-[rgba(var(--ui-accent-rgb),0.6)]"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                        style={
                          uhdViewMode === "loadmore"
                            ? {
                                backgroundColor:
                                  "rgba(var(--ui-accent-rgb),0.2)",
                              }
                            : undefined
                        }
                        title="Режим загрузки"
                      >
                        <IconList size={14} />
                      </button>
                    </div>
                    {uhdViewMode === "pagination" && uhdPaging && (
                      <span className="hidden md:inline-flex items-center gap-2 ml-2 h-8 text-[13px] text-white font-medium">
                        <span className="text-white">Стр.</span>
                        <span
                          className="inline-flex items-center rounded-full text-white px-2 py-[2px]"
                          style={{
                            backgroundColor: "rgb(var(--ui-accent-rgb))",
                          }}
                        >
                          {uhdPaging.page}
                        </span>
                        <span className="text-white">•</span>
                        <span className="text-white">Пролистано</span>
                        <span className="text-white">
                          {uhdPaging.scrolledCount}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="relative z-30 hidden md:flex flex-col items-start justify-start mt-[12vh] min-h-[120px] space-y-3">
                    {effLogoSrc && effLogoId ? (
                      <Link
                        href={`/movie/${effLogoId}`}
                        className="block transition-transform hover:scale-105 duration-300 mb-16"
                      >
                        <img
                          src={effLogoSrc}
                          alt="Логотип"
                          className="h-20 md:h-24 w-auto max-w-[260px] md:max-w-[340px] object-contain drop-shadow-2xl"
                        />
                      </Link>
                    ) : hasOverrideBg && overrideHeroTitle ? (
                      <div className="flex items-start justify-start px-1">
                        <span className="text-3xl md:text-4xl font-bold text-zinc-100 truncate max-w-[70vw] drop-shadow-xl tracking-tight">
                          {overrideHeroTitle}
                        </span>
                      </div>
                    ) : null}

                    <div className="text-base md:text-xl font-medium text-zinc-200/90 px-1 text-left leading-relaxed flex items-start justify-start drop-shadow-md max-w-[900px]">
                      {hasOverrideBg && effMeta
                        ? (() => {
                            const yearVal =
                              effMeta.year && String(effMeta.year).trim()
                                ? String(effMeta.year).trim()
                                : null;
                            const restArr = [
                              effMeta.country,
                              effMeta.genre,
                              effMeta.duration,
                            ].filter(
                              (v) => v && String(v).trim().length > 0
                            ) as string[];
                            return (
                              <span className="inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-2 max-w-[80vw]">
                                {(effMeta.ratingKP != null ||
                                  effMeta.ratingIMDb != null) && (
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
                                            effMeta.ratingKP != null &&
                                            effMeta.ratingKP > 8.5
                                              ? "font-bold text-lg bg-clip-text text-transparent"
                                              : `${ratingColor(
                                                  effMeta.ratingKP ?? undefined
                                                )} font-bold text-lg`
                                          }
                                          style={
                                            effMeta.ratingKP != null &&
                                            effMeta.ratingKP > 8.5
                                              ? {
                                                  backgroundImage:
                                                    "linear-gradient(165deg, #ffd25e 16.44%, #b59646 63.42%)",
                                                  WebkitBackgroundClip: "text",
                                                  backgroundClip: "text",
                                                  WebkitTextFillColor:
                                                    "transparent",
                                                }
                                              : undefined
                                          }
                                        >
                                          {effMeta.ratingKP != null
                                            ? formatRatingLabel(
                                                effMeta.ratingKP
                                              )
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
                                            effMeta.ratingIMDb != null &&
                                            effMeta.ratingIMDb > 8.5
                                              ? "font-bold text-lg bg-clip-text text-transparent"
                                              : `${ratingColor(
                                                  effMeta.ratingIMDb ??
                                                    undefined
                                                )} font-bold text-lg`
                                          }
                                          style={
                                            effMeta.ratingIMDb != null &&
                                            effMeta.ratingIMDb > 8.5
                                              ? {
                                                  backgroundImage:
                                                    "linear-gradient(165deg, #ffd25e 16.44%, #b59646 63.42%)",
                                                  WebkitBackgroundClip: "text",
                                                  backgroundClip: "text",
                                                  WebkitTextFillColor:
                                                    "transparent",
                                                }
                                              : undefined
                                          }
                                        >
                                          {formatRatingLabel(
                                            effMeta.ratingIMDb
                                          )}
                                        </span>
                                      </span>
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center gap-3 text-zinc-300 font-medium">
                                  {yearVal && (
                                    <span className="inline-flex items-center rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 text-white border border-white/10">
                                      <span className="truncate">
                                        {yearVal}
                                      </span>
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
                        : null}
                    </div>
                  </div>

                  <section className="w-full mt-[1vh] md:mt-0">
                    <div className="relative z-20 w-full">
                      <div className="px-2 md:px-0">
                        <UhdSection
                          hideTabs={!isMobile}
                          active={uhdActive}
                          onActiveChange={setUhdActive}
                          viewMode={uhdViewMode}
                          onViewModeChange={setUhdViewMode}
                          onPagingInfoChange={setUhdPaging}
                          onBackdropOverrideChange={(bg, poster) => {
                            setOverrideBg(bg ?? null);
                            setOverridePoster(poster ?? null);
                          }}
                          onHeroInfoOverrideChange={(info) => {
                            setOverrideHeroMeta(info?.meta ?? null);
                            setOverrideHeroLogoSrc(info?.logo ?? null);
                            setOverrideHeroLogoId(info?.logoId ?? null);
                            setOverrideHeroTitle(info?.title ?? null);
                          }}
                        />
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            ) : (
              <>
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
                    <Link
                      href={`/movie/${effLogoId}`}
                      className="block transition-transform hover:scale-105 duration-300"
                    >
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
                    {hasOverrideBg && effMeta
                      ? (() => {
                          const yearVal =
                            effMeta.year && String(effMeta.year).trim()
                              ? String(effMeta.year).trim()
                              : null;
                          const restArr = [
                            effMeta.country,
                            effMeta.genre,
                            effMeta.duration,
                          ].filter(
                            (v) => v && String(v).trim().length > 0
                          ) as string[];
                          return (
                            <span className="inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-2 max-w-[80vw]">
                              {(effMeta.ratingKP != null ||
                                effMeta.ratingIMDb != null) && (
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
                                          effMeta.ratingKP != null &&
                                          effMeta.ratingKP > 8.5
                                            ? "font-bold text-lg bg-clip-text text-transparent"
                                            : `${ratingColor(
                                                effMeta.ratingKP ?? undefined
                                              )} font-bold text-lg`
                                        }
                                        style={
                                          effMeta.ratingKP != null &&
                                          effMeta.ratingKP > 8.5
                                            ? {
                                                backgroundImage:
                                                  "linear-gradient(165deg, #ffd25e 16.44%, #b59646 63.42%)",
                                                WebkitBackgroundClip: "text",
                                                backgroundClip: "text",
                                                WebkitTextFillColor:
                                                  "transparent",
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
                                          effMeta.ratingIMDb != null &&
                                          effMeta.ratingIMDb > 8.5
                                            ? "font-bold text-lg bg-clip-text text-transparent"
                                            : `${ratingColor(
                                                effMeta.ratingIMDb ?? undefined
                                              )} font-bold text-lg`
                                        }
                                        style={
                                          effMeta.ratingIMDb != null &&
                                          effMeta.ratingIMDb > 8.5
                                            ? {
                                                backgroundImage:
                                                  "linear-gradient(165deg, #ffd25e 16.44%, #b59646 63.42%)",
                                                WebkitBackgroundClip: "text",
                                                backgroundClip: "text",
                                                WebkitTextFillColor:
                                                  "transparent",
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
                      : null}
                  </div>
                </div>

                <section className="w-full mt-[1vh] md:mt-4">
                  <div className="relative z-20 w-full">
                    {isMoviesMode ? (
                      <div className="px-0 md:px-12 max-w-[1800px] mx-auto">
                        <MoviesSection
                          onBackdropOverrideChange={(bg, poster) => {
                            setOverrideBg(bg ?? null);
                            setOverridePoster(poster ?? null);
                          }}
                          onHeroInfoOverrideChange={(info) => {
                            setOverrideHeroMeta(info?.meta ?? null);
                            setOverrideHeroLogoSrc(info?.logo ?? null);
                            setOverrideHeroLogoId(info?.logoId ?? null);
                            setOverrideHeroTitle(info?.title ?? null);
                          }}
                        />
                      </div>
                    ) : isSerialsMode ? (
                      <div className="px-0 md:px-12 max-w-[1800px] mx-auto">
                        <SerialsSection
                          onBackdropOverrideChange={(bg, poster) => {
                            setOverrideBg(bg ?? null);
                            setOverridePoster(poster ?? null);
                          }}
                          onHeroInfoOverrideChange={(info) => {
                            setOverrideHeroMeta(info?.meta ?? null);
                            setOverrideHeroLogoSrc(info?.logo ?? null);
                            setOverrideHeroLogoId(info?.logoId ?? null);
                            setOverrideHeroTitle(info?.title ?? null);
                          }}
                        />
                      </div>
                    ) : (
                      <div className="px-0 md:px-12 max-w-[1800px] mx-auto">
                        <TrendingSection
                          activeBackdropId={currentId ?? undefined}
                        />
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </PosterBackground>
  );
}
