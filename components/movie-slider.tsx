"use client";
import useSWR from "swr";
import Link from "next/link";
import NProgress from "nprogress";
import { ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRef, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import movieOverrides from "@/data/overrides/movies.json";
import { useFavorites } from "@/hooks/use-favorites";

type MovieSliderProps = {
  url: string;
  title?: React.ReactNode;
  viewAllHref?: string;
  viewAllLabel?: string;
  viewAllInHeader?: boolean;
  hideViewAllCard?: boolean;
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
  onMovieHover?: (movie: any) => void;
  hideIndicators?: boolean;
  hideMetadata?: boolean;
  enableGlobalKeyNavigation?: boolean;
  cardType?: "poster" | "backdrop";
  initialPages?: number;
  minItems?: number;
  fullscreenMode?: boolean;
  items?: any[];
  hideFavoriteBadge?: boolean;
  showAge?: boolean;
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
    if (!base) return "";
    const u = new URL(base);
    u.searchParams.set("page", String(page));
    return u.toString();
  } catch {
    if (!base) return "";
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
        item.backdrop,
      year: item.details?.released || item.year,
      rating: item.details?.rating_kp || item.rating,
      country: item.details?.country || item.country,
      quality: item.details?.quality || item.quality,
      genre: item.details?.genre || item.genre,
      tags: item.details?.tags || item.tags,
      description: item.details?.about || item.about,
      poster_colors:
        item.details?.poster_colors ||
        item.details?.colors ||
        item.poster_colors ||
        item.colors,
      logo: item.details?.poster_logo || item.poster_logo || item.logo || null,
      type: item.details?.type || item.type || null,
      age: item.details?.age || item.age || null,
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
  viewAllInHeader = false,
  hideViewAllCard = false,
  autoplay = false,
  autoplayIntervalMs = 10000,
  hoverPause = true,
  perPageOverride,
  loop = false,
  activeItemId,
  compactOnMobile,
  fetchAllPages = false,
  sortByYear,
  onMovieHover,
  hideIndicators = false,
  hideMetadata = false,
  enableGlobalKeyNavigation = false,
  cardType = "poster",
  initialPages,
  minItems = 30,
  fullscreenMode = false,
  items,
  hideFavoriteBadge = false,
  showAge = false,
}: MovieSliderProps) {
  const [page, setPage] = useState<number>(1);
  const [pagesData, setPagesData] = useState<
    Array<{ page: number; data: any }>
  >([]);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const fetchingPages = useRef<Set<number>>(new Set());
  const isStatic = Array.isArray(items);
  const isStaticData = isStatic || (!!items && Array.isArray(items));

  const perPage = perPageOverride ?? 15;
  const gapPx = cardType === "backdrop" ? 28 : 20;
  const getItemsPerView = () => {
    if (typeof window === "undefined") return 2;

    // Базовая сетка по брейкпоинтам (потом подправим под минимальную ширину карточки)
    let items: number;
    if (cardType === "backdrop") {
      if (window.matchMedia && window.matchMedia("(min-width: 1600px)").matches)
        items = 2;
      else if (
        window.matchMedia &&
        window.matchMedia("(min-width: 1280px)").matches
      )
        items = 2;
      else if (
        window.matchMedia &&
        window.matchMedia("(min-width: 1024px)").matches
      )
        items = 2;
      else if (
        window.matchMedia &&
        window.matchMedia("(min-width: 768px)").matches
      )
        items = 1;
      else items = 1;
    } else {
      if (window.matchMedia && window.matchMedia("(min-width: 1280px)").matches)
        items = fullscreenMode ? 5 : 6;
      else if (
        window.matchMedia &&
        window.matchMedia("(min-width: 1024px)").matches
      )
        items = fullscreenMode ? 3 : 4;
      else if (
        window.matchMedia &&
        window.matchMedia("(min-width: 768px)").matches
      )
        items = fullscreenMode ? 2 : 3;
      else items = 2;
    }

    // Автокоррекция под минимальную ширину карточек, чтобы на широких/узких экранах не были слишком маленькие
    const usableWidth = Math.max(320, window.innerWidth - 140); // минус сайдбар/паддинги
    const gap = gapPx; // чуть больше зазор под широкие карточки
    const minWidth =
      cardType === "backdrop"
        ? fullscreenMode
          ? 560
          : 520
        : fullscreenMode
        ? 260
        : 230;

    const calcWidth = (cnt: number) =>
      (usableWidth - gap * Math.max(0, cnt - 1)) / cnt;

    while (items > 1 && calcWidth(items) < minWidth) {
      items -= 1;
    }

    return Math.max(1, items);
  };
  const [itemsPerView, setItemsPerView] = useState<number>(2);
  const smoothEasing = useMemo(() => (t: number) => 1 - Math.pow(1 - t, 3), []);
  const carouselContentGapClass =
    cardType === "backdrop" ? "-ml-3.5 md:-ml-5" : "-ml-3.5";
  const carouselItemGapClass =
    cardType === "backdrop" ? "pl-3.5 md:pl-5" : "pl-3.5";
  const carouselOpts = useMemo(
    () => ({
      dragFree: true,
      loop: loop ?? isStaticData,
      align: "start" as const,
      duration: 24,
      easing: smoothEasing,
    }),
    [loop, isStaticData, smoothEasing]
  );
  const skeletonCarouselOpts = useMemo(
    () => ({
      dragFree: true,
      loop: false,
      align: "start" as const,
      duration: 24,
      easing: smoothEasing,
    }),
    [smoothEasing]
  );

  useEffect(() => {
    if (isStatic) return;
    setPage(1);
    setPagesData([]);
    fetchingPages.current.clear();
  }, [url, isStatic]);

  useEffect(() => {
    if (!isStatic) return;
    setPage(1);
    fetchingPages.current.clear();
    setPagesData([{ page: 1, data: items || [] }]);
  }, [isStatic, items]);

  const currentUrl = useMemo(
    () => (isStatic ? null : makePageUrl(url, page)),
    [url, page, isStatic]
  );
  const swrKey = isStatic ? null : currentUrl;
  const { data, error, isLoading, isValidating } = useSWR<string | null>(
    swrKey,
    fetcher
  );

  useEffect(() => {
    if (!data) return;
    setPagesData((prev) => {
      const exists = prev.some((p) => p.page === page);
      if (exists) return prev;
      return [...prev, { page, data }];
    });
  }, [data, page]);

  // Предзагрузка дополнительных страниц (initialPages)
  useEffect(() => {
    if (isStatic) return;
    if (!initialPages || initialPages <= 1) return;
    // Если мы уже загрузили первую страницу (через SWR выше), загружаем остальные
    // Но нужно убедиться, что мы не загружаем их повторно

    const loadMore = async () => {
      for (let i = 2; i <= initialPages; i++) {
        if (fetchingPages.current.has(i)) continue;
        // Проверяем, есть ли уже данные
        if (pagesData.some((p) => p.page === i)) continue;

        fetchingPages.current.add(i);
        try {
          const nextUrl = makePageUrl(url, i);
          const nd = await fetcher(nextUrl, 10000);
          const items = extractMoviesFromData(nd);
          if (items && items.length > 0) {
            setPagesData((prev) => {
              if (prev.some((p) => p.page === i)) return prev;
              return [...prev, { page: i, data: nd }];
            });
          }
        } catch (e) {
          console.error(`Failed to preload page ${i}`, e);
        } finally {
          fetchingPages.current.delete(i);
        }
      }
    };

    loadMore();
  }, [initialPages, url, pagesData, isStatic]); // Trigger on pagesData change to avoid stale checks, but logic handles dupes

  // Когда требуется загрузить все страницы (например, профиль актёра),
  // последовательно подтягиваем следующие страницы, пока данные не закончатся
  useEffect(() => {
    if (isStatic) return;
    if (!fetchAllPages) return;
    if (!data) return;
    let cancelled = false;
    const already = new Set(pagesData.map((p) => p.page));
    (async () => {
      let next = page + 1;
      for (let i = 0; i < 100; i++) {
        if (cancelled) break;
        if (already.has(next)) {
          next++;
          continue;
        }
        try {
          const nextUrl = makePageUrl(url, next);
          const nd = await fetcher(nextUrl, 10000);
          const items = extractMoviesFromData(nd);
          if (!items || items.length === 0) break;

          // Проверка на дубликаты: если все пришедшие фильмы уже есть в списке, прерываем загрузку
          const currentMovies = pagesData.flatMap((p) =>
            extractMoviesFromData(p.data)
          );
          const currentIds = new Set(
            currentMovies.map((m: any) => String(m.id))
          );
          const isAllDuplicates = items.every((item: any) =>
            currentIds.has(String(item.id))
          );

          if (isAllDuplicates) break;

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
    return () => {
      cancelled = true;
    };
  }, [fetchAllPages, data, page, url, pagesData, isStatic]);

  const movies = useMemo(() => {
    let m: any[] = [];
    // Create a copy before sorting to avoid mutating state
    [...pagesData]
      .sort((a, b) => a.page - b.page)
      .forEach((ds) => {
        m = m.concat(extractMoviesFromData(ds.data));
      });

    // Remove duplicates by id
    const seen = new Set<string>();
    return m.filter((movie) => {
      const id = String(movie.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [pagesData]);

  const sortedMovies = useMemo(() => {
    if (!sortByYear) return movies;
    const copy = [...movies];
    const toNum = (y: any) => {
      const n = Number(String(y).replace(/[^0-9]/g, ""));
      return Number.isFinite(n) ? n : NaN;
    };
    copy.sort((a: any, b: any) => {
      const ya = toNum(a.year);
      const yb = toNum(b.year);
      const aU = Number.isNaN(ya);
      const bU = Number.isNaN(yb);
      if (aU && bU) return 0;
      if (aU) return 1;
      if (bU) return -1;
      return sortByYear === "asc" ? ya - yb : yb - ya;
    });
    return copy;
  }, [movies, sortByYear]);

  const display =
    fetchAllPages || isStaticData
      ? sortedMovies
      : sortedMovies.slice(0, perPage);

  // Загружаем overrides для текущих карточек (батчем по ids)
  const overridesCacheRef =
    (globalThis as any).__movieOverridesCache ||
    ((globalThis as any).__movieOverridesCache = {});
  const [overridesMap, setOverridesMap] = useState<Record<string, any>>(() => ({
    ...overridesCacheRef,
  }));
  const [overrideRefresh, setOverrideRefresh] = useState(0);
  const idsString = useMemo(
    () => (display || []).map((m: any) => String(m.id)).join(","),
    [display]
  );
  const [failedSrcById, setFailedSrcById] = useState<Record<string, string>>(
    {}
  );
  const [pendingOverrideIds, setPendingOverrideIds] = useState<Set<string>>(
    new Set()
  );
  const { toggleFavorite, isFavorite } = useFavorites();

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
  }, [idsString, overrideRefresh]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent)?.detail as
        | { ids?: string[]; op?: string; ts?: number }
        | undefined;
      const changedIds = detail?.ids;

      const idsToAffect =
        changedIds && changedIds.length
          ? changedIds
          : idsString.split(",").filter(Boolean);

      if (!idsToAffect.length) return;

      const displayIds = new Set(idsString.split(",").filter(Boolean));
      const intersects = idsToAffect.some((id) => displayIds.has(String(id)));
      if (!intersects) return;

      setOverridesMap((prev) => {
        const next = { ...prev };
        idsToAffect.forEach((id) => {
          delete next[String(id)];
        });
        return next;
      });

      try {
        idsToAffect.forEach((id) => {
          delete (overridesCacheRef as any)[String(id)];
        });
      } catch {}

      setOverrideRefresh((v) => v + 1);
    };

    window.addEventListener("override:changed", handler as EventListener);
    return () =>
      window.removeEventListener("override:changed", handler as EventListener);
  }, [idsString, overridesCacheRef]);

  const finalDisplay = useMemo(() => {
    const base = (display || []).map((m: any) => {
      const ov =
        overridesMap[String(m.id)] ||
        (movieOverrides as any)[String(m.id)] ||
        null;
      const patchedPoster = ov && ov.poster ? ov.poster : m.poster;
      const patchedTitle =
        ov && (ov.name || ov.title) ? ov.name || ov.title : m.title;
      const patchedLogo = ov && ov.poster_logo ? ov.poster_logo : m.logo;
      const patchedBackdrop =
        ov && ov.bg_poster && ov.bg_poster.backdrop
          ? ov.bg_poster.backdrop
          : m.backdrop;
      return {
        ...m,
        poster: patchedPoster,
        title: patchedTitle,
        logo: patchedLogo,
        backdrop: patchedBackdrop,
      };
    });

    if (viewAllHref && !hideViewAllCard) {
      base.push({
        id: `view-all-${viewAllHref}`,
        title: viewAllLabel || "Смотреть все",
        href: viewAllHref,
        isViewAll: true,
      });
    }

    return base;
  }, [display, overridesMap, viewAllHref, viewAllLabel]);
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
    const onDown = () => {
      isInteractingRef.current = true;
    };
    const onUp = () => {
      isInteractingRef.current = false;
    };
    try {
      api.on("pointerDown", onDown);
      api.on("pointerUp", onUp);
    } catch {}
    return () => {
      try {
        api.off("pointerDown", onDown);
        api.off("pointerUp", onUp);
      } catch {}
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
    const idx = finalDisplay.findIndex(
      (m: any) => String(m.id) === String(targetId)
    );
    if (idx >= 0) {
      try {
        api.scrollTo?.(idx);
      } catch {}
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
        if (api.canScrollNext()) api.scrollNext();
        else api.scrollTo(0);
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
  }, [cardType]); // Added cardType dependency
  const handleImageLoad = (id: string | number) => {
    const key = String(id);
    setLoadedImages((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {title && (
        <div className="flex items-center justify-between relative z-20 mb-2 px-1 md:px-0">
          <div className="text-lg md:text-2xl font-bold text-zinc-100 relative z-20 drop-shadow-md tracking-wide">
            {title}
          </div>
          {viewAllInHeader && viewAllHref && (
            <Link
              href={viewAllHref}
              className="inline-flex items-center gap-2 text-sm md:text-base font-bold text-white hover:text-white/80 transition-colors"
            >
              <span>{viewAllLabel || "Смотреть все"}</span>
              <ChevronRight className="w-[18px] h-[18px]" />
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
        <div className="relative px-0">
          <Carousel
            className="w-full"
            opts={skeletonCarouselOpts}
            setApi={setCarouselApi}
          >
            <CarouselContent className={carouselContentGapClass}>
              {Array.from({ length: perPage }).map((_, i) => (
                <CarouselItem
                  key={i}
                  className={`${carouselItemGapClass} ${
                    compactOnMobile
                      ? "basis-[40%] sm:basis-[36%]"
                      : "basis-1/2 sm:basis-1/2"
                  } ${
                    cardType === "backdrop"
                      ? hideMetadata
                        ? "md:basis-[40%] lg:basis-1/3 xl:basis-[28%]"
                        : "md:basis-1/3 lg:basis-1/4 xl:basis-1/4"
                      : hideMetadata
                      ? "md:basis-1/5 lg:basis-[16.67%] xl:basis-[14.28%]"
                      : "md:basis-1/6 lg:basis-[14.28%] xl:basis-[12.5%]"
                  }`}
                >
                  <div className="group block bg-transparent hover:bg-transparent outline-none hover:outline hover:outline-[1.5px] hover:outline-zinc-700 focus-visible:outline focus-visible:outline-[2px] focus-visible:outline-zinc-700 transition-all duration-200 overflow-hidden rounded-sm">
                    <div
                      className={`${
                        cardType === "backdrop"
                          ? "aspect-video"
                          : "aspect-[2/3]"
                      } bg-zinc-950 flex items-center justify-center relative overflow-hidden rounded-[10px]`}
                    >
                      <Skeleton className="w-full h-full" />
                    </div>
                    {/* Под постером оставляем область для анимации частиц + скелетона текста */}
                    <div
                      className={`relative p-2 md:p-3 overflow-hidden ${
                        hideMetadata
                          ? "hidden md:hidden"
                          : "h-[54px] md:h-[68px]"
                      }`}
                    >
                      {!hideMetadata && (
                        <>
                          <div className="pointer-events-none absolute top-[4%] h-[52%] left-1/2 -translate-x-1/2 w-[46%] hidden md:block opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-500 movie-title-flame" />
                          <div className="relative">
                            <Skeleton className="h-3 md:h-4 w-3/4 mb-1" />
                            <div className="flex items-center gap-2 text-[10px] md:text-[11px]">
                              <Skeleton className="h-3 md:h-4 w-10" />
                              <Skeleton className="h-3 md:h-4 w-16" />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex xl:w-10 xl:h-10 md:top-1/2" />
            <CarouselNext className="hidden md:flex xl:w-10 xl:h-10 md:top-1/2" />
          </Carousel>
          {!hideIndicators && (
            <div className="hidden md:flex items-center justify-center gap-1 mt-3 min-h-[10px]">
              {(
                carouselApi?.scrollSnapList() || Array.from({ length: 10 })
              ).map((_: any, i: number) => (
                <span
                  key={i}
                  className={`${
                    selectedIndex === i ? "w-6" : "w-2"
                  } h-2 rounded-full transition-all duration-300`}
                  style={{
                    backgroundColor:
                      selectedIndex === i
                        ? "rgba(var(--ui-accent-rgb), 0.9)"
                        : "rgba(255,255,255,0.3)",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          className="relative px-0"
          onMouseEnter={() => hoverPause && setPaused(true)}
          onMouseLeave={() => hoverPause && setPaused(false)}
        >
          <Carousel
            className="w-full"
            opts={carouselOpts}
            setApi={setCarouselApi}
            enableGlobalKeyNavigation={enableGlobalKeyNavigation}
          >
            <CarouselContent
              className={`${carouselContentGapClass} cursor-grab active:cursor-grabbing`}
            >
              {finalDisplay.map((movie: any, index: number) => (
                <CarouselItem
                  key={movie.id || index}
                  className={`${carouselItemGapClass} ${
                    compactOnMobile
                      ? "basis-[40%] sm:basis-[36%]"
                      : "basis-1/2 sm:basis-1/2"
                  } ${
                    cardType === "backdrop"
                      ? hideMetadata
                        ? "md:basis-[40%] lg:basis-1/3 xl:basis-[28%]"
                        : "md:basis-1/3 lg:basis-1/4 xl:basis-1/4"
                      : hideMetadata
                      ? "md:basis-1/5 lg:basis-[16.67%] xl:basis-[14.28%]"
                      : "md:basis-1/6 lg:basis-[14.28%] xl:basis-[12.5%]"
                  }`}
                >
                  <Link
                    href={
                      movie.isViewAll && movie.href
                        ? movie.href
                        : `/movie/${movie.id}`
                    }
                    className="group block bg-transparent hover:bg-transparent outline-none focus-visible:outline-none transition-all duration-200 overflow-hidden rounded-sm focus:ring-0 hover:outline hover:outline-[1.5px] hover:outline-zinc-700 [&.is-focused]:outline [&.is-focused]:outline-[1.5px] [&.is-focused]:outline-zinc-700"
                    onFocus={(e) => {
                      if (!movie.isViewAll) onMovieHover?.(movie);
                      e.currentTarget.classList.add("is-focused");
                    }}
                    onBlur={(e) => {
                      e.currentTarget.classList.remove("is-focused");
                      const posterEl = e.currentTarget.querySelector(
                        ".poster-card"
                      ) as HTMLElement;
                      if (!posterEl) return;
                      posterEl.style.setProperty("--mx", "0");
                      posterEl.style.setProperty("--my", "0");
                    }}
                    onMouseMove={(e) => {
                      if (movie.isViewAll || compactOnMobile) return;
                      onMovieHover?.(movie);
                      const posterEl = e.currentTarget.querySelector(
                        ".poster-card"
                      ) as HTMLElement;
                      if (!posterEl) return;
                      const rect = posterEl.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const y = e.clientY - rect.top;
                      const mx = (x / rect.width) * 2 - 1;
                      const my = (y / rect.height) * 2 - 1;
                      posterEl.style.setProperty("--x", `${x}px`);
                      posterEl.style.setProperty("--y", `${y}px`);
                      posterEl.style.setProperty("--mx", `${mx}`);
                      posterEl.style.setProperty("--my", `${my}`);
                    }}
                    onMouseLeave={(e) => {
                      const posterEl = e.currentTarget.querySelector(
                        ".poster-card"
                      ) as HTMLElement;
                      if (!posterEl) return;
                      posterEl.style.setProperty("--mx", "0");
                      posterEl.style.setProperty("--my", "0");
                    }}
                    onClick={(e) => {
                      const api = carouselApi as unknown as {
                        clickAllowed?: () => boolean;
                      } | null;
                      if (api?.clickAllowed && !api.clickAllowed()) {
                        e.preventDefault();
                        return;
                      }

                      if (movie.isViewAll) {
                        return;
                      }

                      NProgress.start();

                      // Сохраняем позицию постера для анимации перехода (только десктоп)
                      const posterEl = e.currentTarget.querySelector(
                        ".poster-card"
                      ) as HTMLElement;
                      if (posterEl && movie.poster) {
                        const rect = posterEl.getBoundingClientRect();
                        savePosterTransition({
                          movieId: String(movie.id),
                          posterUrl: movie.poster,
                          rect: rect,
                        });
                      }

                      try {
                        const ids = (finalDisplay || []).map((m: any) =>
                          String(m.id)
                        );
                        const index = ids.indexOf(String(movie.id));
                        const ctx = {
                          origin: "slider",
                          ids,
                          index,
                          timestamp: Date.now(),
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
                    <div
                      className={`${
                        cardType === "backdrop"
                          ? "aspect-video"
                          : "aspect-[2/3]"
                      } bg-zinc-950 flex items-center justify-center relative overflow-hidden rounded-[10px] poster-card isolate transform-gpu transition-all duration-200`}
                    >
                      {!hideFavoriteBadge && !movie.isViewAll && movie.id && (
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
                          className="absolute top-1 left-1 md:top-2 md:left-2 z-[14] rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70 transition-transform active:scale-95"
                        >
                          <svg
                            className="w-6 h-9 md:w-7 md:h-10 drop-shadow-sm"
                            width="28"
                            height="40"
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
                      )}
                      {showAge && movie.age != null && !movie.isViewAll && (
                        <div className="absolute bottom-2.5 left-3 z-[15] text-white/60 text-sm font-bold tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] hidden md:block">
                          {String(movie.age).replace(/\D/g, "")}+
                        </div>
                      )}
                      {movie.isViewAll ? (
                        <div className="absolute inset-0 flex items-center justify-center text-center px-3">
                          <div className="text-base md:text-lg font-semibold text-white drop-shadow-md">
                            {viewAllLabel || "Смотреть все"}
                          </div>
                        </div>
                      ) : (
                        <>
                          {(() => {
                            const idStr = String(movie.id);
                            const ovEntry =
                              (overridesMap as any)[idStr] ||
                              (movieOverrides as any)[idStr];
                            const known = ovEntry !== undefined;
                            const isBackdrop = cardType === "backdrop";

                            // Determine source based on cardType
                            const posterSrc = isBackdrop
                              ? ovEntry?.bg_poster?.backdrop ||
                                movie.backdrop ||
                                movie.poster ||
                                null
                              : ovEntry?.poster ?? movie.poster ?? null;

                            const waiting = !known && !posterSrc; // If we have posterSrc, we don't need to wait for override to confirm it's missing

                            if (
                              posterSrc &&
                              failedSrcById[String(movie.id)] !==
                                (posterSrc || "")
                            ) {
                              return (
                                <>
                                  <img
                                    key={
                                      String(movie.id) +
                                      (isBackdrop ? "-bd" : "-p")
                                    }
                                    src={posterSrc || "/placeholder.svg"}
                                    alt={movie.title || "Постер"}
                                    decoding="async"
                                    loading={
                                      index < itemsPerView ? "eager" : "lazy"
                                    }
                                    fetchPriority={
                                      index < itemsPerView ? "high" : "low"
                                    }
                                    className={`w-full h-full object-cover rounded-[10px] transition-all ease-out poster-media ${
                                      loadedImages.has(String(movie.id))
                                        ? "opacity-100 blur-0 scale-100"
                                        : "opacity-0 blur-md scale-[1.02]"
                                    }`}
                                    style={{
                                      transition:
                                        "opacity 300ms ease-out, filter 600ms ease-out, transform 600ms ease-out",
                                      willChange: "opacity, filter, transform",
                                    }}
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
                                      setFailedSrcById((prev) => ({
                                        ...prev,
                                        [key]: src,
                                      }));
                                    }}
                                  />
                                  {/* Logo Overlay for Backdrop Cards */}
                                  {isBackdrop && movie.logo && (
                                    <div className="absolute inset-0 flex items-center justify-center p-4 z-20 pointer-events-none">
                                      <img
                                        src={movie.logo}
                                        alt={movie.title}
                                        className="max-w-[70%] max-h-[50%] object-contain drop-shadow-lg transition-transform duration-300 translate-y-8 group-hover:scale-110"
                                      />
                                    </div>
                                  )}
                                </>
                              );
                            }
                            if (waiting) {
                              return <Skeleton className="w-full h-full" />;
                            }
                            return (
                              <div className="text-zinc-600 text-[10px] text-center p-1">
                                Нет изображения
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
                            // На мобильных отключаем тяжелые эффекты свечения
                            if (compactOnMobile) return null;

                            return posterSrc &&
                              loadedImages.has(String(movie.id)) ? (
                              <>
                                {/* Эффект свечения по курсору (только hover) */}
                                <div
                                  className="pointer-events-none absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                  style={{
                                    background:
                                      "radial-gradient(140px circle at var(--x) var(--y), rgba(var(--ui-accent-rgb),0.35), rgba(0,0,0,0) 60%)",
                                  }}
                                />
                                {/* Эффект индикатора снизу при навигации стрелками (только is-focused без hover) */}
                                <div className="pointer-events-none absolute inset-0 z-10 opacity-0 group-[.is-focused]:opacity-100 group-hover:!opacity-0 transition-opacity duration-300 overflow-visible">
                                  {/* Мягкое обволакивающее свечение по всей карточке */}
                                  <div
                                    className="absolute inset-0 animate-[glow-pulse_2s_ease-in-out_infinite]"
                                    style={{
                                      background:
                                        "radial-gradient(140% 130% at 50% 50%, rgba(var(--ui-accent-rgb),0.32) 0%, rgba(var(--ui-accent-rgb),0.18) 45%, rgba(var(--ui-accent-rgb),0.08) 70%, transparent 88%)",
                                      boxShadow:
                                        "0 0 40px 14px rgba(var(--ui-accent-rgb),0.3), 0 0 82px 28px rgba(var(--ui-accent-rgb),0.16)",
                                      filter: "blur(3px)",
                                    }}
                                  />
                                </div>
                              </>
                            ) : null;
                          })()}

                          {(() => {
                            const rawTags = (movie as any)?.tags;
                            let tagLabel: string | null = null;
                            if (Array.isArray(rawTags)) {
                              const first = rawTags
                                .map((v) => String(v || "").trim())
                                .find((v) => v.length > 0);
                              tagLabel = first || null;
                            } else if (typeof rawTags === "string") {
                              const first = rawTags
                                .split(/[,/|]/)
                                .map((p) => p.trim())
                                .find((p) => p.length > 0);
                              tagLabel = first || null;
                            }
                            return tagLabel || movie.rating || movie.quality ? (
                              <div className="absolute top-1 right-1 md:top-2 md:right-2 flex flex-col items-end gap-1 z-[12]">
                                {movie.rating && (
                                  <div
                                    className={`px-2 md:px-2 py-[3px] md:py-1 rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.5)] font-black border border-white/10 text-[11px] md:text-[12px] text-white ${ratingBgColor(
                                      movie.rating
                                    )}`}
                                  >
                                    {formatRatingLabel(movie.rating)}
                                  </div>
                                )}
                                {movie.quality && (
                                  <div className="px-2 md:px-2 py-[3px] md:py-1 rounded-full text-[11px] md:text-[12px] text-black font-black tracking-tight bg-white border border-white/70 shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
                                    {String(movie.quality)}
                                  </div>
                                )}
                                {tagLabel && (
                                  <div
                                    className="px-2 md:px-2 py-[3px] md:py-1 rounded-md text-[11px] md:text-[12px] bg-white text-black font-black tracking-tight border border-white/70 shadow-[0_4px_12px_rgba(0,0,0,0.35)]"
                                    title={tagLabel}
                                  >
                                    {tagLabel}
                                  </div>
                                )}
                              </div>
                            ) : null;
                          })()}
                          {/* убрали бейдж качества */}
                        </>
                      )}
                    </div>
                    <div
                      className={`relative p-2 md:p-3 overflow-hidden ${
                        hideMetadata
                          ? "hidden md:hidden"
                          : "h-[54px] md:h-[68px]"
                      }`}
                    >
                      {!hideMetadata && !movie.isViewAll && (
                        <div className="relative z-[2]">
                          <h3
                            className="text-[13px] md:text-[14px] font-bold truncate mb-1 leading-tight text-zinc-300/80 transition-colors duration-200 group-hover:text-zinc-100 group-focus-visible:text-zinc-100"
                            title={movie.title || "Без названия"}
                          >
                            {movie.title || "Без названия"}
                          </h3>
                          {(() => {
                            const year = movie.year ? String(movie.year) : null;
                            if (!year) return null;
                            return (
                              <div className="flex items-center gap-2 text-[10px] md:text-[12px] text-zinc-400/70 transition-colors duration-200 group-hover:text-zinc-300 group-focus-visible:text-zinc-300">
                                {year && <span>{year}</span>}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex xl:w-10 xl:h-10 md:top-1/2" />
            <CarouselNext className="hidden md:flex xl:w-10 xl:h-10 md:top-1/2" />
          </Carousel>
          {!hideIndicators && (
            <div className="hidden md:flex items-center justify-center gap-1 mt-3 min-h-[10px]">
              {(
                carouselApi?.scrollSnapList() || Array.from({ length: 10 })
              ).map((_: any, i: number) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`К слайду ${i + 1}`}
                  aria-current={selectedIndex === i}
                  onClick={() => carouselApi?.scrollTo?.(i)}
                  className={`${
                    selectedIndex === i ? "w-6" : "w-2 bg-white/30"
                  } h-2 rounded-full transition-all duration-300`}
                  style={
                    selectedIndex === i
                      ? { backgroundColor: "rgb(var(--ui-accent-rgb))" }
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
