"use client";
import useSWR from "swr";
import { Loader } from "./loader";
import Link from "next/link";
import NProgress from "nprogress";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useRouter, usePathname } from "next/navigation";
import {
  IconChevronLeft,
  IconChevronRight,
  IconX,
  IconPlayerPlayFilled,
  IconInfoCircle,
} from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ratingBgColor, formatRatingLabel } from "@/lib/utils";
import { getCountryLabel } from "@/lib/country-flags";
import { savePosterTransition } from "@/lib/poster-transition";
import { PlayerSelector } from "@/components/player-selector";
import { VideoPoster } from "@/components/video-poster";
import { useFavorites } from "@/hooks/use-favorites";
import { useWatched } from "@/hooks/use-watched";
import { Eye, EyeOff } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

interface Movie {
  id: string;
  title: string;
  poster?: string;
  year?: string;
  rating?: string;
  country?: string | string[];
  quality?: string;
  tags?: string[] | string;
  age?: string | number | null;
}

interface MovieGridProps {
  url: string;
  navigateOnClick?: boolean;
  onPagingInfo?: (info: {
    page: number;
    scrolledCount: number;
    isArrowMode: boolean;
  }) => void;
  onWatchOpenChange?: (open: boolean) => void;
  onInlineInfoOpenChange?: (open: boolean) => void;
  onBackdropOverrideChange?: (
    bg: string | null,
    poster?: string | null
  ) => void;
  onHeroInfoOverrideChange?: (
    info: {
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
    } | null
  ) => void;
  resetOverridesOnNavigate?: boolean;
  viewMode?: "pagination" | "loadmore";
  hideLoadMoreOverride?: boolean;
  cardType?: "poster" | "backdrop";
  gridColsOverride?: number;
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
      backdrop:
        item.details?.bg_poster?.backdrop ||
        item.details?.wide_poster ||
        item.details?.backdrop ||
        item.backdrop ||
        item.poster,
      year: item.details?.released || item.year,
      rating: item.details?.rating_kp || item.rating,
      country: item.details?.country || item.country,
      quality: item.details?.quality || item.quality,
      genre: item.details?.genre || item.genre,
      tags: item.details?.tags || item.tags,
      description:
        item.details?.about || item.about || item.description || null,
      duration: item.details?.duration || item.duration,
      logo: item.details?.poster_logo || item.logo || null,
      poster_colors:
        item.details?.poster_colors ||
        item.details?.colors ||
        item.poster_colors ||
        item.colors,
      type: item.details?.type || item.type || null,
      age: item.details?.age || item.age || null,
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

export function MovieGrid({
  url,
  navigateOnClick,
  onPagingInfo,
  onWatchOpenChange,
  onInlineInfoOpenChange,
  onBackdropOverrideChange,
  onHeroInfoOverrideChange,
  resetOverridesOnNavigate,
  viewMode,
  hideLoadMoreOverride,
  cardType = "poster",
  gridColsOverride,
}: MovieGridProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [errorImages, setErrorImages] = useState<Set<string>>(new Set());
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
  const [infoSwitching, setInfoSwitching] = useState<boolean>(false);
  const posterContextRef = useRef<{ rect: DOMRect; posterUrl: string } | null>(
    null
  );
  const router = useRouter();
  const pathname = usePathname();
  const isRestrictedBadgesRoute = useMemo(() => {
    if (!pathname) return false;
    // Normalize path by removing trailing slash if present
    const p = pathname.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
    return ["/movies/all", "/serials/all", "/uhd", "/dolbyv/all"].includes(p);
  }, [pathname]);
  const [watchOpen, setWatchOpen] = useState<boolean>(false);
  const [inlineKpId, setInlineKpId] = useState<string | null>(null);
  const [inlineIframeUrl, setInlineIframeUrl] = useState<string | null>(null);
  const [showEscHint, setShowEscHint] = useState<boolean>(false);
  const [isLargeDesktop, setIsLargeDesktop] = useState<boolean>(false);
  const [playerVisible, setPlayerVisible] = useState<boolean>(false);
  const gridWrapRef = useRef<HTMLDivElement | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const [gridHeight, setGridHeight] = useState<number | null>(null);
  const [tileWidth, setTileWidth] = useState<number | null>(null);
  const overlayPosterRef = useRef<HTMLDivElement | null>(null);
  const [overlayPosterHeight, setOverlayPosterHeight] = useState<number | null>(
    null
  );
  const overlayGlowRef = useRef<HTMLDivElement | null>(null);
  const [virtStart, setVirtStart] = useState<number>(0);
  const [virtEnd, setVirtEnd] = useState<number>(0);
  const [virtTopPad, setVirtTopPad] = useState<number>(0);
  const [virtBottomPad, setVirtBottomPad] = useState<number>(0);
  const [rowHeight, setRowHeight] = useState<number | null>(null);
  const keyboardIndexRef = useRef<number>(0);
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);
  const { toggleFavorite, isFavorite } = useFavorites();
  const { isWatched, toggleWatched } = useWatched();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMovie, setDrawerMovie] = useState<any>(null);

  const perPage = 15;
  const aspectClass = cardType === "backdrop" ? "aspect-video" : "aspect-[2/3]";
  const hoverOutlineClass = isKeyboardNav
    ? "outline-none focus-visible:outline focus-visible:outline-[2px] focus-visible:outline-zinc-700"
    : "hover:outline hover:outline-[1.5px] hover:outline-zinc-700 focus-visible:outline focus-visible:outline-[2px] focus-visible:outline-zinc-700";

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
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

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
      const mq =
        typeof window !== "undefined"
          ? window.matchMedia("(min-width: 768px)")
          : null;
      const update = () => setIsDesktop(!!mq?.matches);
      update();
      mq?.addEventListener("change", update);
      return () => mq?.removeEventListener("change", update);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const mq =
        typeof window !== "undefined"
          ? window.matchMedia("(min-width: 1280px)")
          : null;
      const update = () => setIsLargeDesktop(!!mq?.matches);
      update();
      mq?.addEventListener("change", update);
      return () => mq?.removeEventListener("change", update);
    } catch {}
  }, []);

  function handleCloseInline() {
    setShowEscHint(false);
    if (inlinePlayerOpen) {
      setInlineClosing(true);
    }
    setPlayerVisible(false);
    setInfoVisible(false);
    setTimeout(() => {
      setWatchOpen(false);
      if (inlinePlayerOpen) {
        setInlinePlayerOpen(false);
        setInlineClosing(false);
      }
      setSelectedMovie(null);
      setSelectedDetails(null);
      setSelectedError(null);
      setGridHeight(null);
      setTileWidth(null);
      try {
        onInlineInfoOpenChange?.(false);
      } catch {}
    }, 200);
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCloseInline();
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
      try {
        onBackdropOverrideChange?.(null, null);
      } catch {}
      try {
        onHeroInfoOverrideChange?.(null);
      } catch {}
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
        setOverlayPosterHeight(Math.round((width * 3) / 2));
      }
    } catch {}
  }, [watchOpen, selectedMovie, playerVisible]);

  useEffect(() => {
    try {
      setPage(1);
      setSubIndex(0);
      setSelectedMovie(null);
      setSelectedDetails(null);
      setSelectedError(null);
      setInlinePlayerOpen(false);
      setWatchOpen(false);
      setPlayerVisible(false);
      setInfoVisible(false);
      setGridHeight(null);
      setTileWidth(null);
      onInlineInfoOpenChange?.(false);
    } catch {}
  }, [viewMode]);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const mqlXl = window.matchMedia("(min-width: 1280px)");
      const mqlLg = window.matchMedia("(min-width: 1024px)");
      const mqlMd = window.matchMedia("(min-width: 768px)");
      const computeCols = () => {
        if (typeof gridColsOverride === "number" && gridColsOverride > 0) {
          return gridColsOverride;
        }
        if (mqlXl.matches) return 5;
        if (mqlLg.matches) return 5;
        if (mqlMd.matches) return 5;
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
  }, [gridColsOverride]);

  useEffect(() => {
    if (showEscHint && isLargeDesktop) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [showEscHint, isLargeDesktop]);

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
        if (!hideLoadMoreOverride) setLastPageEmpty(true);
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
        if (!hideLoadMoreOverride) setLastPageEmpty(true);
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
        if (!hideLoadMoreOverride) setLastPageEmpty(true);
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
      const isSearch = String(url || "").includes("/api/search");
      if (!isSearch) return;
      if (hasFirstResultsLoadedRef.current) return;
      const firstEntry = pagesData.find((p) => p.page === 1) || null;
      const hasData = !!firstEntry;
      const arr = hasData ? extractMoviesFromData(firstEntry!.data) || [] : [];
      const ok = Array.isArray(arr) && arr.length > 0;
      const finished = !isLoading && !isValidating;
      if (
        (ok && finished) ||
        (error && finished) ||
        (lastPageEmpty && finished)
      ) {
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
    if (hideLoadMoreOverride) return true;
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
    const isMovieOrSerial =
      u.includes("type=movie") || u.includes("type=serial");
    const isUhdTag = /tag=(4K|4K%20HDR|4K%20DolbyV|60FPS)/.test(u);
    const isCompilation = u.includes("/v2/compilations/content");
    const isCastList = u.includes("cast=");
    return (
      (isList && (isMovieOrSerial || isUhdTag || isCastList)) ||
      isCompilation ||
      u.includes("/api/search")
    );
  }, [url]);
  const isMovieOrSerialList = useMemo(() => {
    const u = String(url || "");
    return (
      u.includes("/v2/list") &&
      (u.includes("type=movie") || u.includes("type=serial"))
    );
  }, [url]);
  const isArrowDesktopMode =
    isDesktop &&
    isArrowCandidate &&
    !hideLoadMore &&
    (!viewMode || viewMode === "pagination");

  // Автоподгрузка (инфинити-скролл) в режиме loadmore
  useEffect(() => {
    if (viewMode !== "loadmore") return;
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (
            entry.isIntersecting &&
            !isLoading &&
            !loadingMore &&
            !lastPageEmpty
          ) {
            handleLoadMore();
          }
        });
      },
      { rootMargin: "800px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [viewMode, isLoading, loadingMore, lastPageEmpty]);

  const currentPageEntry = useMemo(() => {
    return pagesData.find((p) => p.page === page) || null;
  }, [pagesData, page]);
  const effectiveCols = useMemo(
    () => (isArrowDesktopMode ? 5 : gridCols),
    [isArrowDesktopMode, gridCols]
  );
  useEffect(() => {
    try {
      const el = gridWrapRef.current;
      if (!el) return;
      const w = el.clientWidth;
      const cols = effectiveCols;
      const gaps = (cols - 1) * 8;
      const tw = Math.floor((w - gaps) / cols);
      setTileWidth(tw > 0 ? tw : null);
    } catch {}
  }, [effectiveCols]);
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
  const currItemsLen = useMemo(
    () => getItemsForPage(page).length,
    [pagesData, page]
  );
  const currEndIndex = useMemo(() => {
    const base = Math.min(currItemsLen, (subIndex + 1) * chunkSize);
    const hasCurrent = pagesData.some((p) => p.page === page);
    if (isArrowDesktopMode && !hasCurrent) {
      return Math.min((subIndex + 1) * chunkSize, chunkSize);
    }
    return base;
  }, [currItemsLen, subIndex, isArrowDesktopMode, pagesData, page]);
  const scrolledCount = useMemo(
    () => Math.max(0, (page - 1) * perPage) + currEndIndex,
    [page, currEndIndex]
  );

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

  const selectedScrolledCount = useMemo(() => {
    if (!selectedMovie) return null;
    const { start } = getChunkBounds(page, subIndex);
    const chunkItems = getChunkItems(page, subIndex);
    const idx = chunkItems.findIndex(
      (m: any) => String(m?.id) === String(selectedMovie.id)
    );
    if (idx < 0) return null;
    return prevItemsCount + start + idx + 1;
  }, [selectedMovie, page, subIndex, prevItemsCount, pagesData]);
  const effectiveScrolledCount = useMemo(() => {
    return selectedScrolledCount != null
      ? selectedScrolledCount
      : scrolledCount;
  }, [selectedScrolledCount, scrolledCount]);

  const lastPagingRef = useRef<{
    page: number;
    scrolled: number;
    arrow: boolean;
  } | null>(null);
  useEffect(() => {
    const info = {
      page,
      scrolledCount: effectiveScrolledCount,
      isArrowMode: isArrowDesktopMode,
    };
    const last = lastPagingRef.current;
    const changed =
      !last ||
      last.page !== info.page ||
      last.scrolled !== info.scrolledCount ||
      last.arrow !== info.isArrowMode;
    if (!changed) return;
    lastPagingRef.current = {
      page: info.page,
      scrolled: info.scrolledCount,
      arrow: info.isArrowMode,
    };
    try {
      onPagingInfo?.(info);
    } catch {}
  }, [page, subIndex, effectiveScrolledCount, isArrowDesktopMode]);

  useEffect(() => {
    try {
      onPagingInfo?.({
        page,
        scrolledCount: effectiveScrolledCount,
        isArrowMode: isArrowDesktopMode,
      });
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
  const [pendingOverrideIds, setPendingOverrideIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (!idsString) return;
    const idsArray = idsString.split(",").filter(Boolean);
    const controller = new AbortController();
    setPendingOverrideIds((prev) => {
      const next = new Set(prev);
      for (const id of idsArray) {
        if (!(id in (overridesCacheRef as any)) && !(id in overridesMap))
          next.add(id);
      }
      return next;
    });
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
      const patchedIntroVideo =
        ov && ov.intro_video ? ov.intro_video : undefined;
      const patchedTitle =
        ov && (ov.name || ov.title) ? ov.name || ov.title : m.title;
      const patchedYear =
        ((ov?.year ??
          ov?.released ??
          ov?.release_year ??
          ov?.releaseYear ??
          ov?.details?.year ??
          ov?.details?.released ??
          ov?.details?.release_year ??
          ov?.details?.releaseYear) as any) ?? m.year;
      const patchedBgPoster =
        ov && (ov.backdrop || ov?.bg_poster?.backdrop)
          ? {
              backdrop: ov.backdrop || ov?.bg_poster?.backdrop,
              poster: ov?.bg_poster?.poster ?? undefined,
            }
          : m?.bg_poster || undefined;
      return {
        ...m,
        poster: patchedPoster,
        title: patchedTitle,
        year: patchedYear,
        intro_video: patchedIntroVideo,
        ...(patchedBgPoster ? { bg_poster: patchedBgPoster } : {}),
      };
    });
  }, [display, overridesMap]);

  const applyOverridesToMovie = useCallback(
    (m: any) => {
      const ov = overridesMap[String(m?.id)] || null;
      const patchedPoster = ov && ov.poster ? ov.poster : m?.poster;
      const patchedIntroVideo =
        ov && ov.intro_video ? ov.intro_video : undefined;
      const patchedTitle =
        ov && (ov.name || ov.title) ? ov.name || ov.title : m?.title;
      const patchedYear =
        ((ov?.year ??
          ov?.released ??
          ov?.release_year ??
          ov?.releaseYear ??
          ov?.details?.year ??
          ov?.details?.released ??
          ov?.details?.release_year ??
          ov?.details?.releaseYear) as any) ?? m?.year;
      const patchedBgPoster =
        ov && (ov.backdrop || ov?.bg_poster?.backdrop)
          ? {
              backdrop: ov.backdrop || ov?.bg_poster?.backdrop,
              poster: ov?.bg_poster?.poster ?? undefined,
            }
          : m?.bg_poster || undefined;
      return {
        ...(m || {}),
        poster: patchedPoster,
        title: patchedTitle,
        year: patchedYear,
        intro_video: patchedIntroVideo,
        ...(patchedBgPoster ? { bg_poster: patchedBgPoster } : {}),
      };
    },
    [overridesMap]
  );

  useEffect(() => {
    if (!selectedMovie) return;
    setSelectedMovie((prev: any) => applyOverridesToMovie(prev));
  }, [overridesMap]);

  useEffect(() => {
    try {
      const el = gridWrapRef.current;
      if (!el) return;
      const card = el.querySelector(
        '[data-card-item="true"]'
      ) as HTMLElement | null;
      if (card && card.offsetHeight) {
        setRowHeight(card.offsetHeight + 8);
        return;
      }
      if (tileWidth != null) {
        const h = Math.round((tileWidth * 3) / 2) + (isDesktop ? 68 : 56) + 8;
        setRowHeight(h);
      }
    } catch {}
  }, [finalDisplay, isDesktop, tileWidth]);

  useEffect(() => {
    if (!selectedMovie) return;
    setSelectedLoading(true);
    setSelectedError(null);
    setSelectedDetails(null);
    const controller = new AbortController();
    let cancelled = false;
    const run = async (attempt: number) => {
      try {
        const res = await fetch(
          `https://api.vokino.pro/v2/view/${selectedMovie.id}`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            cache: "no-store",
          }
        );
        if (!res.ok) {
          const status = res.status;
          if ((status === 429 || status === 503) && attempt < 2) {
            setTimeout(() => run(attempt + 1), 300);
            return;
          }
          throw new Error(String(status));
        }
        const json = await res.json();
        if (cancelled || controller.signal.aborted) return;
        setSelectedDetails(json?.details ?? json ?? null);
        setSelectedLoading(false);
      } catch (e: any) {
        if (cancelled || controller.signal.aborted) return;
        const isAbort =
          e?.name === "AbortError" ||
          e?.code === "ABORT_ERR" ||
          String(e?.message || "")
            .toLowerCase()
            .includes("abort");
        if (isAbort) return;
        if (attempt < 2) {
          setTimeout(() => run(attempt + 1), 300);
          return;
        }
        setSelectedError("Ошибка загрузки");
        setSelectedLoading(false);
      }
    };
    run(0);
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedMovie]);

  useEffect(() => {
    if (!watchOpen) return;
    try {
      const id = selectedMovie ? String(selectedMovie.id) : null;
      const ov = id ? (overridesMap as any)[id] ?? null : null;
      const d: any = selectedDetails || {};
      const ovBackdrop =
        (ov && (ov.backdrop || ov?.bg_poster?.backdrop)) || null;
      const localBackdrop =
        (selectedMovie as any)?.bg_poster?.backdrop ||
        (selectedMovie as any)?.backdrop ||
        null;
      const detailsId = String((d && (d.id ?? d?.details?.id)) ?? "");
      const isDetailsForCurrent =
        id != null && detailsId !== "" && detailsId === id;
      const apiBackdrop = isDetailsForCurrent
        ? (d && (d.backdrop || d?.bg_poster?.backdrop)) || null
        : null;
      const bg =
        ovBackdrop != null
          ? ovBackdrop
          : localBackdrop != null
          ? localBackdrop
          : apiBackdrop;
      const poster =
        (ov && (ov.poster || ov?.bg_poster?.poster)) ||
        (d && (d.poster || d?.bg_poster?.poster)) ||
        (selectedMovie?.poster ?? null);
      if (bg) {
        onBackdropOverrideChange?.(String(bg), poster ? String(poster) : null);
      }
      const logo = (ov as any)?.poster_logo ?? null;
      const titleStr = selectedMovie?.title ?? null;
      const yrRaw =
        d?.year ??
        d?.released ??
        d?.release_year ??
        d?.releaseYear ??
        selectedMovie?.year ??
        null;
      const year = (() => {
        if (yrRaw == null) return null;
        const s = String(yrRaw).trim();
        if (!s || s === "0") return null;
        const m = s.match(/\d{4}/);
        return m ? m[0] : s;
      })();
      const countryLabel =
        getCountryLabel(d?.country ?? selectedMovie?.country) || null;
      const genreVal = (() => {
        const src =
          d?.genre ??
          (Array.isArray(d?.tags) ? d?.tags.join(", ") : d?.tags) ??
          selectedMovie?.tags;
        if (Array.isArray(src)) {
          const first = src.find(
            (v) => v != null && String(v).trim().length > 0
          );
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
          if (typeof val === "number" && !Number.isNaN(val))
            return Math.round(val);
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
            const hoursMatch = s.match(
              /(\d+)\s*(ч|час|часа|часов|h|hr|hour|hours)/
            );
            const minutesMatch = s.match(
              /(\d+)\s*(мин|м|m|min|minute|minutes)/
            );
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
      const metaObj = {
        ratingKP,
        ratingIMDb,
        year,
        country: countryLabel,
        genre: genreVal || null,
        duration: durationStr,
      };
      if (!watchOpen)
        onHeroInfoOverrideChange?.({
          title: null,
          logo: null,
          logoId: null,
          meta: metaObj,
        });
    } catch {}
  }, [selectedDetails, watchOpen]);

  useEffect(() => {
    if (!watchOpen || !selectedMovie) return;
    const controller = new AbortController();
    (async () => {
      try {
        const tRes = await fetch(
          `https://api.vokino.tv/v2/timeline/watch?ident=${selectedMovie.id}&current=100&time=100&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352`,
          {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          }
        );
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
      const showTimer = setTimeout(
        () => {
          setShowEscHint(true);
          if (!isLargeDesktop) {
            const hideTimer = setTimeout(() => setShowEscHint(false), 3000);
            // Не нужно сохранять hideTimer, так как он сработает сам,
            // а при размонтировании/изменении мы сбросим всё через cleanup ниже.
            // Но чтобы не было утечки, если компонент размонтируется во время hideTimer,
            // можно сохранить его в ref, но проще просто сбросить состояние.
          }
        },
        isLargeDesktop ? 2000 : 0
      );

      return () => {
        clearTimeout(showTimer);
        setShowEscHint(false);
      };
    }
  }, [watchOpen, isDesktop, isLargeDesktop]);

  const selectedKpId = useMemo(() => {
    const d: any = selectedDetails || {};
    const kp =
      d?.kp_id ??
      d?.kinopoisk_id ??
      d?.details?.kp_id ??
      d?.details?.kinopoisk_id;
    return kp ? String(kp) : null;
  }, [selectedDetails]);
  const selectedIframeUrl = useMemo(() => {
    const d: any = selectedDetails || {};
    return (d?.iframe_url ?? null) as string | null;
  }, [selectedDetails]);

  const [inlinePlayerOpen, setInlinePlayerOpen] = useState<boolean>(false);
  const [inlineClosing, setInlineClosing] = useState<boolean>(false);
  const [pendingSelectDir, setPendingSelectDir] = useState<
    "next" | "prev" | null
  >(null);

  useEffect(() => {
    if (!inlinePlayerOpen || !selectedMovie) return;
    const controller = new AbortController();
    (async () => {
      try {
        const tRes = await fetch(
          `https://api.vokino.tv/v2/timeline/watch?ident=${selectedMovie.id}&current=100&time=100&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352`,
          {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          }
        );
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

  const isLoadMoreMode = viewMode === "loadmore";
  const showLoadMoreButton =
    !lastPageEmpty && !hideLoadMore && (!isArrowDesktopMode || isLoadMoreMode);
  const showInlineInfo = !navigateOnClick && !!selectedMovie;

  // Фолбек на scroll, если IntersectionObserver не срабатывает
  useEffect(() => {
    if (!isLoadMoreMode) return;
    const onScroll = () => {
      if (lastPageEmpty || isLoading || loadingMore) return;
      const scrollPos = window.scrollY + window.innerHeight;
      const threshold = document.body.scrollHeight - 800;
      if (scrollPos >= threshold) {
        handleLoadMore();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isLoadMoreMode, isLoading, loadingMore, lastPageEmpty]);

  // Клавиатурная навигация по гриду (стрелки) для view-all (где hideLoadMoreOverride=true)
  useEffect(() => {
    if (!hideLoadMoreOverride) return;
    const handler = (e: KeyboardEvent) => {
      const key = e.key;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(key)) {
        return;
      }
      const items = Array.from(
        document.querySelectorAll<HTMLElement>("[data-grid-item]")
      );
      if (items.length === 0) return;
      const active = document.activeElement as HTMLElement | null;
      let idx = items.indexOf(active || (null as any));
      if (idx < 0) idx = keyboardIndexRef.current ?? 0;

      const cols = Math.max(1, effectiveCols);
      if (key === "ArrowRight") idx = Math.min(items.length - 1, idx + 1);
      if (key === "ArrowLeft") idx = Math.max(0, idx - 1);
      if (key === "ArrowDown") idx = Math.min(items.length - 1, idx + cols);
      if (key === "ArrowUp") idx = Math.max(0, idx - cols);

      keyboardIndexRef.current = idx;
      const next = items[idx];
      if (next) {
        e.preventDefault();
        setIsKeyboardNav(true);
        next.focus({ preventScroll: false });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hideLoadMoreOverride, effectiveCols]);

  // Сброс режима клавиатуры при движении мыши/клике (глобально, чтобы pointer-events:none не мешал)
  useEffect(() => {
    const reset = () => setIsKeyboardNav(false);
    window.addEventListener("mousemove", reset, { passive: true });
    window.addEventListener("mousedown", reset, { passive: true });
    return () => {
      window.removeEventListener("mousemove", reset);
      window.removeEventListener("mousedown", reset);
    };
  }, []);
  useEffect(() => {
    try {
      onInlineInfoOpenChange?.(!!showInlineInfo);
    } catch {}
  }, [showInlineInfo]);

  useEffect(() => {
    try {
      const open = !!selectedMovie || inlinePlayerOpen || watchOpen;
      onInlineInfoOpenChange?.(open);
    } catch {}
  }, [selectedMovie, inlinePlayerOpen, watchOpen]);

  const virtualizationEnabled =
    !isArrowDesktopMode &&
    (viewMode === "loadmore" || viewMode === "pagination");

  const totalRows = useMemo(
    () => Math.ceil(finalDisplay.length / effectiveCols),
    [finalDisplay.length, effectiveCols]
  );
  const rowVirtualizer = useWindowVirtualizer({
    count: virtualizationEnabled && rowHeight ? totalRows : 0,
    estimateSize: () => rowHeight || 0,
    overscan: 3,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const vStartRow =
    virtualizationEnabled && rowHeight && virtualItems.length > 0
      ? virtualItems[0].index
      : 0;
  const vEndRowExclusive =
    virtualizationEnabled && rowHeight && virtualItems.length > 0
      ? virtualItems[virtualItems.length - 1].index + 1
      : totalRows;
  const vVirtStart = vStartRow * effectiveCols;
  const vVirtEnd = Math.min(
    finalDisplay.length,
    vEndRowExclusive * effectiveCols
  );
  const vTopPad =
    virtualizationEnabled && rowHeight && virtualItems.length > 0
      ? virtualItems[0].start
      : 0;
  const vLastEnd =
    virtualizationEnabled && rowHeight && virtualItems.length > 0
      ? virtualItems[virtualItems.length - 1].start +
        virtualItems[virtualItems.length - 1].size
      : 0;
  const vBottomPad =
    virtualizationEnabled && rowHeight
      ? Math.max(0, totalRows * (rowHeight || 0) - vLastEnd)
      : 0;

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
      setSelectedMovie(applyOverridesToMovie(chunkItems[0]));
    } else {
      setSelectedMovie(
        applyOverridesToMovie(chunkItems[chunkItems.length - 1])
      );
    }
    setPendingSelectDir(null);
  }, [page, subIndex, pagesData, pendingSelectDir, applyOverridesToMovie]);

  useEffect(() => {
    if (!showInlineInfo || !selectedMovie) return;
    try {
      const id = String(selectedMovie.id);
      const ov = (overridesMap as any)[id] ?? null;
      const d: any = selectedDetails || {};
      const ovBackdrop =
        (ov && (ov.backdrop || ov?.bg_poster?.backdrop)) || null;
      const localBackdrop =
        (selectedMovie as any)?.bg_poster?.backdrop ||
        (selectedMovie as any)?.backdrop ||
        null;
      const detailsId = String((d && (d.id ?? d?.details?.id)) ?? "");
      const isDetailsForCurrent = detailsId !== "" && detailsId === id;
      const apiBackdrop = isDetailsForCurrent
        ? (d && (d.backdrop || d?.bg_poster?.backdrop)) || null
        : null;
      const bg =
        ovBackdrop != null
          ? ovBackdrop
          : localBackdrop != null
          ? localBackdrop
          : apiBackdrop;
      const poster =
        (ov && (ov.poster || ov?.bg_poster?.poster)) ||
        (d && (d.poster || d?.bg_poster?.poster)) ||
        (selectedMovie?.poster ?? null);
      const bgVal = bg ? String(bg) : null;
      if (bgVal) {
        onBackdropOverrideChange?.(bgVal, poster ? String(poster) : null);
      }

      const logo =
        (ov as any)?.poster_logo ??
        (d as any)?.poster_logo ??
        (d as any)?.logo ??
        null;
      const titleStr = selectedMovie?.title ?? null;
      onHeroInfoOverrideChange?.({
        title: titleStr,
        logo: logo ? String(logo) : null,
        logoId: id,
        meta: null,
      });
    } catch {}
  }, [showInlineInfo, selectedMovie, selectedDetails, overridesMap]);

  useEffect(() => {
    if (!showInlineInfo && !inlinePlayerOpen) return;
    try {
      const showTimer = setTimeout(
        () => {
          setShowEscHint(true);
          if (!isLargeDesktop) {
            setTimeout(() => setShowEscHint(false), 6000);
          }
        },
        isLargeDesktop ? 2000 : 0
      );

      return () => {
        clearTimeout(showTimer);
        setShowEscHint(false);
      };
    } catch {}
  }, [showInlineInfo, inlinePlayerOpen, isLargeDesktop]);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const onKey = (e: KeyboardEvent) => {
        const k = e.key;
        if (k === "Escape") {
          handleCloseInline();
          return;
        }
        if (!showInlineInfo) return;
        if (k !== "ArrowLeft" && k !== "ArrowRight") return;
        const t = e.target as any;
        const tn = String(t?.tagName || "").toLowerCase();
        const editable = !!t?.isContentEditable;
        if (tn === "input" || tn === "textarea" || tn === "select" || editable)
          return;
        e.preventDefault();
        if (k === "ArrowLeft") {
          handleInlinePrev();
        } else {
          handleInlineNext();
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    } catch {}
  }, [showInlineInfo, inlinePlayerOpen, selectedMovie, page, subIndex]);

  // Conditional returns AFTER all hooks
  // Show skeletons during initial load/validation when there’s no page data yet.
  if ((isLoading || isValidating) && pagesData.length === 0) {
    const preferFive =
      !hideLoadMore && isArrowCandidate && viewMode === "pagination";
    const skeletonCount = preferFive ? 5 : perPage;
    const gridClass =
      "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 gap-2";
    return (
      <div className={gridClass}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            data-grid-item
            tabIndex={0}
            className={`group block bg-transparent hover:bg-transparent outline-none ${hoverOutlineClass} transition-all duration-200 cursor-pointer overflow-hidden rounded-sm`}
          >
            <div
              className={`${aspectClass} bg-zinc-950 flex items-center justify-center relative overflow-hidden rounded-[10px] isolate transform-gpu`}
            >
              <Skeleton className="w-full h-full" />
            </div>
            {/* Под постером оставляем область для анимации частиц + скелетона текста */}
            <div className="relative p-2 md:p-3 min-h-[48px] md:min-h-[56px] overflow-hidden text-left md:text-left">
              <div className="pointer-events-none absolute top-[4%] h-[52%] left-1/2 -translate-x-1/2 w-[46%] hidden md:block opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-500 movie-title-flame" />
              <div className="relative text-left md:text-left">
                <Skeleton className="h-3 md:h-4 w-3/4 mb-2 mx-0 md:mx-0" />
                <div className="flex items-center gap-2 justify-start md:justify-start">
                  <Skeleton className="h-2 md:h-3 w-10 mx-0 md:mx-0" />
                  <Skeleton className="h-2 md:h-3 w-16 mx-0 md:mx-0" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (
    ((viewMode === "pagination" && isArrowCandidate && !hideLoadMore) ||
      isArrowDesktopMode) &&
    (isLoading || isValidating) &&
    !pagesData.some((p) => p.page === page)
  ) {
    const skeletonCount = 5;
    const gridClass =
      "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 gap-2";
    return (
      <div className={gridClass}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            className="group block bg-transparent hover:bg-transparent outline-none hover:outline hover:outline-[1.5px] hover:outline-zinc-700 focus-visible:outline focus-visible:outline-[2px] focus-visible:outline-zinc-700 transition-all duration-200 cursor-pointer overflow-hidden rounded-sm"
          >
            <div className="aspect-[2/3] bg-zinc-950 flex items-center justify-center relative overflow-hidden rounded-[10px] isolate transform-gpu">
              <Skeleton className="w-full h-full" />
            </div>
            <div className="relative p-2 md:p-3 min-h-[48px] md:min-h-[56px] overflow-hidden text-left md:text-left">
              <div className="pointer-events-none absolute top-[4%] h-[52%] left-1/2 -translate-x-1/2 w-[46%] hidden md:block opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-500 movie-title-flame" />
              <div className="relative text-left md:text-left">
                <Skeleton className="h-3 md:h-4 w-3/4 mb-2 mx-0 md:mx-0" />
                <div className="flex items-center gap-2 justify-start md:justify-start">
                  <Skeleton className="h-2 md:h-3 w-10 mx-0 md:mx-0" />
                  <Skeleton className="h-2 md:h-3 w-16 mx-0 md:mx-0" />
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

  const handleImageError = (id: string | number) => {
    const key = String(id);
    setErrorImages((prev) => {
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
    const nextLen = nextEntry
      ? extractMoviesFromData(nextEntry.data).length
      : 0;
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
    setInfoSwitching(true);
    const chunkItems = getChunkItems(page, subIndex);
    const idx = chunkItems.findIndex(
      (m: any) => String(m.id) === String(selectedMovie.id)
    );
    if (idx > 0) {
      setSelectedMovie(applyOverridesToMovie(chunkItems[idx - 1]));
      setInfoVisible(false);
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => {
          setInfoVisible(true);
          setTimeout(() => setInfoSwitching(false), 250);
        });
      } else {
        setInfoVisible(true);
        setTimeout(() => setInfoSwitching(false), 250);
      }
      return;
    }
    const atGlobalStart = page <= 1 && subIndex <= 0;
    if (atGlobalStart) {
      setInfoSwitching(false);
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
    setInfoSwitching(true);
    const chunkItems = getChunkItems(page, subIndex);
    const idx = chunkItems.findIndex(
      (m: any) => String(m.id) === String(selectedMovie.id)
    );
    if (idx >= 0 && idx < chunkItems.length - 1) {
      setSelectedMovie(applyOverridesToMovie(chunkItems[idx + 1]));
      setInfoVisible(false);
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => {
          setInfoVisible(true);
          setTimeout(() => setInfoSwitching(false), 250);
        });
      } else {
        setInfoVisible(true);
        setTimeout(() => setInfoSwitching(false), 250);
      }
      return;
    }
    const atGlobalEnd =
      subIndex >= currChunkCount - 1 &&
      (!nextPageEntry || nextPageItemsLen === 0);
    if (atGlobalEnd) {
      setInfoSwitching(false);
      return;
    }
    setPendingSelectDir("next");
    handleNextArrow();
  };

  // «Нет данных» показываем только если точно не идёт загрузка/валидация
  if (!isLoading && !isValidating && movies.length === 0) {
    return (
      <div className="text-left py-8">
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
          className={`relative z-20 p-4 md:p-5 bg-zinc-900/80 border border-zinc-800/60 rounded-sm transition-all duration-300 overflow-hidden ${
            playerVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 -translate-y-2"
          }`}
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
          <div className="space-y-4">
            <div className="grid md:grid-cols-[minmax(160px,240px)_1fr] grid-cols-1 gap-3 md:gap-4 items-stretch">
              <div className="hidden md:block">
                {selectedMovie.intro_video ? (
                  <div
                    ref={overlayPosterRef}
                    className="rounded-[10px] overflow-hidden bg-zinc-900 aspect-[2/3]"
                  >
                    <VideoPoster
                      src={selectedMovie.intro_video}
                      poster={selectedMovie.poster}
                      className="w-full h-full"
                    />
                  </div>
                ) : selectedMovie.poster &&
                  !errorImages.has(String(selectedMovie.id)) ? (
                  <div
                    ref={overlayPosterRef}
                    className="rounded-[10px] overflow-hidden bg-zinc-900 aspect-[2/3]"
                  >
                    <img
                      src={selectedMovie.poster}
                      alt="Постер"
                      decoding="async"
                      loading="lazy"
                      fetchPriority="high"
                      className={`block w-full h-full object-cover transition-all ease-out poster-media ${
                        loadedImages.has(String(selectedMovie.id))
                          ? "opacity-100 blur-0 scale-100"
                          : "opacity-0 blur-md scale-[1.02]"
                      }`}
                      style={{
                        transition:
                          "opacity 300ms ease-out, filter 600ms ease-out, transform 600ms ease-out",
                        willChange: "opacity, filter, transform",
                      }}
                      onLoad={() => handleImageLoad(selectedMovie.id)}
                      onError={() => handleImageError(selectedMovie.id)}
                    />
                  </div>
                ) : selectedMovie.poster ? (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[10px]">
                    Нет постера
                  </div>
                ) : null}
              </div>
              <div
                className="min-w-0 md:max-w-none md:mx-0 mx-auto"
                style={
                  isDesktop
                    ? undefined
                    : {
                        width:
                          tileWidth != null ? Math.max(tileWidth, 280) : 280,
                      }
                }
              >
                <div className="flex items-center gap-2 md:justify-start justify-center">
                  <h3
                    className="text-sm md:text-base font-semibold text-zinc-100 truncate md:text-left text-center"
                    title={selectedMovie.title || "Без названия"}
                  >
                    {selectedMovie.title || "Без названия"}
                  </h3>
                  {(() => {
                    const rating =
                      (selectedDetails as any)?.rating_kp ??
                      (selectedDetails as any)?.rating ??
                      selectedMovie.rating;
                    if (rating) {
                      return (
                        <span
                          className={`px-2 py-[3px] rounded-full text-[11px] md:text-[12px] text-white font-bold ${ratingBgColor(
                            rating
                          )}`}
                        >
                          {formatRatingLabel(rating)}
                        </span>
                      );
                    }
                    if (selectedLoading) {
                      return <Skeleton className="h-[18px] w-10 rounded-sm" />;
                    }
                    return null;
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
                        try {
                          onInlineInfoOpenChange?.(false);
                        } catch {}
                      }, 200);
                    }}
                    className="ml-auto inline-flex items-center justify-center w-9 h-9 text-white opacity-85 hover:opacity-100 transition-opacity duration-200"
                  >
                    <IconX size={16} />
                  </button>
                </div>
                <div className="hidden md:block mt-1 h-[22px] overflow-hidden text-[12px] md:text-[13px] text-zinc-400 md:text-left text-center md:max-w-none max-w-[280px] md:mx-0 mx-auto">
                  {selectedLoading ? (
                    <div className="flex items-center gap-2 md:justify-start justify-center">
                      <Skeleton className="h-3 w-10" />
                      <Skeleton className="h-3 w-14" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  ) : (
                    (() => {
                      const d: any = selectedDetails || {};
                      const ov =
                        (overridesMap as any)[String(selectedMovie.id)] ?? null;
                      const year =
                        ov?.year ??
                        ov?.released ??
                        ov?.release_year ??
                        ov?.releaseYear ??
                        ov?.details?.year ??
                        ov?.details?.released ??
                        ov?.details?.release_year ??
                        ov?.details?.releaseYear ??
                        d.year ??
                        d.released ??
                        d.release_year ??
                        d.releaseYear ??
                        selectedMovie.year;
                      const countryRaw = d.country ?? selectedMovie.country;
                      const quality = d.quality ?? selectedMovie.quality;
                      const parts: string[] = [];
                      if (year) parts.push(String(year));
                      if (quality) parts.push(String(quality));
                      if (countryRaw) {
                        const arr = Array.isArray(countryRaw)
                          ? countryRaw
                          : String(countryRaw)
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean);
                        if (arr.length > 0) parts.push(arr.join(" "));
                      }
                      return parts.length > 0 ? (
                        <div className="flex items-center gap-2 md:justify-start justify-center">
                          {parts.map((p, i) => (
                            <span key={i} className="truncate">
                              {p}
                            </span>
                          ))}
                        </div>
                      ) : null;
                    })()
                  )}
                </div>
                <div className="mt-2 text-[12px] md:text-[13px] text-zinc-300/90 h-[72px] md:h-[96px] overflow-hidden text-left md:max-w-none max-w-[280px] md:mx-0 mx-auto">
                  {selectedLoading ? (
                    <div>
                      <Skeleton className="h-3 w-full md:w-[92%] mb-2" />
                      <Skeleton className="h-3 w-full md:w-[88%] mb-2" />
                      <Skeleton className="h-3 w-full md:w-[72%]" />
                    </div>
                  ) : (
                    (() => {
                      const d: any = selectedDetails || {};
                      const ov =
                        (overridesMap as any)[String(selectedMovie.id)] ?? null;
                      const aboutRaw =
                        ov?.about ??
                        ov?.description ??
                        ov?.details?.about ??
                        ov?.details?.description ??
                        ov?.franchise?.about ??
                        ov?.franchise?.description ??
                        d.about ??
                        d.description;
                      const about = Array.isArray(aboutRaw)
                        ? aboutRaw.filter(Boolean).join(" ")
                        : String(aboutRaw || "").trim();
                      return about ? (
                        <p className="line-clamp-3 md:line-clamp-4">{about}</p>
                      ) : (
                        <div className="h-3" />
                      );
                    })()
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Link
                    href={`/movie/${selectedMovie.id}`}
                    onClick={() => {
                      NProgress.start();
                      if (resetOverridesOnNavigate) {
                        try {
                          onBackdropOverrideChange?.(null, null);
                        } catch {}
                        try {
                          onHeroInfoOverrideChange?.(null);
                        } catch {}
                      }
                      try {
                        const allLoadedMovies = pagesData
                          .sort((a, b) => a.page - b.page)
                          .flatMap((p) => extractMoviesFromData(p.data));
                        const ids = allLoadedMovies.map((m: any) =>
                          String(m.id)
                        );
                        const index = ids.indexOf(String(selectedMovie.id));
                        // Pass current page and total pages/url info if needed
                        const ctx = {
                          origin: "grid",
                          ids,
                          index,
                          timestamp: Date.now(),
                          listUrl: url,
                          currentPage: page,
                          totalLoaded: allLoadedMovies.length,
                        };
                        localStorage.setItem(
                          "__navContext",
                          JSON.stringify(ctx)
                        );
                        const href = `${location.pathname}${location.search}`;
                        localStorage.setItem(
                          "__returnTo",
                          JSON.stringify({ href, timestamp: Date.now() })
                        );
                      } catch {}
                    }}
                    className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-md text-[15px] font-semibold text-white bg-zinc-600/80 hover:bg-zinc-600/60 transition-all duration-200"
                  >
                    <IconInfoCircle size={20} />
                    Подробнее
                  </Link>
                </div>
              </div>
            </div>

            <div className="relative w-full md:max-w-none md:mx-0 mx-auto">
              <div
                ref={overlayGlowRef}
                className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[130px] md:h-[160px] opacity-70 animate-pulse"
                style={{
                  backgroundImage:
                    "radial-gradient(320px 120px at 50% 52%, rgba(var(--ui-accent-rgb),0.55), rgba(0,0,0,0) 55%), radial-gradient(80% 40% at 50% 52%, rgba(var(--poster-accent-tl-rgb),0.18), rgba(0,0,0,0) 70%)",
                  mixBlendMode: "screen",
                  transition: "opacity 300ms ease",
                }}
              />
              <PlayerSelector
                onPlayerSelect={() => {}}
                iframeUrl={inlineIframeUrl ?? undefined}
                kpId={inlineKpId ?? undefined}
                videoContainerClassName="bg-zinc-900 rounded-[10px] overflow-hidden"
                videoContainerStyle={
                  overlayPosterHeight != null
                    ? { height: overlayPosterHeight }
                    : undefined
                }
              />
            </div>
          </div>
        </div>
      ) : null}
      <div
        ref={gridWrapRef}
        className={
          isArrowDesktopMode && watchOpen ? "hidden" : "relative w-full md:pr-8"
        }
        style={isKeyboardNav ? { pointerEvents: "none" } : undefined}
      >
        {showInlineInfo ? (
          <div
            key={String(selectedMovie!.id)}
            className={`relative transition-all duration-300 ${
              inlinePlayerOpen
                ? inlineClosing
                  ? "animate-out fade-out-0 zoom-out-95"
                  : ""
                : infoVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2"
            }`}
            style={gridHeight != null ? { minHeight: gridHeight } : undefined}
          >
            <div className="relative p-3 md:py-4 md:px-0 smoke-flash overflow-hidden">
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
                      try {
                        onInlineInfoOpenChange?.(false);
                      } catch {}
                    }, 200);
                  } else {
                    setInfoVisible(false);
                    setTimeout(() => {
                      setSelectedMovie(null);
                      setSelectedDetails(null);
                      setSelectedError(null);
                      setGridHeight(null);
                      setTileWidth(null);
                      try {
                        onInlineInfoOpenChange?.(false);
                      } catch {}
                    }, 200);
                  }
                }}
                className={`absolute right-2 top-2 z-20 inline-flex items-center justify-center w-8 h-8 text-white opacity-85 hover:opacity-100 transition-opacity duration-200`}
              >
                <IconX size={18} />
              </button>
              {isDesktop && (
                <>
                  {(() => {
                    const chunkItems = getChunkItems(page, subIndex);
                    const idx = selectedMovie
                      ? chunkItems.findIndex(
                          (m: any) => String(m.id) === String(selectedMovie.id)
                        )
                      : -1;
                    const canPrevInChunk = idx > 0;
                    const disablePrev =
                      !canPrevInChunk && page <= 1 && subIndex <= 0;
                    return (
                      <button
                        type="button"
                        onClick={handleInlinePrev}
                        disabled={disablePrev && !selectedLoading}
                        aria-label="Предыдущий фильм"
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center w-16 h-16 text-white opacity-70 hover:text-[rgba(var(--ui-accent-rgb),1)] hover:opacity-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <IconChevronLeft size={48} />
                      </button>
                    );
                  })()}
                  {(() => {
                    const chunkItems = getChunkItems(page, subIndex);
                    const idx = selectedMovie
                      ? chunkItems.findIndex(
                          (m: any) => String(m.id) === String(selectedMovie.id)
                        )
                      : -1;
                    const canNextInChunk =
                      idx >= 0 && idx < chunkItems.length - 1;
                    const disableNext =
                      !canNextInChunk &&
                      subIndex >= currChunkCount - 1 &&
                      (nextPageItemsLen === 0 ||
                        (nextPageItemsLen == null && lastPageEmpty));
                    return (
                      <button
                        type="button"
                        onClick={handleInlineNext}
                        disabled={disableNext && !selectedLoading}
                        aria-label="Следующий фильм"
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center w-16 h-16 text-white opacity-70 hover:text-[rgba(var(--ui-accent-rgb),1)] hover:opacity-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <IconChevronRight size={48} />
                      </button>
                    );
                  })()}
                </>
              )}
              <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch">
                <div className="hidden md:block">
                  <div
                    className="rounded-[10px] overflow-hidden bg-zinc-950 aspect-[2/3] relative group poster-card isolate transform-gpu"
                    style={
                      tileWidth != null
                        ? { width: Math.max(tileWidth, 280) }
                        : { width: 280 }
                    }
                  >
                    {selectedMovie!.intro_video ? (
                      <VideoPoster
                        src={selectedMovie!.intro_video}
                        poster={selectedMovie!.poster}
                        className="absolute inset-0 w-full h-full"
                      />
                    ) : selectedMovie!.poster &&
                      !errorImages.has(String(selectedMovie!.id)) ? (
                      <img
                        src={selectedMovie!.poster}
                        alt="Постер"
                        decoding="async"
                        loading="lazy"
                        fetchPriority="high"
                        className={`absolute inset-0 w-full h-full object-cover transition-all ease-out poster-media ${
                          loadedImages.has(String(selectedMovie!.id))
                            ? "opacity-100 blur-0 scale-100"
                            : "opacity-0 blur-md scale-[1.02]"
                        }`}
                        style={{
                          transition:
                            "opacity 300ms ease-out, filter 600ms ease-out, transform 600ms ease-out",
                          willChange: "opacity, filter, transform",
                        }}
                        onLoad={() => handleImageLoad(selectedMovie!.id)}
                        onError={() => handleImageError(selectedMovie!.id)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[10px]">
                        Нет постера
                      </div>
                    )}
                    {selectedMovie!.rating && (
                      <div
                        className={`absolute top-1 right-1 md:top-2 md:right-2 px-2 md:px-2 py-[3px] md:py-1 rounded-full text-[11px] md:text-[12px] text-white font-bold z-[12] ${ratingBgColor(
                          selectedMovie!.rating
                        )}`}
                      >
                        {formatRatingLabel(selectedMovie!.rating)}
                      </div>
                    )}
                    {selectedMovie!.quality && (
                      <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 px-2 md:px-2 py-[3px] md:py-1 rounded-sm text-[10px] md:text-[12px] bg-white text-black border border-white/70 z-[12] opacity-0 group-hover:opacity-100 transition-opacity">
                        {String(selectedMovie!.quality)}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className="min-w-0 flex-1 md:mx-0 mx-auto"
                  style={
                    isDesktop
                      ? undefined
                      : inlinePlayerOpen
                      ? { width: "100%" }
                      : {
                          width:
                            tileWidth != null
                              ? Math.max(tileWidth, 280)
                              : "calc((100% - 8px)/2)",
                        }
                  }
                >
                  {inlinePlayerOpen ? (
                    <div
                      className={`relative mt-1 z-[10] w-full md:mr-12 md:mx-0 mx-auto ${
                        inlineClosing
                          ? "animate-out fade-out-0 zoom-out-95"
                          : "animate-in fade-in-0 zoom-in-95"
                      }`}
                    >
                      {(() => {
                        const w =
                          tileWidth != null ? Math.max(tileWidth, 280) : 280;
                        const h = Math.round((w * 3) / 2);
                        return (
                          <PlayerSelector
                            onPlayerSelect={() => {}}
                            iframeUrl={
                              inlineIframeUrl ?? selectedIframeUrl ?? undefined
                            }
                            kpId={inlineKpId ?? selectedKpId ?? undefined}
                            videoContainerClassName="bg-zinc-900 rounded-[10px] overflow-hidden"
                            videoContainerStyle={{ height: h }}
                          />
                        );
                      })()}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {/* Название и Match */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            className="text-base md:text-lg font-bold text-zinc-100"
                            title={selectedMovie!.title || "Без названия"}
                          >
                            {selectedMovie!.title || "Без названия"}
                          </h3>
                          {(() => {
                            const rating =
                              (selectedDetails as any)?.rating_kp ??
                              (selectedDetails as any)?.rating ??
                              selectedMovie!.rating;
                            if (rating) {
                              const numRating = parseFloat(String(rating));
                              const matchPercent = Math.round(numRating * 10);

                              // Определяем цвет на основе рейтинга
                              const getMatchColor = (r: number) => {
                                if (r >= 8) return "text-green-400";
                                if (r >= 7) return "text-yellow-400";
                                if (r >= 6) return "text-orange-400";
                                return "text-red-400";
                              };

                              const color = getMatchColor(numRating);

                              return (
                                <span
                                  className={`text-[14px] md:text-[15px] font-bold ${color}`}
                                >
                                  {matchPercent}% Match
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        {/* Страна, Год, Возраст, Время */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[13px] md:text-[14px] text-zinc-400">
                          {(() => {
                            const d: any = selectedDetails || {};
                            const countryRaw =
                              d.country ?? selectedMovie!.country;
                            const country = Array.isArray(countryRaw)
                              ? countryRaw[0]
                              : typeof countryRaw === "string"
                              ? countryRaw.split(",")[0].trim()
                              : null;

                            const ov =
                              (overridesMap as any)[
                                String(selectedMovie!.id)
                              ] ?? null;
                            const year =
                              ov?.year ??
                              ov?.released ??
                              d.year ??
                              d.released ??
                              selectedMovie!.year;

                            const ageRating =
                              d.age_rating ??
                              d.ageRating ??
                              d.rating_mpaa ??
                              d.mpaa;

                            const duration =
                              d.duration ??
                              d.time ??
                              d.runtime ??
                              selectedMovie!.duration ??
                              selectedMovie!.time ??
                              selectedMovie!.runtime;
                            let durationStr = null;
                            if (duration) {
                              const durStr = String(duration);
                              let mins = 0;

                              if (durStr.includes(":")) {
                                const parts = durStr
                                  .split(":")
                                  .map((p) => parseInt(p));
                                if (parts.length >= 2) {
                                  mins = parts[0] * 60 + parts[1];
                                }
                              } else {
                                mins = parseInt(durStr);
                              }

                              if (!isNaN(mins) && mins > 0) {
                                if (mins <= 60) {
                                  durationStr = `${mins}мин`;
                                } else {
                                  const h = Math.floor(mins / 60);
                                  const m = mins % 60;
                                  durationStr =
                                    m > 0 ? `${h}ч ${m}мин` : `${h}ч`;
                                }
                              }
                            }

                            return (
                              <>
                                {country && <span>{country}</span>}
                                {year && <span>{String(year)}</span>}
                                {ageRating && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] md:text-[12px] font-semibold text-zinc-300 border border-zinc-600/60 bg-zinc-800/40">
                                    {String(ageRating)}
                                  </span>
                                )}
                                {durationStr && <span>{durationStr}</span>}
                              </>
                            );
                          })()}
                        </div>

                        {/* Жанры без фона */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[13px] md:text-[14px] text-zinc-400">
                          {(() => {
                            const d: any = selectedDetails || {};
                            const genreRaw = d.genre ?? selectedMovie!.genre;
                            const genres = Array.isArray(genreRaw)
                              ? genreRaw.slice(0, 3)
                              : typeof genreRaw === "string"
                              ? genreRaw
                                  .split(/[,/|]/)
                                  .map((g) => g.trim())
                                  .filter(Boolean)
                                  .slice(0, 3)
                              : [];

                            if (genres.length === 0) return null;

                            return genres.map((genre, i) => (
                              <span key={i}>{genre}</span>
                            ));
                          })()}
                        </div>
                      </div>
                      <div className="mt-3 text-[14px] md:text-[15px] text-zinc-300 leading-relaxed overflow-hidden text-left max-w-[280px] md:max-w-[85%] md:mx-0 mx-auto min-h-[72px] md:min-h-[90px]">
                        {selectedLoading ? (
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-[95%]" />
                            <Skeleton className="h-4 w-[80%]" />
                          </div>
                        ) : (
                          (() => {
                            const d: any = selectedDetails || {};
                            const ov =
                              (overridesMap as any)[String(selectedMovie.id)] ??
                              null;
                            const aboutRaw =
                              ov?.about ??
                              ov?.description ??
                              ov?.details?.about ??
                              ov?.details?.description ??
                              ov?.franchise?.about ??
                              ov?.franchise?.description ??
                              d.about ??
                              d.description;
                            const about = Array.isArray(aboutRaw)
                              ? aboutRaw.filter(Boolean).join(" ")
                              : String(aboutRaw || "").trim();
                            return about ? (
                              <p className="line-clamp-3 md:line-clamp-4">
                                {about}
                              </p>
                            ) : (
                              <div className="h-3" />
                            );
                          })()
                        )}
                      </div>
                      <div
                        className="mt-5 flex items-center gap-2 md:justify-start justify-center md:mx-0 mx-auto"
                        style={
                          isDesktop
                            ? undefined
                            : {
                                width:
                                  tileWidth != null
                                    ? Math.max(tileWidth, 280)
                                    : 280,
                              }
                        }
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setInlineKpId(selectedKpId);
                            setInlineIframeUrl(selectedIframeUrl);
                            setInlinePlayerOpen(true);
                            setPlayerVisible(true);
                          }}
                          className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-md text-[15px] font-semibold text-black bg-white hover:bg-white/90 transition-all duration-200"
                        >
                          <IconPlayerPlayFilled size={20} />
                          Смотреть
                        </button>
                        <Link
                          href={`/movie/${selectedMovie!.id}`}
                          onClick={() => {
                            NProgress.start();
                            if (resetOverridesOnNavigate) {
                              try {
                                onBackdropOverrideChange?.(null, null);
                              } catch {}
                              try {
                                onHeroInfoOverrideChange?.(null);
                              } catch {}
                            }
                            try {
                              const allLoadedMovies = pagesData
                                .sort((a, b) => a.page - b.page)
                                .flatMap((p) => extractMoviesFromData(p.data));
                              const ids = allLoadedMovies.map((m: any) =>
                                String(m.id)
                              );
                              const index = ids.indexOf(
                                String(selectedMovie!.id)
                              );
                              const ctx = {
                                origin: "grid",
                                ids,
                                index,
                                timestamp: Date.now(),
                                listUrl: url,
                                currentPage: page,
                                totalLoaded: allLoadedMovies.length,
                              };
                              localStorage.setItem(
                                "__navContext",
                                JSON.stringify(ctx)
                              );
                              const href = `${location.pathname}${location.search}`;
                              localStorage.setItem(
                                "__returnTo",
                                JSON.stringify({ href, timestamp: Date.now() })
                              );
                            } catch {}
                          }}
                          className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-md text-[15px] font-semibold text-white bg-zinc-600/80 hover:bg-zinc-600/60 transition-all duration-200"
                        >
                          <IconInfoCircle size={20} />
                          Подробнее
                        </Link>
                        {selectedError && (
                          <span className="text-[12px] text-red-400">
                            {selectedError}
                          </span>
                        )}
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
                className="hidden md:flex items-center justify-center absolute left-0 md:-translate-x-1/2 top-1/2 -translate-y-1/2 z-[20] md:w-9 md:h-9 lg:w-10 lg:h-10 xl:w-12 xl:h-12 rounded-full border border-white/70 bg-white text-black shadow-md hover:shadow-lg hover:bg-white/95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Предыдущая страница"
              >
                <IconChevronLeft className="w-5 h-5 md:w-4 md:h-4 lg:w-5 lg:h-5 xl:w-7 xl:h-7" />
              </button>
            )}
            <div
              className={
                "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 gap-2"
              }
            >
              {virtualizationEnabled && rowHeight && vTopPad > 0 ? (
                <div style={{ height: vTopPad, gridColumn: "1 / -1" }} />
              ) : null}
              {(virtualizationEnabled && rowHeight
                ? finalDisplay.slice(vVirtStart, vVirtEnd)
                : finalDisplay
              ).map((movie: any, index: number) => (
                <div
                  key={movie.id || index}
                  data-grid-item
                  tabIndex={0}
                  className={`group block bg-transparent hover:bg-transparent outline-none ${hoverOutlineClass} transition-all duration-200 cursor-pointer overflow-hidden rounded-sm`}
                  onMouseMove={(e) => {
                    // Removed glow effect logic
                  }}
                  onMouseLeave={(e) => {
                    // Removed glow effect logic
                  }}
                  onTouchStart={(e) => {
                    touchStartRef.current = {
                      x: e.touches[0].clientX,
                      y: e.touches[0].clientY,
                    };
                  }}
                  onTouchEnd={(e) => {
                    if (!touchStartRef.current) return;
                    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
                    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
                    touchStartRef.current = null;

                    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
                      if (!isDesktop) {
                        e.preventDefault(); // Prevent click event
                        setDrawerMovie(movie);
                        requestAnimationFrame(() => {
                          setDrawerOpen(true);
                        });
                      }
                    }
                  }}
                  onClick={(e) => {
                    if (!isDesktop) {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    if (navigateOnClick || isLoadMoreMode) {
                      if (resetOverridesOnNavigate) {
                        try {
                          onBackdropOverrideChange?.(null, null);
                        } catch {}
                        try {
                          onHeroInfoOverrideChange?.(null);
                        } catch {}
                      }
                      try {
                        const allLoadedMovies = pagesData
                          .sort((a, b) => a.page - b.page)
                          .flatMap((p) => extractMoviesFromData(p.data));
                        const ids = allLoadedMovies.map((m: any) =>
                          String(m.id)
                        );
                        const index = ids.indexOf(String(movie.id));
                        const ctx = {
                          origin: "grid",
                          ids,
                          index,
                          timestamp: Date.now(),
                          listUrl: url,
                          currentPage: page,
                          totalLoaded: allLoadedMovies.length,
                        };
                        localStorage.setItem(
                          "__navContext",
                          JSON.stringify(ctx)
                        );
                        const href = `${location.pathname}${location.search}`;
                        localStorage.setItem(
                          "__returnTo",
                          JSON.stringify({ href, timestamp: Date.now() })
                        );
                      } catch {}
                      NProgress.start();
                      router.push(`/movie/${movie.id}`);
                      return;
                    }
                    const posterEl = e.currentTarget.querySelector(
                      ".aspect-\\[2\\/3\\]"
                    ) as HTMLElement;
                    if (posterEl && movie.poster) {
                      const rect = posterEl.getBoundingClientRect();
                      posterContextRef.current = {
                        rect,
                        posterUrl: movie.poster,
                      };
                      try {
                        if (!isDesktop && rect && rect.width) {
                          setTileWidth(Math.round(rect.width));
                        }
                      } catch {}
                    } else {
                      posterContextRef.current = null;
                    }
                    if (
                      selectedMovie &&
                      String(selectedMovie.id) === String(movie.id)
                    ) {
                      setInfoVisible(false);
                      setTimeout(() => {
                        setSelectedMovie(null);
                        setSelectedDetails(null);
                        setSelectedError(null);
                        setGridHeight(null);
                        setTileWidth(null);
                        try {
                          onInlineInfoOpenChange?.(false);
                        } catch {}
                      }, 200);
                      return;
                    }
                    setGridHeight(
                      gridWrapRef.current
                        ? gridWrapRef.current.offsetHeight
                        : null
                    );
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
                    try {
                      onInlineInfoOpenChange?.(true);
                    } catch {}
                    setInfoVisible(false);
                    if (typeof window !== "undefined") {
                      requestAnimationFrame(() => setInfoVisible(true));
                    } else {
                      setInfoVisible(true);
                    }
                  }}
                >
                  <div className="aspect-[2/3] bg-zinc-950 flex items-center justify-center relative overflow-hidden rounded-[10px] poster-card isolate transform-gpu">
                    {(() => {
                      const idStr = String(movie.id);
                      const ovEntry = (overridesMap as any)[idStr];
                      const known = ovEntry !== undefined;
                      const posterSrc = known
                        ? ovEntry?.poster ?? movie.poster ?? null
                        : null;
                      const hasVideo = !!movie.intro_video;
                      const waiting = !known;
                      if (hasVideo) {
                        if (waiting) {
                          return isLoadMoreMode ? (
                            <a
                              href={`/movie/${movie.id}`}
                              className="block absolute inset-0"
                              onClick={(e) => {
                                if (
                                  e.button === 0 &&
                                  !(
                                    e.metaKey ||
                                    e.ctrlKey ||
                                    e.shiftKey ||
                                    e.altKey
                                  )
                                ) {
                                  e.preventDefault();
                                }
                                try {
                                  const allLoadedMovies = pagesData
                                    .sort((a, b) => a.page - b.page)
                                    .flatMap((p) =>
                                      extractMoviesFromData(p.data)
                                    );
                                  const ids = allLoadedMovies.map((m: any) =>
                                    String(m.id)
                                  );
                                  const index = ids.indexOf(String(movie.id));
                                  const ctx = {
                                    origin: "grid",
                                    ids,
                                    index,
                                    timestamp: Date.now(),
                                    listUrl: url,
                                    currentPage: page,
                                    totalLoaded: allLoadedMovies.length,
                                  };
                                  localStorage.setItem(
                                    "__navContext",
                                    JSON.stringify(ctx)
                                  );
                                  const href = `${location.pathname}${location.search}`;
                                  localStorage.setItem(
                                    "__returnTo",
                                    JSON.stringify({
                                      href,
                                      timestamp: Date.now(),
                                    })
                                  );
                                } catch {}
                              }}
                            >
                              <Skeleton className="absolute inset-0 w-full h-full" />
                            </a>
                          ) : (
                            <Skeleton className="absolute inset-0 w-full h-full" />
                          );
                        }
                        return isLoadMoreMode ? (
                          <a
                            href={`/movie/${movie.id}`}
                            className="block absolute inset-0"
                            onClick={(e) => {
                              if (
                                e.button === 0 &&
                                !(
                                  e.metaKey ||
                                  e.ctrlKey ||
                                  e.shiftKey ||
                                  e.altKey
                                )
                              ) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <VideoPoster
                              src={movie.intro_video}
                              poster={posterSrc || undefined}
                              className="absolute inset-0 w-full h-full rounded-[10px]"
                              onPosterLoad={() => handleImageLoad(movie.id)}
                            />
                          </a>
                        ) : (
                          <VideoPoster
                            src={movie.intro_video}
                            poster={posterSrc || undefined}
                            className="absolute inset-0 w-full h-full rounded-[10px]"
                            onPosterLoad={() => handleImageLoad(movie.id)}
                          />
                        );
                      }
                      if (posterSrc && !errorImages.has(String(movie.id))) {
                        const eager =
                          (virtualizationEnabled && rowHeight
                            ? vVirtStart + index
                            : index) < effectiveCols;
                        const isLoaded = loadedImages.has(String(movie.id));
                        const cls = `absolute inset-0 w-full h-full object-cover rounded-[10px] transition-all ease-out poster-media ${
                          isLoaded
                            ? "opacity-100 blur-0 scale-100"
                            : "opacity-0 blur-md scale-[1.02]"
                        }`;
                        const style = {
                          transition:
                            "opacity 300ms ease-out, filter 600ms ease-out, transform 600ms ease-out",
                          willChange: "opacity, filter, transform",
                        } as const;

                        const content = (
                          <img
                            src={posterSrc || "/placeholder.svg"}
                            alt={movie.title || "Постер"}
                            decoding="async"
                            loading={eager ? "eager" : "lazy"}
                            fetchPriority={eager ? "high" : "low"}
                            className={cls}
                            style={style}
                            onLoad={() => handleImageLoad(movie.id)}
                            onError={() => handleImageError(movie.id)}
                          />
                        );

                        return (
                          <>
                            {!isLoaded && (
                              <Skeleton className="absolute inset-0 w-full h-full rounded-[10px]" />
                            )}
                            {isLoadMoreMode ? (
                              <a
                                href={`/movie/${movie.id}`}
                                className="block absolute inset-0"
                                onClick={(e) => {
                                  if (
                                    e.button === 0 &&
                                    !(
                                      e.metaKey ||
                                      e.ctrlKey ||
                                      e.shiftKey ||
                                      e.altKey
                                    )
                                  ) {
                                    e.preventDefault();
                                  }
                                }}
                              >
                                {content}
                              </a>
                            ) : (
                              content
                            )}
                          </>
                        );
                      }
                      if (waiting) {
                        return isLoadMoreMode ? (
                          <a
                            href={`/movie/${movie.id}`}
                            className="block"
                            onClick={() => {
                              try {
                                const allLoadedMovies = pagesData
                                  .sort((a, b) => a.page - b.page)
                                  .flatMap((p) =>
                                    extractMoviesFromData(p.data)
                                  );
                                const ids = allLoadedMovies.map((m: any) =>
                                  String(m.id)
                                );
                                const index = ids.indexOf(String(movie.id));
                                const ctx = {
                                  origin: "grid",
                                  ids,
                                  index,
                                  timestamp: Date.now(),
                                  listUrl: url,
                                  currentPage: page,
                                  totalLoaded: allLoadedMovies.length,
                                };
                                localStorage.setItem(
                                  "__navContext",
                                  JSON.stringify(ctx)
                                );
                              } catch {}
                            }}
                          >
                            <Skeleton className="absolute inset-0 w-full h-full" />
                          </a>
                        ) : (
                          <Skeleton className="absolute inset-0 w-full h-full" />
                        );
                      }
                      return isLoadMoreMode ? (
                        <a
                          href={`/movie/${movie.id}`}
                          className="block"
                          onClick={() => {
                            try {
                              const allLoadedMovies = pagesData
                                .sort((a, b) => a.page - b.page)
                                .flatMap((p) => extractMoviesFromData(p.data));
                              const ids = allLoadedMovies.map((m: any) =>
                                String(m.id)
                              );
                              const index = ids.indexOf(String(movie.id));
                              const ctx = {
                                origin: "grid",
                                ids,
                                index,
                                timestamp: Date.now(),
                                listUrl: url,
                                currentPage: page,
                                totalLoaded: allLoadedMovies.length,
                              };
                              localStorage.setItem(
                                "__navContext",
                                JSON.stringify(ctx)
                              );
                              const href = `${location.pathname}${location.search}`;
                              localStorage.setItem(
                                "__returnTo",
                                JSON.stringify({ href, timestamp: Date.now() })
                              );
                            } catch {}
                          }}
                        >
                          <div className="text-zinc-600 text-[10px] text-center p-1">
                            Нет постера
                          </div>
                        </a>
                      ) : (
                        <div className="text-zinc-600 text-[10px] text-center p-1">
                          Нет постера
                        </div>
                      );
                    })()}
                    {(() => {
                      const idStr = String(movie.id);
                      const ovEntry = (overridesMap as any)[idStr];
                      const known = ovEntry !== undefined;
                      const posterSrc = known
                        ? ovEntry?.poster ?? movie.poster ?? null
                        : null;
                      return (posterSrc || movie.intro_video) &&
                        loadedImages.has(String(movie.id)) ? (
                        <div
                          className={`pointer-events-none absolute inset-0 z-10 opacity-0 ${
                            isKeyboardNav
                              ? ""
                              : "" // removed hover glow
                          } transition-opacity duration-300`}
                        />
                      ) : null;
                    })()}
                    {loadedImages.has(String(movie.id)) && (
                      <div
                        className={`pointer-events-none absolute inset-0 z-10 opacity-0 ${
                          isKeyboardNav
                            ? ""
                            : "" // removed hover glow
                        } transition-opacity duration-300`}
                      />
                    )}
                    {!movie.isViewAll && isWatched(String(movie.id)) && (
                      <div className="absolute inset-0 bg-black/60 z-[13] pointer-events-none transition-opacity duration-300" />
                    )}
                    {!movie.isViewAll && movie.id && (
                      <>
                        <button
                          type="button"
                          aria-pressed={isFavorite(String(movie.id))}
                          aria-label={
                            isFavorite(String(movie.id))
                              ? "Убрать из избранного"
                              : "Добавить в избранное"
                          }
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClickCapture={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const ne = e.nativeEvent as any;
                            ne?.stopImmediatePropagation?.();
                            toggleFavorite({
                              id: String(movie.id),
                              title: movie.title,
                              poster: movie.poster,
                              backdrop: movie.backdrop,
                              year: movie.year,
                              rating: movie.rating,
                              country: (movie as any).country,
                              genre: movie.genre,
                              description: (movie as any).description,
                              duration: (movie as any).duration,
                              logo: (movie as any).logo,
                              poster_colors: (movie as any).poster_colors,
                              type: (movie as any).type ?? null,
                            });
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className={`absolute top-1 left-1 md:top-2 md:left-2 z-[14] rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70 transition-transform active:scale-95 ${
                            isRestrictedBadgesRoute
                              ? "md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100 transition-opacity duration-200"
                              : ""
                          }`}
                        >
                          <svg
                            className="w-7 h-11 md:w-8 md:h-12 drop-shadow-sm"
                            width="32"
                            height="46"
                            viewBox="0 0 24 34"
                            xmlns="http://www.w3.org/2000/svg"
                            role="presentation"
                          >
                            <polygon
                              className="ipc-watchlist-ribbon__bg-ribbon"
                              fill={
                                isFavorite(String(movie.id))
                                  ? "#f97316"
                                  : "#000000"
                              }
                              fillOpacity={0.9}
                              points="24 0 0 0 0 32 12.2436611 26.2926049 24 31.7728343"
                            ></polygon>
                            <polygon
                              className="ipc-watchlist-ribbon__bg-hover"
                              fill={
                                isFavorite(String(movie.id))
                                  ? "rgba(249,115,22,0.2)"
                                  : "rgba(255,255,255,0.22)"
                              }
                              points="24 0 0 0 0 32 12.2436611 26.2926049 24 31.7728343"
                            ></polygon>
                            <polygon
                              className="ipc-watchlist-ribbon__bg-shadow"
                              fill="rgba(0,0,0,0.45)"
                              points="24 31.7728343 24 33.7728343 12.2436611 28.2926049 0 34 0 32 12.2436611 26.2926049"
                            ></polygon>
                            <g transform="translate(12 15) scale(0.7) translate(-12 -12)">
                              {isFavorite(String(movie.id)) ? (
                                <path
                                  d="M20.285 6.709 18.871 5.295 9 15.166 5.129 11.295 3.715 12.709 9 18 20.285 6.709Z"
                                  fill="white"
                                  fillOpacity={0.95}
                                />
                              ) : (
                                <path
                                  d="M18 13h-5v5c0 .55-.45 1-1 1s-1-.45-1-1v-5H6c-.55 0-1-.45-1-1s.45-1 1-1h5V6c0-.55.45-1 1-1s1 .45 1 1v5h5c.55 0 1 .45 1 1s-.45 1-1 1z"
                                  fill="white"
                                  fillOpacity={0.95}
                                />
                              )}
                            </g>
                          </svg>
                        </button>
                        <button
                          type="button"
                          aria-pressed={isWatched(String(movie.id))}
                          aria-label={
                            isWatched(String(movie.id))
                              ? "Убрать из просмотренного"
                              : "Добавить в просмотренное"
                          }
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClickCapture={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const ne = e.nativeEvent as any;
                            ne?.stopImmediatePropagation?.();
                            toggleWatched({
                              id: String(movie.id),
                              title: movie.title,
                              poster: movie.poster,
                              backdrop: movie.backdrop,
                              year: movie.year,
                              rating: movie.rating,
                              country: (movie as any).country,
                              genre: movie.genre,
                              description: (movie as any).description,
                              duration: (movie as any).duration,
                              logo: (movie as any).logo,
                              poster_colors: (movie as any).poster_colors,
                              type: (movie as any).type ?? null,
                            });
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className={`absolute top-1 left-9 md:top-2 md:left-12 z-[14] rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70 transition-transform active:scale-95 ${
                            isRestrictedBadgesRoute
                              ? "md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100 transition-opacity duration-200"
                              : ""
                          }`}
                        >
                          <svg
                            className="w-7 h-11 md:w-8 md:h-12 drop-shadow-sm"
                            width="32"
                            height="46"
                            viewBox="0 0 24 34"
                            xmlns="http://www.w3.org/2000/svg"
                            role="presentation"
                          >
                            <polygon
                              className="ipc-watchlist-ribbon__bg-ribbon"
                              fill={
                                isWatched(String(movie.id))
                                  ? "#3b82f6"
                                  : "#000000"
                              }
                              fillOpacity={0.9}
                              points="24 0 0 0 0 32 12.2436611 26.2926049 24 31.7728343"
                            ></polygon>
                            <polygon
                              className="ipc-watchlist-ribbon__bg-hover"
                              fill={
                                isWatched(String(movie.id))
                                  ? "rgba(59,130,246,0.2)"
                                  : "rgba(255,255,255,0.22)"
                              }
                              points="24 0 0 0 0 32 12.2436611 26.2926049 24 31.7728343"
                            ></polygon>
                            <polygon
                              className="ipc-watchlist-ribbon__bg-shadow"
                              fill="rgba(0,0,0,0.45)"
                              points="24 31.7728343 24 33.7728343 12.2436611 28.2926049 0 34 0 32 12.2436611 26.2926049"
                            ></polygon>
                            <g transform="translate(12 14) scale(0.65) translate(-12 -12)">
                              <Eye
                                size={24}
                                color="white"
                                fill={
                                  isWatched(String(movie.id)) ? "white" : "none"
                                }
                                fillOpacity={isWatched(String(movie.id)) ? 0.3 : 0}
                                strokeWidth={2}
                              />
                            </g>
                          </svg>
                        </button>
                      </>
                    )}
                    {(() => {
                      const rawTags = (movie as any)?.tags;
                      let tagLabel: string | null = null;
                      if (Array.isArray(rawTags)) {
                        tagLabel =
                          rawTags
                            .map((v) => String(v || "").trim())
                            .find((v) => v.length > 0) || null;
                      } else if (typeof rawTags === "string") {
                        tagLabel =
                          rawTags
                            .split(/[,/|]/)
                            .map((p) => p.trim())
                            .find((p) => p.length > 0) || null;
                      }

                      return movie.rating || movie.quality || tagLabel ? (
                        <div className="absolute top-1 right-1 md:top-2 md:right-2 flex flex-col items-end gap-1 z-[12]">
                          {movie.rating && (
                            <div
                              className={`px-2 md:px-2 py-[3px] md:py-0.5 rounded-full md:rounded-md text-[11px] md:text-[13px] text-white font-bold ${ratingBgColor(
                                movie.rating
                              )} md:shadow-[0_4px_12px_rgba(0,0,0,0.5)] md:font-black tracking-normal md:border md:border-white/10`}
                            >
                              {formatRatingLabel(movie.rating)}
                            </div>
                          )}
                          {movie.quality && (
                            <div
                              className={`px-2 md:px-2 py-[3px] md:py-1 rounded-full text-[10px] md:text-[12px] bg-white text-black border border-white/70 shadow-[0_4px_12px_rgba(0,0,0,0.35)] font-black tracking-tight ${
                                isRestrictedBadgesRoute
                                  ? "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200"
                                  : ""
                              }`}
                            >
                              {String(movie.quality)}
                            </div>
                          )}
                          {tagLabel && (
                            <div
                              className={`px-2 md:px-2 py-[3px] md:py-1 rounded-md text-[10px] md:text-[12px] bg-white text-black font-black tracking-tight border border-white/70 shadow-[0_4px_12px_rgba(0,0,0,0.35)] ${
                                isRestrictedBadgesRoute
                                  ? "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200"
                                  : ""
                              }`}
                            >
                              {tagLabel}
                            </div>
                          )}
                        </div>
                      ) : null;
                    })()}
                    <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 hidden md:flex flex-col items-start gap-1 z-[12] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200 pointer-events-none">
                      {movie.age != null && (
                        <div className="px-2 md:px-2 py-[3px] md:py-1 rounded-md text-[10px] md:text-[12px] bg-white text-black border border-white/70 shadow-[0_4px_12px_rgba(0,0,0,0.35)] font-black tracking-tight">
                          {String(movie.age).replace(/\D/g, "")}+
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Под постером оставляем текст (название, год, 1 жанр) с анимацией частиц */}
                  <div className="relative p-2 md:p-3 min-h-[48px] md:min-h-[56px] overflow-hidden text-left md:text-left">
                    <div className="relative z-[2] text-left md:text-left">
                      <h3
                        className="text-[13px] md:text-[14px] font-bold truncate mb-1 leading-tight text-zinc-300/80 transition-colors duration-200 group-hover:text-zinc-100 group-focus-visible:text-zinc-100 text-left md:text-left"
                        title={movie.title || "Без названия"}
                      >
                        {movie.title || "Без названия"}
                      </h3>
                      {(() => {
                        const year = movie.year ? String(movie.year) : null;
                        const quality = movie.quality
                          ? String(movie.quality)
                          : null;
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
                        if (!year && !quality && tagsArr.length === 0)
                          return null;
                        return (
                          <div className="flex items-center gap-2 justify-start md:justify-start text-[10px] md:text-[12px] text-zinc-400/70 transition-colors duration-200 group-hover:text-zinc-300 group-focus-visible:text-zinc-300">
                            {year && <span>{year}</span>}
                            {year && (quality || tagsArr.length > 0) && (
                              <span className="text-zinc-500/60">•</span>
                            )}
                            {quality && <span>{quality}</span>}
                            {quality && tagsArr.length > 0 && (
                              <span className="text-zinc-500/60">•</span>
                            )}
                            {tagsArr.length > 0 && (
                              <span className="truncate max-w-[70%]">
                                {tagsArr.join(" • ")}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))}
              {virtualizationEnabled && rowHeight && vBottomPad > 0 ? (
                <div style={{ height: vBottomPad, gridColumn: "1 / -1" }} />
              ) : null}
            </div>
            {isArrowDesktopMode && (
              <button
                onClick={handleNextArrow}
                disabled={
                  subIndex >= currChunkCount - 1 &&
                  (nextPageItemsLen === 0 ||
                    (nextPageItemsLen == null && lastPageEmpty))
                }
                className="hidden md:flex items-center justify-center absolute right-0 md:translate-x-1/2 top-1/2 -translate-y-1/2 z-[20] md:w-9 md:h-9 lg:w-10 lg:h-10 xl:w-12 xl:h-12 rounded-full border border-white/70 bg-white text-black shadow-md hover:shadow-lg hover:bg-white/95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Следующая страница"
              >
                <IconChevronRight className="w-5 h-5 md:w-4 md:h-4 lg:w-5 lg:h-5 xl:w-7 xl:h-7" />
              </button>
            )}
          </>
        )}
      </div>

      {!showInlineInfo &&
        !navigateOnClick &&
        selectedMovie &&
        (!isArrowDesktopMode || !watchOpen) && (
          <div
            key={String(selectedMovie.id)}
            className={`relative mt-3 md:mt-4 transition-all duration-300 ${
              infoVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-2"
            }`}
          >
            <div className="relative p-3 md:p-4 smoke-flash overflow-hidden">
              {isDesktop && (
                <>
                  {(() => {
                    const chunkItems = getChunkItems(page, subIndex);
                    const idx = selectedMovie
                      ? chunkItems.findIndex(
                          (m: any) => String(m.id) === String(selectedMovie.id)
                        )
                      : -1;
                    const canPrevInChunk = idx > 0;
                    const disablePrev =
                      !canPrevInChunk && page <= 1 && subIndex <= 0;
                    return (
                      <button
                        type="button"
                        onClick={handleInlinePrev}
                        disabled={disablePrev}
                        aria-label="Предыдущий фильм"
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center w-16 h-16 text-white opacity-70 hover:text-[rgba(var(--ui-accent-rgb),1)] hover:opacity-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <IconChevronLeft size={48} />
                      </button>
                    );
                  })()}
                  {(() => {
                    const chunkItems = getChunkItems(page, subIndex);
                    const idx = selectedMovie
                      ? chunkItems.findIndex(
                          (m: any) => String(m.id) === String(selectedMovie.id)
                        )
                      : -1;
                    const canNextInChunk =
                      idx >= 0 && idx < chunkItems.length - 1;
                    const disableNext =
                      !canNextInChunk &&
                      subIndex >= currChunkCount - 1 &&
                      (nextPageItemsLen === 0 ||
                        (nextPageItemsLen == null && lastPageEmpty));
                    return (
                      <button
                        type="button"
                        onClick={handleInlineNext}
                        disabled={disableNext}
                        aria-label="Следующий фильм"
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center w-16 h-16 text-white opacity-70 hover:text-[rgba(var(--ui-accent-rgb),1)] hover:opacity-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <IconChevronRight size={48} />
                      </button>
                    );
                  })()}
                </>
              )}
              <div className="grid md:grid-cols-[minmax(160px,240px)_1fr] grid-cols-1 gap-3 md:gap-4 items-stretch">
                <div className="hidden md:block">
                  {selectedMovie.intro_video ? (
                    <div className="rounded-[10px] overflow-hidden bg-zinc-900 aspect-[2/3] relative">
                      <VideoPoster
                        src={selectedMovie.intro_video}
                        poster={selectedMovie.poster}
                        className="absolute inset-0 w-full h-full"
                      />
                    </div>
                  ) : selectedMovie.poster ? (
                    <div className="rounded-[10px] overflow-hidden bg-zinc-900 aspect-[2/3] relative">
                      {selectedMovie.poster &&
                      !errorImages.has(String(selectedMovie.id)) ? (
                        <img
                          src={selectedMovie.poster}
                          alt="Постер"
                          decoding="async"
                          loading="lazy"
                          fetchPriority="high"
                          className={`absolute inset-0 w-full h-full object-cover transition-all ease-out poster-media ${
                            loadedImages.has(String(selectedMovie.id))
                              ? "opacity-100 blur-0 scale-100"
                              : "opacity-0 blur-md scale-[1.02]"
                          }`}
                          style={{
                            transition:
                              "opacity 300ms ease-out, filter 600ms ease-out, transform 600ms ease-out",
                            willChange: "opacity, filter, transform",
                          }}
                          onLoad={() => handleImageLoad(selectedMovie.id)}
                          onError={() => handleImageError(selectedMovie.id)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[10px]">
                          Нет постера
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
                <div
                  className="min-w-0 md:mx-0 mx-auto"
                  style={
                    tileWidth != null
                      ? { width: Math.max(tileWidth, 280) }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2">
                    <h3
                      className="text-sm md:text-base font-semibold text-zinc-100 truncate"
                      title={selectedMovie.title || "Без названия"}
                    >
                      {selectedMovie.title || "Без названия"}
                    </h3>
                    {(() => {
                      const rating =
                        (selectedDetails as any)?.rating_kp ??
                        (selectedDetails as any)?.rating ??
                        selectedMovie.rating;
                      return rating ? (
                        <span
                          className={`px-2 py-[3px] rounded-full text-[11px] md:text-[12px] text-white font-bold ${ratingBgColor(
                            rating
                          )}`}
                        >
                          {formatRatingLabel(rating)}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <div className="mt-1 text-[12px] md:text-[13px] text-zinc-400">
                    {(() => {
                      const d: any = selectedDetails || {};
                      const ov =
                        (overridesMap as any)[String(selectedMovie.id)] ?? null;
                      const year =
                        ov?.year ??
                        ov?.released ??
                        ov?.release_year ??
                        ov?.releaseYear ??
                        ov?.details?.year ??
                        ov?.details?.released ??
                        ov?.details?.release_year ??
                        ov?.details?.releaseYear ??
                        d.year ??
                        d.released ??
                        d.release_year ??
                        d.releaseYear ??
                        selectedMovie.year;
                      const countryRaw = d.country ?? selectedMovie.country;
                      const quality = d.quality ?? selectedMovie.quality;
                      const parts: string[] = [];
                      if (year) parts.push(String(year));
                      if (quality) parts.push(String(quality));
                      if (countryRaw) {
                        const arr = Array.isArray(countryRaw)
                          ? countryRaw
                          : String(countryRaw)
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean);
                        if (arr.length > 0) parts.push(arr.join(" "));
                      }
                      return parts.length > 0 ? (
                        <div className="flex items-center gap-2">
                          {parts.map((p, i) => (
                            <span key={i} className="truncate">
                              {p}
                            </span>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <div className="mt-2 text-[12px] md:text-[13px] text-zinc-300/90 min-h-[66px] md:min-h-[84px]">
                    {selectedLoading ? (
                      <div>
                        <Skeleton className="h-3 w-full md:w-[92%] mb-2" />
                        <Skeleton className="h-3 w-full md:w-[88%] mb-2" />
                        <Skeleton className="h-3 w-full md:w-[72%]" />
                      </div>
                    ) : (
                      (() => {
                        const d: any = selectedDetails || {};
                        const ov =
                          (overridesMap as any)[String(selectedMovie.id)] ??
                          null;
                        const aboutRaw =
                          ov?.about ??
                          ov?.description ??
                          ov?.details?.about ??
                          ov?.details?.description ??
                          ov?.franchise?.about ??
                          ov?.franchise?.description ??
                          d.about ??
                          d.description;
                        const about = Array.isArray(aboutRaw)
                          ? aboutRaw.filter(Boolean).join(" ")
                          : String(aboutRaw || "").trim();
                        return about ? (
                          <p className="line-clamp-3 md:line-clamp-4">
                            {about}
                          </p>
                        ) : (
                          <div className="h-3" />
                        );
                      })()
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      disabled
                      aria-disabled
                      className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-md text-[15px] font-semibold text-black/50 bg-white/50 cursor-not-allowed"
                    >
                      <IconPlayerPlayFilled size={20} />
                      Смотреть
                    </button>
                    <Link
                      href={`/movie/${selectedMovie.id}`}
                      onClick={() => {
                        NProgress.start();
                        try {
                          onBackdropOverrideChange?.(null, null);
                        } catch {}
                        try {
                          onHeroInfoOverrideChange?.(null);
                        } catch {}
                        const allLoadedMovies = pagesData
                          .sort((a, b) => a.page - b.page)
                          .flatMap((p) => extractMoviesFromData(p.data));
                        const ids = allLoadedMovies.map((m: any) =>
                          String(m.id)
                        );
                        const index = ids.indexOf(String(selectedMovie.id));
                        const ctx = {
                          origin: "grid",
                          ids,
                          index,
                          timestamp: Date.now(),
                          listUrl: url,
                          currentPage: page,
                          totalLoaded: allLoadedMovies.length,
                        };
                        localStorage.setItem(
                          "__navContext",
                          JSON.stringify(ctx)
                        );
                        const href = `${location.pathname}${location.search}`;
                        localStorage.setItem(
                          "__returnTo",
                          JSON.stringify({ href, timestamp: Date.now() })
                        );
                      }}
                      className="inline-flex items-center justify-center gap-2 h-10 px-6 rounded-md text-[15px] font-semibold text-white bg-zinc-600/80 hover:bg-zinc-600/60 transition-all duration-200"
                    >
                      <IconInfoCircle size={20} />
                      Подробнее
                    </Link>

                    {selectedError && (
                      <span className="text-[12px] text-red-400">
                        {selectedError}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {viewMode === "loadmore" && (
        <div ref={loadMoreSentinelRef} className="h-[1px]" />
      )}

      {showLoadMoreButton && (
        <div className="flex justify-center mt-6 pb-12 md:pb-0">
          {isLoading || loadingMore ? (
            // Анимированные синие три точки без обрамления (увеличенный размер)
            <Loader size="lg" />
          ) : (
            <button
              onClick={handleLoadMore}
              className="px-8 py-3 text-sm font-bold text-zinc-950 bg-gradient-to-r from-blue-400 to-cyan-300 rounded-full shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all duration-300"
            >
              Загрузить ещё
            </button>
          )}
        </div>
      )}

      {showEscHint &&
        isLargeDesktop &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all duration-300 animate-in fade-in duration-300 cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              // Не закрываем по клику на фон, только по кнопке
            }}
          >
            <div
              className="relative bg-zinc-900/90 border border-zinc-700/50 rounded-xl p-8 max-w-2xl text-center shadow-2xl transform scale-100"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowEscHint(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
              >
                <IconX size={24} />
              </button>
              <div className="flex flex-col items-center gap-6">
                <div className="text-2xl font-bold text-white">Навигация</div>
                <div className="flex items-center gap-4 text-lg text-zinc-300">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-2">
                      <kbd className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-600 font-bold text-white text-xl min-w-[48px] text-center">
                        ←
                      </kbd>
                      <kbd className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-600 font-bold text-white text-xl min-w-[48px] text-center">
                        →
                      </kbd>
                    </div>
                    <span className="text-sm opacity-70">Переключение</span>
                  </div>
                  <div className="h-12 w-px bg-zinc-700 mx-4"></div>
                  <div className="flex flex-col items-center gap-2">
                    <kbd className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-600 font-bold text-white text-xl">
                      ESC
                    </kbd>
                    <span className="text-sm opacity-70">Закрыть</span>
                  </div>
                </div>
                <p className="text-zinc-400 max-w-md">
                  Используйте стрелки на клавиатуре для быстрого переключения
                  между фильмами, а ESC для закрытия окна.
                </p>
                <button
                  onClick={() => setShowEscHint(false)}
                  className="mt-4 px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
                >
                  Понятно
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[85vh]">
          <DrawerHeader className="text-center">
            {drawerMovie && (overridesMap[String(drawerMovie.id)]?.logo || drawerMovie.logo) ? (
              <div className="flex justify-center mb-2">
                <img
                  src={overridesMap[String(drawerMovie.id)]?.logo || drawerMovie.logo}
                  alt={drawerMovie.title}
                  className="h-12 object-contain"
                />
              </div>
            ) : (
              <DrawerTitle className="text-2xl font-bold text-white">
                {drawerMovie?.title}
              </DrawerTitle>
            )}
            <div className="flex gap-2 text-xs text-zinc-400 mt-1 justify-center">
              {drawerMovie?.year && <span>{drawerMovie.year}</span>}
              {drawerMovie?.country && (
                <span>
                  {Array.isArray(drawerMovie.country)
                    ? drawerMovie.country[0]
                    : drawerMovie.country}
                </span>
              )}
              {drawerMovie?.rating && (
                <span
                  className={`px-1.5 py-0.5 rounded ${ratingBgColor(
                    Number(drawerMovie.rating)
                  )} text-white text-[10px] font-bold`}
                >
                  {formatRatingLabel(drawerMovie.rating)}
                </span>
              )}
            </div>
          </DrawerHeader>
          <div className="p-4 overflow-y-auto">
            <div className="flex flex-col gap-4">
              <div className="text-sm text-zinc-300 leading-relaxed">
                {drawerMovie?.description || "Описание отсутствует"}
              </div>

              <Link
                href={`/movie/${drawerMovie?.id}`}
                className="w-full bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
                onClick={() => setDrawerOpen(false)}
              >
                <IconPlayerPlayFilled size={20} />
                Смотреть
              </Link>
            </div>
          </div>
          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button
                variant="outline"
                className="w-full bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                Закрыть
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

export default MovieGrid;
