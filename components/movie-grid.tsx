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
import { PlayerSelector } from "@/components/player-selector";

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
  onWatchOpenChange?: (open: boolean) => void;
  onBackdropOverrideChange?: (bg: string | null, poster?: string | null) => void;
  onHeroInfoOverrideChange?: (
    info:
      | {
          title?: string | null;
          logo?: string | null;
          logoId?: string | null;
          meta?: {
            ratingKP?: number | null;
            ratingIMDb?: number | null;
            year?: string | null;
            country?: string | null;
            genre?: string | null;
            duration?: string | null;
          } | null;
        }
      | null
  ) => void;
  resetOverridesOnNavigate?: boolean;
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

export function MovieGrid({ url, navigateOnClick, onPagingInfo, onWatchOpenChange, onBackdropOverrideChange, onHeroInfoOverrideChange, resetOverridesOnNavigate }: MovieGridProps) {
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
  const [watchOpen, setWatchOpen] = useState<boolean>(false);
  const [inlineKpId, setInlineKpId] = useState<string | null>(null);
  const [inlineIframeUrl, setInlineIframeUrl] = useState<string | null>(null);
  const [showEscHint, setShowEscHint] = useState<boolean>(false);
  const [playerVisible, setPlayerVisible] = useState<boolean>(false);
  const gridWrapRef = useRef<HTMLDivElement | null>(null);
  const [gridHeight, setGridHeight] = useState<number | null>(null);
  const [tileWidth, setTileWidth] = useState<number | null>(null);
  const overlayPosterRef = useRef<HTMLDivElement | null>(null);
  const [overlayPosterHeight, setOverlayPosterHeight] = useState<number | null>(null);

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
    setWatchOpen(false);
    setSubIndex(0);
  }, [url]);

  useEffect(() => {
    setSelectedMovie(null);
    setSelectedDetails(null);
    setSelectedError(null);
    setInfoVisible(false);
    setInlinePlayerOpen(false);
    setInlineClosing(false);
    setInlineKpId(null);
    setInlineIframeUrl(null);
    setPlayerVisible(false);
    setGridHeight(null);
    setTileWidth(null);
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
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setWatchOpen(false);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKeyDown);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("keydown", onKeyDown);
      }
    };
  }, []);

  useEffect(() => {
    try {
      onWatchOpenChange?.(watchOpen);
    } catch {}
  }, [watchOpen]);

  useEffect(() => {
    if (!watchOpen && !selectedMovie) {
      try { onBackdropOverrideChange?.(null, null); } catch {}
      try { onHeroInfoOverrideChange?.(null); } catch {}
    }
  }, [watchOpen, selectedMovie]);

  useEffect(() => {
    if (watchOpen) {
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => setPlayerVisible(true));
      } else {
        setPlayerVisible(true);
      }
    } else {
      setPlayerVisible(false);
    }
  }, [watchOpen]);

  useEffect(() => {
    try {
      if (!watchOpen || !selectedMovie) {
        setOverlayPosterHeight(null);
        return;
      }
      const el = overlayPosterRef.current;
      if (!el) return;
      const width = el.offsetWidth;
      if (width && width > 0) {
        setOverlayPosterHeight(Math.round(width * 3 / 2));
      }
    } catch {}
  }, [watchOpen, selectedMovie, playerVisible]);


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
    const isCompilation = u.includes("/v2/compilations/content");
    return (isList && (isMovieOrSerial || isUhdTag)) || isCompilation || u.includes("/api/search");
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

  // Helpers for chunk navigation and pending selection effect
  const getChunkBounds = (pg: number, sIdx: number) => {
    const start = sIdx * chunkSize;
    const items = getItemsForPage(pg);
    const end = Math.min(start + chunkSize, items.length);
    return { start, end, items };
  };

  const getChunkItems = (pg: number, sIdx: number) => {
    const { start, end, items } = getChunkBounds(pg, sIdx);
    return items.slice(start, end);
  };

  

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

  useEffect(() => {
    if (!watchOpen) return;
    try {
      const id = selectedMovie ? String(selectedMovie.id) : null;
      const ov = id ? (overridesMap as any)[id] ?? null : null;
      const d: any = selectedDetails || {};
      const bg = (ov && (ov.backdrop || ov?.bg_poster?.backdrop)) || (d && (d.backdrop || d?.bg_poster?.backdrop)) || null;
      const poster = (ov && (ov.poster || ov?.bg_poster?.poster)) || (d && (d.poster || d?.bg_poster?.poster)) || (selectedMovie?.poster ?? null);
      if (bg) {
        onBackdropOverrideChange?.(String(bg), poster ? String(poster) : null);
      }
      const logo = (ov as any)?.poster_logo ?? null;
      const titleStr = selectedMovie?.title ?? null;
      const yrRaw = d?.year ?? d?.released ?? d?.release_year ?? d?.releaseYear ?? selectedMovie?.year ?? null;
      const year = (() => {
        if (yrRaw == null) return null;
        const s = String(yrRaw).trim();
        if (!s || s === "0") return null;
        const m = s.match(/\d{4}/);
        return m ? m[0] : s;
      })();
      const countryLabel = getCountryLabel(d?.country ?? selectedMovie?.country) || null;
      const genreVal = (() => {
        const src = d?.genre ?? (Array.isArray(d?.tags) ? d?.tags.join(", ") : d?.tags) ?? selectedMovie?.tags;
        if (Array.isArray(src)) {
          const first = src.find((v) => v != null && String(v).trim().length > 0);
          return first != null ? String(first).trim() : null;
        }
        if (src == null) return null;
        const s = String(src);
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
      const ratingKP = getValidRating(d?.rating_kp ?? selectedMovie?.rating);
      const ratingIMDb = getValidRating(d?.rating_imdb);
      const durationStr = (() => {
        const raw = d?.duration ?? d?.time ?? d?.runtime ?? d?.length;
        const toMinutes = (val: any): number | null => {
          if (val == null) return null;
          if (typeof val === "number" && !Number.isNaN(val)) return Math.round(val);
          if (typeof val === "string") {
            const s = val.trim().toLowerCase();
            if (s.includes(":")) {
              const parts = s.split(":").map((p) => parseInt(p, 10));
              if (parts.every((n) => !Number.isNaN(n))) {
                if (parts.length >= 2) {
                  const h = parts[0];
                  const m = parts[1];
                  return h * 60 + m;
                }
              }
            }
            const hoursMatch = s.match(/(\d+)\s*(ч|час|часа|часов|h|hr|hour|hours)/);
            const minutesMatch = s.match(/(\d+)\s*(мин|м|m|min|minute|minutes)/);
            if (hoursMatch || minutesMatch) {
              const h = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
              const m = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
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
      const metaObj = { ratingKP, ratingIMDb, year, country: countryLabel, genre: genreVal || null, duration: durationStr };
      if (!watchOpen) onHeroInfoOverrideChange?.({ title: null, logo: null, logoId: null, meta: metaObj });
    } catch {}
  }, [selectedDetails, watchOpen]);

  useEffect(() => {
    if (!watchOpen || !selectedMovie) return;
    const controller = new AbortController();
    (async () => {
      try {
        const tRes = await fetch(`https://api.vokino.tv/v2/timeline/watch?ident=${selectedMovie.id}&current=100&time=100&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        const tJson = tRes.ok ? await tRes.json() : null;
        const kp = tJson?.kp_id || tJson?.data?.kp_id || null;
        if (kp) {
          setInlineKpId(String(kp));
          const frRes = await fetch(`/api/franchise?kinopoisk_id=${kp}`, {
            signal: controller.signal,
            headers: { Accept: "application/json" },
            cache: "no-store",
          });
          const frJson = frRes.ok ? await frRes.json() : null;
          const iframe = frJson?.iframe_url || null;
          if (iframe) setInlineIframeUrl(String(iframe));
        }
      } catch {}
    })();
    return () => controller.abort();
  }, [watchOpen, selectedMovie]);

  useEffect(() => {
    if (watchOpen && isDesktop) {
      setShowEscHint(true);
      const t = setTimeout(() => setShowEscHint(false), 3000);
      return () => clearTimeout(t);
    }
  }, [watchOpen, isDesktop]);

  const selectedKpId = useMemo(() => {
    const d: any = selectedDetails || {};
    const kp = d?.kp_id ?? d?.kinopoisk_id ?? d?.details?.kp_id ?? d?.details?.kinopoisk_id;
    return kp ? String(kp) : null;
  }, [selectedDetails]);
  const selectedIframeUrl = useMemo(() => {
    const d: any = selectedDetails || {};
    return (d?.iframe_url ?? null) as string | null;
  }, [selectedDetails]);

  const [inlinePlayerOpen, setInlinePlayerOpen] = useState<boolean>(false);
  const [inlineClosing, setInlineClosing] = useState<boolean>(false);
  const [pendingSelectDir, setPendingSelectDir] = useState<"next" | "prev" | null>(null);

  useEffect(() => {
    if (!inlinePlayerOpen || !selectedMovie) return;
    const controller = new AbortController();
    (async () => {
      try {
        const tRes = await fetch(`https://api.vokino.tv/v2/timeline/watch?ident=${selectedMovie.id}&current=100&time=100&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        const tJson = tRes.ok ? await tRes.json() : null;
        const kp = tJson?.kp_id || tJson?.data?.kp_id || null;
        if (kp) {
          setInlineKpId(String(kp));
          const frRes = await fetch(`/api/franchise?kinopoisk_id=${kp}`, {
            signal: controller.signal,
            headers: { Accept: "application/json" },
            cache: "no-store",
          });
          const frJson = frRes.ok ? await frRes.json() : null;
          const iframe = frJson?.iframe_url || null;
          if (iframe) setInlineIframeUrl(String(iframe));
        }
      } catch {}
    })();
    return () => controller.abort();
  }, [inlinePlayerOpen, selectedMovie]);

  const showLoadMoreButton = !lastPageEmpty && !hideLoadMore && !isArrowDesktopMode;
  const showInlineInfo = !navigateOnClick && !!selectedMovie;

  useEffect(() => {
    if (!showInlineInfo) return;
    try {
      const el = gridWrapRef.current;
      if (!el) return;
      const w = el.clientWidth;
      const cols = effectiveCols;
      const gaps = (cols - 1) * 8;
      const tw = Math.floor((w - gaps) / cols);
      setTileWidth(tw > 0 ? tw : null);
    } catch {}
  }, [showInlineInfo, effectiveCols]);

  useEffect(() => {
    if (!pendingSelectDir) return;
    const chunkItems = getChunkItems(page, subIndex);
    if (chunkItems.length === 0) {
      setPendingSelectDir(null);
      return;
    }
    if (pendingSelectDir === "next") {
      setSelectedMovie(chunkItems[0]);
    } else {
      setSelectedMovie(chunkItems[chunkItems.length - 1]);
    }
    setPendingSelectDir(null);
  }, [page, subIndex, pagesData, pendingSelectDir]);

  useEffect(() => {
    if (!showInlineInfo || !selectedMovie) return;
    try {
      const id = String(selectedMovie.id);
      const ov = (overridesMap as any)[id] ?? null;
      const d: any = selectedDetails || {};
      const bg = (ov && (ov.backdrop || ov?.bg_poster?.backdrop)) || (d && (d.backdrop || d?.bg_poster?.backdrop)) || null;
      const poster = (ov && (ov.poster || ov?.bg_poster?.poster)) || (d && (d.poster || d?.bg_poster?.poster)) || (selectedMovie?.poster ?? null);
      const bgVal = bg ? String(bg) : null;
      if (bgVal) {
        onBackdropOverrideChange?.(bgVal, poster ? String(poster) : null);
      }

      const logo = (ov as any)?.poster_logo ?? (d as any)?.poster_logo ?? (d as any)?.logo ?? null;
      const titleStr = selectedMovie?.title ?? null;
      onHeroInfoOverrideChange?.({ title: titleStr, logo: logo ? String(logo) : null, logoId: id, meta: null });
    } catch {}
  }, [showInlineInfo, selectedMovie, selectedDetails, overridesMap]);

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

  const handleInlinePrev = () => {
    if (!selectedMovie) return;
    setInlinePlayerOpen(false);
    setInlineClosing(false);
    setPlayerVisible(false);
    const chunkItems = getChunkItems(page, subIndex);
    const idx = chunkItems.findIndex((m: any) => String(m.id) === String(selectedMovie.id));
    if (idx > 0) {
      setSelectedMovie(chunkItems[idx - 1]);
      setInfoVisible(false);
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => setInfoVisible(true));
      } else {
        setInfoVisible(true);
      }
      return;
    }
    setPendingSelectDir("prev");
    handlePrevArrow();
  };

  const handleInlineNext = () => {
    if (!selectedMovie) return;
    setInlinePlayerOpen(false);
    setInlineClosing(false);
    setPlayerVisible(false);
    const chunkItems = getChunkItems(page, subIndex);
    const idx = chunkItems.findIndex((m: any) => String(m.id) === String(selectedMovie.id));
    if (idx >= 0 && idx < chunkItems.length - 1) {
      setSelectedMovie(chunkItems[idx + 1]);
      setInfoVisible(false);
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => setInfoVisible(true));
      } else {
        setInfoVisible(true);
      }
      return;
    }
    setPendingSelectDir("next");
    handleNextArrow();
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


  return (
    <div className="relative">
      {isArrowDesktopMode && watchOpen ? null : null}
      {isArrowDesktopMode && watchOpen && selectedMovie ? (
        <div
          className={`relative z-20 p-4 md:p-5 bg-zinc-900/80 border border-zinc-800/60 rounded-sm transition-all duration-300 ${playerVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
          style={{
            WebkitMaskImage:
              "radial-gradient(150% 150% at 50% 115%, black 70%, transparent 100%)",
            maskImage:
              "radial-gradient(150% 150% at 50% 115%, black 70%, transparent 100%)",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
          }}
        >
          

          {showEscHint && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30">
              <div className="px-3 py-1.5 text-xs rounded-md shadow-md bg-zinc-900/85 border border-zinc-800/70 text-zinc-100 animate-in fade-in-0 slide-in-from-top-2">
                Для выхода нажмите ESC
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid md:grid-cols-[minmax(160px,240px)_1fr] grid-cols-1 gap-3 md:gap-4 items-stretch">
              <div className="hidden md:block">
                {selectedMovie.poster ? (
                  <div ref={overlayPosterRef} className="rounded-[10px] overflow-hidden bg-zinc-900 aspect-[2/3]">
                    <img src={selectedMovie.poster} alt="Постер" className="w-full h-full object-cover" />
                  </div>
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
                  <button
                    type="button"
                    aria-label="Закрыть"
                    onClick={() => {
                      setPlayerVisible(false);
                      setInfoVisible(false);
                      setTimeout(() => {
                        setWatchOpen(false);
                        setInlinePlayerOpen(false);
                        setInlineClosing(false);
                        setSelectedMovie(null);
                        setSelectedDetails(null);
                        setSelectedError(null);
                        setTileWidth(null);
                      }, 200);
                    }}
                    className="ml-auto inline-flex items-center justify-center w-9 h-9 rounded-full border border-[rgba(var(--ui-accent-rgb),0.55)] text-[rgba(var(--ui-accent-rgb),1)] hover:bg-[rgba(var(--ui-accent-rgb),0.12)] hover:border-[rgba(var(--ui-accent-rgb),0.85)] transition-all duration-200"
                  >
                    <IconX size={16} />
                  </button>
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
                  <Link
                    href={`/movie/${selectedMovie.id}`}
                    onClick={() => { if (resetOverridesOnNavigate) { try { onBackdropOverrideChange?.(null, null); } catch {}; try { onHeroInfoOverrideChange?.(null); } catch {}; } }}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-full text-[12px] font-medium border border-zinc-700/60 bg-zinc-900/40 text-zinc-300 hover:text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800/60 shadow-xs transition-all duration-200"
                  >
                    Подробнее
                  </Link>
                </div>
              </div>
            </div>

            <div className="relative">
              <div
                className="pointer-events-none absolute -inset-6 md:-inset-10 opacity-60"
                style={{
                  backgroundImage:
                    "radial-gradient(120% 120% at 50% 50%, rgba(var(--poster-accent-tl-rgb),0.35), rgba(var(--poster-accent-br-rgb),0) 60%)",
                }}
              />
              <PlayerSelector onPlayerSelect={() => {}} iframeUrl={inlineIframeUrl ?? undefined} kpId={inlineKpId ?? undefined} videoContainerClassName="bg-zinc-900 rounded-[10px] overflow-hidden" videoContainerStyle={overlayPosterHeight != null ? { height: overlayPosterHeight } : undefined} />
            </div>
          </div>
        </div>
      ) : null}
      <div ref={gridWrapRef} className={isArrowDesktopMode && watchOpen ? "hidden" : "relative"}>
      {showInlineInfo ? (
        <div
          key={String(selectedMovie!.id)}
          className={`relative transition-all duration-300 ${inlinePlayerOpen ? (inlineClosing ? "animate-out fade-out-0 zoom-out-95" : "") : (infoVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")}`}
          style={gridHeight != null ? { minHeight: gridHeight } : undefined}
        >
          <div className="relative p-3 md:p-4 smoke-flash">
            <button
              type="button"
              aria-label="Закрыть"
              onClick={() => {
                if (inlinePlayerOpen) {
                  setInlineClosing(true);
                  setPlayerVisible(false);
                  setInfoVisible(false);
                  setTimeout(() => {
                    setInlinePlayerOpen(false);
                    setInlineClosing(false);
                    setSelectedMovie(null);
                    setSelectedDetails(null);
                    setSelectedError(null);
                    setGridHeight(null);
                    setTileWidth(null);
                  }, 200);
                } else {
                  setInfoVisible(false);
                  setTimeout(() => {
                    setSelectedMovie(null);
                    setSelectedDetails(null);
                    setSelectedError(null);
                    setGridHeight(null);
                    setTileWidth(null);
                  }, 200);
                }
              }}
              className="absolute right-2 top-2 inline-flex items-center justify-center w-8 h-8 rounded-full border border-[rgba(var(--ui-accent-rgb),0.55)] text-[rgba(var(--ui-accent-rgb),1)] hover:bg-[rgba(var(--ui-accent-rgb),0.12)] hover:border-[rgba(var(--ui-accent-rgb),0.85)] transition-all duration-200"
            >
              <IconX size={18} />
            </button>
            {isDesktop && (
              <>
                {(() => {
                  const chunkItems = getChunkItems(page, subIndex);
                  const idx = selectedMovie ? chunkItems.findIndex((m: any) => String(m.id) === String(selectedMovie.id)) : -1;
                  const canPrevInChunk = idx > 0;
                  const disablePrev = !canPrevInChunk && page <= 1 && subIndex <= 0;
                  return (
                    <button
                      type="button"
                      onClick={handleInlinePrev}
                      disabled={disablePrev}
                      aria-label="Предыдущий фильм"
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center w-10 h-10 text-[rgba(var(--ui-accent-rgb),1)] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <IconChevronLeft size={26} />
                    </button>
                  );
                })()}
                {(() => {
                  const chunkItems = getChunkItems(page, subIndex);
                  const idx = selectedMovie ? chunkItems.findIndex((m: any) => String(m.id) === String(selectedMovie.id)) : -1;
                  const canNextInChunk = idx >= 0 && idx < chunkItems.length - 1;
                  const disableNext = (!canNextInChunk) && (subIndex >= currChunkCount - 1) && ((nextPageItemsLen === 0) || (nextPageItemsLen == null && lastPageEmpty));
                  return (
                    <button
                      type="button"
                      onClick={handleInlineNext}
                      disabled={disableNext}
                      aria-label="Следующий фильм"
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center w-10 h-10 text-[rgba(var(--ui-accent-rgb),1)] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <IconChevronRight size={26} />
                    </button>
                  );
                })()}
              </>
            )}
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch">
              <div className="hidden md:block">
                <div className="rounded-[10px] overflow-hidden bg-zinc-900 aspect-[2/3]" style={tileWidth != null ? { width: Math.max(tileWidth, 280) } : { width: 280 }}>
                  {selectedMovie!.poster ? (
                    <img src={selectedMovie!.poster} alt="Постер" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[10px]">Нет постера</div>
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                {inlinePlayerOpen ? (
                  <div className={`relative mt-1 z-[10] mr-12 ${inlineClosing ? "animate-out fade-out-0 zoom-out-95" : "animate-in fade-in-0 zoom-in-95"}`}>
                    {(() => {
                      const w = tileWidth != null ? Math.max(tileWidth, 280) : 280;
                      const h = Math.round(w * 3 / 2);
                      return (
                        <PlayerSelector
                          onPlayerSelect={() => {}}
                          iframeUrl={inlineIframeUrl ?? selectedIframeUrl ?? undefined}
                          kpId={inlineKpId ?? selectedKpId ?? undefined}
                          videoContainerClassName="bg-zinc-900 rounded-[10px] overflow-hidden"
                          videoContainerStyle={{ height: h }}
                        />
                      );
                    })()}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm md:text-base font-semibold text-zinc-100 truncate" title={selectedMovie!.title || "Без названия"}>
                        {selectedMovie!.title || "Без названия"}
                      </h3>
                      {(() => {
                        const rating = (selectedDetails as any)?.rating_kp ?? (selectedDetails as any)?.rating ?? selectedMovie!.rating;
                        return rating ? (
                          <span className={`px-2 py-[3px] rounded-sm text-[11px] md:text-[12px] text-white ${ratingBgColor(rating)}`}>{formatRatingLabel(rating)}</span>
                        ) : null;
                      })()}
                    </div>
                    <div className="mt-1 text-[12px] md:text-[13px] text-zinc-300">
                      {(() => {
                        const d: any = selectedDetails || {};
                        const year = d.year ?? d.released ?? d.release_year ?? d.releaseYear ?? selectedMovie!.year;
                        const countryRaw = d.country ?? selectedMovie!.country;
                        const quality = d.quality ?? selectedMovie!.quality;
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
                    <div className="mt-2 text-[12px] md:text-[13px] text-zinc-200 min-h-[66px] md:min-h-[84px]">
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
                          setInlineKpId(selectedKpId);
                          setInlineIframeUrl(selectedIframeUrl);
                          setInlinePlayerOpen(true);
                          setPlayerVisible(true);
                        }}
                        className="inline-flex items-center gap-2 h-9 px-4 rounded-full text-[12px] font-medium text-white border border-transparent bg-gradient-to-r from-[rgba(var(--ui-accent-rgb),1)] to-[rgba(var(--ui-accent-rgb),0.85)] ring-1 ring-[rgba(var(--ui-accent-rgb),0.25)] shadow-xs hover:shadow-md hover:opacity-95 transition-all duration-200"
                      >
                        Смотреть онлайн
                      </button>
                      <Link
                        href={`/movie/${selectedMovie!.id}`}
                        onClick={() => { if (resetOverridesOnNavigate) { try { onBackdropOverrideChange?.(null, null); } catch {}; try { onHeroInfoOverrideChange?.(null); } catch {}; } }}
                        className="inline-flex items-center gap-2 h-9 px-4 rounded-full text-[12px] font-medium border border-zinc-700/60 bg-zinc-900/40 text-zinc-300 hover:text-zinc-100 hover:border-zinc-600 hover:bg-зinc-800/60 shadow-xs transition-all duration-200"
                      >
                        Подробнее
                      </Link>
                      {selectedError && <span className="text-[12px] text-red-400">{selectedError}</span>}
                    </div>
                  </>
                )}
              </div>
              
            </div>
          </div>
        </div>
      ) : (
      <>
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
                if (resetOverridesOnNavigate) {
                  try { onBackdropOverrideChange?.(null, null); } catch {}
                  try { onHeroInfoOverrideChange?.(null); } catch {}
                }
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
                  setGridHeight(null);
                  setTileWidth(null);
                }, 200);
                return;
              }
              setGridHeight(gridWrapRef.current ? gridWrapRef.current.offsetHeight : null);
              try {
                const el = gridWrapRef.current;
                if (el) {
                  const w = el.clientWidth;
                  const cols = effectiveCols;
                  const gaps = (cols - 1) * 8;
                  const tw = Math.floor((w - gaps) / cols);
                  setTileWidth(tw > 0 ? tw : null);
                }
              } catch {}
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
      </>
      )}
      </div>

      {!showInlineInfo && !navigateOnClick && selectedMovie && (!isArrowDesktopMode || !watchOpen) && (
        <div key={String(selectedMovie.id)} className={`relative mt-3 md:mt-4 transition-all duration-300 ${infoVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
          <div className="relative p-3 md:p-4 smoke-flash">
            {isDesktop && (
              <>
                {(() => {
                  const chunkItems = getChunkItems(page, subIndex);
                  const idx = selectedMovie ? chunkItems.findIndex((m: any) => String(m.id) === String(selectedMovie.id)) : -1;
                  const canPrevInChunk = idx > 0;
                  const disablePrev = !canPrevInChunk && page <= 1 && subIndex <= 0;
                  return (
                    <button
                      type="button"
                      onClick={handleInlinePrev}
                      disabled={disablePrev}
                      aria-label="Предыдущий фильм"
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center w-10 h-10 text-[rgba(var(--ui-accent-rgb),1)] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <IconChevronLeft size={26} />
                    </button>
                  );
                })()}
                {(() => {
                  const chunkItems = getChunkItems(page, subIndex);
                  const idx = selectedMovie ? chunkItems.findIndex((m: any) => String(m.id) === String(selectedMovie.id)) : -1;
                  const canNextInChunk = idx >= 0 && idx < chunkItems.length - 1;
                  const disableNext = (!canNextInChunk) && (subIndex >= currChunkCount - 1) && ((nextPageItemsLen === 0) || (nextPageItemsLen == null && lastPageEmpty));
                  return (
                    <button
                      type="button"
                      onClick={handleInlineNext}
                      disabled={disableNext}
                      aria-label="Следующий фильм"
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center w-10 h-10 text-[rgba(var(--ui-accent-rgb),1)] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <IconChevronRight size={26} />
                    </button>
                  );
                })()}
              </>
            )}
            <div className="grid md:grid-cols-[minmax(160px,240px)_1fr] grid-cols-1 gap-3 md:gap-4 items-stretch">
              <div className="hidden md:block">
                {selectedMovie.poster ? (
                  <div className="rounded-[10px] overflow-hidden bg-zinc-900 aspect-[2/3]">
                    <img src={selectedMovie.poster} alt="Постер" className="w-full h-full object-cover" />
                  </div>
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
                    disabled
                    aria-disabled
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-full text-[12px] font-medium text-white/70 border border-transparent bg-gradient-to-r from-[rgba(var(--ui-accent-rgb),0.6)] to-[rgba(var(--ui-accent-rgb),0.5)] ring-1 ring-[rgba(var(--ui-accent-rgb),0.15)] shadow-xs cursor-not-allowed"
                  >
                    Смотреть онлайн
                  </button>
                  <Link
                    href={`/movie/${selectedMovie.id}`}
                    onClick={() => { try { onBackdropOverrideChange?.(null, null); } catch {}; try { onHeroInfoOverrideChange?.(null); } catch {}; }}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-full text-[12px] font-medium border border-zinc-700/60 bg-zinc-900/40 text-zinc-300 hover:text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800/60 shadow-xs transition-all duration-200"
                  >
                    Подробнее
                  </Link>
                  
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
