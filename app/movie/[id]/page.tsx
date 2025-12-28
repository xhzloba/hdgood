"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useMemo } from "react";
import { Loader } from "@/components/loader";
import {
  ArrowLeft,
  Play,
  Info,
  Plus,
  ThumbsUp,
  ChevronDown,
  X,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Heart,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PlayerSelector } from "@/components/player-selector";
import { toast } from "@/hooks/use-toast";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import SimpleMovieSlider from "@/components/simple-movie-slider";
import {
  FranchiseData,
  FranchiseSeason,
  FranchiseEpisode,
} from "@/types/franchise";

// Кеш dynamic overrides по id фильма, переживает размонтирование страницы и переиспользуется из списка/слайдера
const movieOverrideCache: Record<string, any> =
  (globalThis as any).__movieOverridesCache ||
  ((globalThis as any).__movieOverridesCache = {});

const fetcher = async (
  url: string,
  timeout: number = 5000,
  retries: number = 2
) => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
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
        lastError = error;

        // Если это последняя попытка - выбрасываем ошибку
        if (attempt === retries - 1) {
          if (error.name === "AbortError") {
            throw new Error("Request timeout");
          }
          throw error;
        }

        // Экспоненциальная задержка: 300мс, 600мс для повторных попыток
        const delay = 300 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw new Error("Unknown error occurred");
      }
    }
  }

  throw lastError || new Error("Failed to fetch");
};

// Cache for movie data to enable instant transitions
const movieDataCache: Record<string, any> =
  (globalThis as any).__movieDataCache ||
  ((globalThis as any).__movieDataCache = {});

const fetchMovieFullData = async (id: string) => {
  // Return cached data if available
  if (movieDataCache[id]) {
    return movieDataCache[id];
  }

  const viewStart = Date.now();
  const viewPromise = fetcher(
    `https://api.vokino.pro/v2/view/${id}`,
    5000,
    2
  );

  const timelineStart = Date.now();
  const timelinePromise = fetcher(
    `https://api.vokino.tv/v2/timeline/watch?ident=${id}&current=100&time=100&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352`,
    2000, // Reduced timeout for timeline
    1    // Fewer retries for timeline
  ).catch((e) => {
    console.warn(
      `⚠️ Timeline API error: ${Date.now() - timelineStart}ms -`,
      e instanceof Error ? e.message : String(e)
    );
    return null;
  });

  // Wait for the main movie data first
  const movieData = await viewPromise.catch((e) => {
    console.error(
      `❌ View API error: ${Date.now() - viewStart}ms -`,
      e instanceof Error ? e.message : String(e)
    );
    throw e;
  });

  // Try to get timeline data but don't block for more than 500ms if movieData is already here
  const timelineData = await Promise.race([
    timelinePromise,
    new Promise((resolve) => setTimeout(() => resolve(null), 500)),
  ]);

  if (!movieData || typeof movieData !== "object") {
    throw new Error("Invalid data format received from API");
  }

  const kpId =
    timelineData?.kp_id ||
    timelineData?.data?.kp_id ||
    movieData?.kp_id ||
    movieData?.details?.kp_id ||
    movieData?.details?.kinopoisk_id;

  const result = { movieData, timelineData, kpId };

  // Cache the result
  movieDataCache[id] = result;

  return result;
};

// Функция для franchise API с retry логикой для надежности
const fetchFranchise = async (
  kpId: number,
  retries: number = 2
): Promise<FranchiseData | null> => {
  // Используем наш Next.js API route для избежания CORS проблем
  const url = `/api/franchise?kinopoisk_id=${kpId}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Если это последняя попытка - логируем ошибку
        if (attempt === retries - 1) {
          console.warn(
            `⚠️ Franchise API HTTP error: ${response.status} для kp_id: ${kpId}`
          );
          return null;
        }
        // Пробуем еще раз
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }

      const data = await response.json();

      // Проверяем что данные не пустые
      if (
        !data ||
        (typeof data === "object" && Object.keys(data).length === 0)
      ) {
        if (attempt === retries - 1) {
          console.warn(
            `⚠️ Franchise API вернул пустой объект для kp_id: ${kpId}`
          );
          return null;
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }

      return data;
    } catch (error) {
      // Если это последняя попытка - логируем и возвращаем null
      if (attempt === retries - 1) {
        console.warn(`⚠️ Franchise API error для kp_id: ${kpId}:`, error);
        return null;
      }
      // Пробуем еще раз через 300мс
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  return null;
};

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

function makePageUrl(base: string, page: number) {
  try {
    const u = new URL(base);
    u.searchParams.set("page", String(page));
    return u.toString();
  } catch {
    const hasQuery = base.includes("?");
    return `${base}${hasQuery ? "&" : "?"}page=${page}`;
  }
}

import { CastList } from "@/components/cast-list";
import {
  TrailerPlayer,
  getEmbedSrcFromTrailer,
} from "@/components/trailer-player";
import { ratingColor, formatCurrency } from "@/lib/utils";
import { TriviaSection } from "@/components/trivia-section";
import { ShootingPhotosSlider } from "@/components/shooting-photos-slider";
import { getMovieOverride, getSeriesOverride } from "@/lib/overrides";
import { VideoPosterRef } from "@/components/video-poster";
import { useFavorites } from "@/hooks/use-favorites";

export default function MoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [franchiseData, setFranchiseData] = useState<FranchiseData | null>(
    null
  );
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState<string>("");
  const [kpId, setKpId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPlayer, setSelectedPlayer] = useState<number>(1);
  const [showWatchOverlay, setShowWatchOverlay] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const currentIdRef = useRef<string>(""); // Ref для отслеживания текущего id
  const [openSeasons, setOpenSeasons] = useState<Set<number>>(new Set([1])); // По умолчанию открыт только первый сезон
  const [playingEpisode, setPlayingEpisode] = useState<{
    seasonNumber: number;
    episodeNumber: number;
    url: string;
    title: string;
  } | null>(null); // Для inline iframe
  const [detailsOpen, setDetailsOpen] = useState(true); // Десктоп: сворачиваем «О фильме/О сериале», «В ролях», «Актёры дубляжа»
  const [overrideData, setOverrideData] = useState<any>(null);
  const [isOverrideLoading, setIsOverrideLoading] = useState(false);
  const [shareFiles, setShareFiles] = useState<File[] | undefined>(undefined);
  const [posterLoaded, setPosterLoaded] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const videoPosterRef = useRef<VideoPosterRef>(null);
  const [isVideoLooping, setIsVideoLooping] = useState(false);
  const [navIds, setNavIds] = useState<string[]>([]);
  const [navIndex, setNavIndex] = useState<number | null>(null);
  const [returnHref, setReturnHref] = useState<string | null>(null);
  const [showTsWarning, setShowTsWarning] = useState(false);
  const [isTrailerPlaying, setIsTrailerPlaying] = useState(false);
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isBackdropLoaded, setIsBackdropLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [failedActorImages, setFailedActorImages] = useState<Set<string>>(
    new Set()
  );
  const playerRef = useRef<any>(null);
  const [origin, setOrigin] = useState("");
  const [listUrl, setListUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const { toggleFavorite, isFavorite } = useFavorites();

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!showWatchOverlay) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        setShowWatchOverlay(false);
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [showWatchOverlay]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  const toggleMute = () => {
    if (playerRef.current) {
      const action = isMuted ? "unMute" : "mute";
      playerRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: action, args: [] }),
        "*"
      );
      setIsMuted(!isMuted);
    }
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Вычисляем информацию о качестве и TS
  const qualityInfo = useMemo(() => {
    if (!data?.details && !overrideData) return { quality: null, isTS: false };

    const m = overrideData ?? data?.details;
    if (!m) return { quality: null, isTS: false };

    // Мерджим franchise данные
    let fData = franchiseData;
    if (overrideData?.franchise && fData) {
      // Простая логика мерджа для примера, аналогичная той, что ниже в рендере
      // Но для useMemo достаточно просто взять наличие franchiseData
    }

    const tagsRaw = (m as any).tags;
    const tagsList = Array.isArray(tagsRaw)
      ? tagsRaw
      : String(tagsRaw || "").split(",");
    const firstTag = tagsList
      .map((s: any) => String(s).trim())
      .filter(Boolean)[0];

    const franchiseQuality = fData && (fData as any).quality;
    const quality = firstTag || franchiseQuality;

    // Check if quality is TS (Telesync) or CAM
    const isTS =
      quality &&
      ["ts", "cam", "camrip", "telesync"].includes(
        String(quality).toLowerCase()
      );

    return { quality, isTS };
  }, [data, franchiseData, overrideData]);

  useEffect(() => {
    if (qualityInfo.isTS) {
      setShowTsWarning(true);
      const timer = setTimeout(() => {
        setShowTsWarning(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [qualityInfo.isTS]);

  const normalizeTrailers = (val: any): any[] => {
    try {
      if (Array.isArray(val)) return val.filter(Boolean);
      if (val && typeof val === "object") return [val];
      if (typeof val === "string" && val.trim()) return [{ url: val.trim() }];
      return [];
    } catch {
      return [];
    }
  };

  const rawTrailers = useMemo(() => {
    try {
      const ov = (overrideData as any)?.trailers;
      const dt = (data as any)?.details?.trailers ?? (data as any)?.trailers;
      const ovN = normalizeTrailers(ov);
      const dtN = normalizeTrailers(dt);
      return ovN.length > 0 ? ovN : dtN;
    } catch {
      return [] as any[];
    }
  }, [data, overrideData]);

  const hasTrailers = useMemo(() => {
    try {
      return (rawTrailers || []).some((t: any) => {
        const src = getEmbedSrcFromTrailer(t);
        return !!src && src.includes("youtube.com/embed");
      });
    } catch {
      return false;
    }
  }, [rawTrailers]);

  const trailerData = useMemo(() => {
    if (!hasTrailers) return null;
    return (rawTrailers || []).find((t: any) => {
      const src = getEmbedSrcFromTrailer(t);
      return !!src && src.includes("youtube.com/embed");
    });
  }, [hasTrailers, rawTrailers]);

  const desktopTrailerUrl = useMemo(() => {
    if (!trailerData) return null;
    let src = getEmbedSrcFromTrailer(trailerData);
    if (src) {
      const separator = src.includes("?") ? "&" : "?";
      // Desktop: muted, no controls, autoplay
      src += `${separator}autoplay=1&mute=1&controls=0&playsinline=1&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&enablejsapi=1&origin=${origin}&widget_referrer=${origin}`;
    }
    return src;
  }, [trailerData, origin]);

  const mobileTrailerUrl = useMemo(() => {
    if (!trailerData) return null;
    let src = getEmbedSrcFromTrailer(trailerData);
    if (src) {
      const separator = src.includes("?") ? "&" : "?";
      // Mobile: with controls, NO autoplay, playsinline
      src += `${separator}autoplay=0&mute=0&controls=1&playsinline=1&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&enablejsapi=1&origin=${origin}&widget_referrer=${origin}`;
    }
    return src;
  }, [trailerData, origin]);

  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem("__navContext")
          : null;
      if (!raw) {
        setNavIds([]);
        setNavIndex(null);
        return;
      }
      const ctx = JSON.parse(raw || "{}");
      const ids = Array.isArray(ctx?.ids)
        ? ctx.ids.map((s: any) => String(s))
        : [];
      setNavIds(ids);
      const idx = ids.indexOf(String(id));
      setNavIndex(idx >= 0 ? idx : null);

      if (ctx?.listUrl) setListUrl(ctx.listUrl);
      if (ctx?.currentPage) setCurrentPage(Number(ctx.currentPage) || 1);
    } catch {
      setNavIds([]);
      setNavIndex(null);
    }
  }, [id]);

  // Dynamic fetching of next page when reaching the end
  useEffect(() => {
    if (!navIds.length || navIndex === null || !listUrl || isLoadingMore)
      return;

    // If we are near the end (e.g., within 5 items)
    if (navIndex >= navIds.length - 5) {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      const nextUrl = makePageUrl(listUrl, nextPage);

      console.log(`Fetching next page: ${nextPage}`);

      fetcher(nextUrl)
        .then((data) => {
          const newMovies = extractMoviesFromData(data);
          const newIds = newMovies.map((m: any) => String(m.id));

          if (newIds.length > 0) {
            // Filter out duplicates just in case
            const uniqueNewIds = newIds.filter(
              (nid: string) => !navIds.includes(nid)
            );

            if (uniqueNewIds.length > 0) {
              const updatedIds = [...navIds, ...uniqueNewIds];
              setNavIds(updatedIds);
              setCurrentPage(nextPage);

              // Update localStorage so if user refreshes or comes back, they have the new list
              try {
                const raw = localStorage.getItem("__navContext");
                if (raw) {
                  const ctx = JSON.parse(raw);
                  ctx.ids = updatedIds;
                  ctx.currentPage = nextPage;
                  ctx.totalLoaded = updatedIds.length;
                  localStorage.setItem("__navContext", JSON.stringify(ctx));
                }
              } catch (e) {
                console.error("Failed to update nav context", e);
              }
            } else {
              // Even if no *new* unique IDs (e.g. overlap), we should advance the page
              // so we don't get stuck fetching the same page forever.
              console.warn(
                `Page ${nextPage} returned data but no new unique IDs.`
              );
              setCurrentPage(nextPage);

              // Update currentPage in localStorage too
              try {
                const raw = localStorage.getItem("__navContext");
                if (raw) {
                  const ctx = JSON.parse(raw);
                  ctx.currentPage = nextPage;
                  localStorage.setItem("__navContext", JSON.stringify(ctx));
                }
              } catch (e) {}
            }
          } else {
            console.log(`Page ${nextPage} returned no movies.`);
          }
        })
        .catch((err) => {
          console.error("Failed to load more movies", err);
        })
        .finally(() => {
          setIsLoadingMore(false);
        });
    }
  }, [navIndex, navIds, listUrl, currentPage, isLoadingMore]);

  // Prefetch adjacent movies for smoother transition
  useEffect(() => {
    if (!navIds.length || navIndex === null) return;

    const prefetch = async (targetId: string) => {
      // 1. Prefetch Movie Data (Main API)
      if (!movieDataCache[targetId]) {
        fetchMovieFullData(targetId)
          .then(() => console.log(`🚀 Prefetched movie data for ${targetId}`))
          .catch(() => {});
      }

      // 2. Prefetch Override Data (Local API)
      // Проверяем наличие в кеше (учитываем, что там может быть null, поэтому проверяем на undefined)
      if (movieOverrideCache[targetId] === undefined) {
        fetch(`/api/overrides/movies/${targetId}`, { cache: "no-store" })
          .then(async (res) => {
            if (res.ok) return res.json();
            return null;
          })
          .then((data) => {
            // Сохраняем в кеш (даже если null, чтобы знать, что оверрайда нет)
            movieOverrideCache[targetId] = data || null;
            try {
              (globalThis as any).__movieOverridesCache[targetId] =
                data || null;
            } catch {}
            console.log(
              `🚀 Prefetched override for ${targetId}:`,
              data ? "Found" : "None"
            );
          })
          .catch(() => {
            // При ошибке тоже можно закешировать null, чтобы не долбить API
            movieOverrideCache[targetId] = null;
          });
      }
    };

    // Prefetch next
    if (navIndex < navIds.length - 1) {
      prefetch(navIds[navIndex + 1]);
    }
    // Prefetch prev
    if (navIndex > 0) {
      prefetch(navIds[navIndex - 1]);
    }
  }, [navIds, navIndex]);

  useEffect(() => {
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem("__returnTo")
          : null;
      const obj = raw ? JSON.parse(raw) : null;
      const href = obj?.href ? String(obj.href) : null;
      setReturnHref(href);
    } catch {
      setReturnHref(null);
    }
  }, [id]);

  const handleShare = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const name =
      (data?.name ?? overrideData?.name ?? "") ||
      (typeof (data as any)?.movie === "object"
        ? (data as any).movie?.name ?? ""
        : "");
    const descRaw = (data?.about ??
      (data as any)?.description ??
      overrideData?.about ??
      "") as any;
    const desc = Array.isArray(descRaw)
      ? descRaw.filter(Boolean).join(" ")
      : String(descRaw || "").trim();

    // Получаем год из данных фильма
    const movie = data || overrideData;
    const yearRaw =
      (movie as any)?.year ??
      (movie as any)?.released ??
      (movie as any)?.release_year ??
      (movie as any)?.releaseYear;
    let yearPart = "";
    if (yearRaw != null) {
      const s = String(yearRaw).trim();
      if (s && s !== "0") {
        const match = s.match(/\d{4}/);
        if (match) yearPart = ` (${match[0]})`;
      }
    }

    // Формируем заголовок с названием и годом
    const title = name
      ? `Смотреть онлайн: ${name}${yearPart}`
      : "Смотреть онлайн в 4K качестве";
    const text = [desc || null, shareUrl].filter(Boolean).join("\n\n");
    const files: File[] | undefined = shareFiles;

    const hasWebShare =
      typeof navigator !== "undefined" &&
      typeof (navigator as any).share === "function";
    const isSecure =
      typeof window !== "undefined" && (window as any).isSecureContext === true;
    const isTopLevel =
      typeof window !== "undefined" && window.top === window.self;
    if (hasWebShare && isSecure && isTopLevel) {
      try {
        const canShareFiles =
          files &&
          (navigator as any).canShare &&
          (navigator as any).canShare({ files });
        if (canShareFiles) {
          await (navigator as any).share({ title, text, files });
        } else {
          await (navigator as any).share({ title, text, url: shareUrl });
        }
        toast({ title: "Ссылка отправлена" });
      } catch (e: any) {
        const msg = String(e?.name || e || "").toLowerCase();
        if (msg.includes("aborterror")) {
          return; // пользователь отменил — ничего не делаем
        }
        // Если Web Share поддерживается, но произошла ошибка — не копируем в буфер,
        // чтобы не было двойных действий и дублирования.
        toast({ title: "Не удалось поделиться" });
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(
        `${title ? title + "\n\n" : ""}${text}`
      );
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = `${title ? title + "\n\n" : ""}${text}`;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {}
    }
    toast({ title: "Ссылка скопирована" });
  };

  // Копирование ident (id из маршрута) в буфер обмена по клику на постер
  const copyIdentToClipboard = async () => {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = id;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch (e) {
        console.warn("Не удалось скопировать ident:", e);
      }
    }
  };

  useEffect(() => {
    const posterUrl =
      (overrideData as any)?.poster ??
      (data as any)?.poster ??
      (data as any)?.details?.poster ??
      (data as any)?.movie?.poster;
    if (!posterUrl || typeof posterUrl !== "string" || !posterUrl.trim()) {
      setShareFiles(undefined);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const proxyUrl = `/api/share-poster?url=${encodeURIComponent(
          posterUrl
        )}`;
        const res = await fetch(proxyUrl, { cache: "force-cache" });
        if (!res.ok) {
          if (!cancelled) setShareFiles(undefined);
          return;
        }
        const blob = await res.blob();
        let outBlob: Blob = blob;
        let outExt = (blob.type.split("/")[1] || "jpg").toLowerCase();
        const canShare =
          typeof navigator !== "undefined" && (navigator as any).canShare;
        if (canShare) {
          const testFile = new File([blob], `poster.${outExt}`, {
            type: blob.type,
          });
          const ok = (navigator as any).canShare({ files: [testFile] });
          const preferredType = "image/jpeg";
          if (!ok && blob.type !== preferredType) {
            const url = URL.createObjectURL(blob);
            const img = new Image();
            const converted: Blob | null = await new Promise((resolve) => {
              img.onload = () => {
                URL.revokeObjectURL(url);
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth || img.width || 600;
                canvas.height = img.naturalHeight || img.height || 900;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                  resolve(null);
                  return;
                }
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                if (typeof (canvas as any).toBlob === "function") {
                  (canvas as any).toBlob(
                    (b: Blob | null) => resolve(b || null),
                    preferredType,
                    0.92
                  );
                } else {
                  try {
                    const dataUrl = canvas.toDataURL(preferredType, 0.92);
                    fetch(dataUrl)
                      .then((r) => r.blob())
                      .then((b) => resolve(b))
                      .catch(() => resolve(null));
                  } catch {
                    resolve(null);
                  }
                }
              };
              img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(null);
              };
              img.src = url;
            });
            if (converted) {
              outBlob = converted;
              outExt = "jpg";
            }
          }
        }
        const file = new File([outBlob], `poster-${id || "movie"}.${outExt}`, {
          type: outBlob.type || "image/jpeg",
        });
        if (!cancelled) setShareFiles([file]);
      } catch {
        if (!cancelled) setShareFiles(undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, overrideData, data]);

  // Функция переключения открытия/закрытия сезона
  const toggleSeason = (seasonNumber: number) => {
    setOpenSeasons((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(seasonNumber)) {
        newSet.delete(seasonNumber);
      } else {
        newSet.add(seasonNumber);
      }
      return newSet;
    });
  };

  // Функции для управления inline iframe с эпизодом
  const playEpisode = (
    seasonNumber: number,
    episodeNumber: number,
    url: string,
    title: string
  ) => {
    setPlayingEpisode({ seasonNumber, episodeNumber, url, title });
  };

  const closeEpisode = (seasonNumber: number) => {
    setPlayingEpisode(null);
  };

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setId(resolvedParams.id);
    };
    loadParams();
  }, [params]);

  // Загружаем динамический override из JSON API
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const cached = movieOverrideCache[id];
    const hasCache = cached !== undefined;

    if (hasCache) {
      setOverrideData(cached);
      setIsOverrideLoading(false);
    } else {
      setIsOverrideLoading(true);
    }

    (async () => {
      try {
        const res = await fetch(`/api/overrides/movies/${id}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) || null;
        if (!cancelled) {
          // Если данные пришли такие же, как в кеше — не обновляем стейт (оптимизация рендера)
          if (JSON.stringify(data) !== JSON.stringify(movieOverrideCache[id])) {
            setOverrideData(data);
            movieOverrideCache[id] = data;
            try {
              const ref: any = globalThis as any;
              const cache = (ref.__movieOverridesCache ||= {});
              cache[id] = data;
            } catch {}
          }
        }
      } catch {
        if (!cancelled) {
          // Если в кеше уже было значение — оставляем его, иначе фиксируем отсутствие override
          // Если кеша не было и произошла ошибка - считаем что override нет
          if (!hasCache) {
            setOverrideData(null);
            movieOverrideCache[id] = null; // Кешируем отсутствие
          }
        }
      } finally {
        if (!cancelled) setIsOverrideLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;

    let isCancelled = false;
    currentIdRef.current = id; // Сохраняем текущий id

    const loadData = async () => {
      console.log(`🔄 Загрузка фильма ${id}`);

      // Reset UI states for new movie
      setActiveTab("overview");
      setOpenSeasons(new Set([1]));
      setPlayingEpisode(null);
      setIsTrailerPlaying(false);

      // Check cache first for instant transition
      const cached = movieDataCache[id];
      if (cached) {
        console.log(`⚡ Использован кеш для ${id}`);
        setData(cached.movieData);
        setLoading(false);
        // Reset backdrop to trigger animation
        setIsBackdropLoaded(false);
      } else {
        setLoading(true);
        setIsBackdropLoaded(false);
      }

      setError(null);
      setErrorDetails("");
      // Сбрасываем franchise данные при загрузке нового фильма
      setFranchiseData(null);

      try {
        let result = cached;

        if (!result) {
          result = await fetchMovieFullData(id);
        }

        if (isCancelled) return;

        // Если данные не из кеша, обновляем стейт
        if (!cached) {
          setData(result.movieData);
          setLoading(false);
        }

        const { kpId } = result;

        // Загружаем franchise асинхронно (не блокируем отображение страницы)
        if (kpId) {
          setKpId(kpId); // Сохраняем kpId в состояние
          console.log(`📡 kp_id найден: ${kpId} - начинаем загрузку franchise`);
          const franchiseStart = Date.now();
          const currentIdForFranchise = id; // Сохраняем id для проверки

          // Функция для загрузки franchise
          const loadFranchise = async (attemptNumber: number = 1) => {
            try {
              const data = await fetchFranchise(kpId, 2);

              // Проверяем что мы все еще на той же странице (id не изменился)
              if (currentIdRef.current !== currentIdForFranchise) {
                return;
              }

              if (data) {
                setFranchiseData(data);
              } else {
                // Если данные не получены и это первая попытка - пробуем еще раз через 2 секунды
                if (attemptNumber === 1) {
                  setTimeout(() => {
                    // Проверяем что мы все еще на той же странице перед повторной попыткой
                    if (currentIdRef.current === currentIdForFranchise) {
                      loadFranchise(2);
                    }
                  }, 2000);
                }
              }
            } catch (e) {
              // Проверяем что мы все еще на той же странице даже при ошибке
              if (currentIdRef.current !== currentIdForFranchise) {
                return;
              }

              // Если это первая попытка - пробуем еще раз через 2 секунды
              if (attemptNumber === 1) {
                setTimeout(() => {
                  if (currentIdRef.current === currentIdForFranchise) {
                    loadFranchise(2);
                  }
                }, 2000);
              }
            }
          };

          // Запускаем первую попытку
          loadFranchise(1);
        } else {
          console.warn(`⚠️ kp_id не найден - franchise не будет загружен.`);
        }
      } catch (e) {
        if (!isCancelled) {
          setError(e);
          console.error("MoviePage error:", e);

          if (!errorDetails) {
            setErrorDetails(
              e instanceof Error ? e.message : "Неизвестная ошибка"
            );
          }
        }
        // Скрываем loader при ошибке
        setLoading(false);
      }
    };

    loadData();

    // Cleanup функция - отменяет обработку результатов при размонтировании или смене id
    return () => {
      isCancelled = true;
    };
  }, [id]);

  // Убрали эффект прокрутки для хедера: чистый, без blur и границы

  if (loading) {
    return (
      <div className="min-h-[100dvh] min-h-screen relative bg-zinc-950">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur-3xl -z-10" />

        <div className="max-w-6xl mx-auto px-4 pt-0 pb-6 md:py-8 relative z-0">
          <div className="flex items-center justify-center min-h-[100dvh] min-h-screen">
            <Loader size="lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data || !data.details) {
    return (
      <div className="min-h-[100dvh] min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-950/50 border border-red-900/50 p-6 text-red-400 rounded backdrop-blur-sm max-w-md text-center">
          <h2 className="text-lg font-semibold mb-2">Ошибка загрузки</h2>
          <p className="text-sm text-red-300 mb-4">{errorDetails}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-800 hover:bg-red-700 rounded text-white text-sm transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  let movie = data.details;
  // Локальная копия данных франшизы для отображения
  let franchise = franchiseData;

  // Мердж локальных оверрайдов (например, bg_poster/backdrop)
  // Определяем тип контента и выбираем соответствующий набор оверрайдов
  const typeRawForOverride = (movie as any).type ?? (data as any).type ?? "";
  const tForOverride = String(typeRawForOverride).toLowerCase();
  const isSerialForOverride =
    tForOverride.includes("serial") ||
    tForOverride.includes("series") ||
    tForOverride.includes("tv") ||
    tForOverride.includes("сериал");
  // Применяем override приоритетно ко всем полям
  const override =
    overrideData ??
    (isSerialForOverride ? getSeriesOverride(id) : getMovieOverride(id));
  if (override) {
    const deepMergePreferOverride = (base: any, ov: any) => {
      if (!ov || typeof ov !== "object") return base;
      const result: any = Array.isArray(base) ? [...base] : { ...base };
      for (const key of Object.keys(ov)) {
        const ovVal = (ov as any)[key];
        const baseVal = (base as any)?.[key];
        if (ovVal && typeof ovVal === "object" && !Array.isArray(ovVal)) {
          result[key] = deepMergePreferOverride(baseVal || {}, ovVal);
        } else {
          result[key] = ovVal; // override имеет приоритет
        }
      }
      return result;
    };

    movie = deepMergePreferOverride(movie, override);

    // Применяем оверрайды франшизы, если есть
    if (override?.franchise) {
      const deepMergePreferOverrideFr = (base: any, ov: any) => {
        if (!ov || typeof ov !== "object") return base;
        const result: any = Array.isArray(base) ? [...base] : { ...base };
        for (const key of Object.keys(ov)) {
          const ovVal = (ov as any)[key];
          const baseVal = (base as any)?.[key];
          if (ovVal && typeof ovVal === "object" && !Array.isArray(ovVal)) {
            result[key] = deepMergePreferOverrideFr(baseVal || {}, ovVal);
          } else {
            result[key] = ovVal; // override имеет приоритет
          }
        }
        return result;
      };
      franchise = deepMergePreferOverrideFr(
        franchise || {},
        override.franchise
      );
    }
  }

  const favoriteMovieInfo = (() => {
    if (!movie) return null;
    const m: any = movie;
    const movieId = String(m.id ?? id ?? "");
    if (!movieId) return null;
    const title =
      m.title ??
      m.name ??
      m.details?.name ??
      m.details?.title ??
      data?.details?.name ??
      "Без названия";
    const poster =
      m.poster ??
      m.bg_poster?.poster ??
      m.cover ??
      m.preview ??
      m.poster_path ??
      null;
    const backdrop =
      m.bg_poster?.backdrop ??
      m.wide_poster ??
      m.backdrop ??
      m.background ??
      poster ??
      null;
    const year =
      m.year ??
      m.released ??
      m.release_year ??
      m.releaseYear ??
      (m.details ? m.details.release_year : null);
    const rating = m.rating_kp ?? m.rating ?? m.imdb_rating ?? null;
    const country = m.country ?? m.details?.country ?? null;
    const genre = Array.isArray(m.genre)
      ? m.genre[0]
      : m.genre ?? (Array.isArray(m.tags) ? m.tags[0] : m.tags);
    const description =
      m.description ??
      m.about ??
      (Array.isArray(m.description) ? m.description.join(" ") : null);
    const duration = m.duration ?? m.time ?? m.runtime ?? null;
    const logo = m.poster_logo ?? m.logo ?? null;
    const payload = {
      id: movieId,
      title,
      poster,
      backdrop,
      year,
      rating,
      country,
      genre,
      description,
      duration,
      logo,
      poster_colors: m.poster_colors,
      type:
        m.type ??
        m.details?.type ??
        (data as any)?.type ??
        (typeof m.is_serial === "boolean" && m.is_serial ? "serial" : null),
    };
    return { payload, isFav: isFavorite(movieId) };
  })();

  const handleToggleFavorite = () => {
    if (!favoriteMovieInfo?.payload) return;
    toggleFavorite(favoriteMovieInfo.payload);
  };

  const isFavoriteCurrent = favoriteMovieInfo?.isFav ?? false;

  // Helper for actor photos
  const getActorPhoto = (actor: any): string | null => {
    if (!actor || typeof actor !== "object") return null;
    const posterCandidate =
      actor?.poster ??
      actor?.photo ??
      actor?.image ??
      actor?.avatar ??
      actor?.picture ??
      actor?.pic ??
      actor?.poster_url ??
      actor?.cover ??
      actor?.icon;
    const src = String(posterCandidate ?? "")
      .replace(/[`'"]/g, "")
      .trim();
    const invalids = ["null", "undefined", "—", "none", "n/a", "no-image"];
    const isImageLike =
      src.startsWith("data:image") ||
      /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(src) ||
      src.startsWith("/") ||
      src.startsWith("http");
    return !!src && !invalids.includes(src.toLowerCase()) && isImageLike
      ? src
      : null;
  };

  const topActors = (() => {
    const list = (movie as any).casts || (data as any).casts || [];
    if (!Array.isArray(list)) return [];
    return list
      .filter((a: any) => {
        const key = String(a.id || a.name || "");
        return (
          (a.name || a.title) && getActorPhoto(a) && !failedActorImages.has(key)
        );
      })
      .slice(0, 8);
  })();

  // Helper to find list in multiple sources with multiple keys
  const findList = (keys: string[], ...sources: any[]) => {
    for (const source of sources) {
      if (!source || typeof source !== "object") continue;
      for (const key of keys) {
        const val = (source as any)[key];
        if (Array.isArray(val) && val.length > 0) return val;
      }
    }
    return [];
  };

  const seqList = findList(
    [
      "sequelsAndPrequels",
      "sequels_and_prequels",
      "sequels",
      "prequels",
      "related",
    ],
    movie,
    data,
    franchise,
    override
  );

  const similarList = findList(
    ["similar_movies", "similar", "recommendations", "similars"],
    movie,
    data,
    franchise,
    override
  );

  const detailsTitle = (() => {
    const typeRaw = (movie as any).type ?? (data as any).type ?? "";
    const t = String(typeRaw).toLowerCase();
    const isSerial =
      t.includes("serial") ||
      t.includes("series") ||
      t.includes("tv") ||
      t.includes("сериал");
    return isSerial ? "О сериале" : "О фильме";
  })();

  // Год для заголовка: добавляем в скобках, если есть
  const titleYear = (() => {
    const raw =
      (movie as any).year ??
      (movie as any).released ??
      (movie as any).release_year ??
      (movie as any).releaseYear;
    if (raw == null) return null;
    const s = String(raw).trim();
    if (!s || s === "0") return null;
    const match = s.match(/\d{4}/);
    return match ? match[0] : s;
  })();

  const formatQuality = () => {
    const quality = (movie as any).quality;
    const tags = Array.isArray((movie as any).tags)
      ? (movie as any).tags.join(", ")
      : (movie as any).tags ?? "";
    const combined = [quality, tags]
      .filter((v) => v && String(v).trim().length > 0)
      .join(" • ");
    return combined || "-";
  };

  const formatDuration = () => {
    const raw =
      (movie as any).duration ??
      (movie as any).time ??
      (movie as any).runtime ??
      (movie as any).length;
    const toMinutes = (val: any): number | null => {
      if (val == null) return null;
      if (typeof val === "number" && !Number.isNaN(val)) return Math.round(val);
      if (typeof val === "string") {
        const s = val.trim().toLowerCase();
        if (s.includes(":")) {
          const parts = s.split(":").map((p) => parseInt(p, 10));
          if (parts.every((n) => !Number.isNaN(n))) {
            if (parts.length === 3) {
              const [h, m] = parts;
              return h * 60 + m;
            }
            if (parts.length === 2) {
              const [h, m] = parts;
              return h * 60 + m;
            }
          }
        }
        const hoursMatch = s.match(
          /(\d+)\s*(ч|час|часа|часов|h|hr|hour|hours)/
        );
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
    if (mins == null) return "—";
    if (mins % 60 === 0) return `${mins} мин`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}ч ${m} мин` : `${m} мин`;
  };

  const formatDate = (dateValue: any): string => {
    if (!dateValue) return "—";

    const tryParse = (val: any): Date | null => {
      if (val instanceof Date && !isNaN(val.getTime())) return val;
      if (typeof val === "number") {
        if (val > 1e12) return new Date(val); // ms
        if (val > 1e9) return new Date(val * 1000); // sec
        return null;
      }
      if (typeof val === "string") {
        const s = val.trim();
        if (!s) return null;
        // Пропустим чисто год вида "2020"
        if (/^\d{4}$/.test(s)) return null;
        // ISO 8601 YYYY-MM-DD
        let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
        if (m) {
          const y = parseInt(m[1], 10);
          const mo = parseInt(m[2], 10);
          const d = parseInt(m[3], 10);
          if (!isNaN(y) && !isNaN(mo) && !isNaN(d))
            return new Date(y, mo - 1, d);
        }
        // DD.MM.YYYY
        m = s.match(/^(\d{1,2})[.](\d{1,2})[.](\d{4})$/);
        if (m) {
          const d = parseInt(m[1], 10);
          const mo = parseInt(m[2], 10);
          const y = parseInt(m[3], 10);
          if (!isNaN(y) && !isNaN(mo) && !isNaN(d))
            return new Date(y, mo - 1, d);
        }
        // DD/MM/YYYY
        m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) {
          const d = parseInt(m[1], 10);
          const mo = parseInt(m[2], 10);
          const y = parseInt(m[3], 10);
          if (!isNaN(y) && !isNaN(mo) && !isNaN(d))
            return new Date(y, mo - 1, d);
        }
        // Попытка нативного парсинга (на случай полнотекстовых дат)
        const t = Date.parse(s);
        if (!isNaN(t)) return new Date(t);
      }
      return null;
    };

    const dt = tryParse(dateValue);
    if (!dt) return "—";
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(dt);
  };

  const formatReleaseDate = () => {
    const pick = (...keys: string[]) => {
      for (const k of keys) {
        const v = (movie as any)[k];
        if (v != null && String(v).trim() !== "") return v;
      }
      return null;
    };
    // Поддержим разные наименования полей из API
    const raw = pick(
      "release_date",
      "releaseDate",
      "premiere_world",
      "premiere_ru",
      "worldPremiere",
      "premiere",
      "first_air_date",
      "air_date",
      "aired",
      "released_at",
      "releasedDate",
      "date",
      // как самый крайний фолбэк – released (часто это только год)
      "released"
    );
    return formatDate(raw);
  };

  // Подсчет среднего рейтинга (HDBOX) по КП и IMDb
  const getValidRating = (r: any): number | null => {
    if (r == null) return null;
    const v = parseFloat(String(r));
    if (Number.isNaN(v)) return null;
    if (String(r) === "0.0" || v === 0) return null;
    return v;
  };
  const ratingKP = getValidRating((movie as any).rating_kp);
  const ratingIMDb = getValidRating((movie as any).rating_imdb);

  const backdropUrl =
    (movie as any).backdrop || (movie as any).bg_poster?.backdrop;

  const studioLogos: string[] = (() => {
    const raw = (movie as any).studio_logo;
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw
        .map((v) => (v == null ? "" : String(v).trim()))
        .filter((s) => s.length > 0);
    }
    const s = String(raw).trim();
    if (!s) return [];
    if (s.includes(",")) {
      return s
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
    }
    return [s];
  })();

  return (
    <>
      {/* Navigation Arrows - Outside animated container to keep position stable */}
      {navIds.length > 0 && navIndex !== null && (
        <>
          {navIndex > 0 && (
            <Link
              href={`/movie/${navIds[navIndex - 1]}`}
              className="fixed left-4 top-1/2 -translate-y-1/2 z-[100] p-3 bg-black/30 hover:bg-black/60 text-white/70 hover:text-white rounded-full backdrop-blur-sm transition-all hidden md:flex border border-white/10 hover:border-white/30"
              title="Предыдущий"
            >
              <IconChevronLeft size={32} stroke={1.5} />
            </Link>
          )}
          {navIndex < navIds.length - 1 && (
            <Link
              href={`/movie/${navIds[navIndex + 1]}`}
              className="fixed right-4 top-1/2 -translate-y-1/2 z-[100] p-3 bg-black/30 hover:bg-black/60 text-white/70 hover:text-white rounded-full backdrop-blur-sm transition-all hidden md:flex border border-white/10 hover:border-white/30"
              title="Следующий"
            >
              <IconChevronRight size={32} stroke={1.5} />
            </Link>
          )}
        </>
      )}

      <div
        key={id}
        className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-white/20 relative overflow-x-hidden animate-in fade-in duration-700"
      >
        <header className="absolute top-0 left-0 w-full z-50 p-6 md:p-8 flex items-center justify-between pointer-events-none">
          <Link
            href={returnHref ?? "/"}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full hover:bg-black/40 pointer-events-auto"
            onClick={(e) => {
              try {
                const sameOriginRef =
                  typeof document !== "undefined" &&
                  document.referrer &&
                  document.referrer.startsWith(location.origin);
                if (sameOriginRef) {
                  e.preventDefault();
                  router.back();
                  return;
                }
                if (returnHref) {
                  e.preventDefault();
                  router.push(returnHref);
                  return;
                }
              } catch {}
            }}
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Назад</span>
          </Link>

          {studioLogos.length > 0 && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex items-center gap-4">
              {studioLogos.map((logo, idx) => (
                <img
                  key={idx}
                  src={logo}
                  alt={`Studio Logo ${idx + 1}`}
                  className="h-8 md:h-10 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                />
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
            className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 text-white/80 hover:text-white transition-colors pointer-events-auto"
            title={
              isFullscreen
                ? "Выйти из полноэкранного режима"
                : "Полноэкранный режим"
            }
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>

          {isTrailerPlaying && (
            <button
              onClick={toggleMute}
              className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm hover:bg-black/40 text-white/80 hover:text-white transition-colors pointer-events-auto ml-2"
              title={isMuted ? "Включить звук" : "Выключить звук"}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          )}
          </div>
        </header>

        {/* Hero Background */}
        <div className="relative min-h-[100svh] w-full overflow-hidden flex flex-col justify-end md:block bg-zinc-950">
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/10 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/50 via-zinc-950/5 to-transparent z-10" />

          {isTrailerPlaying && trailerData ? (
            <>
              {/* Desktop Background Player */}
              {!isMobile && (
                <div className="hidden md:block absolute inset-0 w-full h-full z-[1] bg-black animate-in fade-in duration-700">
                  <iframe
                    ref={playerRef}
                    src={desktopTrailerUrl || ""}
                    className="w-full h-full object-cover scale-125 pointer-events-none"
                    allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {/* Mobile Modal Player - Absolute in Hero */}
              {isMobile && (
                <div className="md:hidden absolute inset-0 z-[100] bg-zinc-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTrailerPlaying(false);
                    }}
                    className="absolute top-20 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all active:scale-90 z-50"
                  >
                    <X size={24} />
                  </button>
                  <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
                    <iframe
                      src={mobileTrailerUrl || ""}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <p className="mt-4 text-zinc-400 text-sm font-medium">
                    Трейлер
                  </p>
                </div>
              )}
            </>
          ) : backdropUrl ? (
            <img
              src={backdropUrl}
              alt={movie.name}
              loading="eager"
              fetchPriority="high"
              onLoad={() => setIsBackdropLoaded(true)}
              className={`absolute inset-0 w-full h-full object-cover object-top transition-all duration-1000 ease-out ${
                isBackdropLoaded
                  ? "opacity-100 blur-0 scale-100"
                  : "opacity-0 blur-xl scale-110"
              }`}
            />
          ) : (
            <img
              src={movie.poster}
              alt={movie.name}
              className="absolute inset-0 w-full h-full object-cover object-top opacity-40 blur-xl scale-110"
            />
          )}

          {/* Desktop Content Gradient Overlay - Feathered (Растушевка) */}
          <div className="absolute inset-0 w-full md:w-[75%] bg-gradient-to-r from-zinc-950/60 via-zinc-950/30 to-transparent z-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-zinc-950/50 to-transparent z-20 pointer-events-none" />

          {/* Hero Content Overlay */}
          <div className="relative md:absolute bottom-0 left-0 z-20 p-6 md:p-12 w-full md:w-2/3 lg:w-1/2 flex flex-col gap-4 pt-32 pb-8 md:pt-32 md:pb-12 mt-auto md:animate-in md:fade-in md:slide-in-from-left-10 md:duration-1000 md:ease-out">
            {/* TS Quality Warning */}
            {showTsWarning && (
              <div className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 px-4 py-3 rounded-xl backdrop-blur-md flex items-center gap-3 w-fit max-w-xl animate-in fade-in slide-in-from-bottom-2">
                <Info className="w-5 h-5 flex-shrink-0 text-yellow-400" />
                <p className="text-sm font-medium leading-relaxed">
                  Не расстраивайтесь, скоро выйдет в хорошем качестве
                </p>
              </div>
            )}

            {(movie as any).poster_logo ? (
              <img
                src={(movie as any).poster_logo}
                alt={movie.name}
                loading="eager"
                fetchPriority="high"
                decoding="sync"
                className="h-24 md:h-28 w-auto max-w-[280px] md:max-w-[400px] object-contain self-start mb-2 mt-8"
              />
            ) : isOverrideLoading ? (
              <div className="h-12 md:h-16 w-64" />
            ) : (
              <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-lg leading-tight">
                {movie.name}
              </h1>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm md:text-base text-zinc-200 font-medium drop-shadow-md">
              {(() => {
                const kp = parseFloat(
                  String(movie.rating_kp || "").replace(",", ".")
                );
                const imdb = parseFloat(
                  String(movie.rating_imdb || "").replace(",", ".")
                );
                const hasKp = !isNaN(kp) && kp > 0;
                const hasImdb = !isNaN(imdb) && imdb > 0;

                let rating: number | null = null;

                if (hasKp && hasImdb) {
                  rating = (kp + imdb) / 2;
                } else if (hasKp) {
                  rating = kp;
                } else if (hasImdb) {
                  rating = imdb;
                }

                if (!rating) return null;

                // Convert 0-10 scale to percentage (e.g. 8.5 -> 85%)
                const percent = Math.round(rating * 10);
                const colorClass =
                  rating >= 7
                    ? "text-green-400"
                    : rating >= 5
                    ? "text-yellow-400"
                    : "text-red-400";
                return (
                  <span className={`${colorClass} font-bold`}>
                    {percent}% совпадение
                  </span>
                );
              })()}
              {(() => {
                const list = Array.isArray(movie.country)
                  ? movie.country
                  : String(movie.country || "").split(",");
                const topOne = list
                  .map((s: any) => String(s).trim())
                  .filter(Boolean)
                  .slice(0, 1);
                return topOne.length > 0 ? <span>{topOne[0]}</span> : null;
              })()}
              <span>{titleYear}</span>
              <span className="border border-zinc-400/50 px-1.5 py-0.5 rounded text-xs bg-black/30 backdrop-blur-sm">
                {(() => {
                  const val = movie.age ?? movie.age_limit;
                  const num =
                    val !== null && val !== undefined
                      ? String(val).replace(/\D/g, "")
                      : null;
                  return num ? `${num}+` : "18+";
                })()}
              </span>
              <span>{formatDuration()}</span>
              {/* Fix content jump by showing movie quality immediately if available */}
              {(() => {
                // Логика получения качества:
                // 1. Сначала проверяем tags (так как пользователь просил приоритет)
                // 2. Затем проверяем франшизу (qualityInfo.quality)
                // 3. Если ничего нет - не рендерим

                // Пробуем найти качество в тегах
                const tags = (movie as any).tags;
                let tagQuality = null;
                if (Array.isArray(tags)) {
                  tagQuality = tags.find((t: any) =>
                    ["4K", "HD", "1080p", "720p", "CAMRip", "TS"].some((q) =>
                      String(t).toUpperCase().includes(q)
                    )
                  );
                }

                // Определяем финальное значение
                const finalQuality =
                  tagQuality ||
                  (typeof qualityInfo !== "undefined" &&
                    qualityInfo?.quality) ||
                  (movie as any).quality;

                // Если это мобилка, всегда рендерим контейнер (скелетон или значение), чтобы не прыгало
                // Если десктоп - рендерим только если есть значение

                if (isMobile) {
                  if (finalQuality) {
                    return (
                      <span className="border border-zinc-400/50 px-1.5 py-0.5 rounded text-xs bg-black/30 backdrop-blur-sm">
                        {finalQuality}
                      </span>
                    );
                  } else {
                    // Скелетон/пустышка для мобилки, чтобы зарезервировать место и избежать скачка
                    return (
                      <span
                        className="border border-transparent px-1.5 py-0.5 rounded text-xs bg-transparent w-[24px] inline-block select-none"
                        aria-hidden="true"
                      >
                        &nbsp;
                      </span>
                    );
                  }
                }

                // Для десктопа возвращаем только если есть значение
                return finalQuality ? (
                  <span className="border border-zinc-400/50 px-1.5 py-0.5 rounded text-xs bg-black/30 backdrop-blur-sm">
                    {finalQuality}
                  </span>
                ) : null;
              })()}
            </div>

            <p className="text-zinc-200 text-sm md:text-lg line-clamp-3 md:line-clamp-4 drop-shadow-md max-w-2xl font-light leading-relaxed">
              {movie.description || movie.about || "Нет описания"}
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-4">
              <button
                onClick={() => {
                  setShowWatchOverlay(true);
                }}
                className="bg-white text-black px-6 py-3 md:px-8 rounded-[4px] font-bold flex items-center justify-center gap-2 hover:bg-white/90 transition active:scale-95 flex-1 md:flex-none min-w-[140px]"
              >
                <Play
                  size={20}
                  fill="currentColor"
                  className="ml-1 md:w-6 md:h-6"
                />
                <span className="text-base md:text-lg">Смотреть</span>
              </button>
              <button
                onClick={() => {
                  tabsRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-zinc-500/40 text-white px-4 py-3 md:px-6 rounded-[4px] font-bold flex items-center justify-center gap-2 hover:bg-zinc-500/50 transition backdrop-blur-sm active:scale-95 flex-1 md:flex-none min-w-[140px]"
              >
                <Info size={20} className="md:w-6 md:h-6" />
                <span className="text-base md:text-lg">Подробнее</span>
              </button>
              <div className="flex gap-3 w-full md:w-auto justify-start">
                <button
                  onClick={handleToggleFavorite}
                  className={`p-3 rounded-full border-2 transition active:scale-95 backdrop-blur-sm ${
                    isFavoriteCurrent
                      ? "border-white bg-white text-black"
                      : "border-zinc-400/50 text-zinc-200 hover:border-white hover:text-white hover:bg-white/10"
                  }`}
                  title={
                    isFavoriteCurrent
                      ? "Убрать из избранного"
                      : "Добавить в избранное"
                  }
                  aria-pressed={isFavoriteCurrent}
                >
                  {isFavoriteCurrent ? (
                    <Heart size={20} fill="currentColor" />
                  ) : (
                    <Plus size={20} />
                  )}
                </button>
                {hasTrailers && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setIsTrailerPlaying(!isTrailerPlaying);
                    }}
                    className={`p-3 rounded-full border-2 transition active:scale-95 backdrop-blur-sm ${
                      isTrailerPlaying
                        ? "border-white text-white bg-white/20"
                        : "border-zinc-400/50 text-zinc-200 hover:border-white hover:text-white hover:bg-white/10"
                    }`}
                    title={
                      isTrailerPlaying
                        ? "Остановить трейлер"
                        : "Смотреть трейлер"
                    }
                  >
                    {isTrailerPlaying ? (
                      <X size={20} />
                    ) : (
                      <svg
                        aria-hidden="true"
                        fill="currentColor"
                        height="20"
                        viewBox="0 0 48 48"
                        width="20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          clipRule="evenodd"
                          d="M42 24C42 31.2328 38.3435 37.6115 32.7782 41.3886C33.1935 41.2738 33.602 41.1447 34 41C45.1693 36.9384 47 32 47 32L48 35C48 35 44.3832 40.459 34.5 43.5C28 45.5 21 45 21 45C9.40202 45 0 35.598 0 24C0 12.402 9.40202 3 21 3C32.598 3 42 12.402 42 24ZM21 19C24.3137 19 27 16.3137 27 13C27 9.68629 24.3137 7 21 7C17.6863 7 15 9.68629 15 13C15 16.3137 17.6863 19 21 19ZM10 30C13.3137 30 16 27.3137 16 24C16 20.6863 13.3137 18 10 18C6.68629 18 4 20.6863 4 24C4 27.3137 6.68629 30 10 30ZM38 24C38 27.3137 35.3137 30 32 30C28.6863 30 26 27.3137 26 24C26 20.6863 28.6863 18 32 18C35.3137 18 38 20.6863 38 24ZM21 26C22.1046 26 23 25.1046 23 24C23 22.8954 22.1046 22 21 22C19.8954 22 19 22.8954 19 24C19 25.1046 19.8954 26 21 26ZM27 35C27 38.3137 24.3137 41 21 41C17.6863 41 15 38.3137 15 35C15 31.6863 17.6863 29 21 29C24.3137 29 27 31.6863 27 35Z"
                          fill="currentColor"
                          fillRule="evenodd"
                        ></path>
                      </svg>
                    )}
                  </button>
                )}
                <button
                  onClick={handleShare}
                  className="p-3 rounded-full border-2 border-zinc-400/50 text-zinc-200 hover:border-white hover:text-white hover:bg-white/10 transition active:scale-95 backdrop-blur-sm"
                  title="Поделиться"
                >
                  <svg
                    aria-hidden="true"
                    fill="currentColor"
                    height="20"
                    viewBox="0 0 48 48"
                    width="20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M25.5 5.745L30.885 11.115L33 9L24 0L15 9L17.115 11.115L22.5 5.745V27H25.5V5.745Z"
                      fill="currentColor"
                    ></path>
                    <path
                      d="M5 17V40C5 40.7956 5.31607 41.5587 5.87868 42.1213C6.44129 42.6839 7.20435 43 8 43H40C40.7956 43 41.5587 42.6839 42.1213 42.1213C42.6839 41.5587 43 40.7957 43 40V17C43 16.2043 42.6839 15.4413 42.1213 14.8787C41.5587 14.3161 40.7957 14 40 14H35.5V17H40V40H8L8 17H12.5V14L8 14C7.20435 14 6.44129 14.3161 5.87868 14.8787C5.31607 15.4413 5 16.2043 5 17Z"
                      fill="currentColor"
                    ></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Actors Overlay (Bottom Right) */}
          {topActors.length > 0 && (
            <div className="hidden md:flex absolute bottom-12 right-12 z-20 flex-col items-end gap-2 animate-in fade-in slide-in-from-right-10 duration-1000 delay-200">
              <style jsx global>{`
                @keyframes blur-fade-in {
                  0% {
                    opacity: 0;
                    filter: blur(10px);
                    transform: scale(0.8);
                  }
                  100% {
                    opacity: 1;
                    filter: blur(0);
                    transform: scale(1);
                  }
                }
                .animate-blur-fade-in {
                  animation: blur-fade-in 0.8s ease-out both;
                }
              `}</style>
              <div className="flex items-center gap-2 pl-0">
                {topActors.map((actor: any, i: number) => (
                  <Tooltip key={i}>
                    <TooltipTrigger asChild>
                      <Link
                        href={`/actor/${actor.id}`}
                        className="relative transition-transform hover:scale-110 hover:z-10 duration-500"
                        onClick={() => {
                          try {
                            const raw = localStorage.getItem("__actorInfo");
                            const map = raw ? JSON.parse(raw) : {};
                            map[String(actor.id)] = {
                              name: actor.name || actor.title,
                              photo: getActorPhoto(actor),
                            };
                            localStorage.setItem(
                              "__actorInfo",
                              JSON.stringify(map)
                            );
                          } catch {}
                        }}
                      >
                        <img
                          src={getActorPhoto(actor)!}
                          alt={actor.name || actor.title}
                          className="w-16 h-16 rounded-full object-cover shadow-lg animate-blur-fade-in"
                          style={{ animationDelay: `${i * 100 + 500}ms` }}
                          onError={() => {
                            const key = String(actor.id || actor.name || "");
                            setFailedActorImages((prev) => {
                              const next = new Set(prev);
                              next.add(key);
                              return next;
                            });
                          }}
                        />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="font-bold bg-white text-black border-0 shadow-xl"
                    >
                      <p>{actor.name || actor.title}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabs Section */}
        <div
          ref={tabsRef}
          className="relative z-30 bg-zinc-950 px-4 md:px-12 pb-20 min-h-screen"
        >
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="flex items-center gap-6 overflow-x-auto scrollbar-hide border-b border-white/10 bg-transparent p-0 mb-8 w-full justify-start h-auto">
              <TabsTrigger
                value="overview"
                className="rounded-none border-t-4 border-transparent px-0 py-3 text-sm font-bold uppercase text-zinc-400 hover:text-zinc-200 data-[state=active]:border-transparent data-[state=active]:text-white data-[state=active]:bg-transparent transition-colors"
              >
                Обзор
              </TabsTrigger>
              <TabsTrigger
                value="trailers"
                className="rounded-none border-t-4 border-transparent px-0 py-3 text-sm font-bold uppercase text-zinc-400 hover:text-zinc-200 data-[state=active]:border-transparent data-[state=active]:text-white data-[state=active]:bg-transparent transition-colors"
              >
                Трейлеры
              </TabsTrigger>
              {franchise?.seasons &&
                Array.isArray(franchise.seasons) &&
                franchise.seasons.length > 0 && (
                  <TabsTrigger
                    value="episodes"
                    className="rounded-none border-t-4 border-transparent px-0 py-3 text-sm font-bold uppercase text-zinc-400 hover:text-zinc-200 data-[state=active]:border-transparent data-[state=active]:text-white data-[state=active]:bg-transparent transition-colors"
                  >
                    Эпизоды
                  </TabsTrigger>
                )}
              {Array.isArray(seqList) && seqList.length > 0 && (
                <TabsTrigger
                  value="sequels"
                  className="rounded-none border-t-4 border-transparent px-0 py-3 text-sm font-bold uppercase text-zinc-400 hover:text-zinc-200 data-[state=active]:border-transparent data-[state=active]:text-white data-[state=active]:bg-transparent transition-colors"
                >
                  Сиквелы и приквелы
                </TabsTrigger>
              )}
              {Array.isArray(similarList) && similarList.length > 0 && (
                <TabsTrigger
                  value="similar"
                  className="rounded-none border-t-4 border-transparent px-0 py-3 text-sm font-bold uppercase text-zinc-400 hover:text-zinc-200 data-[state=active]:border-transparent data-[state=active]:text-white data-[state=active]:bg-transparent transition-colors"
                >
                  Похожие
                </TabsTrigger>
              )}
            </TabsList>

            {/* Overview Tab */}
            <TabsContent
              value="overview"
              className="animate-in fade-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none"
            >
              <div className="grid md:grid-cols-[2fr_1fr] gap-8 md:gap-16">
                <div className="space-y-8">
                  {/* Poster + Plot + Ratings Container */}
                  <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                    {/* Poster (Left) - Desktop Only */}
                    {(movie.poster || (movie as any).poster_url) && (
                      <div className="hidden md:block flex-shrink-0 w-[280px]">
                        <div className="sticky top-24 rounded-lg overflow-hidden shadow-2xl border border-white/10">
                          <img
                            src={movie.poster || (movie as any).poster_url}
                            alt={movie.name || "Постер"}
                            className="w-full h-auto object-cover aspect-[2/3]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Content (Right) */}
                    <div className="flex-1 space-y-8 min-w-0">
                      <div className="space-y-4">
                        <h3 className="text-2xl font-semibold text-white">
                          Сюжет
                        </h3>
                        <p className="text-zinc-300 text-base md:text-lg leading-relaxed">
                          {movie.description ||
                            movie.about ||
                            "Описание отсутствует."}
                        </p>
                      </div>

                      {/* Ratings Block */}
                      <div className="flex items-center gap-4 p-4 bg-zinc-900/50 rounded-lg border border-white/5 w-fit flex-wrap">
                        {/* Средний рейтинг */}
                        <div className="flex flex-col items-center px-2">
                          <span className="text-zinc-400 text-xs uppercase tracking-wider mb-1">
                            Рейтинг
                          </span>
                          {(() => {
                            const kp = parseFloat(
                              String(movie.rating_kp || "").replace(",", ".")
                            );
                            const imdb = parseFloat(
                              String(movie.rating_imdb || "").replace(",", ".")
                            );
                            const hasKp = !isNaN(kp) && kp > 0;
                            const hasImdb = !isNaN(imdb) && imdb > 0;

                            let rating: number | null = null;
                            if (hasKp && hasImdb) rating = (kp + imdb) / 2;
                            else if (hasKp) rating = kp;
                            else if (hasImdb) rating = imdb;

                            if (!rating)
                              return (
                                <span className="text-2xl font-bold text-zinc-500">
                                  —
                                </span>
                              );

                            const colorClass =
                              rating >= 7
                                ? "text-green-500"
                                : rating >= 5
                                ? "text-yellow-500"
                                : "text-red-500";
                            return (
                              <span
                                className={`text-2xl font-bold ${colorClass}`}
                              >
                                {rating.toFixed(1)}
                              </span>
                            );
                          })()}
                        </div>

                        <div className="w-px h-8 bg-white/10" />

                        {/* Кинопоиск */}
                        <div className="flex items-center gap-3 px-2">
                          <img
                            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS7c46WVoj-3Dc9bezLc6iabLcvs813ggQ76A&s"
                            alt="Кинопоиск"
                            className="w-8 h-8 rounded-md object-cover"
                          />
                          <span
                            className={`text-xl font-bold ${ratingColor(
                              movie.rating_kp
                            )}`}
                          >
                            {movie.rating_kp &&
                            movie.rating_kp !== "0.0" &&
                            movie.rating_kp !== 0
                              ? Number(movie.rating_kp).toFixed(1)
                              : "—"}
                          </span>
                        </div>

                        <div className="w-px h-8 bg-white/10" />

                        {/* IMDb */}
                        <div className="flex items-center gap-3 px-2">
                          <img
                            src="https://upload.wikimedia.org/wikipedia/commons/6/69/IMDB_Logo_2016.svg"
                            alt="IMDb"
                            className="w-8 h-8 object-contain"
                          />
                          <span
                            className={`text-xl font-bold ${ratingColor(
                              movie.rating_imdb
                            )}`}
                          >
                            {movie.rating_imdb &&
                            movie.rating_imdb !== "0.0" &&
                            movie.rating_imdb !== 0
                              ? Number(movie.rating_imdb).toFixed(1)
                              : "—"}
                          </span>
                        </div>

                        {studioLogos.length > 0 && (
                          <>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="flex flex-col items-start gap-1 px-2 min-w-[120px]">
                              <span className="text-zinc-400 text-xs uppercase tracking-wider">
                                Производство
                              </span>
                              <div className="flex items-center gap-2">
                                {studioLogos.map((src, index) => (
                                  <img
                                    key={`${src}-${index}`}
                                    src={src}
                                    alt="Логотип киностудии"
                                    className="h-8 md:h-9 w-auto object-contain opacity-90 drop-shadow-[0_10px_32px_rgba(0,0,0,0.8)]"
                                  />
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cast List (Moved from sidebar) */}
                  <CastList casts={movie.casts || data.casts || []} />

                  {/* Shooting Photos Slider */}
                  {franchise?.shooting_photos &&
                    Array.isArray(franchise.shooting_photos) &&
                    franchise.shooting_photos.length > 0 && (
                      <div className="mb-8">
                        <ShootingPhotosSlider
                          photos={franchise.shooting_photos}
                        />
                      </div>
                    )}

                  {/* Trivia / Facts Section */}
                  {(() => {
                    const franchiseTrivia =
                      franchise?.trivia || franchise?.facts;
                    const movieFacts = movie?.facts;

                    if (franchiseTrivia) {
                      if (
                        typeof franchiseTrivia === "string" &&
                        franchiseTrivia.trim().length > 0
                      ) {
                        return (
                          <div className="space-y-4">
                            <h3 className="text-2xl font-semibold text-white">
                              Знаете ли вы что?
                            </h3>
                            <TriviaSection trivia={franchiseTrivia} />
                          </div>
                        );
                      }
                      if (
                        Array.isArray(franchiseTrivia) &&
                        franchiseTrivia.length > 0
                      ) {
                        return (
                          <div className="space-y-4">
                            <h3 className="text-2xl font-semibold text-white">
                              Знаете ли вы что?
                            </h3>
                            <div className="space-y-4">
                              {franchiseTrivia.map((fact: any, i: number) => {
                                const text =
                                  typeof fact === "object" ? fact.value : fact;
                                const isSpoiler =
                                  typeof fact === "object" && fact.spoiler;
                                if (!text) return null;
                                return (
                                  <div
                                    key={i}
                                    className={`bg-zinc-900/30 p-4 rounded-lg border border-white/5 ${
                                      isSpoiler ? "opacity-75" : ""
                                    }`}
                                  >
                                    {isSpoiler && (
                                      <span className="text-red-400 text-xs font-bold uppercase mb-1 block">
                                        Спойлер
                                      </span>
                                    )}
                                    <div
                                      className="text-zinc-300 text-base leading-relaxed [&>a]:text-blue-400 [&>a]:underline"
                                      dangerouslySetInnerHTML={{ __html: text }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                    }

                    if (Array.isArray(movieFacts) && movieFacts.length > 0) {
                      return (
                        <div className="space-y-4">
                          <h3 className="text-2xl font-semibold text-white">
                            Знаете ли вы что?
                          </h3>
                          <div className="space-y-4">
                            {movieFacts.map((fact: any, i: number) => {
                              const text =
                                typeof fact === "object" ? fact.value : fact;
                              const isSpoiler =
                                typeof fact === "object" && fact.spoiler;
                              if (!text) return null;
                              return (
                                <div
                                  key={i}
                                  className={`bg-zinc-900/30 p-4 rounded-lg border border-white/5 ${
                                    isSpoiler ? "opacity-75" : ""
                                  }`}
                                >
                                  {isSpoiler && (
                                    <span className="text-red-400 text-xs font-bold uppercase mb-1 block">
                                      Спойлер
                                    </span>
                                  )}
                                  <div
                                    className="text-zinc-300 text-base leading-relaxed [&>a]:text-blue-400 [&>a]:underline"
                                    dangerouslySetInnerHTML={{ __html: text }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })()}
                </div>

                <div className="space-y-8 text-base md:text-lg text-zinc-400">
                  <div>
                    <span className="block text-zinc-500 mb-3 uppercase text-sm font-bold tracking-wider">
                      {detailsTitle}
                    </span>
                    <div className="space-y-3">
                      {isSerialForOverride && franchise?.serial_status && (
                        <div className="grid grid-cols-[140px_1fr] gap-2">
                          <span className="text-zinc-500">Статус</span>
                          <span
                            className={`font-bold ${
                              String(franchise.serial_status).toLowerCase() ===
                              "offline"
                                ? "text-red-500"
                                : "text-green-500"
                            }`}
                          >
                            {String(franchise.serial_status).toLowerCase() ===
                            "offline"
                              ? "Закончен"
                              : "В эфире"}
                          </span>
                        </div>
                      )}
                      <div className="grid grid-cols-[140px_1fr] gap-2">
                        <span className="text-zinc-500">Режиссер</span>
                        <span className="text-zinc-200">
                          {Array.isArray(movie.director)
                            ? movie.director.join(", ")
                            : movie.director || "—"}
                        </span>
                      </div>
                      <div className="grid grid-cols-[140px_1fr] gap-2">
                        <span className="text-zinc-500">Сценаристы</span>
                        <span className="text-zinc-200">
                          {franchise?.screenwriter &&
                          franchise.screenwriter.length > 0
                            ? franchise.screenwriter.join(", ")
                            : "—"}
                        </span>
                      </div>
                      <div className="grid grid-cols-[140px_1fr] gap-2">
                        <span className="text-zinc-500">Продюсеры</span>
                        <span className="text-zinc-200">
                          {franchise?.producer && franchise.producer.length > 0
                            ? franchise.producer.join(", ")
                            : "—"}
                        </span>
                      </div>
                      <div className="grid grid-cols-[140px_1fr] gap-2">
                        <span className="text-zinc-500">Оператор</span>
                        <span className="text-zinc-200">
                          {franchise?.operator && franchise.operator.length > 0
                            ? franchise.operator.join(", ")
                            : "—"}
                        </span>
                      </div>
                      <div className="grid grid-cols-[140px_1fr] gap-2">
                        <span className="text-zinc-500">Монтаж</span>
                        <span className="text-zinc-200">
                          {franchise?.editor && franchise.editor.length > 0
                            ? franchise.editor.join(", ")
                            : "—"}
                        </span>
                      </div>
                      <div className="grid grid-cols-[140px_1fr] gap-2">
                        <span className="text-zinc-500">Художники</span>
                        <span className="text-zinc-200">
                          {franchise?.design && franchise.design.length > 0
                            ? franchise.design.join(", ")
                            : "—"}
                        </span>
                      </div>
                      <div className="grid grid-cols-[140px_1fr] gap-2">
                        <span className="text-zinc-500">Жанры</span>
                        <span className="text-zinc-200">
                          {Array.isArray(movie.genre)
                            ? movie.genre.join(", ")
                            : movie.genre || "—"}
                        </span>
                      </div>
                      <div className="grid grid-cols-[140px_1fr] gap-2">
                        <span className="text-zinc-500">Страна</span>
                        <span className="text-zinc-200">
                          {Array.isArray(movie.country)
                            ? movie.country.join(", ")
                            : movie.country || "—"}
                        </span>
                      </div>
                      <div className="grid grid-cols-[140px_1fr] gap-2">
                        <span className="text-zinc-500">Премьера</span>
                        <span className="text-zinc-200">
                          {formatReleaseDate()}
                        </span>
                      </div>
                      {/* Дополнительная информация из Franchise API */}
                      {franchise?.slogan && (
                        <div className="grid grid-cols-[140px_1fr] gap-2">
                          <span className="text-zinc-500">Слоган</span>
                          <span className="text-zinc-200">
                            «{franchise.slogan}»
                          </span>
                        </div>
                      )}
                      {franchise?.premier_rus && (
                        <div className="grid grid-cols-[140px_1fr] gap-2">
                          <span className="text-zinc-500">Премьера в РФ</span>
                          <span className="text-zinc-200">
                            {formatDate(franchise.premier_rus)}
                          </span>
                        </div>
                      )}
                      {franchise?.rate_mpaa && (
                        <div className="grid grid-cols-[140px_1fr] gap-2">
                          <span className="text-zinc-500">Рейтинг MPAA</span>
                          <span className="text-zinc-200">
                            {franchise.rate_mpaa}
                          </span>
                        </div>
                      )}
                      {franchise?.budget && (
                        <div className="grid grid-cols-[140px_1fr] gap-2">
                          <span className="text-zinc-500">Бюджет</span>
                          <span className="text-zinc-200">
                            {formatCurrency(franchise.budget)}
                          </span>
                        </div>
                      )}
                      {franchise?.fees_world && (
                        <div className="grid grid-cols-[140px_1fr] gap-2">
                          <span className="text-zinc-500">Сборы в мире</span>
                          <span className="text-zinc-200">
                            {formatCurrency(franchise.fees_world)}
                          </span>
                        </div>
                      )}
                      {franchise?.fees_rus && (
                        <div className="grid grid-cols-[140px_1fr] gap-2">
                          <span className="text-zinc-500">Сборы в РФ</span>
                          <span className="text-zinc-200">
                            {formatCurrency(franchise.fees_rus)}
                          </span>
                        </div>
                      )}
                      {franchise?.actors_dubl &&
                        Array.isArray(franchise.actors_dubl) &&
                        franchise.actors_dubl.length > 0 && (
                          <div className="grid grid-cols-[140px_1fr] gap-2">
                            <span className="text-zinc-500">
                              Актёры дубляжа
                            </span>
                            <span className="text-zinc-200">
                              {franchise.actors_dubl.join(", ")}
                            </span>
                          </div>
                        )}
                      {franchise?.voiceActing &&
                        Array.isArray(franchise.voiceActing) &&
                        franchise.voiceActing.length > 0 && (
                          <div className="grid grid-cols-[140px_1fr] gap-2">
                            <span className="text-zinc-500">Озвучка</span>
                            <span className="text-zinc-200">
                              {franchise.voiceActing.join(", ")}
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Trailers Tab */}
            <TabsContent
              value="trailers"
              className="animate-in fade-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none"
            >
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">
                    Трейлеры и тизеры
                  </h3>
                  <TrailerPlayer trailers={rawTrailers} mode="carousel" />
                </div>
              </div>
            </TabsContent>

            {/* Episodes Tab */}
            {franchise?.seasons && (
              <TabsContent
                value="episodes"
                className="animate-in fade-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none"
              >
                <div className="space-y-4">
                  {franchise.seasons.map((season: FranchiseSeason) => (
                    <div
                      key={season.season}
                      className="bg-zinc-900/30 border border-white/5 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleSeason(season.season)}
                        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left group"
                      >
                        <div className="flex items-center gap-4">
                          {season.poster ? (
                            <img
                              src={season.poster}
                              alt={`Сезон ${season.season}`}
                              className="w-10 h-14 object-cover rounded shadow-sm hidden sm:block"
                            />
                          ) : (
                            <div className="bg-zinc-800 w-12 h-12 flex items-center justify-center rounded text-xl font-bold text-zinc-400">
                              {season.season}
                            </div>
                          )}
                          <div>
                            <span className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                              Сезон {season.season}
                            </span>
                            {season.episodes && (
                              <span className="block text-sm text-zinc-500">
                                {season.episodes.length} эпизодов
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-zinc-500 transition-transform duration-300 ${
                            openSeasons.has(season.season) ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {openSeasons.has(season.season) && season.episodes && (
                        <div className="p-4 pt-0 border-t border-white/5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {season.episodes.map((episode: FranchiseEpisode) => {
                            const isAvailable =
                              !!(
                                episode.iframe_url ||
                                season.iframe_url ||
                                kpId
                              ) &&
                              (!episode.availability ||
                                new Date(episode.availability) <= new Date());

                            return (
                              <button
                                key={episode.episode}
                                disabled={!isAvailable}
                                onClick={() => {
                                  if (!isAvailable) return;
                                  const epUrl =
                                    episode.iframe_url ||
                                    season.iframe_url ||
                                    "";
                                  playEpisode(
                                    season.season,
                                    episode.episode,
                                    epUrl,
                                    `S${season.season} E${episode.episode}`
                                  );
                                }}
                                className={`flex items-start gap-3 p-3 rounded transition text-left group relative overflow-hidden ${
                                  isAvailable
                                    ? "hover:bg-white/10"
                                    : "opacity-50 cursor-not-allowed bg-white/5"
                                }`}
                              >
                                <div
                                  className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors ${
                                    isAvailable
                                      ? "bg-white/5 text-zinc-400 group-hover:bg-primary group-hover:text-white"
                                      : "bg-white/5 text-zinc-600"
                                  }`}
                                >
                                  {episode.episode}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span
                                    className={`block text-sm font-medium transition-colors truncate ${
                                      isAvailable
                                        ? "text-zinc-300 group-hover:text-white"
                                        : "text-zinc-500"
                                    }`}
                                  >
                                    {episode.name ||
                                      `Эпизод ${episode.episode}`}
                                  </span>
                                  <span className="text-xs text-zinc-500 flex items-center gap-2 mt-1">
                                    {!isAvailable && episode.availability ? (
                                      <span className="text-yellow-500/80">
                                        Ожидается{" "}
                                        {formatDate(episode.availability)}
                                      </span>
                                    ) : (
                                      <>
                                        {episode.release_ru
                                          ? formatDate(episode.release_ru)
                                          : ""}
                                        {episode.voiceActing &&
                                          episode.voiceActing.length > 0 && (
                                            <span className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-zinc-400">
                                              {episode.voiceActing.length} озв.
                                            </span>
                                          )}
                                      </>
                                    )}
                                  </span>
                                </div>
                                {/* Play icon on hover (only if available) */}
                                {isAvailable && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Play
                                      size={24}
                                      className="text-white fill-white"
                                    />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
            )}

            {/* Sequels Tab */}
            <TabsContent
              value="sequels"
              className="animate-in fade-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none"
            >
              <SimpleMovieSlider
                movies={seqList
                  .map((item: any) => {
                    const data = item.details || item;
                    return {
                      id:
                        data.id ||
                        data.movieId ||
                        data.kp_id ||
                        data.kinopoisk_id ||
                        data.ident,
                      title:
                        data.title ||
                        data.name ||
                        data.original_title ||
                        data.en_name ||
                        "Без названия",
                      poster: data.poster || data.cover || data.poster_url,
                      rating: data.rating || data.rating_kp,
                      year: data.year || data.released,
                      genre: data.genre,
                      quality: data.quality,
                      country: data.country,
                    };
                  })
                  .filter((m: any) => m.id)}
                compactOnMobile
              />
            </TabsContent>

            {/* Similar Tab */}
            <TabsContent
              value="similar"
              className="animate-in fade-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none"
            >
              {Array.isArray(similarList) && similarList.length > 0 ? (
                <SimpleMovieSlider
                  movies={similarList
                    .map((item: any) => {
                      const data = item.details || item;
                      return {
                        id:
                          data.id ||
                          data.movieId ||
                          data.kp_id ||
                          data.kinopoisk_id ||
                          data.ident,
                        title:
                          data.title ||
                          data.name ||
                          data.original_title ||
                          data.en_name ||
                          "Без названия",
                        poster: data.poster || data.cover || data.poster_url,
                        rating: data.rating || data.rating_kp,
                        year: data.year || data.released,
                        genre: data.genre,
                        quality: data.quality,
                        country: data.country,
                      };
                    })
                    .filter((m: any) => m.id)}
                  compactOnMobile
                />
              ) : (
                <div className="text-center text-zinc-500 py-12">
                  Похожих фильмов пока нет
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {showWatchOverlay && (
        <div className="fixed inset-0 z-[120] bg-black">
          <div className="absolute inset-0">
            <div className="absolute top-3 left-3 text-xs md:text-sm text-white/70 font-semibold pointer-events-none select-none">
              ESC / Backspace — закрыть
            </div>
            <PlayerSelector
              floatingControls
              className="w-full h-full"
              videoContainerClassName="w-full h-full bg-black"
              onPlayerSelect={(playerId: number) => setSelectedPlayer(playerId)}
              iframeUrl={franchise?.iframe_url || movie.iframe_url}
              kpId={kpId}
              movieLogo={movie?.poster_logo || movie?.logo}
              onClose={() => setShowWatchOverlay(false)}
            />
          </div>
        </div>
      )}

      {/* Episode Player Overlay */}
      {playingEpisode && (
        <div className="fixed inset-0 z-[130] bg-black">
          <div className="absolute inset-0">
            <div className="absolute top-3 left-3 text-xs md:text-sm text-white/70 font-semibold pointer-events-none select-none z-50">
              ESC / Backspace — закрыть • {playingEpisode.title}
            </div>
            <PlayerSelector
              floatingControls
              className="w-full h-full"
              videoContainerClassName="w-full h-full bg-black"
              iframeUrl={playingEpisode.url}
              kpId={kpId}
              season={playingEpisode.seasonNumber}
              episode={playingEpisode.episodeNumber}
              movieLogo={movie?.poster_logo || movie?.logo}
              onClose={() => setPlayingEpisode(null)}
            />
          </div>
        </div>
      )}
      {/* Mobile Trailer Modal Player moved back to hero */}
    </>
  );
}
