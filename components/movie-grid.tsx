"use client";
import useSWR from "swr";
import { Loader } from "./loader";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ratingBgColor, formatRatingLabel } from "@/lib/utils";
import CountryFlag, { getCountryLabel } from "@/lib/country-flags";
import { savePosterTransition } from "@/lib/poster-transition";

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
        Accept: "application/json",
        "Content-Type": "application/json",
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
      if (error.name === "AbortError") {
        throw new Error("Request timeout");
      }
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


// Бейдж качества: белый фон, чёрный текст, нейтральный бело‑серый бордер

const overridesCacheRef =
  (globalThis as any).__movieOverridesCache ||
  ((globalThis as any).__movieOverridesCache = {});

export function MovieGrid({ url }: MovieGridProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [page, setPage] = useState<number>(1);
  const [pagesData, setPagesData] = useState<
    Array<{ page: number; data: any }>
  >([]);
  const [lastPageEmpty, setLastPageEmpty] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  const [gridCols, setGridCols] = useState<number>(4);
  const [subIndex, setSubIndex] = useState<number>(0);

  const perPage = 15;

  // Для страниц франшиз хотим более точное количество скелетонов
  // до получения данных, чтобы не было ощущения "лишних" карточек.
  function expectedSkeletonCountForUrl(u: string): number | null {
    const base = (u || "").split("?")[0];
    if (base.endsWith("/api/franchise-venom")) return 3;
    if (base.endsWith("/api/franchise-johnwick")) return 7;
    if (base.endsWith("/api/franchise-lyudi-x")) return 13;
    if (base.endsWith("/api/franchise-by-id")) return 6; // эвристика на детальной франшизе
    return null;
  }

  // Restore paging state on mount/url change (не трогаем loadedImages, чтобы не ломать fade-in при возврате)
  useEffect(() => {
    setPage(1);
    setPagesData([]);
    setLastPageEmpty(false);
  }, [url]);

  useEffect(() => {
    try {
      const mq = typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)") : null;
      const update = () => setIsDesktop(!!mq?.matches);
      update();
      mq?.addEventListener("change", update);
      return () => mq?.removeEventListener("change", update);
    } catch {}
  }, []);


  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const mqlXl = window.matchMedia("(min-width: 1280px)");
      const mqlLg = window.matchMedia("(min-width: 1024px)");
      const mqlMd = window.matchMedia("(min-width: 768px)");
      const computeCols = () => {
        if (mqlXl.matches) return 6;
        if (mqlLg.matches) return 5;
        if (mqlMd.matches) return 4;
        return 2;
      };
      const updateCols = () => setGridCols(computeCols());
      updateCols();
      mqlXl.addEventListener("change", updateCols);
      mqlLg.addEventListener("change", updateCols);
      mqlMd.addEventListener("change", updateCols);
      window.addEventListener("resize", updateCols);
      return () => {
        mqlXl.removeEventListener("change", updateCols);
        mqlLg.removeEventListener("change", updateCols);
        mqlMd.removeEventListener("change", updateCols);
        window.removeEventListener("resize", updateCols);
      };
    } catch {}
  }, []);

  const currentUrl = useMemo(() => makePageUrl(url, page), [url, page]);
  const { data, error, isLoading, isValidating } = useSWR<string>(
    currentUrl,
    fetcher
  );
  const nextUrl = useMemo(() => makePageUrl(url, page + 1), [url, page]);
  const { data: nextData } = useSWR<string>(nextUrl, fetcher);
  const next2Url = useMemo(() => makePageUrl(url, page + 2), [url, page]);
  const { data: next2Data } = useSWR<string>(next2Url, fetcher);

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

  useEffect(() => {
    if (!nextData) return;
    setPagesData((prev) => {
      const nextPage = page + 1;
      const exists = prev.some((p) => p.page === nextPage);
      if (exists) return prev;
      const movies = extractMoviesFromData(nextData);
      if (!movies || movies.length === 0) {
        setLastPageEmpty(true);
      }
      return [...prev, { page: nextPage, data: nextData }];
    });
  }, [nextData, page]);

  useEffect(() => {
    if (!next2Data) return;
    setPagesData((prev) => {
      const nextPage = page + 2;
      const exists = prev.some((p) => p.page === nextPage);
      if (exists) return prev;
      const movies = extractMoviesFromData(next2Data);
      if (!movies || movies.length === 0) {
        setLastPageEmpty(true);
      }
      return [...prev, { page: nextPage, data: next2Data }];
    });
  }, [next2Data, page]);

  const hasNextLoadedGlobal = useMemo(() => {
    return pagesData.some((p) => p.page === page + 1);
  }, [pagesData, page]);
  const nextPageEntry = useMemo(() => {
    return pagesData.find((p) => p.page === page + 1) || null;
  }, [pagesData, page]);
  const nextPageItemsLen = useMemo(() => {
    if (!nextPageEntry) return null;
    try {
      const arr = extractMoviesFromData(nextPageEntry.data);
      return Array.isArray(arr) ? arr.length : 0;
    } catch {
      return 0;
    }
  }, [nextPageEntry]);

  // NOTE: Avoid early returns before all hooks to keep hook order stable.

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

  // Compute display set and overrides BEFORE any conditional returns.
  const displayMovies = movies.slice(0, perPage * pagesData.length);
  const hideLoadMore = (() => {
    const base = (url || "").split("?")[0];
    return base.includes("/api/franchise");
  })();
  const isArrowCandidate = useMemo(() => {
    const u = String(url || "");
    const isList = u.includes("/v2/list");
    const isMovieOrSerial = u.includes("type=movie") || u.includes("type=serial");
    const isUhdTag = /tag=(4K|4K%20HDR|4K%20DolbyV|60FPS)/.test(u);
    return isList && (isMovieOrSerial || isUhdTag);
  }, [url]);
  const isArrowDesktopMode = isDesktop && isArrowCandidate && !hideLoadMore;
  const currentPageEntry = useMemo(() => {
    return pagesData.find((p) => p.page === page) || null;
  }, [pagesData, page]);
  const effectiveCols = useMemo(() => (isArrowDesktopMode ? 5 : gridCols), [isArrowDesktopMode, gridCols]);
  const chunkSize = 5;
  const getItemsForPage = (pg: number) => {
    const entry = pagesData.find((p) => p.page === pg) || null;
    return entry ? extractMoviesFromData(entry.data) : [];
  };
  const currChunkCount = useMemo(() => {
    const len = getItemsForPage(page).length;
    return Math.max(1, Math.ceil(len / chunkSize));
  }, [pagesData, page]);
  const display = hideLoadMore
    ? movies
    : isArrowDesktopMode
    ? (() => {
        const currItems = getItemsForPage(page);
        const start = subIndex * chunkSize;
        const end = start + chunkSize;
        return currItems.slice(start, end);
      })()
    : displayMovies;

  // Batch-load overrides for current display ids.
  const [overridesMap, setOverridesMap] = useState<Record<string, any>>(() => ({
    ...overridesCacheRef,
  }));
  const idsString = useMemo(
    () => (display || []).map((m: any) => String(m.id)).join(","),
    [display]
  );

  useEffect(() => {
    if (!idsString) return;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(
          `/api/overrides/movies?ids=${encodeURIComponent(idsString)}`,
          {
            signal: controller.signal,
            cache: "no-store",
            headers: { Accept: "application/json" },
          }
        );
        if (!res.ok) return;
        const data = (await res.json()) || {};
        setOverridesMap((prev) => {
          const next = { ...prev, ...data };
          Object.assign(overridesCacheRef, next);
          return next;
        });
      } catch {}
    })();
    return () => controller.abort();
  }, [idsString]);

  const finalDisplay = useMemo(() => {
    return (display || []).map((m: any) => {
      const ov = overridesMap[String(m.id)] || null;
      const patchedPoster = ov && ov.poster ? ov.poster : m.poster;
      // Применяем переопределённое название, если задано (поддержка name/title)
      const patchedTitle =
        ov && (ov.name || ov.title) ? ov.name || ov.title : m.title;
      return { ...m, poster: patchedPoster, title: patchedTitle };
    });
  }, [display, overridesMap]);

  // Conditional returns AFTER all hooks
  // Show skeletons during initial load/validation when there’s no page data yet.
  if ((isLoading || isValidating) && pagesData.length === 0) {
    const isDesktopNow = typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
    const skeletonCount = typeof window === "undefined"
      ? 5
      : (isArrowDesktopMode ? effectiveCols : (isDesktopNow ? 5 : perPage));
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 gap-2">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            className="group block bg-transparent hover:bg-transparent outline-none hover:outline hover:outline-[1.5px] hover:outline-zinc-700 focus-visible:outline focus-visible:outline-[2px] focus-visible:outline-zinc-700 transition-all duration-200 cursor-pointer overflow-hidden rounded-sm"
          >
            <div className="aspect-[2/3] bg-zinc-950 flex items-center justify-center relative overflow-hidden rounded-[10px]">
              <Skeleton className="w-full h-full" />
            </div>
            {/* Под постером оставляем область для анимации частиц + скелетона текста */}
            <div className="relative p-2 md:p-3 min-h-[48px] md:min-h-[56px] overflow-hidden">
              <div className="pointer-events-none absolute top-[4%] h-[52%] left-1/2 -translate-x-1/2 w-[46%] hidden md:block opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-500 movie-title-flame" />
              <div className="relative">
                <Skeleton className="h-3 md:h-4 w-3/4 mb-2" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-2 md:h-3 w-10" />
                  <Skeleton className="h-2 md:h-3 w-16" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (
    isArrowDesktopMode &&
    (isLoading || isValidating) &&
    !pagesData.some((p) => p.page === page)
  ) {
    const skeletonCount = effectiveCols;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 gap-2">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            className="group block bg-transparent hover:bg-transparent outline-none hover:outline hover:outline-[1.5px] hover:outline-zinc-700 focus-visible:outline focus-visible:outline-[2px] focus-visible:outline-zinc-700 transition-all duration-200 cursor-pointer overflow-hidden rounded-sm"
          >
            <div className="aspect-[2/3] bg-zinc-950 flex items-center justify-center relative overflow-hidden rounded-[10px]">
              <Skeleton className="w-full h-full" />
            </div>
            <div className="relative p-2 md:p-3 min-h-[48px] md:min-h-[56px] overflow-hidden">
              <div className="pointer-events-none absolute top-[4%] h-[52%] left-1/2 -translate-x-1/2 w-[46%] hidden md:block opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-500 movie-title-flame" />
              <div className="relative">
                <Skeleton className="h-3 md:h-4 w-3/4 mb-2" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-2 md:h-3 w-10" />
                  <Skeleton className="h-2 md:h-3 w-16" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state (only when no page data yet)
  if (error && pagesData.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="inline-block bg-red-950/50 border border-red-900/50 p-4 text-red-400 rounded backdrop-blur-sm">
          Ошибка загрузки данных
        </div>
      </div>
    );
  }

  // «Нет данных» показываем только если точно не идёт загрузка/валидация
  // (handled below just before rendering the grid)

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
    setSubIndex(0);
  };

  const handlePrevArrow = () => {
    if (!isArrowDesktopMode) return;
    const prevItems = page > 1 ? getItemsForPage(page - 1) : [];
    const prevChunks = Math.max(1, Math.ceil(prevItems.length / chunkSize));
    if (subIndex > 0) {
      setSubIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (page > 1) {
      setPage((p) => Math.max(1, p - 1));
      setSubIndex(Math.max(0, prevChunks - 1));
    }
  };

  const handleNextArrow = () => {
    if (!isArrowDesktopMode) return;
    const currItems = getItemsForPage(page);
    const chunkCount = Math.max(1, Math.ceil(currItems.length / chunkSize));
    if (subIndex < chunkCount - 1) {
      setSubIndex((i) => i + 1);
      return;
    }
    const nextEntry = pagesData.find((p) => p.page === page + 1) || null;
    const nextLen = nextEntry ? extractMoviesFromData(nextEntry.data).length : 0;
    if (nextEntry) {
      if (nextLen === 0) {
        return;
      }
      setPage((p) => p + 1);
      setSubIndex(0);
      return;
    }
    if (lastPageEmpty || isLoading) return;
    handleLoadMore();
  };

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

  const showLoadMoreButton = !lastPageEmpty && !hideLoadMore && !isArrowDesktopMode;

  return (
    <div className="relative">
      {isArrowDesktopMode && (
        <button
          onClick={handlePrevArrow}
          disabled={page <= 1 && subIndex <= 0}
          className="hidden md:flex items-center justify-center absolute left-[-40px] top-1/2 -translate-y-1/2 z-[20] w-11 h-11 rounded-full border border-white/70 bg-white text-black shadow-md hover:shadow-lg hover:bg-white/95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Предыдущая страница"
        >
          <IconChevronLeft size={20} />
        </button>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 gap-2">
        {finalDisplay.map((movie: any, index: number) => (
          <Link
            key={movie.id || index}
            href={`/movie/${movie.id}`}
            className="group block bg-transparent hover:bg-transparent outline-none hover:outline hover:outline-[1.5px] hover:outline-zinc-700 focus-visible:outline focus-visible:outline-[2px] focus-visible:outline-zinc-700 transition-all duration-200 cursor-pointer overflow-hidden rounded-sm"
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
            }}
          >
            <div className="aspect-[2/3] bg-zinc-950 flex items-center justify-center relative overflow-hidden rounded-[10px] poster-card">
              {movie.poster ? (
                <img
                  src={movie.poster || "/placeholder.svg"}
                  alt={movie.title || "Постер"}
                  decoding="async"
                  loading={index < effectiveCols ? "eager" : "lazy"}
                  fetchPriority={index < effectiveCols ? "high" : "low"}
                  className={`w-full h-full object-cover transition-all ease-out poster-media ${
                    loadedImages.has(String(movie.id))
                      ? "opacity-100 blur-0 scale-100"
                      : "opacity-0 blur-md scale-[1.02]"
                  }`}
                  style={{ transition: "opacity 300ms ease-out, filter 600ms ease-out, transform 600ms ease-out", willChange: "opacity, filter, transform" }}
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
            {/* Под постером оставляем текст (название, год, 1 жанр) с анимацией частиц */}
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
                      {year && genre && (
                        <span className="text-zinc-500/60">•</span>
                      )}
                      {genre && (
                        <span className="truncate max-w-[70%]">{genre}</span>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </Link>
        ))}
      </div>
      {isArrowDesktopMode && (
        <button
          onClick={handleNextArrow}
          disabled={(subIndex >= currChunkCount - 1) && ((nextPageItemsLen === 0) || (nextPageItemsLen == null && lastPageEmpty))}
          className="hidden md:flex items-center justify-center absolute right-[-40px] top-1/2 -translate-y-1/2 z-[20] w-11 h-11 rounded-full border border-white/70 bg-white text-black shadow-md hover:shadow-lg hover:bg-white/95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Следующая страница"
        >
          <IconChevronRight size={20} />
        </button>
      )}

      {showLoadMoreButton && (
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
