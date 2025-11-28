"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ratingBgColor, formatRatingLabel } from "@/lib/utils";
import CountryFlag from "@/lib/country-flags";
import { savePosterTransition } from "@/lib/poster-transition";

// Swiper imports
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination, Autoplay } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';

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
  compactOnMobile?: boolean;
  fetchAllPages?: boolean;
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
      genre: item.details?.genre || item.genre,
      tags: item.details?.tags || item.tags,
    }));
  } else if (Array.isArray(data)) {
    movies = data;
  }
  return movies;
}

export default function CoverflowMovieSlider({
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
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);
  const [isSliderInitialized, setIsSliderInitialized] = useState(false);
  const perPage = perPageOverride ?? 15;
  const router = useRouter();
  
  useEffect(() => {
    setPage(1);
    setPagesData([]);
    setIsSliderInitialized(false);
  }, [url]);

  const currentUrl = useMemo(() => makePageUrl(url, page), [url, page]);
  const { data, error, isLoading } = useSWR<string>(currentUrl, fetcher);

  useEffect(() => {
    if (!data) return;
    setPagesData((prev) => {
      const exists = prev.some((p) => p.page === page);
      if (exists) return prev;
      return [...prev, { page, data }];
    });
  }, [data, page]);

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
  
  useEffect(() => {
    if (!idsString) return;
    const idsArray = idsString.split(",").filter(Boolean);
    const controller = new AbortController();
    
    // Simple check to avoid re-fetching if we already have everything
    const needed = idsArray.filter(id => !(id in (overridesCacheRef as any)) && !(id in overridesMap));
    if (needed.length === 0) return;

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
      }
    })();
    return () => controller.abort();
  }, [idsString]);

  const finalDisplay = useMemo(() => {
    return (display || []).map((m: any) => {
      const ov = overridesMap[String(m.id)] || null;
      const patchedPoster = ov && ov.poster ? ov.poster : m.poster;
      const patchedTitle = ov && (ov.name || ov.title) ? (ov.name || ov.title) : m.title;
      return { ...m, poster: patchedPoster, title: patchedTitle };
    });
  }, [display, overridesMap]);

  const handleImageLoad = (id: string | number) => {
    const key = String(id);
    setLoadedImages((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  // Calculate initial index (starts from 5th active item if possible)
  const initialIndex = useMemo(() => {
    if (!finalDisplay || finalDisplay.length === 0) return 0;
    // Try to start at index 4 (5th item)
    return finalDisplay.length > 4 ? 4 : Math.floor(finalDisplay.length / 2);
  }, [finalDisplay]);

  // Force slide to initial index when ready
  useEffect(() => {
    if (swiperInstance && finalDisplay.length > 0 && !isSliderInitialized) {
        if (loop) {
            swiperInstance.slideToLoop(initialIndex, 0);
        } else {
            swiperInstance.slideTo(initialIndex, 0);
        }
        setIsSliderInitialized(true);
    }
  }, [swiperInstance, finalDisplay, loop, isSliderInitialized, initialIndex]);

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
        // Skeleton loader - mimicking Coverflow layout (7 visible items)
        <div className="relative z-10 flex items-center justify-center overflow-hidden py-8 w-full">
           {/* Left fake items */}
           {/* 3rd Left (furthest) */}
           <div className="hidden lg:block absolute left-[calc(50%-480px)] scale-[0.75] opacity-20 z-0 w-[160px] md:w-[220px] -rotate-y-25 origin-right translate-x-[-50%]">
              <div className="aspect-[2/3] bg-zinc-950 rounded-[10px]">
                 <Skeleton className="w-full h-full rounded-[10px]" />
              </div>
           </div>
           {/* 2nd Left */}
           <div className="hidden md:block absolute left-[calc(50%-330px)] scale-[0.8] opacity-40 z-0 w-[160px] md:w-[220px] -rotate-y-25 origin-right translate-x-[-50%]">
              <div className="aspect-[2/3] bg-zinc-950 rounded-[10px]">
                 <Skeleton className="w-full h-full rounded-[10px]" />
              </div>
           </div>
           {/* 1st Left (closest) */}
           <div className="absolute left-[calc(50%-115px)] md:left-[calc(50%-165px)] scale-[0.85] opacity-60 z-10 w-[160px] md:w-[220px] -rotate-y-25 origin-right translate-x-[-50%]">
              <div className="aspect-[2/3] bg-zinc-950 rounded-[10px]">
                 <Skeleton className="w-full h-full rounded-[10px]" />
              </div>
           </div>

           {/* Center active item */}
           <div className="relative z-20 scale-100 w-[160px] md:w-[220px] shadow-xl">
              <div className="aspect-[2/3] bg-zinc-950 rounded-[10px] mb-2">
                 <Skeleton className="w-full h-full rounded-[10px]" />
              </div>
              <div className="mt-3 space-y-2 px-1">
                 <Skeleton className="h-4 w-3/4 mx-auto" />
                 <div className="flex justify-center gap-2">
                    <Skeleton className="h-3 w-8" />
                    <Skeleton className="h-3 w-12" />
                 </div>
              </div>
           </div>

           {/* Right fake items */}
           {/* 1st Right (closest) */}
           <div className="absolute right-[calc(50%-115px)] md:right-[calc(50%-165px)] scale-[0.85] opacity-60 z-10 w-[160px] md:w-[220px] rotate-y-25 origin-left translate-x-[50%]">
              <div className="aspect-[2/3] bg-zinc-950 rounded-[10px]">
                 <Skeleton className="w-full h-full rounded-[10px]" />
              </div>
           </div>
           {/* 2nd Right */}
           <div className="hidden md:block absolute right-[calc(50%-330px)] scale-[0.8] opacity-40 z-0 w-[160px] md:w-[220px] rotate-y-25 origin-left translate-x-[50%]">
              <div className="aspect-[2/3] bg-zinc-950 rounded-[10px]">
                 <Skeleton className="w-full h-full rounded-[10px]" />
              </div>
           </div>
           {/* 3rd Right (furthest) */}
           <div className="hidden lg:block absolute right-[calc(50%-480px)] scale-[0.75] opacity-20 z-0 w-[160px] md:w-[220px] rotate-y-25 origin-left translate-x-[50%]">
              <div className="aspect-[2/3] bg-zinc-950 rounded-[10px]">
                 <Skeleton className="w-full h-full rounded-[10px]" />
              </div>
           </div>
        </div>
      ) : (
        <div className="relative">
          <Swiper
            onSwiper={setSwiperInstance}
            effect={'coverflow'}
            grabCursor={true}
            centeredSlides={true}
            slidesPerView={'auto'}
            coverflowEffect={{
              rotate: 25,
              stretch: 0,
              depth: 100,
              modifier: 1,
              slideShadows: true,
            }}
            pagination={false}
            loop={loop}
            autoplay={autoplay ? { delay: autoplayIntervalMs, disableOnInteraction: false, pauseOnMouseEnter: hoverPause } : false}
            modules={[EffectCoverflow, Autoplay]}
            className="w-full py-8"
            initialSlide={initialIndex}
          >
            {finalDisplay.map((movie: any, index: number) => (
              <SwiperSlide 
                key={movie.id || index}
                className="!w-[160px] sm:!w-[180px] md:!w-[220px]"
                data-movie-id={movie.id}
              >
                {({ isActive }) => (
                  <div
                    className={`group block bg-transparent hover:bg-transparent outline-none transition-all duration-300 overflow-hidden rounded-sm relative cursor-pointer ${
                      isActive ? "" : "brightness-[0.35] hover:brightness-[0.6]"
                    }`}
                    onClick={(e) => {
                       e.preventDefault();
                       e.stopPropagation();
                       
                       if (isActive) {
                           // Navigate to movie page
                           const posterEl = e.currentTarget.querySelector('.aspect-\\[2\\/3\\]') as HTMLElement;
                           if (posterEl && movie.poster) {
                               const rect = posterEl.getBoundingClientRect();
                               savePosterTransition({
                                   movieId: String(movie.id),
                                   posterUrl: movie.poster,
                                   rect: rect,
                               });
                           }
                           
                           try {
                               const ids = (finalDisplay || []).map((m: any) => String(m.id));
                               const idx = ids.indexOf(String(movie.id));
                               const ctx = { origin: "slider", ids, index: idx, timestamp: Date.now() };
                               localStorage.setItem("__navContext", JSON.stringify(ctx));
                               const href = `${location.pathname}${location.search}`;
                               localStorage.setItem("__returnTo", JSON.stringify({ href, timestamp: Date.now() }));
                           } catch {}
                           
                           router.push(`/movie/${movie.id}`);
                       } else {
                           // Slide to this item
                           if (swiperInstance) {
                               if (loop) {
                                   swiperInstance.slideToLoop(index);
                               } else {
                                   swiperInstance.slideTo(index);
                               }
                           }
                       }
                    }}
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
                            src={posterSrc || "/placeholder.svg"}
                            alt={movie.title || "Постер"}
                            decoding="async"
                            loading={index < 5 ? "eager" : "lazy"}
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
                    
                    {/* Shine effect */}
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

                    {/* Info overlay on poster */}
                    {(() => {
                      const genres = (() => {
                        const raw = (movie as any)?.genre;
                        let items: string[] = [];
                        if (Array.isArray(raw)) {
                          items = raw
                            .map((v) => String(v || "").trim())
                            .filter((v) => v.length > 0);
                        } else if (typeof raw === "string") {
                          items = raw
                            .split(/[,/|]/)
                            .map((p) => p.trim())
                            .filter(Boolean);
                        }
                        return items.slice(0, 2);
                      })();
                      const hasCountry = !!movie.country;
                      if (!hasCountry && genres.length === 0) return null;
                      return (
                        <div className="pointer-events-none absolute inset-0 z-[11] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200">
                          <div
                            className="absolute inset-x-0 bottom-0 h-[40%]"
                            style={{
                              background:
                                "linear-gradient(to top, rgba(0,0,0,0.52), rgba(0,0,0,0.28) 45%, rgba(0,0,0,0.0) 100%)",
                            }}
                          />
                          <div className="absolute inset-x-0 bottom-1 md:bottom-2 flex items-center justify-center px-3">
                            <div className="px-2.5 py-1 md:px-3 md:py-1.5 text-[10px] md:text-[11px] text-white flex items-center justify-center gap-2 flex-wrap text-center">
                              {hasCountry && (
                                <CountryFlag country={movie.country} size="md" className="shadow-sm" />
                              )}
                              {genres.length > 0 && (
                                <span className="opacity-90">{genres.join(" • ")}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                      {movie.rating && (
                        <div
                          className={`absolute top-1 right-1 md:top-2 md:right-2 px-2 md:px-2 py-[3px] md:py-1 rounded-sm text-[11px] md:text-[12px] text-white font-medium z-[20] transition-opacity duration-300 ${
                            isActive ? "opacity-100" : "opacity-0"
                          } ${ratingBgColor(movie.rating)}`}
                        >
                          {formatRatingLabel(movie.rating)}
                        </div>
                      )}
                      {movie.quality && (
                        <div className={`absolute bottom-1 left-1 md:bottom-2 md:left-2 px-2 md:px-2 py-[3px] md:py-1 rounded-sm text-[10px] md:text-[12px] bg-white text-black border border-white/70 z-[20] transition-opacity duration-300 ${
                            isActive ? "opacity-100 group-hover:opacity-100" : "opacity-0"
                          }`}
                        >
                          {String(movie.quality)}
                        </div>
                      )}
                    </div>
                    
                    <div className="relative p-2 md:p-3 min-h-[48px] md:min-h-[56px] overflow-hidden">
                      <div className="relative z-[2]">
                        <h3
                          className="text-[13px] md:text-[14px] font-bold truncate mb-1 leading-tight text-zinc-300/80 transition-colors duration-200 group-hover:text-zinc-100 group-focus-visible:text-zinc-100"
                          title={movie.title || "Без названия"}
                        >
                          {movie.title || "Без названия"}
                        </h3>
                        {(() => {
                          const year = movie.year ? String(movie.year) : null;
                          const quality = movie.quality ? String(movie.quality) : null;
                          const tagsArr = (() => {
                            const raw = (movie as any)?.tags;
                            let items: string[] = [];
                            if (Array.isArray(raw)) {
                              items = raw
                                .map((v) => String(v || "").trim())
                                .filter((v) => v.length > 0);
                            } else if (typeof raw === "string") {
                              items = raw
                                .split(/[,/|]/)
                                .map((p) => p.trim())
                                .filter(Boolean);
                            }
                            return items.slice(0, 1);
                          })();
                          if (!year && !quality && tagsArr.length === 0) return null;
                          return (
                            <div className="flex items-center gap-2 text-[10px] md:text-[11px] text-zinc-400/70 transition-colors duration-200 group-hover:text-zinc-300 group-focus-visible:text-zinc-300">
                              {year && <span>{year}</span>}
                              {year && (quality || tagsArr.length > 0) && (
                                <span className="text-zinc-500/60">•</span>
                              )}
                              {quality && <span>{quality}</span>}
                              {quality && tagsArr.length > 0 && (
                                <span className="text-zinc-500/60">•</span>
                              )}
                              {tagsArr.length > 0 && (
                                <span className="truncate max-w-[70%]">{tagsArr.join(" • ")}</span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}
    </div>
  );
}
