"use client";
import useSWR from "swr";
import { Loader } from "./loader";
import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { IconChevronLeft, IconChevronRight, IconX } from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ratingBgColor, formatRatingLabel } from "@/lib/utils";
import CountryFlag, { getCountryLabel } from "@/lib/country-flags";
import { savePosterTransition } from "@/lib/poster-transition";
import NProgress from "nprogress";

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
  navigateOnClick?: boolean;
  onPagingInfo?: (info: { page: number; scrolledCount: number; isArrowMode: boolean }) => void;
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

export function MovieGrid({ url, navigateOnClick, onPagingInfo }: MovieGridProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [page, setPage] = useState<number>(1);
  const [pagesData, setPagesData] = useState<
    Array<{ page: number; data: any }>
  >([]);
  const [lastPageEmpty, setLastPageEmpty] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  const [gridCols, setGridCols] = useState<number>(4);
  const [subIndex, setSubIndex] = useState<number>(0);
  const [selectedMovie, setSelectedMovie] = useState<any | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<any | null>(null);
  const [selectedLoading, setSelectedLoading] = useState<boolean>(false);
  const [selectedError, setSelectedError] = useState<string | null>(null);
  const [infoVisible, setInfoVisible] = useState<boolean>(false);
  const posterContextRef = useRef<{ rect: DOMRect; posterUrl: string } | null>(null);
  const router = useRouter();

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
    lastPagingRef.current = null;
  }, [url]);

  useEffect(() => {
    try {
      const isSearch = String(url || "").includes("/api/search");
      if (isSearch) {
        hasFirstResultsLoadedRef.current = false;
      }
    } catch {}
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

  useEffect(() => {
    try {
      const hasCurrent = pagesData.some((p) => p.page === page);
      if (hasCurrent && !isLoading && !isValidating && loadingMore) {
        const t = setTimeout(() => setLoadingMore(false), 120);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [page, pagesData, isLoading, isValidating, loadingMore]);

  const hasFirstResultsLoadedRef = useRef(false);
  useEffect(() => {
    try {
      const isSearch = (String(url || "").includes("/api/search"));
      if (!isSearch) return;
      if (hasFirstResultsLoadedRef.current) return;
      const firstEntry = pagesData.find((p) => p.page === 1) || null;
      const hasData = !!firstEntry;
      const arr = hasData ? (extractMoviesFromData(firstEntry!.data) || []) : [];
      const ok = Array.isArray(arr) && arr.length > 0;
      const finished = !isLoading && !isValidating;
      if ((ok && finished) || (error && finished) || (lastPageEmpty && finished)) {
        if (typeof window !== "undefined") {
          hasFirstResultsLoadedRef.current = true;
          window.dispatchEvent(new CustomEvent("search:firstResultsLoaded"));
        }
      }
    } catch {}
  }, [pagesData, url, isLoading, isValidating, error, lastPageEmpty]);

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
  const isSearchMode = useMemo(() => {
    const u = String(url || "");
    return u.includes("/api/search");
  }, [url]);

  const isArrowCandidate = useMemo(() => {
    const u = String(url || "");
    const isList = u.includes("/v2/list");
    const isMovieOrSerial = u.includes("type=movie") || u.includes("type=serial");
    const isUhdTag = /tag=(4K|4K%20HDR|4K%20DolbyV|60FPS)/.test(u);
    return (isList && (isMovieOrSerial || isUhdTag)) || u.includes("/api/search");
  }, [url]);
  const isMovieOrSerialList = useMemo(() => {
    const u = String(url || "");
    return u.includes("/v2/list") && (u.includes("type=movie") || u.includes("type=serial"));
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

  const prevItemsCount = useMemo(() => {
    return pagesData
      .filter((p) => p.page < page)
      .reduce((sum, p) => {
        try {
          const arr = extractMoviesFromData(p.data);
          return sum + (Array.isArray(arr) ? arr.length : 0);
        } catch {
          return sum;
        }
      }, 0);
  }, [pagesData, page]);
  const currItemsLen = useMemo(() => getItemsForPage(page).length, [pagesData, page]);
  const currEndIndex = useMemo(() => {
    const base = Math.min(currItemsLen, (subIndex + 1) * chunkSize);
    const hasCurrent = pagesData.some((p) => p.page === page);
    if (isArrowDesktopMode && !hasCurrent) {
      return Math.min((subIndex + 1) * chunkSize, chunkSize);
    }
    return base;
  }, [currItemsLen, subIndex, isArrowDesktopMode, pagesData, page]);
  const scrolledCount = useMemo(() => Math.max(0, (page - 1) * perPage) + currEndIndex, [page, currEndIndex]);

  const lastPagingRef = useRef<{ page: number; scrolled: number; arrow: boolean } | null>(null);
  useEffect(() => {
    const info = { page, scrolledCount, isArrowMode: isArrowDesktopMode };
    const last = lastPagingRef.current;
    const changed = !last || last.page !== info.page || last.scrolled !== info.scrolledCount || last.arrow !== info.isArrowMode;
    if (!changed) return;
    lastPagingRef.current = { page: info.page, scrolled: info.scrolledCount, arrow: info.isArrowMode };
    try {
      onPagingInfo?.(info);
    } catch {}
  }, [page, subIndex, scrolledCount, isArrowDesktopMode]);

  useEffect(() => {
    try {
      onPagingInfo?.({ page, scrolledCount, isArrowMode: isArrowDesktopMode });
    } catch {}
  }, [url, isArrowDesktopMode]);

  

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

  useEffect(() => {
    if (!selectedMovie) return;
    setSelectedLoading(true);
    setSelectedError(null);
    setSelectedDetails(null);
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`https://api.vokino.pro/v2/view/${selectedMovie.id}`, {
          signal: controller.signal,
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        setSelectedDetails(json?.details ?? json ?? null);
      } catch (e: any) {
        setSelectedError("Ошибка загрузки");
      } finally {
        setSelectedLoading(false);
      }
    })();
    return () => controller.abort();
  }, [selectedMovie]);

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
    setLoadingMore(true);
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
          <div
            key={movie.id || index}
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
              if (navigateOnClick || !isDesktop) {
                try { NProgress.set(0.2); NProgress.start(); } catch {}
                router.push(`/movie/${movie.id}`);
                return;
              }
              const posterEl = e.currentTarget.querySelector('.aspect-\\[2\\/3\\]') as HTMLElement;
              if (posterEl && movie.poster) {
                const rect = posterEl.getBoundingClientRect();
                posterContextRef.current = { rect, posterUrl: movie.poster };
              } else {
                posterContextRef.current = null;
              }
              if (selectedMovie && String(selectedMovie.id) === String(movie.id)) {
                setInfoVisible(false);
                setTimeout(() => {
                  setSelectedMovie(null);
                  setSelectedDetails(null);
                  setSelectedError(null);
                }, 200);
                return;
              }
              setSelectedMovie(movie);
              setInfoVisible(false);
              if (typeof window !== "undefined") {
                requestAnimationFrame(() => setInfoVisible(true));
              } else {
                setInfoVisible(true);
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
              {movie.poster && loadedImages.has(String(movie.id)) && (
                <div
                  className="pointer-events-none absolute inset-0 z-10 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300"
                  style={{
                    background:
                      "radial-gradient(140px circle at var(--x) var(--y), rgba(var(--ui-accent-rgb),0.35), rgba(0,0,0,0) 60%)",
                  }}
                />
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
          </div>
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
      </div>

      {!navigateOnClick && selectedMovie && (
        <div key={String(selectedMovie.id)} className={`mt-3 md:mt-4 transition-all duration-300 ${infoVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
          <div className="relative p-3 md:p-4 smoke-flash">
            <button
              type="button"
              aria-label="Закрыть"
              onClick={() => {
                setInfoVisible(false);
                setTimeout(() => {
                  setSelectedMovie(null);
                  setSelectedDetails(null);
                  setSelectedError(null);
                }, 200);
              }}
              className="absolute right-2 top-2 inline-flex items-center justify-center w-8 h-8 rounded-full text-zinc-300 hover:text-white hover:bg-zinc-700/40 transition-all duration-200"
            >
              <IconX size={18} />
            </button>
            <div className="grid md:grid-cols-[minmax(90px,120px)_1fr] grid-cols-1 gap-3 md:gap-4 items-stretch">
              <div className="hidden md:block rounded-sm overflow-hidden bg-zinc-900 h-full">
                {selectedMovie.poster ? (
                  <img src={selectedMovie.poster} alt="Постер" className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm md:text-base font-semibold text-zinc-100 truncate" title={selectedMovie.title || "Без названия"}>
                    {selectedMovie.title || "Без названия"}
                  </h3>
                  {(() => {
                    const rating = (selectedDetails as any)?.rating_kp ?? (selectedDetails as any)?.rating ?? selectedMovie.rating;
                    return rating ? (
                      <span className={`px-2 py-[3px] rounded-sm text-[11px] md:text-[12px] text-white ${ratingBgColor(rating)}`}>{formatRatingLabel(rating)}</span>
                    ) : null;
                  })()}
                </div>
                <div className="mt-1 text-[12px] md:text-[13px] text-zinc-400">
                  {(() => {
                    const d: any = selectedDetails || {};
                    const year = d.year ?? d.released ?? d.release_year ?? d.releaseYear ?? selectedMovie.year;
                    const countryRaw = d.country ?? selectedMovie.country;
                    const quality = d.quality ?? selectedMovie.quality;
                    const parts: string[] = [];
                    if (year) parts.push(String(year));
                    if (quality) parts.push(String(quality));
                    if (countryRaw) {
                      const arr = Array.isArray(countryRaw) ? countryRaw : String(countryRaw).split(",").map((s) => s.trim()).filter(Boolean);
                      if (arr.length > 0) parts.push(arr.join(" "));
                    }
                    return parts.length > 0 ? <div className="flex items-center gap-2">{parts.map((p, i) => (
                      <span key={i} className="truncate">{p}</span>
                    ))}</div> : null;
                  })()}
                </div>
                <div className="mt-2 text-[12px] md:text-[13px] text-zinc-300/90 min-h-[66px] md:min-h-[84px]">
                  {selectedLoading ? (
                    <div>
                      <Skeleton className="h-3 w-[92%] mb-2" />
                      <Skeleton className="h-3 w-[88%] mb-2" />
                      <Skeleton className="h-3 w-[72%]" />
                    </div>
                  ) : (() => {
                    const d: any = selectedDetails || {};
                    const aboutRaw = d.about ?? d.description;
                    const about = Array.isArray(aboutRaw) ? aboutRaw.filter(Boolean).join(" ") : String(aboutRaw || "").trim();
                    return about ? (
                      <p className="line-clamp-3 md:line-clamp-4">{about}</p>
                    ) : (
                      <div className="h-3" />
                    );
                  })()}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const ctx = posterContextRef.current;
                      if (ctx) {
                        savePosterTransition({ movieId: String(selectedMovie.id), posterUrl: ctx.posterUrl, rect: ctx.rect });
                      }
                      router.push(`/movie/${selectedMovie.id}#watch`);
                    }}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-full text-[12px] font-medium text-white border border-transparent bg-gradient-to-r from-[rgba(var(--ui-accent-rgb),1)] to-[rgba(var(--ui-accent-rgb),0.85)] ring-1 ring-[rgba(var(--ui-accent-rgb),0.25)] shadow-xs hover:shadow-md hover:opacity-95 transition-all duration-200"
                  >
                    Смотреть онлайн
                  </button>
                  <Link
                    href={`/movie/${selectedMovie.id}`}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-full text-[12px] font-medium border border-zinc-700/60 bg-zinc-900/40 text-zinc-300 hover:text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800/60 shadow-xs transition-all duration-200"
                  >
                    Подробнее
                  </Link>
                  {selectedLoading && (!isDesktop || !isMovieOrSerialList) && <Loader size="sm" />}
                  {selectedError && <span className="text-[12px] text-red-400">{selectedError}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLoadMoreButton && (
        <div className="flex justify-center mt-4">
          {isLoading || loadingMore ? (
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
