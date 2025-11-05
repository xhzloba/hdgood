"use client";
import useSWR from "swr";
import { Loader } from "./loader";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ratingBgColor, formatRatingLabel } from "@/lib/utils";
import CountryFlag from "@/lib/country-flags";

interface Movie {
  id: string;
  title: string;
  poster?: string;
  year?: string;
  rating?: string;
  country?: string | string[];
  quality?: string;
  tags?: string[] | string;
}

interface MovieGridProps {
  url: string;
}

const fetcher = async (url: string, timeout: number = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
    throw new Error('Unknown error occurred');
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
  } else if (data?.type === "category" && data?.channels) {
    movies = data.channels.map((item: any, index: number) => ({
      id: item.playlist_url || index,
      title: item.title,
      poster: null,
      year: null,
    }));
  } else if (data?.channels) {
    movies = data.channels;
  } else if (Array.isArray(data)) {
    movies = data;
  }
  return movies;
}

// Бейдж качества: белый фон, чёрный текст, нейтральный бело‑серый бордер

export function MovieGrid({ url }: MovieGridProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [page, setPage] = useState<number>(1);
  const [pagesData, setPagesData] = useState<
    Array<{ page: number; data: any }>
  >([]);
  const [lastPageEmpty, setLastPageEmpty] = useState<boolean>(false);

  const perPage = 15;

  // Restore paging state on mount/url change (не трогаем loadedImages, чтобы не ломать fade-in при возврате)
  useEffect(() => {
    setPage(1);
    setPagesData([]);
    setLastPageEmpty(false);
  }, [url]);

  const currentUrl = useMemo(() => makePageUrl(url, page), [url, page]);
  const { data, error, isLoading, isValidating } = useSWR<string>(currentUrl, fetcher);

  // Append fetched page data
  useEffect(() => {
    if (!data) return;
    setPagesData((prev) => {
      const exists = prev.some((p) => p.page === page);
      if (exists) return prev;
      const movies = extractMoviesFromData(data);
      if (!movies || movies.length === 0) {
        setLastPageEmpty(true);
      }
      const next = [...prev, { page, data }];
      return next;
    });
  }, [data, page, lastPageEmpty]);

  // Показываем скелетоны не только при первоначальной загрузке,
  // но и во время валидации (смены вкладки/URL), чтобы избежать флэша «Нет данных»
  if ((isLoading || isValidating) && pagesData.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: perPage }).map((_, i) => (
          <div
            key={i}
            className="bg-zinc-900/60 border-2 md:border border-zinc-800/50 rounded-sm overflow-hidden"
          >
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
        ))}
      </div>
    );
  }

  if (error && pagesData.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="inline-block bg-red-950/50 border border-red-900/50 p-4 text-red-400 rounded backdrop-blur-sm">
          Ошибка загрузки данных
        </div>
      </div>
    );
  }

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

  // «Нет данных» показываем только если точно не идёт загрузка/валидация
  if (!isLoading && !isValidating && movies.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="inline-block bg-zinc-800/50 border border-zinc-700/50 p-4 text-zinc-400 backdrop-blur-sm rounded">
          Нет данных
        </div>
      </div>
    );
  }

  const handleImageLoad = (id: string | number) => {
    const key = String(id);
    setLoadedImages((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const handleLoadMore = () => {
    if (isLoading) return;
    if (lastPageEmpty) return;
    setPage((p) => p + 1);
  };

  const displayMovies = movies.slice(0, perPage * pagesData.length);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {displayMovies.map((movie: any, index: number) => (
          <Link
            key={movie.id || index}
            href={`/movie/${movie.id}`}
            className="bg-zinc-900/60 hover:bg-zinc-800/80 border-2 md:border border-zinc-800/50 hover:border-zinc-700 transition-all duration-200 cursor-pointer overflow-hidden rounded-sm"
          >
            <div className="aspect-[2/3] bg-zinc-950 flex items-center justify-center relative">
              {movie.poster ? (
                <img
                  src={movie.poster || "/placeholder.svg"}
                  alt={movie.title || "Постер"}
                  className={`w-full h-full object-cover transition-opacity duration-500 ${
                    loadedImages.has(String(movie.id))
                      ? "opacity-100"
                      : "opacity-0"
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
                <div className="text-zinc-600 text-[10px] text-center p-1">
                  Нет постера
                </div>
              )}
              {/* Tags / Quality on the left, opposite rating */}
              {(() => {
                const collected: string[] = [];
                if (movie.quality) collected.push(String(movie.quality));
                const tv = movie.tags as any;
                if (Array.isArray(tv)) {
                  collected.push(
                    ...tv
                      .filter(Boolean)
                      .map((t: any) => String(t))
                  );
                } else if (typeof tv === "string") {
                  collected.push(
                    ...tv
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                  );
                }
                const display = collected.slice(0, 2);
                return display.length > 0 ? (
                  <div className="absolute top-1 left-1 md:top-2 md:left-2 flex flex-col items-start gap-1">
                    {display.map((t, i) => (
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
                  className={`absolute top-1 right-1 md:top-2 md:right-2 px-2 md:px-2 py-[3px] md:py-1 rounded-sm text-[11px] md:text-[12px] text-white font-medium ${ratingBgColor(movie.rating)}`}
                >
                  {formatRatingLabel(movie.rating)}
                </div>
              )}
            </div>
            <div className="p-2 md:p-3">
              <h3
                className="text-[11px] md:text-[12px] font-medium truncate mb-1 leading-tight text-zinc-200"
                title={movie.title || "Без названия"}
              >
                {movie.title || "Без названия"}
              </h3>
              <div className="flex items-center justify-start gap-1 text-[10px] md:text-[11px] text-zinc-500">
                {movie.year && <span>{movie.year}</span>}
                {movie.country && (
                  <CountryFlag country={movie.country} size="sm" />
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!lastPageEmpty && (
        <div className="flex justify-center mt-4">
          {isLoading ? (
            // Анимированные синие три точки без обрамления (увеличенный размер)
            <Loader size="lg" />
          ) : (
            <button
              onClick={handleLoadMore}
              className="w-full md:w-auto px-4 py-2 text-[12px] border border-zinc-700/50 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800 text-zinc-300 rounded-sm transition-all duration-200"
            >
              {"Загрузить ещё"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
