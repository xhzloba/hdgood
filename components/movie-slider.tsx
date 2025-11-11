"use client";
import useSWR from "swr";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ratingBgColor, formatRatingLabel } from "@/lib/utils";
import CountryFlag, { getCountryLabel } from "@/lib/country-flags";
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

export default function MovieSlider({ url, title, viewAllHref, viewAllLabel = "Смотреть все" }: MovieSliderProps) {
  const [page, setPage] = useState<number>(1);
  const [pagesData, setPagesData] = useState<Array<{ page: number; data: any }>>([]);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const perPage = 15;

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

  const display = movies.slice(0, perPage);

  // Загружаем overrides для текущих карточек (батчем по ids)
  const [overridesMap, setOverridesMap] = useState<Record<string, any>>({});
  const idsString = useMemo(() => (display || []).map((m: any) => String(m.id)).join(","), [display]);

  useEffect(() => {
    if (!idsString) return;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/overrides/movies?ids=${encodeURIComponent(idsString)}`, {
          signal: controller.signal,
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const data = await res.json();
        setOverridesMap(data || {});
      } catch {}
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
        <div className="flex items-center justify-between">
          {title ? (
            <h2 className="text-lg md:text-xl font-semibold text-zinc-200">{title}</h2>
          ) : (
            <div />
          )}
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-[12px] md:text-sm font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
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
        <div className="relative">
          <Carousel className="w-full" opts={{ dragFree: true, loop: false, align: "start" }}>
            <CarouselContent className="-ml-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <CarouselItem
                  key={i}
                  className="pl-2 basis-1/2 sm:basis-1/2 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
                >
                  <div className="block bg-zinc-900/60 border-2 md:border border-zinc-800/50 overflow-hidden rounded-sm">
                    <div className="aspect-[2/3] bg-zinc-950">
                      <Skeleton className="w-full h-full" />
                    </div>
                    <div className="p-2 md:p-3">
                      <Skeleton className="h-3 md:h-4 w-3/4 mb-2" />
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-2 md:h-3 w-16" />
                        <Skeleton className="h-2 md:h-3 w-12" />
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>
      ) : (
        <div className="relative">
          <Carousel className="w-full" opts={{ dragFree: true, loop: false, align: "start" }} setApi={setCarouselApi}>
            <CarouselContent className="-ml-2 cursor-grab active:cursor-grabbing">
              {finalDisplay.map((movie: any, index: number) => (
                <CarouselItem
                  key={movie.id || index}
                  className="pl-2 basis-1/2 sm:basis-1/2 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
                >
                  <Link
                    href={`/movie/${movie.id}`}
                    className="group block bg-zinc-900/60 hover:bg-zinc-800/80 border-2 md:border border-transparent hover:border-zinc-700 active:border-zinc-700 focus-visible:border-zinc-700 transition-all duration-200 overflow-hidden rounded-sm"
                    onClick={(e) => {
                      const api = carouselApi as unknown as { clickAllowed?: () => boolean } | null
                      if (api?.clickAllowed && !api.clickAllowed()) {
                        e.preventDefault()
                      }
                    }}
                  >
                    <div className="aspect-[2/3] bg-zinc-950 flex items-center justify-center relative">
                      {movie.poster ? (
                        <img
                          src={movie.poster || "/placeholder.svg"}
                          alt={movie.title || "Постер"}
                          className={`w-full h-full object-cover transition-opacity duration-500 ${
                            loadedImages.has(String(movie.id)) ? "opacity-100" : "opacity-0"
                          }`}
                          onLoad={() => handleImageLoad(movie.id)}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              parent.innerHTML =
                                '<div class="text-zinc-600 text-[10px] text-center p-1">Нет постера</div>';
                            }
                          }}
                        />
                      ) : (
                        <div className="text-zinc-600 text-[10px] text-center p-1">Нет постера</div>
                      )}
                      {(() => {
                        const collected: string[] = [];
                        if (movie.quality) collected.push(String(movie.quality));
                        const tv = movie.tags as any;
                        if (Array.isArray(tv)) {
                          collected.push(
                            ...tv.filter(Boolean).map((t: any) => String(t))
                          );
                        } else if (typeof tv === "string") {
                          collected.push(
                            ...tv
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean)
                          );
                        }
                        const tags = collected.slice(0, 2);
                        return tags.length > 0 ? (
                          <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 flex flex-col items-start gap-1">
                            {tags.map((t, i) => (
                              <Badge
                                key={`${t}-${i}`}
                                variant="secondary"
                                className={"px-1.5 py-[2px] text-[9px] md:text-[10px] rounded-sm/2 bg-white text-black border border-zinc-300"}
                              >
                                {t}
                              </Badge>
                            ))}
                          </div>
                        ) : null;
                      })()}
                      {movie.rating && (
                        <div
                          className={`absolute top-1 right-1 md:top-2 md:right-2 px-2 md:px-2 py-[3px] md:py-1 rounded-sm text-[11px] md:text-[12px] text-white font-medium ${ratingBgColor(
                            movie.rating
                          )}`}
                        >
                          {formatRatingLabel(movie.rating)}
                        </div>
                      )}
                    </div>
                    <div className="p-2 md:p-3">
                      <h3
                        className="text-[11px] md:text-[12px] font-medium truncate mb-1 leading-tight text-zinc-300/60 transition-colors duration-200 group-hover:text-zinc-300 group-focus-visible:text-zinc-300 group-active:text-zinc-300"
                        title={movie.title || "Без названия"}
                      >
                        {movie.title || "Без названия"}
                      </h3>
                      <div className="flex items-center justify-start gap-1 text-[10px] md:text-[11px] text-zinc-400/60 transition-colors duration-200 group-hover:text-zinc-400 group-focus-visible:text-zinc-400 group-active:text-zinc-400">
                        {movie.year && <span>{movie.year}</span>}
                        {movie.year && movie.country && (
                          <span className="text-zinc-500/60"> / </span>
                        )}
                        {movie.country && (
                          <>
                            <CountryFlag country={movie.country} size="sm" />
                            {getCountryLabel(movie.country) && (
                              <span>{getCountryLabel(movie.country) as string}</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>
      )}
    </div>
  );
}