"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  Search,
  User,
  Play,
  Plus,
  Settings,
  Maximize2,
  Minimize2,
  Heart,
  ChevronRight,
  Download,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  IconClock,
  IconMovie,
  IconDeviceTv,
  IconMoodKid,
  IconLayoutGrid,
  IconPokeball,
  IconFileText,
  IconFiles,
  IconMicrophone,
  IconCategory,
  IconHeart,
} from "@tabler/icons-react";
import { CATEGORIES } from "@/lib/categories";
import MovieSlider from "@/components/movie-slider";
import useSWR from "swr";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useFavorites } from "@/hooks/use-favorites";
import { formatRatingLabel, ratingBgColor } from "@/lib/utils";

const DEFAULT_UB_COLORS = {
  tl: "#10212f",
  tr: "#1f2937",
  br: "#0f172a",
  bl: "#111827",
};

type Slide = {
  id: string;
  title: string;
  navTitle?: string;
  url?: string;
  fetchAll?: boolean;
  items?: any[];
  viewAllHref?: string;
};

type NormalizedMovie = {
  id: string | number;
  title: string;
  poster?: string | null;
  backdrop?: string | null;
  year?: any;
  rating?: any;
  country?: any;
  genre?: any;
  description?: string | null;
  duration?: any;
  logo?: string | null;
  poster_colors?: any;
  type?: string | null;
};

const TRENDING_URL =
  "https://api.vokino.pro/v2/list?sort=popular&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352";
const WATCHING_URL =
  "https://api.vokino.pro/v2/list?sort=watching&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352";
const MOVIES_URL =
  "https://api.vokino.pro/v2/list?sort=popular&type=movie&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352";
const SERIALS_URL =
  "https://api.vokino.pro/v2/list?sort=popular&type=serial&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352";

const PROFILE_AVATARS = [
  "https://i.pinimg.com/564x/1b/71/b8/1b71b85dd741ad27bffa5c834a7ed797.jpg",
  "https://i.pinimg.com/564x/1b/a2/e6/1ba2e6d1d4874546c70c91f1024e17fb.jpg",
  "https://i.pinimg.com/236x/ec/74/7a/ec747a688a5d6232663caaf114bad1c3.jpg",
  "https://i.pinimg.com/236x/89/51/35/89513597910ab6ce4285402ab7c0e591.jpg",
  "https://i.pinimg.com/474x/b6/77/cd/b677cd1cde292f261166533d6fe75872.jpg",
  "https://pbs.twimg.com/media/GvFs5kxWEAAJpzR.jpg",
  "https://i.pinimg.com/474x/60/80/81/60808105ca579916a1b3eda8768dd570.jpg",
];

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

const SLIDES: Slide[] = [
  {
    id: "watching",
    title: "Сейчас смотрят",
    url: WATCHING_URL,
    viewAllHref: "/watching/all",
  },
  {
    id: "trending",
    title: "В тренде",
    url: TRENDING_URL,
    viewAllHref: "/trending/all",
  },
  {
    id: "movies",
    title: "Фильмы",
    url: MOVIES_URL,
    viewAllHref: "/movies/all",
  },
  {
    id: "serials",
    title: "Сериалы",
    url: SERIALS_URL,
    viewAllHref: "/serials/all",
  },
  {
    id: "netflix_serials",
    title: "Сериалы Netflix",
    navTitle: "Netflix",
    url: "https://api.vokino.pro/v2/compilations/content/65a6b9dabce57d552a34b40d?token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352",
    fetchAll: true,
  },
  {
    id: "dolbyv",
    title: "4K DolbyV",
    navTitle: "DolbyV",
    url: "https://api.vokino.pro/v2/list?sort=new&tag=4K%20DolbyV&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352",
    viewAllHref: "/dolbyv/all",
  },
  {
    id: "fast_furious",
    title: "Франшиза: Форсаж",
    navTitle: "Форсаж",
    url: "https://api.vokino.pro/v2/compilations/content/65a6d50302d4113c4cce4fc4",
    fetchAll: true,
  },
  {
    id: "new_year",
    title: "Подборка: Новогодние фильмы",
    navTitle: "Новогодние",
    url: "https://api.vokino.pro/v2/compilations/content/675e9a26b453dd0c4a47bee3",
    fetchAll: true,
  },
];

// --- Helper Components ---

function Icon4kCustom({ className, ...props }: any) {
  const { size, stroke, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="currentColor"
      className={className}
      {...rest}
    >
      <path
        clipRule="evenodd"
        fillRule="evenodd"
        d="M31.0012 13.7598C31.0546 13.3494 30.8569 12.9479 30.4999 12.7417C30.1428 12.5355 29.6963 12.5652 29.3675 12.8166L19.0718 20.6938C18.9639 20.7763 18.8699 20.8853 18.802 21.0031C18.734 21.1207 18.6901 21.2507 18.6725 21.3854L16.9985 34.2402C16.9452 34.6508 17.1428 35.0522 17.4999 35.2584C17.8569 35.4645 18.3035 35.435 18.6323 35.1835L28.928 27.3064C29.0358 27.2238 29.1298 27.1148 29.1977 26.9971C29.2656 26.8794 29.3097 26.7494 29.3273 26.6148L31.0012 13.7598ZM26.1649 25.25C25.4746 26.4458 23.9456 26.8554 22.7499 26.1651C21.5541 25.4747 21.1444 23.9458 21.8348 22.75C22.5252 21.5543 24.0541 21.1446 25.2499 21.835C26.4456 22.5253 26.8553 24.0543 26.1649 25.25Z"
      />
      <path
        clipRule="evenodd"
        fillRule="evenodd"
        d="M45 24C45 35.598 35.598 45 24 45C12.402 45 3 35.598 3 24C3 12.402 12.402 3 24 3C35.598 3 45 12.402 45 24ZM42 24C42 33.9411 33.9411 42 24 42C14.0589 42 6 33.9411 6 24C6 14.0589 14.0589 6 24 6C33.9411 6 42 14.0589 42 24Z"
      />
    </svg>
  );
}

function IconHomeCustom({ className, ...props }: any) {
  const { size, stroke, ...rest } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="currentColor"
      className={className}
      {...rest}
    >
      <path
        clipRule="evenodd"
        fillRule="evenodd"
        d="M23.9864 4.00009C24.3242 4.00009 24.6522 4.11294 24.9185 4.32071L45 20V39.636C44.9985 40.4312 44.5623 41.4377 44 42C43.4377 42.5623 42.4311 42.9985 41.6359 43H27V28H21V43H6.5C5.70485 42.9984 4.56226 42.682 4 42.1197C3.43774 41.5575 3.00163 40.7952 3 40V21L23.0544 4.32071C23.3207 4.11294 23.6487 4.00009 23.9864 4.00009ZM30 28V40H42V21.4314L24 7.40726L6 22V40L18 40V28C18.0008 27.2046 18.3171 26.442 18.8796 25.8796C19.442 25.3171 20.2046 25.0008 21 25H27C27.7954 25.0009 28.5579 25.3173 29.1203 25.8797C29.6827 26.4421 29.9991 27.2046 30 28Z"
      />
    </svg>
  );
}

function CategoryIcon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const props = { className, size: 28, stroke: 1.5 } as const;
  switch (name) {
    case "clock":
      return <IconClock {...props} />;
    case "4k":
      return <Icon4kCustom {...props} />;
    case "movie":
      return <IconMovie {...props} />;
    case "serial":
      return <IconDeviceTv {...props} />;
    case "multfilm":
      return <IconMoodKid {...props} />;
    case "multserial":
      return <IconLayoutGrid {...props} />;
    case "anime":
      return <IconPokeball {...props} />;
    case "documovie":
      return <IconFileText {...props} />;
    case "docuserial":
      return <IconFiles {...props} />;
    case "tvshow":
      return <IconMicrophone {...props} />;
    case "compilations":
      return <IconCategory {...props} />;
    default:
      return <IconMovie {...props} />;
  }
}

function NavItem({
  icon,
  label,
  href,
  active,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const className = `p-3 rounded-xl transition-all group relative flex items-center justify-center ${
    disabled
      ? "text-zinc-500 cursor-not-allowed opacity-60"
      : active
      ? "text-white bg-white/10"
      : "text-zinc-400 hover:text-white hover:bg-white/5"
  }`;

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          {onClick ? (
            <button
              onClick={disabled ? undefined : onClick}
              className={className}
              disabled={disabled}
            >
              {icon}
            </button>
          ) : disabled ? (
            <button className={className} disabled aria-disabled>
              {icon}
            </button>
          ) : (
            <Link href={href || "#"} className={className}>
              {icon}
            </Link>
          )}
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="font-bold bg-white text-black border-0 shadow-xl ml-2"
        >
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function BackdropImage({ src }: { src: string }) {
  const [current, setCurrent] = useState(src);
  const [prev, setPrev] = useState(src);
  const [isLoading, setIsLoading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (src !== current) {
      setPrev(current);
      setCurrent(src);
      setIsLoading(!!src);
    }
  }, [src, current]);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setIsLoading(false);
    }
  }, [current]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="absolute top-0 right-0 w-[85%] h-[70vh] overflow-hidden pointer-events-none select-none z-0">
      {/* Previous Image Layer */}
      {prev && (
        <img
          key={prev}
          src={prev}
          className={`absolute inset-0 w-full h-full object-cover object-top transition-all duration-700 blur-xl scale-105 ${
            isLoading ? "opacity-100" : "opacity-0"
          }`}
          alt=""
        />
      )}

      {/* Current Image Layer */}
      {current && (
        <img
          ref={imgRef}
          key={current}
          src={current}
          className={`absolute inset-0 w-full h-full object-cover object-top transition-all duration-700 ${
            isLoading
              ? "opacity-0 blur-xl scale-105"
              : "opacity-100 blur-0 scale-100"
          }`}
          onLoad={handleLoad}
          alt=""
        />
      )}

      {/* Gradient Masks for smooth blend */}
      <div className="absolute inset-0 bg-linear-to-r from-zinc-950 via-zinc-950/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-zinc-950 to-transparent" />
      {/* Top Gradient for Text Visibility */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-linear-to-b from-zinc-950/80 to-transparent" />
      {/* Right Gradient for Indicators */}
      <div className="absolute top-0 right-0 bottom-0 w-96 bg-linear-to-l from-zinc-950 via-zinc-950/60 to-transparent" />
    </div>
  );
}

// --- Main Component ---

export function DesktopSidebar({
  profileAvatar = PROFILE_AVATARS[0],
  onSettingsClick,
  showFavorites = true,
  favoritesActive = false,
  favoritesCount = 0,
}: {
  profileAvatar?: string;
  onSettingsClick?: () => void;
  showFavorites?: boolean;
  favoritesActive?: boolean;
  favoritesCount?: number;
}) {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-24 z-50 flex flex-col items-center py-10 gap-10 bg-transparent">
      <div className="text-orange-500 font-black text-2xl mb-4 tracking-tighter">
        HD
      </div>

      <nav className="flex flex-col gap-6 flex-1 justify-center w-full items-center">
        <NavItem icon={<Search size={28} />} label="Поиск" href="/search" />
        <NavItem
          icon={<IconHomeCustom className="w-7 h-7" />}
          label="Главная"
          href="/"
          active={!favoritesActive}
        />

        <NavItem
          icon={
            <div className="relative">
              <IconHeart
                className={`w-7 h-7 ${favoritesActive ? "text-white" : ""}`}
                stroke={1.6}
                fill={favoritesActive ? "currentColor" : "none"}
              />
              {favoritesCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500" />
              )}
            </div>
          }
          label="Избранное"
          href="/favorites"
          active={favoritesActive}
        />

        {CATEGORIES.filter((cat) => cat.route && cat.route !== "/updates").map(
          (cat, i) => (
            <NavItem
              key={i}
              icon={<CategoryIcon name={cat.ico} className="w-7 h-7" />}
              label={cat.title}
              href={cat.route || "#"}
            />
          )
        )}
      </nav>

      <div className="mt-auto">
        <NavItem
          icon={
            <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-white/10 group-hover:ring-white/30 transition-all">
              <img
                src={profileAvatar}
                className="w-full h-full object-cover"
                alt="Профиль"
              />
            </div>
          }
          label="Профиль"
          onClick={onSettingsClick}
        />
      </div>
    </aside>
  );
}

export function DesktopHome({
  initialDisplayMode = "backdrop",
  customSlides,
  initialSlideId,
  favoritesActiveOverride = false,
  forceShowFavoritesNav = false,
}: {
  initialDisplayMode?: "backdrop" | "poster";
  customSlides?: Slide[];
  initialSlideId?: string;
  favoritesActiveOverride?: boolean;
  forceShowFavoritesNav?: boolean;
}) {
  const [activeMovie, setActiveMovie] = useState<any>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<
    "next" | "prev" | "none"
  >("none");
  const [isIndicatorHovered, setIsIndicatorHovered] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isFetchingOverride, setIsFetchingOverride] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState(PROFILE_AVATARS[0]);
  const lastUrlRef = useRef<string | null>(null);
  const lastInputTimeRef = useRef(0);
  const [overrideRefresh, setOverrideRefresh] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWideClock, setShowWideClock] = useState(false);
  const [clockText, setClockText] = useState<string>("");
  const {
    favorites,
    ready: favoritesReady,
    toggleFavorite,
    isFavorite,
  } = useFavorites();
  const favoritesCount = (favorites || []).length;
  const showFavoritesNav = true;
  const [viewportHeight, setViewportHeight] = useState<number>(
    typeof window !== "undefined" ? window.innerHeight : 1080
  );
  const isTinyHeight = viewportHeight > 0 && viewportHeight <= 787;
  const isShortHeight = viewportHeight > 0 && viewportHeight < 900;

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [cardDisplayMode, setCardDisplayMode] = useState<"backdrop" | "poster">(
    initialDisplayMode
  );
  const [showPosterMetadata, setShowPosterMetadata] = useState(true);
  const [enablePosterColors, setEnablePosterColors] = useState(true);
  const [paletteReady, setPaletteReady] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [ubColors, setUbColors] = useState(DEFAULT_UB_COLORS);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const paletteCacheRef = useRef<
    Record<string, { tl: string; tr: string; br: string; bl: string }>
  >({});

  useEffect(() => {
    setIsMounted(true);
    const savedMeta = localStorage.getItem("desktop_show_poster_metadata");
    if (savedMeta) {
      setShowPosterMetadata(savedMeta === "true");
    }
    const savedColors = localStorage.getItem("desktop_enable_poster_colors");
    if (savedColors) {
      const enabled = savedColors !== "false";
      setEnablePosterColors(enabled);
      if (!enabled) {
        setUbColors(DEFAULT_UB_COLORS);
        setPaletteReady(true);
      } else {
        setPaletteReady(false);
      }
    } else {
      setEnablePosterColors(true);
      setPaletteReady(false);
    }
  }, []);

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    const detectStandalone = () => {
      const standaloneMedia =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(display-mode: standalone)").matches;
      const iosStandalone =
        typeof (navigator as any) !== "undefined" &&
        (navigator as any).standalone === true;
      setIsStandalone(!!(standaloneMedia || iosStandalone));
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    syncFullscreen();
    detectStandalone();
    const media = window.matchMedia
      ? window.matchMedia("(display-mode: standalone)")
      : null;
    const mediaListener = () => detectStandalone();
    media?.addEventListener("change", mediaListener);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      media?.removeEventListener("change", mediaListener);
    };
  }, []);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const dow = ["ВС", "ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ"][now.getDay()];
      const months = [
        "ЯНВАРЯ",
        "ФЕВРАЛЯ",
        "МАРТА",
        "АПРЕЛЯ",
        "МАЯ",
        "ИЮНЯ",
        "ИЮЛЯ",
        "АВГУСТА",
        "СЕНТЯБРЯ",
        "ОКТЯБРЯ",
        "НОЯБРЯ",
        "ДЕКАБРЯ",
      ];
      const month = months[now.getMonth()];
      setClockText(`${hh}:${mm} ${dow}, ${dd} ${month}`);
    };

    const checkWidth = () => {
      const isWide = typeof window !== "undefined" && window.innerWidth >= 1600;
      setShowWideClock(isWide);
    };

    updateClock();
    checkWidth();
    const iv = setInterval(updateClock, 60_000);
    window.addEventListener("resize", checkWidth);
    const syncHeight = () => setViewportHeight(window.innerHeight);
    syncHeight();
    window.addEventListener("resize", syncHeight);
    return () => {
      clearInterval(iv);
      window.removeEventListener("resize", checkWidth);
      window.removeEventListener("resize", syncHeight);
    };
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const toggleFullscreen = async () => {
    try {
      const doc: any = document;
      const el: any = document.documentElement;
      if (!doc.fullscreenElement) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      } else {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      }
    } catch {}
  };

  const handleDisplayModeChange = (checked: boolean) => {
    const newMode = checked ? "backdrop" : "poster";
    setCardDisplayMode(newMode);
    // Save to cookie for server-side persistence (1 year)
    document.cookie = `desktop_home_card_display_mode=${newMode}; path=/; max-age=31536000`;
  };

  const handleMetadataChange = (show: boolean) => {
    setShowPosterMetadata(show);
    localStorage.setItem("desktop_show_poster_metadata", String(show));
  };

  const handlePosterColorsChange = (enable: boolean) => {
    setEnablePosterColors(enable);
    localStorage.setItem("desktop_enable_poster_colors", String(enable));
    if (!enable) {
      setUbColors(DEFAULT_UB_COLORS);
      setPaletteReady(true);
    } else {
      setPaletteReady(false);
    }
  };

  useEffect(() => {
    const src = activeMovie?.poster || activeMovie?.backdrop;
    const movieId = activeMovie?.id ? String(activeMovie.id) : null;
    const cacheKey = movieId ? `id:${movieId}` : src ? `src:${src}` : null;

    if (!enablePosterColors) {
      setUbColors(DEFAULT_UB_COLORS);
      setPaletteReady(true);
      return;
    }
    if (!src) {
      setUbColors(DEFAULT_UB_COLORS);
      setPaletteReady(true);
      return;
    }

    const tryApplyOverrideColors = (ovColors: any) => {
      const toHex = (arr?: number[]) => {
        if (!Array.isArray(arr) || arr.length < 3) return null;
        const [r, g, b] = arr;
        const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
        return (
          "#" +
          [r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")
        );
      };
      const tl = toHex(ovColors?.accentTl) || toHex(ovColors?.dominant1);
      const tr = toHex(ovColors?.accentTr) || tl;
      const br = toHex(ovColors?.accentBr) || toHex(ovColors?.dominant2) || tl;
      const bl = toHex(ovColors?.accentBl) || br;
      if (tl || tr || br || bl) {
        const next = {
          tl: tl || DEFAULT_UB_COLORS.tl,
          tr: tr || tl || DEFAULT_UB_COLORS.tr,
          br: br || tl || DEFAULT_UB_COLORS.br,
          bl: bl || br || DEFAULT_UB_COLORS.bl,
        };
        setUbColors(next);
        if (cacheKey) paletteCacheRef.current[cacheKey] = next;
        setPaletteReady(true);
        return true;
      }
      return false;
    };

    // Если уже есть цвета в активном фильме (из override) — применяем и выходим
    const directOvColors = (activeMovie as any)?.poster_colors;
    if (directOvColors && tryApplyOverrideColors(directOvColors)) return;

    // Если есть кэш — используем без мерцания
    if (cacheKey && paletteCacheRef.current[cacheKey]) {
      setUbColors(paletteCacheRef.current[cacheKey]);
      setPaletteReady(true);
      return;
    }

    try {
      const overridesCache = (globalThis as any).__movieOverridesCache || {};
      const ovColors = movieId ? overridesCache[movieId]?.poster_colors : null;
      if (ovColors && tryApplyOverrideColors(ovColors)) return;
    } catch {}

    // Если overrides не дали цвета — попробуем забрать свежие overrides, затем fallback на автопалитру
    let overrideApplied = false;
    if (movieId) {
      void (async () => {
        try {
          const res = await fetch(`/api/overrides/movies?ids=${movieId}`, {
            headers: { Accept: "application/json" },
            cache: "no-store",
          });
          if (!res.ok) return;
          const data = await res.json();
          const ov = data?.[movieId];
          if (ov?.poster_colors) {
            const ok = tryApplyOverrideColors(ov.poster_colors);
            if (ok) {
              overrideApplied = true;
              const overridesCache =
                (globalThis as any).__movieOverridesCache ||
                ((globalThis as any).__movieOverridesCache = {});
              overridesCache[movieId] = {
                ...(overridesCache[movieId] || {}),
                poster_colors: ov.poster_colors,
              };
            }
          }
        } catch {}
      })();
    }

    if (overrideApplied) return;

    const loadImage = (
      source: string
    ): Promise<{ img: HTMLImageElement; blobUrl?: string }> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.decoding = "async";
        img.referrerPolicy = "no-referrer";
        img.onload = () => resolve({ img });
        img.onerror = async () => {
          try {
            const resp = await fetch(source);
            if (!resp.ok) return reject(new Error("fetch failed"));
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            const img2 = new Image();
            img2.crossOrigin = "anonymous";
            img2.decoding = "async";
            img2.referrerPolicy = "no-referrer";
            img2.onload = () => resolve({ img: img2, blobUrl });
            img2.onerror = () => {
              URL.revokeObjectURL(blobUrl);
              reject(new Error("blob load failed"));
            };
            img2.src = blobUrl;
          } catch (e) {
            reject(e as any);
          }
        };
        img.src = source;
      });

    const getPaletteFromImage = (img: HTMLImageElement): number[][] => {
      const maxSize = 120;
      const w = img.naturalWidth || img.width || 1;
      const h = img.naturalHeight || img.height || 1;
      const scale = Math.min(1, maxSize / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return [];
      ctx.drawImage(img, 0, 0, cw, ch);
      const data = ctx.getImageData(0, 0, cw, ch).data;
      const buckets = new Map<
        number,
        { r: number; g: number; b: number; count: number }
      >();
      const step = 4; // we already downscale, so step 1 pixel
      for (let i = 0; i < data.length; i += 4 * step) {
        const a = data[i + 3];
        if (a < 200) continue;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const r5 = r >> 3;
        const g5 = g >> 3;
        const b5 = b >> 3;
        const key = (r5 << 10) | (g5 << 5) | b5;
        const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, count: 0 };
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
        bucket.count += 1;
        buckets.set(key, bucket);
      }
      const colors = Array.from(buckets.values())
        .filter((b) => b.count > 0)
        .map((b) => [b.r / b.count, b.g / b.count, b.b / b.count] as number[]);
      return colors;
    };

    const rgbToHsl = (r: number, g: number, b: number) => {
      r /= 255;
      g /= 255;
      b /= 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          default:
            h = (r - g) / d + 4;
        }
        h /= 6;
      }
      return { h, s, l };
    };

    const clamp = (v: number, a: number, b: number) =>
      Math.min(b, Math.max(a, v));
    const rgbToHex = (rgb: number[]) =>
      "#" +
      rgb
        .map((c) =>
          Math.max(0, Math.min(255, Math.round(c)))
            .toString(16)
            .padStart(2, "0")
        )
        .join("");

    const sanitize = (rgb: number[]) => {
      const [r, g, b] = rgb;
      const { s, l } = rgbToHsl(r, g, b);
      // убираем серое и светлое, слегка затемняем
      const sFixed = s < 0.2 ? 0.22 : s;
      const lFixed = clamp(l, 0.18, 0.55);
      const factor = lFixed / (l || 0.0001);
      return rgbToHex([r * factor, g * factor, b * factor]);
    };

    const applyPalette = (palette: number[][] | null) => {
      if (cancelled) return;
      const colors = (palette || [])
        .map((p) => ({ raw: p, hsl: rgbToHsl(p[0], p[1], p[2]) }))
        .filter((c) => {
          const { s, l } = c.hsl;
          // Жёсткий отсев засвеченных/бело-бежевых: очень светлые или светлые с низкой насыщенностью
          if (l > 0.72) return false;
          if (l > 0.62 && s < 0.5) return false;
          if (l > 0.6 && s < 0.6) return false;
          if (l > 0.58 && s < 0.45) return false;
          // допускаем слабонасыщенные только если они тёмно-серые
          if (s <= 0.12) return l >= 0.18 && l <= 0.45;
          return s > 0.12;
        })
        .map((c) => {
          const { h, s, l } = c.hsl;
          let hueWeight = 1;
          // приоритеты по тону (усиливаем зелёно-бирюзовые, ослабляем красные)
          if (h >= 0.55 && h <= 0.78) hueWeight *= 1.3; // синие/фиолетовые
          else if (h <= 0.05 || h >= 0.95)
            hueWeight *= l < 0.55 ? 0.95 : 0.85; // красные/бордо — ослабили
          else if (h > 0.05 && h <= 0.1)
            hueWeight *= l < 0.5 ? 1.0 : 0.75; // алые/красно-оранж — мягче
          else if (h >= 0.1 && h <= 0.18)
            hueWeight *= 0.25; // жёлто-бежевые — резко вниз
          else if (h > 0.18 && h <= 0.28)
            hueWeight *= 0.45; // светло-оранж/охра — вниз
          else if (h > 0.28 && h < 0.45) hueWeight *= l < 0.6 ? 1.3 : 0.8; // зелёные/сине-зелёные — выше приоритет, если не светлые

          const darkBoost = l < 0.4 ? 1.35 : l > 0.55 ? 0.6 : 1;
          const lightPenalty = l < 0.72 ? 1 : 0.4;
          const floorPenalty = l > 0.12 ? 1 : 0.55;
          const satWeight = 0.4 + s * 0.6;

          const score =
            satWeight * hueWeight * darkBoost * lightPenalty * floorPenalty;
          return { ...c, score };
        })
        .sort((a, b) => b.score - a.score);

      const isYellow = (h: number) => h >= 0.1 && h <= 0.18;

      // Если доминанта жёлтая — возвращаем фиксированный тёплый набор
      const top = colors[0];
      if (top && isYellow(top.hsl.h)) {
        const fixed = {
          tl: "#412901",
          tr: "#60351d",
          br: "#563119",
          bl: "#6f5d18",
        };
        setUbColors(fixed);
        if (cacheKey) paletteCacheRef.current[cacheKey] = fixed;
        setPaletteReady(true);
        return;
      }

      const primary =
        colors.find((c) => !isYellow(c.hsl.h)) || colors[0] || null;
      let secondary =
        colors.find(
          (c) =>
            c.raw !== primary?.raw &&
            !isYellow(c.hsl.h) &&
            Math.abs(c.hsl.h - (primary?.hsl.h ?? 0)) > 0.08 &&
            Math.abs(c.hsl.l - (primary?.hsl.l ?? 0)) > 0.02
        ) ||
        colors.find((c) => !isYellow(c.hsl.h) && c.raw !== primary?.raw) ||
        colors[1] ||
        null;

      // Если второй цвет слишком слабый — используем первый для обоих углов
      if (!secondary || (primary && secondary.score < primary.score * 0.5)) {
        secondary = primary;
      }

      const first = primary?.raw || null;
      const second = secondary?.raw || null;

      const c1 = first ? sanitize(first) : DEFAULT_UB_COLORS.tl;
      const c2 = second ? sanitize(second) : c1;
      const next = { tl: c1, br: c1, tr: c2, bl: c2 };
      setUbColors(next);
      if (cacheKey) paletteCacheRef.current[cacheKey] = next;
      else paletteCacheRef.current[src] = next;
      setPaletteReady(true);
    };

    let cancelled = false;
    let blobUrl: string | null = null;
    const run = async () => {
      try {
        const { img, blobUrl: bu } = await loadImage(src);
        blobUrl = bu || null;
        const palette = getPaletteFromImage(img);
        if (!cancelled) applyPalette(palette.length > 0 ? palette : null);
      } catch {
        if (!cancelled) applyPalette(null);
      }
    };

    run();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [activeMovie?.poster, activeMovie?.backdrop, enablePosterColors]);

  const slides = useMemo<Slide[]>(() => {
    if (customSlides && customSlides.length > 0) return customSlides;
    return SLIDES;
  }, [customSlides]);

  useEffect(() => {
    if (!slides || slides.length === 0) return;
    if (slideIndex >= slides.length) {
      setSlideIndex(Math.max(0, slides.length - 1));
    }
  }, [slides, slideIndex]);

  useEffect(() => {
    if (!initialSlideId) return;
    const idx = slides.findIndex((s) => s.id === initialSlideId);
    if (idx >= 0) setSlideIndex(idx);
  }, [initialSlideId, slides]);

  const activeSlide = slides[slideIndex] ?? slides[0];

  useEffect(() => {
    setProfileAvatar(
      PROFILE_AVATARS[Math.floor(Math.random() * PROFILE_AVATARS.length)]
    );
  }, []);

  const swrKey = activeSlide?.items ? null : activeSlide?.url || null;
  const { data } = useSWR(swrKey, fetcher);

  const normalizeMovieForHero = useCallback(
    (item: any): NormalizedMovie | null => {
      if (!item) return null;
      const d = item.details ?? item;
      const normalized: NormalizedMovie = {
        id: d?.id ?? item.id,
        title: d?.name ?? item.title ?? "Без названия",
        poster: d?.poster ?? item.poster ?? null,
        backdrop:
          d?.bg_poster?.backdrop ??
          d?.wide_poster ??
          d?.backdrop ??
          item.backdrop ??
          d?.bg ??
          item.poster ??
          null,
        year: d?.released ?? item.year,
        rating: d?.rating_kp ?? item.rating,
        country: d?.country ?? item.country,
        genre: d?.genre ?? item.genre,
        description: d?.about ?? item.about ?? item.description ?? null,
        duration: d?.duration ?? item.duration,
        logo: item.logo ?? d?.poster_logo ?? null,
        poster_colors:
          item.poster_colors ??
          d?.poster_colors ??
          d?.colors ??
          item.colors ??
          null,
        type: d?.type ?? item.type ?? null,
      };
      return normalized;
    },
    []
  );

  // Scroll Jacking Logic
  useEffect(() => {
    const COOLDOWN = 1000; // ms between switches

    if (!slides || slides.length === 0) return;

    const handleInput = (direction: "next" | "prev") => {
      const now = Date.now();
      if (now - lastInputTimeRef.current < COOLDOWN) return;

      if (direction === "next") {
        if (slideIndex < slides.length - 1) {
          lastInputTimeRef.current = now;
          setSlideDirection("next");
          setSlideIndex((prev) => prev + 1);
        }
      } else {
        if (slideIndex > 0) {
          lastInputTimeRef.current = now;
          setSlideDirection("prev");
          setSlideIndex((prev) => prev - 1);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      // Down scroll -> Next Slide
      if (e.deltaY > 0) handleInput("next");
      // Up scroll -> Prev Slide
      else if (e.deltaY < 0) handleInput("prev");
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        handleInput("next");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        handleInput("prev");
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [slideIndex, slides]);

  // Fetch override for the initial movie or when activeMovie changes
  useEffect(() => {
    if (!activeMovie) return;

    // If we already have a logo, no need to fetch
    // BUT if we just switched slides (isFetchingOverride is true manually set), we MUST proceed
    if (activeMovie.logo && !isFetchingOverride && overrideRefresh === 0)
      return;

    const fetchOverride = async () => {
      if (!isFetchingOverride) setIsFetchingOverride(true); // Ensure loading state is on
      try {
        const res = await fetch(`/api/overrides/movies?ids=${activeMovie.id}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const overrides = await res.json();
          const ov = overrides[String(activeMovie.id)];
          if (ov) {
            // Update cache
            const overridesCache =
              (globalThis as any).__movieOverridesCache ||
              ((globalThis as any).__movieOverridesCache = {});
            overridesCache[String(activeMovie.id)] = ov;

            setActiveMovie((prev: any) => {
              // If the active movie changed while we were fetching, don't update
              if (!prev || prev.id !== activeMovie.id) return prev;

              return {
                ...prev,
                logo: ov.poster_logo || prev.logo,
                // Prioritize override backdrop (bg_poster.backdrop)
                backdrop: ov.bg_poster?.backdrop || prev.backdrop,
                poster_colors: ov.poster_colors || prev.poster_colors,
              };
            });
          }
        }
      } catch (e) {
        console.error("Failed to fetch override", e);
      } finally {
        setIsFetchingOverride(false);
      }
    };

    fetchOverride();
  }, [activeMovie?.id, activeSlide?.id, overrideRefresh]); // Re-run if ID changes, slide changes, or override invalidated

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent)?.detail as
        | { ids?: string[]; op?: string; ts?: number }
        | undefined;
      const changedIds = detail?.ids || [];
      if (changedIds.length === 0 && activeMovie?.id == null) return;
      if (
        changedIds.length === 0 ||
        changedIds.some((id) => String(id) === String(activeMovie?.id))
      ) {
        // Drop cached entry for current movie
        try {
          const cache =
            (globalThis as any).__movieOverridesCache ||
            ((globalThis as any).__movieOverridesCache = {});
          if (activeMovie?.id != null) delete cache[String(activeMovie.id)];
        } catch {}
        setOverrideRefresh((v) => v + 1);
      }
    };
    window.addEventListener("override:changed", handler as EventListener);
    return () =>
      window.removeEventListener("override:changed", handler as EventListener);
  }, [activeMovie?.id]);

  useEffect(() => {
    if (!activeSlide) return;
    const rawList = (() => {
      if (Array.isArray(activeSlide.items)) return activeSlide.items;
      if (data && Array.isArray((data as any).channels))
        return (data as any).channels;
      if (Array.isArray(data)) return data;
      return [];
    })();
    if (!rawList || rawList.length === 0) return;

    const first = normalizeMovieForHero(rawList[0]);
    if (!first) return;

    const overridesCache =
      (globalThis as any).__movieOverridesCache ||
      ((globalThis as any).__movieOverridesCache = {});
    const cachedOverride = overridesCache[String(first.id)];
    const normalized = {
      ...first,
      logo: cachedOverride?.poster_logo ?? first.logo ?? null,
      backdrop: cachedOverride?.bg_poster?.backdrop ?? first.backdrop,
      poster_colors: cachedOverride?.poster_colors ?? first.poster_colors,
      type:
        first.type ??
        (rawList[0] as any)?.type ??
        (rawList[0] as any)?.details?.type ??
        null,
    };

    const prevSlideKey = lastUrlRef.current;
    const nextSlideKey =
      activeSlide.id || activeSlide.url || String(activeSlide.title);
    if (prevSlideKey !== nextSlideKey) {
      lastUrlRef.current = nextSlideKey;
      if (!cachedOverride) setIsFetchingOverride(true);
    }

    setActiveMovie((prev: any) => {
      if (prev && String(prev.id) === String(normalized.id)) {
        return { ...prev, ...normalized };
      }
      return normalized;
    });
  }, [data, activeSlide, normalizeMovieForHero]);

  const activeIdRef = useRef<string | null>(null);
  const hoverPendingRef = useRef<any>(null);
  const hoverRafRef = useRef<number | null>(null);
  const hoverLastTsRef = useRef<number>(0);
  useEffect(() => {
    if (activeMovie?.id != null) activeIdRef.current = String(activeMovie.id);
  }, [activeMovie?.id]);

  const handleMovieHover = useCallback((movie: any) => {
    if (!movie) return;
    if (activeIdRef.current && String(movie.id) === activeIdRef.current) return;

    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - hoverLastTsRef.current < 160) return; // дольше задержка, чтобы не дёргалось при авто-докрутке
    hoverLastTsRef.current = now;

    hoverPendingRef.current = movie;
    if (hoverRafRef.current != null) return;

    hoverRafRef.current = requestAnimationFrame(() => {
      const m = hoverPendingRef.current;
      hoverPendingRef.current = null;
      hoverRafRef.current = null;
      if (!m) return;

      // Применяем override из кеша, если есть (включая poster_colors)
      const overridesCache = (globalThis as any).__movieOverridesCache || {};
      const ov = overridesCache[String(m.id)];

      const normalized = {
        id: m.id,
        title: m.title,
        poster: ov?.poster ?? m.poster,
        backdrop: ov?.bg_poster?.backdrop ?? m.backdrop ?? m.poster,
        year: m.year,
        rating: m.rating,
        country: m.country,
        genre: m.genre,
        description: m.description || "",
        duration: m.duration,
        logo: ov?.poster_logo ?? m.logo ?? null,
        poster_colors: ov?.poster_colors,
        type: m.type ?? null,
      };
      activeIdRef.current = String(normalized.id);
      setActiveMovie((prev) => {
        if (prev && String(prev.id) === String(normalized.id)) return prev;
        return normalized;
      });
    });
  }, []);

  // Helper to get high-res image if possible, or fallback
  const getBackdrop = (movie: any) => {
    if (!movie) return "";
    return movie.backdrop || movie.poster || "";
  };

  const isMobile = false;
  const colorLayerEnabled = enablePosterColors && !isMobile;
  const layerOpacity = colorLayerEnabled && paletteReady ? 0.6 : 0;

  const logoHeightClass = isFullscreen
    ? "h-[140px] md:h-[160px] lg:h-[180px] xl:h-[200px]"
    : isTinyHeight
    ? "h-[68px] md:h-[74px] lg:h-[80px] xl:h-[88px]"
    : isShortHeight
    ? "h-[82px] md:h-[94px] lg:h-[100px] xl:h-[104px]"
    : "h-[110px] md:h-[110px] lg:h-[110px] xl:h-[110px]";

  // Фиксируем высоту описания, чтобы при переключении карточек не прыгал макет
  const descriptionHeightClass = isFullscreen
    ? "h-[140px] md:h-[152px] overflow-hidden"
    : isShortHeight
    ? "h-[72px] md:h-[76px] overflow-hidden"
    : "h-[116px] md:h-[128px] overflow-hidden";

  const sliderAnimClass = !isMounted
    ? ""
    : slideDirection === "next"
    ? "animate-in fade-in slide-in-from-bottom-6 duration-500"
    : slideDirection === "prev"
    ? "animate-in fade-in slide-in-from-top-6 duration-500"
    : "animate-in fade-in duration-500";

  const sliderMarginClass = isFullscreen
    ? "mt-[60px] md:mt-[72px] lg:mt-[88px] xl:mt-[108px]"
    : isShortHeight
    ? "mt-4 md:mt-6 lg:mt-7"
    : "mt-6 md:mt-8 lg:mt-10";

  const logoBlockMarginClass = isTinyHeight
    ? "mt-[4px] md:mt-[6px] lg:mt-[8px] xl:mt-[10px]"
    : isShortHeight
    ? "mt-[6px] md:mt-[8px] lg:mt-[10px] xl:mt-[12px]"
    : "mt-[12px] md:mt-[14px] lg:mt-[16px] xl:mt-[18px]";

  // Убираем line-clamp, чтобы не было двойных многоточий при обрезке
  const descriptionClampClass = "";

  const ctaGapClass = isTinyHeight ? "gap-3" : "gap-4";
  const primaryButtonSizeClass = isTinyHeight
    ? "px-5 py-2.5 md:px-6 min-w-[120px]"
    : "px-6 py-3 md:px-8 min-w-[140px]";
  const primaryButtonTextClass = isTinyHeight
    ? "text-sm md:text-base"
    : "text-base md:text-lg";
  const favoriteButtonPaddingClass = isTinyHeight ? "p-2.5" : "p-3";
  const playIconSize = isTinyHeight ? 18 : 20;
  const favoriteIconSize = isTinyHeight ? 18 : 20;

  const mainPaddingClass = isShortHeight
    ? "pt-[38px] md:pt-[46px] lg:pt-[52px] pb-[clamp(10px,3vh,26px)] gap-[clamp(12px,1.6vh,24px)] overflow-y-auto"
    : "pt-[52px] md:pt-[60px] lg:pt-[64px] pb-[clamp(12px,4vh,48px)] gap-[clamp(16px,2vh,32px)] overflow-hidden";

  const isFavoriteActiveMovie = isFavorite(
    activeMovie?.id ? String(activeMovie.id) : null
  );

  const headerViewAllSlides = new Set([
    "watching",
    "trending",
    "movies",
    "serials",
    "new_year",
    "dolbyv",
  ]);

  const computeThemeColor = useCallback(() => {
    const hex = (ubColors?.tl || "").trim();
    const match = hex.match(/^#?[0-9a-fA-F]{6}$/);
    if (match) return hex.startsWith("#") ? hex : `#${hex}`;
    return "#0f172a";
  }, [ubColors]);

  const handleFavoriteToggle = () => {
    if (!activeMovie) return;
    toggleFavorite({
      id: String(activeMovie.id),
      title: activeMovie.title,
      poster: activeMovie.poster,
      backdrop: activeMovie.backdrop,
      year: activeMovie.year,
      rating: activeMovie.rating,
      country: activeMovie.country,
      genre: activeMovie.genre,
      description: activeMovie.description,
      duration: activeMovie.duration,
      logo: activeMovie.logo,
      poster_colors: (activeMovie as any).poster_colors,
      type: (activeMovie as any).type ?? null,
    });
  };

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    try {
      installPrompt.prompt();
      await installPrompt.userChoice;
    } catch {}
    setInstallPrompt(null);
  };

  if (!activeSlide) return null;

  useEffect(() => {
    const meta = document.querySelector(
      'meta[name="theme-color"]'
    ) as HTMLMetaElement | null;
    if (!meta) return;
    const color =
      enablePosterColors && paletteReady && ubColors?.tl
        ? computeThemeColor()
        : "#0f172a";
    meta.content = color;
  }, [enablePosterColors, paletteReady, ubColors, computeThemeColor]);

  return (
    <div
      className={`relative min-h-screen min-h-[100dvh] w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans selection:bg-orange-500/30 ${
        isFullscreen ? "fullscreen-mode" : ""
      }`}
    >
      {/* Background Backdrop */}
      <BackdropImage src={getBackdrop(activeMovie)} />
      {/* Цветовой слой из постера (отключен) */}
      {colorLayerEnabled && (
        <div
          className="ub-color-layer"
          style={
            {
              "--color-ub-tl": ubColors.tl,
              "--color-ub-tr": ubColors.tr,
              "--color-ub-br": ubColors.br,
              "--color-ub-bl": ubColors.bl,
              opacity: layerOpacity,
            } as React.CSSProperties
          }
          aria-hidden
        />
      )}

      {/* Sidebar Navigation */}
      <DesktopSidebar
        profileAvatar={profileAvatar}
        onSettingsClick={() => setIsSettingsOpen(true)}
        showFavorites={showFavoritesNav}
        favoritesActive={favoritesActiveOverride}
        favoritesCount={favoritesCount}
      />

      {/* Fullscreen toggle + clock (desktop only) */}
      <div className="hidden md:flex absolute top-4 right-6 z-40 items-center gap-2">
        {!isStandalone && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={!installPrompt}
                  className={`h-11 w-11 inline-flex items-center justify-center rounded-[10px] text-white/90 transition-all ${
                    installPrompt
                      ? "hover:text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/30"
                      : "text-white/40 cursor-not-allowed"
                  }`}
                >
                  <Download className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={8}
                className="bg-white text-black border-0 shadow-xl"
              >
                <p className="text-xs font-semibold">
                  {installPrompt
                    ? "Установить как приложение"
                    : "Установка недоступна в этом браузере"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={
                  isFullscreen ? "Обычный режим" : "Полноэкранный режим"
                }
                onClick={toggleFullscreen}
                className="h-11 w-11 items-center justify-center rounded-[10px] text-white/90 hover:text-white hover:bg-white/10 transition-all flex"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5" />
                ) : (
                  <Maximize2 className="w-5 h-5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              sideOffset={8}
              className="bg-white text-black border-0 shadow-xl"
            >
              <p className="text-xs font-semibold">
                {isFullscreen
                  ? "Выйти из полноэкранного"
                  : "Полноэкранный режим"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Main Content Area */}
      <main
        className={`relative z-10 ml-24 h-[100dvh] max-h-[100dvh] flex flex-col px-0 ${mainPaddingClass} transition-[padding] duration-500 ease-out`}
      >
        <div className="flex-1 w-full flex flex-col gap-[clamp(12px,2vh,28px)] overflow-hidden">
          <div className="w-full px-3 lg:px-4 2xl:px-6 max-w-none flex flex-col gap-[clamp(12px,2vh,28px)] overflow-hidden">
            {/* Movie Info */}
            {activeMovie ? (
              <>
                <div className="max-w-5xl w-full transition-[margin] duration-500 ease-out">
                  <div
                    className={`${logoHeightClass} mb-[clamp(10px,1.5vh,22px)] flex items-center transition-[height] duration-500 ease-out ${logoBlockMarginClass}`}
                  >
                    {activeMovie.logo ? (
                      <img
                        src={activeMovie.logo}
                        alt={activeMovie.title}
                        className="h-full w-auto object-contain drop-shadow-2xl transition-all duration-500 ease-out max-w-[min(52vw,520px)]"
                      />
                    ) : isFetchingOverride ? (
                      // Show nothing or skeleton while checking for logo
                      <div className="h-full w-[240px] bg-transparent" />
                    ) : (
                      <h1 className="text-[clamp(28px,4vw,56px)] font-black leading-[1.05] drop-shadow-2xl tracking-tight">
                        {activeMovie.title}
                      </h1>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mb-[clamp(12px,2vh,24px)]">
                    {(() => {
                      const ratingLabel = formatRatingLabel(activeMovie.rating);
                      if (!ratingLabel) return null;
                      return (
                        <span
                          className={`px-2 py-1 rounded text-xs md:text-sm font-bold ${ratingBgColor(
                            activeMovie.rating
                          )}`}
                        >
                          {ratingLabel}
                        </span>
                      );
                    })()}
                    <span className="text-zinc-300 text-xs md:text-sm lg:text-base">
                      {activeMovie.year}
                    </span>
                    <span className="text-zinc-300 text-xs md:text-sm lg:text-base">
                      {activeMovie.genre?.split(",").slice(0, 2).join(",")}
                    </span>
                    {activeMovie.country && (
                      <span className="text-zinc-300 text-xs md:text-sm lg:text-base">
                        {activeMovie.country}
                      </span>
                    )}
                  </div>

                  <p
                    className={`relative text-zinc-300 text-[clamp(15px,1.6vw,19px)] ${descriptionClampClass} max-w-3xl mb-[clamp(18px,3vh,36px)] drop-shadow-md font-light leading-relaxed ${descriptionHeightClass} pr-[2px] after:pointer-events-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-5 after:bg-gradient-to-b after:from-transparent after:to-transparent`}
                  >
                    {activeMovie.description ||
                      "Описание к этому фильму пока не добавлено, но мы уверены, что оно того стоит."}
                  </p>

                  <div className={`flex items-center ${ctaGapClass}`}>
                    <Link
                      href={`/movie/${activeMovie.id}`}
                      className={`bg-white text-black rounded-[4px] font-bold flex items-center justify-center gap-2 hover:bg-white/90 transition active:scale-95 flex-1 md:flex-none ${primaryButtonSizeClass}`}
                    >
                      <Play
                        size={playIconSize}
                        fill="currentColor"
                        className={`ml-1 ${
                          isTinyHeight
                            ? "md:w-[22px] md:h-[22px]"
                            : "md:w-6 md:h-6"
                        }`}
                      />
                      <span className={primaryButtonTextClass}>Смотреть</span>
                    </Link>
                    <button
                      onClick={handleFavoriteToggle}
                      className={`${favoriteButtonPaddingClass} rounded-full border-2 transition active:scale-95 backdrop-blur-sm ${
                        isFavoriteActiveMovie
                          ? "border-white bg-white text-black"
                          : "border-zinc-400/50 text-zinc-200 hover:border-white hover:text-white hover:bg-white/10"
                      }`}
                      title={
                        isFavoriteActiveMovie
                          ? "Убрать из избранного"
                          : "Добавить в избранное"
                      }
                      aria-pressed={isFavoriteActiveMovie}
                    >
                      {isFavoriteActiveMovie ? (
                        <Heart size={favoriteIconSize} fill="currentColor" />
                      ) : (
                        <Plus size={favoriteIconSize} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Trending Slider */}
                <div className={`w-full ${sliderMarginClass}`}>
                  <div key={slideIndex} className={`w-full ${sliderAnimClass}`}>
                    <MovieSlider
                      key={activeSlide.id}
                      url={activeSlide.url || "/favorites"}
                      title={activeSlide.title}
                      items={activeSlide.items}
                      viewAllHref={activeSlide.viewAllHref}
                      viewAllInHeader={
                        !!activeSlide.id &&
                        headerViewAllSlides.has(activeSlide.id)
                      }
                      onMovieHover={handleMovieHover}
                      compactOnMobile={false}
                      perPageOverride={15}
                      hideIndicators
                      hideMetadata={!showPosterMetadata}
                      enableGlobalKeyNavigation
                      cardType={cardDisplayMode}
                      fetchAllPages={(activeSlide as any).fetchAll}
                      fullscreenMode={isFullscreen}
                      hideFavoriteBadge
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-50">
                <div className="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-zinc-500 animate-spin" />
              </div>
            )}
          </div>
        </div>
        {/* Vertical Slider Indicators - Scrollable & Compact */}
        <div
          className={`absolute right-0 top-32 w-64 z-40 pointer-events-none flex flex-col items-end pr-10 transition-opacity duration-700 ${
            activeMovie ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="h-[170px] w-full relative overflow-hidden mask-[linear-gradient(to_bottom,transparent,black_18%,black_78%,transparent)]">
            <div
              className="absolute top-0 right-0 flex flex-col gap-3 items-end transition-transform duration-500 ease-out w-full"
              style={{
                transform: `translateY(${50 - slideIndex * 44}px)`,
              }}
            >
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  onClick={() => {
                    if (i === slideIndex) return;
                    setSlideDirection(i > slideIndex ? "next" : "prev");
                    setSlideIndex(i);
                  }}
                  className="group flex items-center gap-3 focus:outline-none pointer-events-auto min-h-[30px] px-2 py-1 rounded-lg transition-all duration-300"
                >
                  <div
                    className={`h-px transition-all duration-500 ${
                      slideIndex === i
                        ? "w-10 bg-white drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]"
                        : "w-6 bg-white/30 group-hover:bg-white/70"
                    }`}
                  />
                  <span
                    className={`font-semibold uppercase tracking-[0.25em] transition-all duration-500 text-right whitespace-nowrap ${
                      slideIndex === i
                        ? "text-white text-base"
                        : "text-zinc-400 text-xs group-hover:text-zinc-200"
                    }`}
                  >
                    {(slide as any).navTitle || slide.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="sm:max-w-[480px] bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden shadow-2xl">
            <DialogHeader className="p-6 bg-zinc-900/30 border-b border-white/5">
              <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                <Settings className="w-5 h-5 text-zinc-400" />
                Настройки интерфейса
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-sm">
                Персонализируйте внешний вид под свои предпочтения
              </DialogDescription>
            </DialogHeader>

            <div className="p-6 space-y-6">
              {/* Display Mode Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">
                  Вид карточек
                </h4>

                <div className="flex items-center justify-between space-x-4 rounded-xl border border-white/5 p-4 bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors">
                  <div className="flex flex-col space-y-1.5">
                    <Label
                      htmlFor="display-mode"
                      className="text-base font-bold text-zinc-100 cursor-pointer"
                    >
                      Расширенный режим
                    </Label>
                    <span className="text-xs text-zinc-400 leading-relaxed max-w-[280px]">
                      Использовать широкие горизонтальные обложки (Backdrops)
                      вместо стандартных постеров.
                    </span>
                  </div>
                  <Switch
                    id="display-mode"
                    checked={cardDisplayMode === "backdrop"}
                    onCheckedChange={handleDisplayModeChange}
                    className="data-[state=checked]:bg-white data-[state=unchecked]:bg-zinc-800 border-2 border-transparent data-[state=checked]:border-indigo-500/20"
                  />
                </div>
              </div>

              {/* Metadata Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">
                  Метаданные
                </h4>

                <div className="flex items-center justify-between space-x-4 rounded-xl border border-white/5 p-4 bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors">
                  <div className="flex flex-col space-y-1.5">
                    <Label
                      htmlFor="show-metadata"
                      className="text-base font-bold text-zinc-100 cursor-pointer"
                    >
                      Информация под постером
                    </Label>
                    <span className="text-xs text-zinc-400 leading-relaxed max-w-[280px]">
                      Отображать название, год и теги качества под карточками
                      фильмов.
                    </span>
                  </div>
                  <Switch
                    id="show-metadata"
                    checked={showPosterMetadata}
                    onCheckedChange={handleMetadataChange}
                    className="data-[state=checked]:bg-white data-[state=unchecked]:bg-zinc-800 border-2 border-transparent data-[state=checked]:border-indigo-500/20"
                  />
                </div>
              </div>

              {/* Poster Colors Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">
                  Цвета из постеров
                </h4>

                <div className="flex items-center justify-between space-x-4 rounded-xl border border-white/5 p-4 bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors">
                  <div className="flex flex-col space-y-1.5">
                    <Label
                      htmlFor="poster-colors"
                      className="text-base font-bold text-zinc-100 cursor-pointer"
                    >
                      Извлекать цвета для фона
                    </Label>
                    <span className="text-xs text-zinc-400 leading-relaxed max-w-[280px]">
                      Если выключить — фон будет как раньше, без подмешивания
                      цветов постеров.
                    </span>
                  </div>
                  <Switch
                    id="poster-colors"
                    checked={enablePosterColors}
                    onCheckedChange={handlePosterColorsChange}
                    className="data-[state=checked]:bg-white data-[state=unchecked]:bg-zinc-800 border-2 border-transparent data-[state=checked]:border-indigo-500/20"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-zinc-900/30 border-t border-white/5 text-center">
              <p className="text-[10px] text-zinc-600">
                HDGood v2.5.0 • Settings
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
