"use client";
import useSWR from "swr";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRef, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ratingBgColor, formatRatingLabel } from "@/lib/utils";
import CountryFlag, { getCountryLabel } from "@/lib/country-flags";
import { savePosterTransition } from "@/lib/poster-transition";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

type MovieSliderProps = {
  url: string;
  title?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  autoplay?: boolean;
  autoplayIntervalMs?: number;
  hoverPause?: boolean;
  perPageOverride?: number;
  loop?: boolean;
  activeItemId?: string;
  // Только для главной: уменьшенные карточки на мобиле
  compactOnMobile?: boolean;
  // Для страниц актёра: загрузить все страницы и показать все фильмы
  fetchAllPages?: boolean;
  // Сортировка по году: по убыванию (desc) или возрастанию (asc)
  sortByYear?: "asc" | "desc";
};

const fetcher = async (url: string, timeout: number = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === "AbortError") throw new Error("Request timeout");
      throw error;
    }
    throw new Error("Unknown error occurred");
  }
};

function makePageUrl(base: string, page: number) {
  try {
    const u = new URL(base);
    u.searchParams.set("page", String(page));
    return u.toString();
  } catch {
    const hasQuery = base.includes("?");
    const hasPage = /[?&]page=/.test(base);
    if (hasPage) {
      return base.replace(/([?&]page=)\d+/, `$1${page}`);
    }
    return base + (hasQuery ? `&page=${page}` : `?page=${page}`);
  }
}

function extractMoviesFromData(data: any): any[] {
  let movies: any[] = [];
  if (data?.type === "list" && data?.channels) {
    movies = data.channels.map((item: any) => ({
      id: item.details?.id || item.id,
      title: item.details?.name || item.title,
      poster: item.details?.poster || item.poster,
      year: item.details?.released || item.year,
      rating: item.details?.rating_kp || item.rating,
      country: item.details?.country || item.country,
      quality: item.details?.quality || item.quality,
      tags: item.details?.tags || item.tags,
    }));
  } else if (Array.isArray(data)) {
    movies = data;
  }
  return movies;
}

function getPrimaryGenreFromMovie(movie: any): string | null {
  if (!movie) return null;
  const raw = (movie as any).genre ?? (movie as any).tags;
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const first = raw.find((v) => v != null && String(v).trim().length > 0);
    return first != null ? String(first).trim() : null;
  }
  if (typeof raw === "string") {
    const parts = raw
      .split(/[,/|]/)
      .map((p) => p.trim())
      .filter(Boolean);
    return parts[0] || null;
  }
  return null;
}

export default function MovieSlider({
  url,
  title,
  viewAllHref,
  viewAllLabel = "Смотреть все",
  autoplay = false,
  autoplayIntervalMs = 10000,
  hoverPause = true,
  perPageOverride,
  loop = false,
  activeItemId,
  compactOnMobile,
  fetchAllPages = false,
  sortByYear,
}: MovieSliderProps) {
  const [page, setPage] = useState<number>(1);
  const [pagesData, setPagesData] = useState<Array<{ page: number; data: any }>>([]);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const perPage = perPageOverride ?? 15;
  const getItemsPerView = () => {
    if (typeof window === "undefined") return 2;
    if (window.matchMedia && window.matchMedia("(min-width: 1280px)").matches) return 6;
    if (window.matchMedia && window.matchMedia("(min-width: 1024px)").matches) return 5;
    if (window.matchMedia && window.matchMedia("(min-width: 768px)").matches) return 4;
    return 2;
  };
  const [itemsPerView, setItemsPerView] = useState<number>(2);

  useEffect(() => {
    setPage(1);
    setPagesData([]);
  }, [url]);

  const currentUrl = useMemo(() => makePageUrl(url, page), [url, page]);
  const { data, error, isLoading, isValidating } = useSWR<string>(currentUrl, fetcher);

  useEffect(() => {
    if (!data) return;
    setPagesData((prev) => {
      const exists = prev.some((p) => p.page === page);
      if (exists) return prev;
      return [...prev, { page, data }];
    });
  }, [data, page]);

  // Когда требуется загрузить все страницы (например, профиль актёра),
  // последовательно подтягиваем следующие страницы, пока данные не закончатся
  useEffect(() => {
    if (!fetchAllPages) return;
    if (!data) return;
    let cancelled = false;
    const already = new Set(pagesData.map((p) => p.page));
    (async () => {
      let next = page + 1;
      for (let i = 0; i < 100; i++) {
        if (cancelled) break;
        if (already.has(next)) { next++; continue; }
        try {
          const nextUrl = makePageUrl(url, next);
          const nd = await fetcher(nextUrl, 10000);
          const items = extractMoviesFromData(nd);
          if (!items || items.length === 0) break;
          setPagesData((prev) => {
            if (prev.some((p) => p.page === next)) return prev;
            return [...prev, { page: next, data: nd }];
          });
          already.add(next);
          next++;
        } catch {
          break;
        }
      }
    })();
    return () => { cancelled = true; };
  }, [fetchAllPages, data, page, url, pagesData]);

  let movies: any[] = [];
  pagesData
    .sort((a, b) => a.page - b.page)
    .forEach((ds) => {
      movies = movies.concat(extractMoviesFromData(ds.data));
    });

  // Remove duplicates by id
  const seen = new Set<string>();
  movies = movies.filter((m) => {
    const id = String(m.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  if (sortByYear) {
    const toNum = (y: any) => {
      const n = Number(String(y).replace(/[^0-9]/g, ""));
      return Number.isFinite(n) ? n : NaN;
    };
    movies.sort((a: any, b: any) => {
      const ya = toNum(a.year);
      const yb = toNum(b.year);
      const aU = Number.isNaN(ya);
      const bU = Number.isNaN(yb);
      if (aU && bU) return 0;
      if (aU) return 1;
      if (bU) return -1;
      return sortByYear === "asc" ? ya - yb : yb - ya;
    });
  }

  const display = fetchAllPages ? movies : movies.slice(0, perPage);

  // Загружаем overrides для текущих карточек (батчем по ids)
  const overridesCacheRef = (globalThis as any).__movieOverridesCache || ((globalThis as any).__movieOverridesCache = {});
  const [overridesMap, setOverridesMap] = useState<Record<string, any>>(() => ({ ...overridesCacheRef }));
  const idsString = useMemo(() => (display || []).map((m: any) => String(m.id)).join(","), [display]);
  const [failedSrcById, setFailedSrcById] = useState<Record<string, string>>({});
  const [pendingOverrideIds, setPendingOverrideIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!idsString) return;
    const idsArray = idsString.split(",").filter(Boolean);
    const controller = new AbortController();
    setPendingOverrideIds((prev) => {
      const next = new Set(prev);
      for (const id of idsArray) {
        if (!(id in (overridesCacheRef as any)) && !(id in overridesMap)) next.add(id);
      }
      return next;
    });
    (async () => {
      try {
        const res = await fetch(`/api/overrides/movies?ids=${encodeURIComponent(idsString)}`, {
          signal: controller.signal,
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const ok = res.ok;
        const data = ok ? (await res.json()) || {} : {};
        setOverridesMap((prev) => {
          const next: Record<string, any> = { ...prev, ...data };
          for (const id of idsArray) {
            if (!(id in next)) next[id] = null;
          }
          Object.assign(overridesCacheRef, next);
          return next;
        });
      } catch {
        setOverridesMap((prev) => {
          const next: Record<string, any> = { ...prev };
          for (const id of idsArray) {
            if (!(id in next)) next[id] = null;
          }
          Object.assign(overridesCacheRef, next);
          return next;
        });
      } finally {
        setPendingOverrideIds((prev) => {
          const next = new Set(prev);
          for (const id of idsArray) next.delete(id);
          return next;
        });
      }
    })();
    return () => controller.abort();
  }, [idsString]);

  const finalDisplay = useMemo(() => {
    return (display || []).map((m: any) => {
      const ov = overridesMap[String(m.id)] || null;
      const patchedPoster = ov && ov.poster ? ov.poster : m.poster;
      // Если в override задано название, используем его:
      // поддерживаем как `name`, так и `title` на случай разных источников
      const patchedTitle = ov && (ov.name || ov.title) ? (ov.name || ov.title) : m.title;
      return { ...m, poster: patchedPoster, title: patchedTitle };
    });
  }, [display, overridesMap]);
  useEffect(() => {
    const api = carouselApi;
    if (!api) return;
    const update = () => setSelectedIndex(api.selectedScrollSnap());
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => {
      api.off("select", update);
      api.off("reInit", update);
    };
  }, [carouselApi]);

  const isInteractingRef = useRef<boolean>(false);
  useEffect(() => {
    const api: any = carouselApi as any;
    if (!api || typeof api.on !== "function") return;
    const onDown = () => { isInteractingRef.current = true; };
    const onUp = () => { isInteractingRef.current = false; };
    try { api.on("pointerDown", onDown); api.on("pointerUp", onUp); } catch {}
    return () => {
      try { api.off("pointerDown", onDown); api.off("pointerUp", onUp); } catch {}
    };
  }, [carouselApi]);

  const lastSyncedIdRef = useRef<string | null>(null);
  const pendingSyncIdRef = useRef<string | null>(null);
  const trySyncToActive = useCallback(() => {
    const api: any = carouselApi as any;
    const targetId = pendingSyncIdRef.current;
    if (!api || !targetId) return;
    if (isInteractingRef.current) return;
    if (!finalDisplay || finalDisplay.length === 0) return;
    const idx = finalDisplay.findIndex((m: any) => String(m.id) === String(targetId));
    if (idx >= 0) {
      try { api.scrollTo?.(idx); } catch {}
      lastSyncedIdRef.current = targetId;
      pendingSyncIdRef.current = null;
    }
  }, [carouselApi, finalDisplay]);

  useEffect(() => {
    pendingSyncIdRef.current = activeItemId || null;
    lastSyncedIdRef.current = null;
    trySyncToActive();
  }, [activeItemId, trySyncToActive]);

  useEffect(() => {
    trySyncToActive();
  }, [finalDisplay, trySyncToActive]);

  const [paused, setPaused] = useState<boolean>(false);
  useEffect(() => {
    if (!autoplay) return;
    const api = carouselApi;
    if (!api) return;
    const id = setInterval(() => {
      if (paused) return;
      if (loop) {
        if (api.canScrollNext()) api.scrollNext(); else api.scrollTo(0);
      } else {
        if (api.canScrollNext()) api.scrollNext();
      }
    }, Math.max(1000, autoplayIntervalMs));
    return () => clearInterval(id);
  }, [autoplay, carouselApi, paused, loop, autoplayIntervalMs]);

  useEffect(() => {
    const compute = () => setItemsPerView(getItemsPerView());
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);
  const handleImageLoad = (id: string | number) => {
    const key = String(id);
    setLoadedImages((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {(title || viewAllHref) && (
        <div className="flex items-center justify-between relative z-20">
          {title ? (
            <h2 className="text-lg md:text-xl font-semibold text-zinc-200 relative z-20">{title}</h2>
          ) : (
            <div />
          )}
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-[12px] md:text-sm font-medium text-zinc-300 hover:text-zinc-100 transition-colors relative z-20"
            >
              {viewAllLabel}
            </Link>
          )}
        </div>
      )}
      {error && display.length === 0 ? (
        <div className="text-center py-6">
          <div className="inline-block bg-red-950/50 border border-red-900/50 p-3 text-red-400 rounded backdrop-blur-sm">
            Ошибка загрузки данных
          </div>
        </div>
      ) : isLoading && display.length === 0 ? (
        // Скелетоны должны точно повторять вёрстку карусели, чтобы не было layout shift
        <div className="relative z-10">
          <Carousel className="w-full" opts={{ dragFree: true, loop: false, align: "start" }} setApi={setCarouselApi}>
            <CarouselContent className="-ml-2">
              {Array.from({ length: perPage }).map((_, i) => (
                <CarouselItem
                  key={i}
                  className={`pl-2 ${
                    compactOnMobile ? "basis-1/2 sm:basis-1/2" : "basis-1/2 sm:basis-1/2"
                  } md:basis-1/5 lg:basis-1/5 xl:basis-1/5`}
                >
                  <div className="group block bg-transparent hover:bg-transparent outline-none hover:outline hover:outline-[1.5px] hover:outline-zinc-700 focus-visible:outline focus-visible:outline-[2px] focus-visible:outline-zinc-700 transition-all duration-200 overflow-hidden rounded-sm">
                    <div className="aspect-[2/3] bg-zinc-950 flex items-center justify-center relative overflow-hidden rounded-[10px]">
                      <Skeleton className="w-full h-full" />
                    </div>
                    {/* Под постером оставляем область для анимации частиц + скелетона текста */}
                    <div className="relative p-2 md:p-3 min-h-[48px] md:min-h-[56px] overflow-hidden">
                      <div className="pointer-events-none absolute top-[4%] h-[52%] left-1/2 -translate-x-1/2 w-[46%] hidden md:block opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-500 movie-title-flame" />
                      <div className="relative">
                        <Skeleton className="h-3 md:h-4 w-3/4 mb-1" />
                        <div className="flex items-center gap-2 text-[10px] md:text-[11px]">
                          <Skeleton className="h-3 md:h-4 w-10" />
                          <Skeleton className="h-3 md:h-4 w-16" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
          <div className="hidden md:flex items-center justify-center gap-1 mt-3 min-h-[10px]">
            {(carouselApi?.scrollSnapList() || Array.from({ length: 10 })).map((_: any, i: number) => (
              <span
                key={i}
                className={`${selectedIndex === i ? "w-6" : "w-2"} h-2 rounded-full transition-all duration-300`}
                style={{ backgroundColor: selectedIndex === i ? "rgba(var(--ui-accent-rgb), 0.9)" : "rgba(255,255,255,0.3)" }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="relative" onMouseEnter={() => hoverPause && setPaused(true)} onMouseLeave={() => hoverPause && setPaused(false)}>
          <Carousel className="w-full" opts={{ dragFree: true, loop: loop ?? false, align: "start" }} setApi={setCarouselApi}>
            <CarouselContent className="-ml-2 cursor-grab active:cursor-grabbing">
              {finalDisplay.map((movie: any, index: number) => (
                <CarouselItem
                  key={movie.id || index}
                  className={`pl-2 ${
                    compactOnMobile ? "basis-1/2 sm:basis-1/2" : "basis-1/2 sm:basis-1/2"
                  } md:basis-1/5 lg:basis-1/5 xl:basis-1/5`}
                >
                  <Link
                    href={`/movie/${movie.id}`}
                    className="group block bg-transparent hover:bg-transparent outline-none hover:outline hover:outline-[1.5px] hover:outline-zinc-700 focus-visible:outline focus-visible:outline-[2px] focus-visible:outline-zinc-700 transition-all duration-200 overflow-hidden rounded-sm"
                    onMouseMove={(e) => {
                      const posterEl = e.currentTarget.querySelector('.poster-card') as HTMLElement;
                      if (!posterEl) return;
                      const rect = posterEl.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const y = e.clientY - rect.top;
                      const mx = x / rect.width * 2 - 1;
                      const my = y / rect.height * 2 - 1;
                      posterEl.style.setProperty('--x', `${x}px`);
                      posterEl.style.setProperty('--y', `${y}px`);
                      posterEl.style.setProperty('--mx', `${mx}`);
                      posterEl.style.setProperty('--my', `${my}`);
                    }}
                    onMouseLeave={(e) => {
                      const posterEl = e.currentTarget.querySelector('.poster-card') as HTMLElement;
                      if (!posterEl) return;
                      posterEl.style.setProperty('--mx', '0');
                      posterEl.style.setProperty('--my', '0');
                    }}
                  onClick={(e) => {
                    const api = carouselApi as unknown as { clickAllowed?: () => boolean } | null
                    if (api?.clickAllowed && !api.clickAllowed()) {
                      e.preventDefault()
                      return
                    }
                    
                    // Сохраняем позицию постера для анимации перехода (только десктоп)
                    const posterEl = e.currentTarget.querySelector('.aspect-\\[2\\/3\\]') as HTMLElement
                    if (posterEl && movie.poster) {
                      const rect = posterEl.getBoundingClientRect()
                      savePosterTransition({
                        movieId: String(movie.id),
                        posterUrl: movie.poster,
                        rect: rect,
                      })
                    }

                    try {
                      const ids = (finalDisplay || []).map((m: any) => String(m.id))
                      const index = ids.indexOf(String(movie.id))
                      const ctx = { origin: "slider", ids, index, timestamp: Date.now() }
                      localStorage.setItem("__navContext", JSON.stringify(ctx))
                      const href = `${location.pathname}${location.search}`
                      localStorage.setItem("__returnTo", JSON.stringify({ href, timestamp: Date.now() }))
                    } catch {}
                  }}
                >
                  <div className="aspect-[2/3] bg-zinc-950 flex items-center justify-center relative overflow-hidden rounded-[10px] poster-card">
                    {(() => {
                      const idStr = String(movie.id);
                      const ovEntry = (overridesMap as any)[idStr];
                      const known = ovEntry !== undefined;
                      const posterSrc = known
                        ? (ovEntry?.poster ?? movie.poster ?? null)
                        : null;
                      const waiting = !known;
                      if (posterSrc && failedSrcById[String(movie.id)] !== (posterSrc || "")) {
                        return (
                          <img
                            key={String(movie.id)}
                            src={posterSrc || "/placeholder.svg"}
                            alt={movie.title || "Постер"}
                            decoding="async"
                            loading={index < itemsPerView ? "eager" : "lazy"}
                            fetchPriority={index < itemsPerView ? "high" : "low"}
                            className={`w-full h-full object-cover transition-all ease-out poster-media ${
                              loadedImages.has(String(movie.id)) ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-md scale-[1.02]"
                            }`}
                            style={{ transition: "opacity 300ms ease-out, filter 600ms ease-out, transform 600ms ease-out", willChange: "opacity, filter, transform" }}
                            onLoad={() => {
                              handleImageLoad(movie.id);
                              const key = String(movie.id);
                              setFailedSrcById((prev) => {
                                const next = { ...prev };
                                if (next[key]) delete next[key];
                                return next;
                              });
                            }}
                            onError={() => {
                              const key = String(movie.id);
                              const src = posterSrc || "";
                              setFailedSrcById((prev) => ({ ...prev, [key]: src }));
                            }}
                          />
                        );
                      }
                      if (waiting) {
                        return <Skeleton className="w-full h-full" />;
                      }
                      return <div className="text-zinc-600 text-[10px] text-center p-1">Нет постера</div>;
                    })()}
                      {(() => {
                        const idStr = String(movie.id);
                        const ovEntry = (overridesMap as any)[idStr];
                        const known = ovEntry !== undefined;
                        const posterSrc = known
                          ? (ovEntry?.poster ?? movie.poster ?? null)
                          : null;
                        return posterSrc && loadedImages.has(String(movie.id)) ? (
                          <div
                            className="pointer-events-none absolute inset-0 z-10 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300"
                            style={{
                              background:
                                "radial-gradient(140px circle at var(--x) var(--y), rgba(var(--ui-accent-rgb),0.35), rgba(0,0,0,0) 60%)",
                            }}
                          />
                        ) : null;
                      })()}
                      
                      {movie.rating && (
                        <div
                          className={`absolute top-1 right-1 md:top-2 md:right-2 px-2 md:px-2 py-[3px] md:py-1 rounded-sm text-[11px] md:text-[12px] text-white font-medium z-[3] ${ratingBgColor(
                            movie.rating
                          )}`}
                        >
                          {formatRatingLabel(movie.rating)}
                        </div>
                      )}
                      {movie.quality && (
                        <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 px-2 md:px-2 py-[3px] md:py-1 rounded-sm text-[10px] md:text-[12px] bg-white text-black border border-white/70 z-[3] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                          {String(movie.quality)}
                        </div>
                      )}
                    </div>
                    <div className="relative p-2 md:p-3 min-h-[48px] md:min-h-[56px] overflow-hidden">
                      <div className="relative z-[2]">
                        <h3
                          className="text-[11px] md:text-[12px] font-medium truncate mb-1 leading-tight text-zinc-300/80 transition-colors duration-200 group-hover:text-zinc-100 group-focus-visible:text-zinc-100"
                          title={movie.title || "Без названия"}
                        >
                          {movie.title || "Без названия"}
                        </h3>
                        {(() => {
                          const year = movie.year ? String(movie.year) : null;
                          const genre = getPrimaryGenreFromMovie(movie);
                          if (!year && !genre) return null;
                          return (
                            <div className="flex items-center gap-2 text-[10px] md:text-[11px] text-zinc-400/70 transition-colors duration-200 group-hover:text-zinc-300 group-focus-visible:text-zinc-300">
                              {year && <span>{year}</span>}
                              {year && genre && <span className="text-zinc-500/60">•</span>}
                              {genre && <span className="truncate max-w-[70%]">{genre}</span>}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
          <div className="hidden md:flex items-center justify-center gap-1 mt-3 min-h-[10px]">
            {(carouselApi?.scrollSnapList() || Array.from({ length: 10 })).map((_: any, i: number) => (
              <button
                key={i}
                type="button"
                aria-label={`К слайду ${i + 1}`}
                aria-current={selectedIndex === i}
                onClick={() => carouselApi?.scrollTo?.(i)}
                className={`${selectedIndex === i ? "w-6" : "w-2 bg-white/30"} h-2 rounded-full transition-all duration-300`}
                style={selectedIndex === i ? { backgroundColor: "rgb(var(--ui-accent-rgb))" } : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
