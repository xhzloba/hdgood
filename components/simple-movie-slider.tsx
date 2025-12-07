"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ratingBgColor, formatRatingLabel } from "@/lib/utils";
import { savePosterTransition } from "@/lib/poster-transition";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

export type SimpleMovie = {
  id: string | number;
  title: string;
  poster: string | null;
  year?: string | number;
  rating?: number | null;
  country?: string;
  quality?: string;
  genre?: string;
  tags?: string[];
};

type SimpleMovieSliderProps = {
  movies: SimpleMovie[];
  title?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  autoplay?: boolean;
  autoplayIntervalMs?: number;
  loop?: boolean;
  compactOnMobile?: boolean;
  activeItemId?: string;
};

export default function SimpleMovieSlider({
  movies,
  title,
  viewAllHref,
  viewAllLabel = "Смотреть все",
  autoplay = false,
  autoplayIntervalMs = 10000,
  loop = false,
  compactOnMobile,
  activeItemId,
}: SimpleMovieSliderProps) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const smoothEasing = useMemo(
    () => (t: number) => 1 - Math.pow(1 - t, 3),
    []
  );
  const carouselOpts = useMemo(
    () => ({
      dragFree: true,
      loop: loop ?? false,
      align: "start" as const,
      duration: 24,
      easing: smoothEasing,
    }),
    [loop, smoothEasing]
  );

  // Overrides logic
  const overridesCacheRef = (globalThis as any).__movieOverridesCache || ((globalThis as any).__movieOverridesCache = {});
  const [overridesMap, setOverridesMap] = useState<Record<string, any>>(() => ({ ...overridesCacheRef }));
  const idsString = useMemo(() => movies.map((m) => String(m.id)).join(","), [movies]);
  const [pendingOverrideIds, setPendingOverrideIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!idsString) return;
    const idsArray = idsString.split(",").filter(Boolean);
    const controller = new AbortController();
    
    // Check which IDs need overrides
    const neededIds: string[] = [];
    for (const id of idsArray) {
        if (!(id in (overridesCacheRef as any)) && !(id in overridesMap)) {
            neededIds.push(id);
        }
    }
    
    if (neededIds.length === 0) return;

    setPendingOverrideIds((prev) => {
      const next = new Set(prev);
      for (const id of neededIds) next.add(id);
      return next;
    });

    (async () => {
      try {
        // Batch fetch in chunks if too many
        const chunkSize = 20;
        for (let i = 0; i < neededIds.length; i += chunkSize) {
            const chunk = neededIds.slice(i, i + chunkSize);
            const res = await fetch(`/api/overrides/movies?ids=${encodeURIComponent(chunk.join(","))}`, {
              signal: controller.signal,
              cache: "no-store",
              headers: { Accept: "application/json" },
            });
            const ok = res.ok;
            const data = ok ? (await res.json()) || {} : {};
            
            setOverridesMap((prev) => {
              const next: Record<string, any> = { ...prev, ...data };
              for (const id of chunk) {
                if (!(id in next)) next[id] = null;
              }
              Object.assign(overridesCacheRef, next);
              return next;
            });
        }
      } catch {
        // Ignore errors
      } finally {
        setPendingOverrideIds((prev) => {
          const next = new Set(prev);
          for (const id of neededIds) next.delete(id);
          return next;
        });
      }
    })();
    return () => controller.abort();
  }, [idsString]);

  const finalDisplay = useMemo(() => {
    return movies.map((m) => {
      const ov = overridesMap[String(m.id)] || null;
      const patchedPoster = ov && ov.poster ? ov.poster : m.poster;
      const patchedTitle = ov && (ov.name || ov.title) ? (ov.name || ov.title) : m.title;
      return { ...m, poster: patchedPoster, title: patchedTitle };
    });
  }, [movies, overridesMap]);

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

  const handleImageLoad = (id: string | number) => {
    const key = String(id);
    setLoadedImages((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  if (!movies || movies.length === 0) return null;

  return (
    <div className="space-y-4 px-2 md:px-0">
      {(title || viewAllHref) && (
        <div className="flex items-center justify-between relative z-20 mb-2 px-1 md:px-0">
          {title ? (
            <h2 className="text-lg md:text-2xl font-bold text-zinc-100 relative z-20 drop-shadow-md tracking-wide">{title}</h2>
          ) : (
            <div />
          )}
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-xs md:text-sm font-medium text-zinc-400 hover:text-white transition-colors relative z-20 flex items-center gap-1"
            >
              {viewAllLabel}
              <span className="text-[10px]">›</span>
            </Link>
          )}
        </div>
      )}
      
      <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <Carousel className="w-full" opts={carouselOpts} setApi={setCarouselApi}>
          <CarouselContent className="-ml-2 cursor-grab active:cursor-grabbing">
            {finalDisplay.map((movie, index) => (
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
                        posterUrl: movie.poster!,
                        rect: rect,
                      })
                    }
                  }}
                >
                  <div 
                    className="poster-card aspect-[2/3] bg-zinc-900 relative overflow-hidden rounded-[10px] isolate transform-gpu"
                    style={{ '--x': '50%', '--y': '50%', '--mx': '0', '--my': '0' } as React.CSSProperties}
                  >
                    {movie.poster ? (
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        loading="lazy"
                        onLoad={() => handleImageLoad(movie.id)}
                        className={`w-full h-full object-cover transition-all duration-500 will-change-transform group-hover:scale-105 ${
                          loadedImages.has(String(movie.id)) ? "opacity-100 blur-0" : "opacity-0 blur-md"
                        }`}
                      />
                    ) : (
                       <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600 text-xs text-center p-2">
                         Нет постера
                       </div>
                    )}

                    {/* Hover Shine Effect */}
                    {movie.poster && loadedImages.has(String(movie.id)) && (
                      <div
                        className="pointer-events-none absolute inset-0 z-10 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300"
                        style={{
                          background: "radial-gradient(140px circle at var(--x) var(--y), rgba(var(--ui-accent-rgb),0.35), rgba(0,0,0,0) 60%)"
                        }}
                      />
                    )}

                    {/* Rating Badge */}
                    {movie.rating ? (
          <div className={`absolute top-1 right-1 md:top-2 md:right-2 px-2 md:px-2 py-[3px] md:py-1 rounded-full md:rounded-md md:shadow-[0_4px_12px_rgba(0,0,0,0.5)] md:font-black md:border md:border-white/10 text-[11px] md:text-[12px] text-white font-bold z-[12] ${ratingBgColor(movie.rating)}`}>
            {formatRatingLabel(movie.rating)}
          </div>
                    ) : null}

                    {/* Quality Badge */}
                    {movie.quality && (
                      <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 px-2 md:px-2 py-[3px] md:py-1 rounded-sm text-[10px] md:text-[12px] bg-white text-black border border-white/70 z-[12] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                        {String(movie.quality)}
                      </div>
                    )}
                  </div>

                  {/* Info under poster */}
                  <div className="relative p-2 md:p-3 min-h-[48px] md:min-h-[56px] overflow-hidden text-left md:text-left">
                    <div className="relative z-[2] text-left md:text-left">
                      <h3 className="text-[13px] md:text-[14px] font-bold truncate mb-1 leading-tight text-zinc-300/80 transition-colors duration-200 group-hover:text-zinc-100 group-focus-visible:text-zinc-100 text-left md:text-left">
                        {movie.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] md:text-[12px] text-zinc-500 font-medium truncate">
                        {movie.year && <span>{movie.year}</span>}
                        {movie.genre && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-zinc-600" />
                            <span className="truncate text-zinc-400">{movie.genre.split(',')[0]}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-4" />
          <CarouselNext className="hidden md:flex -right-4" />
        </Carousel>
      </div>
    </div>
  );
}
