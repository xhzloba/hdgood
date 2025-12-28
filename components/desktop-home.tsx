"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
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
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
  Clapperboard,
  Film,
  Check,
  Zap,
  Layers,
  ChevronDown,
  Volume2,
  VolumeX,
  X,
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
import {
  TrailerPlayer,
  getEmbedSrcFromTrailer,
} from "@/components/trailer-player";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useFavorites } from "@/hooks/use-favorites";
import { useWatched } from "@/hooks/use-watched";
import { formatRatingLabel, ratingBgColor, ratingColor } from "@/lib/utils";
import appleOriginalFilms from "@/data/appleoriginal/films.json";

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
  studio_logo?: string | string[] | null;
  poster_colors?: any;
  type?: string | null;
  quality?: any;
  tags?: any;
  age?: any;
  trailers?: any;
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

const appleOriginalFilmsSorted = [...appleOriginalFilms].sort((a, b) => {
  const yearA = a.year ? Number(a.year) : 0;
  const yearB = b.year ? Number(b.year) : 0;
  return yearB - yearA;
});

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
    viewAllHref: "/movies/all?tab=popular",
  },
  {
    id: "serials",
    title: "Сериалы",
    url: SERIALS_URL,
    viewAllHref: "/serials/all?tab=popular",
  },
  {
    id: "netflix_serials",
    title: "Сериалы Netflix",
    navTitle: "Netflix",
    url: "https://api.vokino.pro/v2/compilations/content/65a6b9dabce57d552a34b40d?token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352",
    fetchAll: true,
    viewAllHref: "/serials/netflix/all",
  },
  {
    id: "dolbyv",
    title: "4K DolbyV",
    navTitle: "DolbyV",
    url: "https://api.vokino.pro/v2/list?sort=new&tag=4K%20DolbyV&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352",
    viewAllHref: "/dolbyv/all",
  },
  {
    id: "harry_potter_universe",
    title: "Вселенная Гарри Поттер",
    navTitle: "Поттер",
    url: "https://api.vokino.pro/v2/compilations/content/65a69c828e6a3e812467507d",
    fetchAll: true,
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
  {
    id: "apple_original",
    title: (
      <div className="flex items-center gap-3">
        <span className="text-white">Популярное</span>
        <span className="text-white">Apple Original Films</span>
      </div>
    ) as any,
    navTitle: "Apple Films",
    items: appleOriginalFilmsSorted,
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

function IconFilmCustom({ className, ...props }: any) {
  const { size, stroke, ...rest } = props;
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 48 48"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <path
        clipRule="evenodd"
        fillRule="evenodd"
        d="M42 24C42 31.2328 38.3435 37.6115 32.7782 41.3886C33.1935 41.2738 33.602 41.1447 34 41C45.1693 36.9384 47 32 47 32L48 35C48 35 44.3832 40.459 34.5 43.5C28 45.5 21 45 21 45C9.40202 45 0 35.598 0 24C0 12.402 9.40202 3 21 3C32.598 3 42 12.402 42 24ZM21 19C24.3137 19 27 16.3137 27 13C27 9.68629 24.3137 7 21 7C17.6863 7 15 9.68629 15 13C15 16.3137 17.6863 19 21 19ZM10 30C13.3137 30 16 27.3137 16 24C16 20.6863 13.3137 18 10 18C6.68629 18 4 20.6863 4 24C4 27.3137 6.68629 30 10 30ZM38 24C38 27.3137 35.3137 30 32 30C28.6863 30 26 27.3137 26 24C26 20.6863 28.6863 18 32 18C35.3137 18 38 20.6863 38 24ZM21 26C22.1046 26 23 25.1046 23 24C23 22.8954 22.1046 22 21 22C19.8954 22 19 22.8954 19 24C19 25.1046 19.8954 26 21 26ZM27 35C27 38.3137 24.3137 41 21 41C17.6863 41 15 38.3137 15 35C15 31.6863 17.6863 29 21 29C24.3137 29 27 31.6863 27 35Z"
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
  const props = { className, stroke: 1.5 } as const;
  switch (name) {
    case "clock":
      return <IconClock {...props} />;
    case "4k":
      return <Icon4kCustom {...props} />;
    case "movie":
      return <IconFilmCustom {...props} />;
    case "serial":
      return <Clapperboard className={className} strokeWidth={1.5} />;
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
  const className = `p-[clamp(8px,1.2vh,12px)] rounded-xl transition-all group relative flex items-center justify-center ${
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
      {prev && prev !== current && (
        <img
          key={`prev-${prev}`}
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
          key={`curr-${current}`}
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

// Динамические размеры иконок для сайдбара
const sidebarIconClass = "w-[clamp(20px,3vh,28px)] h-[clamp(20px,3vh,28px)]";

export function DesktopSidebar({
  profileAvatar = PROFILE_AVATARS[0],
  onSettingsClick,
  showFavorites = true,
  favoritesActive = false,
  favoritesCount = 0,
  watchedActive = false,
  watchedCount = 0,
  activeRoute,
  enablePosterColors = true,
  onTogglePosterColors,
}: {
  profileAvatar?: string;
  onSettingsClick?: () => void;
  showFavorites?: boolean;
  favoritesActive?: boolean;
  favoritesCount?: number;
  watchedActive?: boolean;
  watchedCount?: number;
  activeRoute?: string;
  enablePosterColors?: boolean;
  onTogglePosterColors?: (val: boolean) => void;
}) {
  const pathname = usePathname();
  const activePath = activeRoute ?? pathname ?? "";
  const isHomeActive = !favoritesActive && !watchedActive && activePath === "/";
  const isFavoritesActive =
    favoritesActive || activePath.startsWith("/favorites");
  const isWatchedActive =
    watchedActive || activePath.startsWith("/watched");

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[clamp(64px,8vw,96px)] z-50 flex flex-col items-center py-[clamp(24px,4vh,40px)] gap-[clamp(24px,4vh,40px)] bg-transparent">
      <Link
        href="/"
        className="relative group flex flex-col items-center justify-center mb-[clamp(8px,1.5vh,16px)] py-2 transition-transform duration-300 group-hover:scale-105"
      >
        <span className="font-[900] text-[28px] leading-none tracking-tighter text-transparent bg-clip-text bg-linear-to-b from-white to-zinc-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          HD
        </span>
        <span className="font-[900] italic text-[10px] leading-none tracking-[0.3em] text-transparent bg-clip-text bg-linear-to-b from-white to-zinc-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] ml-1">
          GOOD
        </span>
      </Link>

      <nav className="flex flex-col gap-[clamp(8px,1.2vh,16px)] flex-1 justify-center w-full items-center">
        <NavItem
          icon={<Search className={sidebarIconClass} />}
          label="Поиск"
          href="/search"
          active={activePath.startsWith("/search")}
        />
        <NavItem
          icon={<IconHomeCustom className={sidebarIconClass} />}
          label="Главная"
          href="/"
          active={isHomeActive}
        />

        <NavItem
          icon={
            <div className="relative">
              <IconHeart
                className={`${sidebarIconClass} ${
                  isFavoritesActive ? "text-white" : ""
                }`}
                stroke={1.6}
                fill={isFavoritesActive ? "currentColor" : "none"}
              />
              {favoritesCount > 0 && (
                <span className="absolute -top-3 -right-3 min-w-[24px] h-[24px] flex items-center justify-center rounded-full bg-red-600 text-[12px] font-bold text-white px-1 shadow-sm ring-1 ring-black/20">
                  {favoritesCount > 99 ? "99+" : favoritesCount}
                </span>
              )}
            </div>
          }
          label="Избранное"
          href="/favorites"
          active={isFavoritesActive}
        />

        <NavItem
          icon={
            <div className="relative">
              <Eye
                className={`${sidebarIconClass} ${
                  isWatchedActive ? "text-white" : ""
                }`}
                strokeWidth={1.6}
              />
              {watchedCount > 0 && (
                <span className="absolute -top-3 -right-3 min-w-[24px] h-[24px] flex items-center justify-center rounded-full bg-blue-600 text-[12px] font-bold text-white px-1 shadow-sm ring-1 ring-black/20">
                  {watchedCount > 99 ? "99+" : watchedCount}
                </span>
              )}
            </div>
          }
          label="Просмотренное"
          href="/watched"
          active={isWatchedActive}
        />

        <NavItem
          icon={<IconDeviceTv className={sidebarIconClass} />}
          label="ТВ Каналы"
          href="/tv"
          active={activePath.startsWith("/tv")}
        />

        {CATEGORIES.filter((cat) => cat.route && cat.route !== "/updates").map(
          (cat, i) => (
            <NavItem
              key={i}
              icon={
                <CategoryIcon name={cat.ico} className={sidebarIconClass} />
              }
              label={cat.title}
              href={cat.route || "#"}
              active={
                !!cat.route &&
                (activePath.startsWith(cat.route) ||
                  (cat.route === "/serials/all" &&
                    activePath.startsWith("/serials")) ||
                  (cat.route === "/movies/all" &&
                    activePath.startsWith("/movies")))
              }
            />
          )
        )}
      </nav>

      <div className="mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-[clamp(8px,1.2vh,12px)] rounded-xl transition-all group relative flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 outline-none">
              <div
                className={`${sidebarIconClass} rounded-full overflow-hidden ring-2 ring-white/10 group-hover:ring-white/30 transition-all`}
              >
                <img
                  src={profileAvatar}
                  className="w-full h-full object-cover"
                  alt="Профиль"
                />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="end"
            className="w-64 bg-zinc-950 border-zinc-800 text-zinc-200 ml-4 p-2"
          >
            <DropdownMenuLabel className="text-zinc-400 font-medium">
              Мой профиль
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-800 my-2" />
            <DropdownMenuItem
              onClick={onSettingsClick}
              className="cursor-pointer focus:bg-zinc-900 focus:text-white rounded-md py-2"
            >
              <Settings className="mr-3 h-4 w-4" />
              <span>Настройки интерфейса</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800 my-2" />
            <DropdownMenuLabel className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest px-2 py-1">
              Внешний вид
            </DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={enablePosterColors}
              onCheckedChange={onTogglePosterColors}
              className="focus:bg-zinc-900 focus:text-white rounded-md py-2 cursor-pointer"
            >
              Извлекать цвета от фона
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

export function DesktopHome({
  initialDisplayMode = "backdrop",
  customSlides,
  initialSlideId,
  favoritesActiveOverride = false,
  watchedActiveOverride = false,
  forceShowFavoritesNav = false,
}: {
  initialDisplayMode?: "backdrop" | "poster";
  customSlides?: Slide[];
  initialSlideId?: string;
  favoritesActiveOverride?: boolean;
  watchedActiveOverride?: boolean;
  forceShowFavoritesNav?: boolean;
}) {
  const router = useRouter();
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
  const lastNavSourceRef = useRef<"keyboard" | "mouse">("mouse");
  const [overrideRefresh, setOverrideRefresh] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWideClock, setShowWideClock] = useState(false);
  const [clockText, setClockText] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchYear, setSearchYear] = useState<string>("");
  const [searchPage, setSearchPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchItems, setSearchItems] = useState<
    Array<{
      id: string | number;
      title: string;
      poster?: string | null;
      year?: string | number | null;
      rating?: any;
      country?: any;
      genre?: any;
      tags?: any;
      quality?: string | null;
      type?: string | null;
    }>
  >([]);
  type SearchHistoryMovie = {
    id: string | number;
    title: string;
    poster?: string | null;
    year?: string | number | null;
  };

  const [searchHistory, setSearchHistory] = useState<SearchHistoryMovie[]>([]);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const observerTarget = useRef<HTMLDivElement | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchSeqRef = useRef(0);
  const {
    favorites,
    ready: favoritesReady,
    toggleFavorite,
    isFavorite,
  } = useFavorites();
  const favoritesCount = (favorites || []).length;
  const {
    watched,
    toggleWatched,
    isWatched,
  } = useWatched();
  const watchedCount = (watched || []).length;
  const showFavoritesNav = true;
  const [viewportHeight, setViewportHeight] = useState<number>(
    typeof window !== "undefined" ? window.innerHeight : 1080
  );
  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1920
  );
  const isVeryTinyHeight = viewportHeight > 0 && viewportHeight < 700;
  const isTinyHeight = viewportHeight > 0 && viewportHeight <= 787;
  const isSmallHeight = viewportHeight > 0 && viewportHeight < 800;
  const isShortHeight = viewportHeight > 0 && viewportHeight < 900;
  const isMediumHeight = viewportHeight >= 900 && viewportHeight <= 1200;
  const isWideAndTall = viewportWidth >= 1800 && viewportHeight >= 950;

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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingExiting, setOnboardingExiting] = useState(false);
  const [showHoverTrailer, setShowHoverTrailer] = useState(false);
  const [hoverTrailerUrl, setHoverTrailerUrl] = useState<string | null>(null);
  const [isTrailerMuted, setIsTrailerMuted] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isTrailerDialogOpen, setIsTrailerDialogOpen] = useState(false);
  const [activeTrailers, setActiveTrailers] = useState<any[]>([]);
  const hoverTrailerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [onboardingNavDone, setOnboardingNavDone] = useState(false);
  const [onboardingNavDownDone, setOnboardingNavDownDone] = useState(false);
  const [onboardingNavUpDone, setOnboardingNavUpDone] = useState(false);
  const [onboardingNavWheelDownDone, setOnboardingNavWheelDownDone] = useState(false);
  const [onboardingNavWheelUpDone, setOnboardingNavWheelUpDone] = useState(false);
  
  const [onboardingSliderDone, setOnboardingSliderDone] = useState(false);
  const [onboardingSliderRightDone, setOnboardingSliderRightDone] = useState(false);
  const [onboardingSliderLeftDone, setOnboardingSliderLeftDone] = useState(false);

  const [onboardingFullscreenDone, setOnboardingFullscreenDone] = useState(false);
  const [onboardingSearchDone, setOnboardingSearchDone] = useState(false);
  const [onboardingPersonalizationDone, setOnboardingPersonalizationDone] = useState(false);

  // New state to track if nav dropdown is open
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Track horizontal interaction first (Sequential Right then Left)
  useEffect(() => {
    if (!showOnboarding) return;
    
    const handleSliderInteraction = (e: KeyboardEvent | WheelEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === "ArrowRight") setOnboardingSliderRightDone(true);
        if (onboardingSliderRightDone && e.key === "ArrowLeft") setOnboardingSliderLeftDone(true);
      } else if (e instanceof WheelEvent) {
        if (e.deltaX > 10) setOnboardingSliderRightDone(true);
        if (onboardingSliderRightDone && e.deltaX < -10) setOnboardingSliderLeftDone(true);
      }
    };
    
    window.addEventListener("keydown", handleSliderInteraction);
    window.addEventListener("wheel", handleSliderInteraction, { passive: true });
    
    if (onboardingSliderRightDone && onboardingSliderLeftDone) {
      setOnboardingSliderDone(true);
    }
    
    return () => {
      window.removeEventListener("keydown", handleSliderInteraction);
      window.removeEventListener("wheel", handleSliderInteraction);
    };
  }, [showOnboarding, onboardingSliderRightDone, onboardingSliderLeftDone]);

  // Track category switching for onboarding (Only after Slider is done)
  useEffect(() => {
    if (!showOnboarding || !onboardingSliderDone) return;
    
    const handleNavKeys = (e: KeyboardEvent) => {
      if (!onboardingNavUpDone) {
        if (e.key === "ArrowDown") setOnboardingNavDownDone(true);
        if (onboardingNavDownDone && e.key === "ArrowUp") setOnboardingNavUpDone(true);
      }
    };
    
    const handleNavWheel = (e: WheelEvent) => {
      if (onboardingNavUpDone) {
        if (e.deltaY > 10) setOnboardingNavWheelDownDone(true);
        if (onboardingNavWheelDownDone && e.deltaY < -10) setOnboardingNavWheelUpDone(true);
      }
    };

    window.addEventListener("keydown", handleNavKeys);
    window.addEventListener("wheel", handleNavWheel, { passive: true });
    
    if (onboardingNavWheelUpDone) {
      setOnboardingNavDone(true);
    }
    
    return () => {
      window.removeEventListener("keydown", handleNavKeys);
      window.removeEventListener("wheel", handleNavWheel);
    };
  }, [showOnboarding, onboardingSliderDone, onboardingNavDownDone, onboardingNavUpDone, onboardingNavWheelDownDone, onboardingNavWheelUpDone]);

  // Track fullscreen and search for onboarding
  useEffect(() => {
    if (showOnboarding && isFullscreen) setOnboardingFullscreenDone(true);
  }, [isFullscreen, showOnboarding]);

  useEffect(() => {
    if (showOnboarding && searchExpanded) setOnboardingSearchDone(true);
  }, [searchExpanded, showOnboarding]);

  // Onboarding completion logic is now handled via a manual button in the celebration screen
  useEffect(() => {
    if (onboardingNavDone && onboardingSliderDone && onboardingFullscreenDone && onboardingSearchDone && onboardingPersonalizationDone) {
      // Logic moved to "Start Watching" button
    }
  }, [onboardingNavDone, onboardingSliderDone, onboardingFullscreenDone, onboardingSearchDone, onboardingPersonalizationDone]);

  const paletteCacheRef = useRef<
    Record<string, { tl: string; tr: string; br: string; bl: string }>
  >({});

  useEffect(() => {
    setIsMounted(true);
    const savedMeta = localStorage.getItem("desktop_show_poster_metadata");
    if (savedMeta) {
      setShowPosterMetadata(savedMeta === "true");
    }

    const onboardingDone = localStorage.getItem("desktop_onboarding_done");
    if (!onboardingDone) {
      // Delay onboarding slightly for visual polish
      const timer = setTimeout(() => setShowOnboarding(true), 1500);
      return () => clearTimeout(timer);
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
    
    // Sync display mode from cookies on mount if possible, or just trust initialDisplayMode
    // However, if we want to be sure, we can check document.cookie
    const match = document.cookie.match(/desktop_home_card_display_mode=([^;]+)/);
    if (match) {
      const mode = match[1] as "backdrop" | "poster";
      if (mode === "backdrop" || mode === "poster") {
        setCardDisplayMode(mode);
      }
    }
  }, []);

  const pushSearchHistoryMovie = useCallback(
    (movie: SearchHistoryMovie) => {
      const id = movie?.id;
      const title = String(movie?.title || "").trim();
      if (id == null || !title) return;
      try {
        setSearchHistory((prev) => {
          const next = [
            {
              id,
              title,
              poster: movie?.poster ?? null,
              year: movie?.year ?? null,
            },
            ...prev.filter((v) => String(v.id) !== String(id)),
          ].slice(0, 10);
          try {
            localStorage.setItem(
              "desktop_search_history",
              JSON.stringify(next)
            );
          } catch {}
          return next;
        });
      } catch {}
    },
    []
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem("desktop_search_history");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const next = parsed
        .map((v: any) => {
          if (!v || typeof v !== "object") return null;
          const id = (v as any).id;
          const title = String((v as any).title || "").trim();
          if (id == null || !title) return null;
          return {
            id,
            title,
            poster: (v as any).poster ?? null,
            year: (v as any).year ?? null,
          };
        })
        .filter(Boolean)
        .slice(0, 10) as SearchHistoryMovie[];
      setSearchHistory(next);
    } catch {}
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (historyOpen) {
      try {
        searchAbortRef.current?.abort();
      } catch {}
      setSearchLoading(false);
      setSearchError(null);
      setSearchItems([]);
      setSearchOpen(true);
      return;
    }
    if (q.length < 2) {
      try {
        searchAbortRef.current?.abort();
      } catch {}
      setSearchLoading(false);
      setSearchError(null);
      setSearchItems([]);
      setSearchOpen(false);
      return;
    }

    const seq = ++searchSeqRef.current;
    setSearchLoading(true);
    setSearchError(null);

    const timeoutMs = searchPage > 1 ? 50 : 220;

    const timeoutId = window.setTimeout(async () => {
      try {
        try {
          searchAbortRef.current?.abort();
        } catch {}
        const controller = new AbortController();
        searchAbortRef.current = controller;

        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&page=${searchPage}${
            searchYear ? `&year=${searchYear}` : ""
          }`,
          {
            signal: controller.signal,
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        if (seq !== searchSeqRef.current) return;

        const extract = (src: any): any[] => {
          if (src?.type === "list" && Array.isArray(src?.channels)) {
            return src.channels;
          }
          if (Array.isArray(src?.channels)) return src.channels;
          if (Array.isArray(src)) return src;
          return [];
        };

        const cleanUrl = (val: any): string | null => {
          if (val == null) return null;
          const s = String(val).trim();
          if (!s) return null;
          return s.replace(/^[`'"]+|[`'"]+$/g, "").trim() || null;
        };

        let items = extract(data)
          .map((item: any) => {
            const d = item?.details ?? item;
            const id = d?.id ?? item?.id;
            const title =
              d?.name ?? d?.title ?? item?.title ?? "";
            const poster = cleanUrl(d?.poster ?? item?.poster ?? null);
            const year =
              d?.released ?? d?.year ?? item?.year ?? null;
            const rating =
              d?.rating_kp ?? d?.rating ?? d?.rating_imdb ?? item?.rating ?? null;
            const country = d?.country ?? item?.country ?? null;
            const genre = d?.genre ?? item?.genre ?? null;
            const tags = d?.tags ?? item?.tags ?? null;
            const quality =
              d?.quality ?? item?.quality ?? null;
            const type = d?.type ?? item?.type ?? null;
            return {
              id,
              title: String(title || "").trim(),
              poster,
              year,
              rating,
              country,
              genre,
              tags,
              quality,
              type: type ? String(type) : null,
            };
          })
          .filter((it: any) => it?.id != null && it?.title);

        if (searchYear && searchYear.length === 4) {
          items.sort((a, b) => {
            const yearA = String(a.year || "");
            const yearB = String(b.year || "");
            const matchA = yearA === searchYear;
            const matchB = yearB === searchYear;
            if (matchA && !matchB) return -1;
            if (!matchA && matchB) return 1;
            return 0;
          });
        }

        if (searchPage === 1) {
          setSearchItems(items);
        } else {
          setSearchItems((prev) => {
            const newItems = items.filter(
              (n: any) => !prev.some((p) => String(p.id) === String(n.id))
            );
            return [...prev, ...newItems];
          });
        }
        setHasMore(items.length > 0);
        setSearchOpen(true);
      } catch (e: any) {
        const aborted =
          e?.name === "AbortError" ||
          searchAbortRef.current?.signal?.aborted;
        if (aborted) return;
        if (seq !== searchSeqRef.current) return;
        if (searchPage === 1) {
          setSearchItems([]);
          setSearchError("Не удалось загрузить результаты");
        }
        setSearchOpen(true);
      } finally {
        if (seq === searchSeqRef.current) {
          setSearchLoading(false);
        }
      }
    }, timeoutMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchQuery, historyOpen, searchYear, searchPage]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !searchLoading) {
          setSearchPage((p) => p + 1);
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, searchLoading]);

  useEffect(() => {
    if (!searchOpen) return;
    const onPointerDown = (ev: MouseEvent) => {
      const wrap = searchWrapRef.current;
      if (!wrap) return;
      if (!wrap.contains(ev.target as Node)) {
        setSearchOpen(false);
        setHistoryOpen(false);
      }
    };
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setSearchOpen(false);
        setHistoryOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [searchOpen]);

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
    const syncHeight = () => {
      setViewportHeight(window.innerHeight);
      setViewportWidth(window.innerWidth);
    };
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

    let cancelled = false;
    let overrideCheckCancelled = false;

    const tryApplyOverrideColors = (ovColors: any) => {
      if (cancelled) return false;
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
        if (!cancelled) {
          setUbColors(next);
          if (cacheKey) paletteCacheRef.current[cacheKey] = next;
          setPaletteReady(true);
        }
        return true;
      }
      return false;
    };

    // Если уже есть цвета в активном фильме (из override) — применяем и выходим
    const directOvColors = (activeMovie as any)?.poster_colors;
    if (directOvColors && tryApplyOverrideColors(directOvColors)) {
      return () => {
        cancelled = true;
        overrideCheckCancelled = true;
      };
    }

    // Если есть кэш — используем без мерцания
    if (cacheKey && paletteCacheRef.current[cacheKey]) {
      if (!cancelled) {
        setUbColors(paletteCacheRef.current[cacheKey]);
        setPaletteReady(true);
      }
      return () => {
        cancelled = true;
        overrideCheckCancelled = true;
      };
    }

    try {
      const overridesCache = (globalThis as any).__movieOverridesCache || {};
      const ovColors = movieId ? overridesCache[movieId]?.poster_colors : null;
      if (ovColors && tryApplyOverrideColors(ovColors)) {
        return () => {
          cancelled = true;
          overrideCheckCancelled = true;
        };
      }
    } catch {}

    // Если overrides не дали цвета — попробуем забрать свежие overrides, затем fallback на автопалитру
    if (movieId) {
      void (async () => {
        try {
          const res = await fetch(`/api/overrides/movies?ids=${movieId}`, {
            headers: { Accept: "application/json" },
            cache: "no-store",
          });
          if (overrideCheckCancelled || cancelled) return;
          if (!res.ok) {
            // Если запрос не удался, продолжаем с автопалитрой
            return;
          }
          const data = await res.json();
          if (overrideCheckCancelled || cancelled) return;
          const ov = data?.[movieId];
          if (ov?.poster_colors) {
            const ok = tryApplyOverrideColors(ov.poster_colors);
            if (ok) {
              const overridesCache =
                (globalThis as any).__movieOverridesCache ||
                ((globalThis as any).__movieOverridesCache = {});
              overridesCache[movieId] = {
                ...(overridesCache[movieId] || {}),
                poster_colors: ov.poster_colors,
              };
              return; // Выходим, если override применен
            }
          }
          // Если override не дал цвета, продолжаем с автопалитрой ниже
        } catch {
          // При ошибке продолжаем с автопалитрой
        }
      })();
    }

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
      if (cancelled || overrideCheckCancelled) return;
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

    let blobUrl: string | null = null;
    const run = async () => {
      try {
        const { img, blobUrl: bu } = await loadImage(src);
        if (cancelled || overrideCheckCancelled) {
          if (bu) URL.revokeObjectURL(bu);
          return;
        }
        blobUrl = bu || null;
        const palette = getPaletteFromImage(img);
        if (!cancelled && !overrideCheckCancelled) {
          applyPalette(palette.length > 0 ? palette : null);
        }
      } catch {
        if (!cancelled && !overrideCheckCancelled) {
          applyPalette(null);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      overrideCheckCancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [activeMovie?.id, activeMovie?.poster, activeMovie?.backdrop, enablePosterColors]);

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
  const showNetflixTopLogo = activeSlide?.id === "netflix_serials";
  const showAppleTopLogo = activeSlide?.id === "apple_original";
  const showWarnersTopLogo = activeSlide?.id === "harry_potter_universe";

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
        studio_logo: (d as any)?.studio_logo ?? (item as any)?.studio_logo ?? null,
        poster_colors:
          item.poster_colors ??
          d?.poster_colors ??
          d?.colors ??
          item.colors ??
          null,
        type: d?.type ?? item.type ?? null,
        quality: d?.quality ?? item.quality ?? null,
        tags: d?.tags ?? item.tags ?? null,
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
      // If dropdown is open, don't hijack scroll
      if (isDropdownOpen) return;

      lastNavSourceRef.current = "mouse";
      // Down scroll -> Next Slide
      if (e.deltaY > 0) handleInput("next");
      // Up scroll -> Prev Slide
      else if (e.deltaY < 0) handleInput("prev");
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // If dropdown is open, let default behavior happen (e.g. arrow keys in menu)
      if (isDropdownOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        lastNavSourceRef.current = "keyboard";
        handleInput("next");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        lastNavSourceRef.current = "keyboard";
        handleInput("prev");
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [slideIndex, slides, isDropdownOpen]);

  // Fetch override for the initial movie or when activeMovie changes
  useEffect(() => {
    let cancelled = false;
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
                studio_logo: (ov as any)?.studio_logo ?? (prev as any)?.studio_logo ?? null,
                trailers: ov.trailers || prev.trailers,
              };
            });
          }
        }
      } catch (e) {
        console.error("Failed to fetch override", e);
      } finally {
        if (!cancelled) setIsFetchingOverride(false);
      }
    };

    fetchOverride();

    return () => {
      cancelled = true;
    };
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
      description: cachedOverride?.about || first.description,
      backdrop: cachedOverride?.bg_poster?.backdrop ?? first.backdrop,
      poster_colors: cachedOverride?.poster_colors ?? first.poster_colors,
      studio_logo:
        (cachedOverride as any)?.studio_logo ?? (first as any)?.studio_logo ?? null,
      trailers: cachedOverride?.trailers ?? first.trailers ?? null,
      quality:
        first.quality ??
        (rawList[0] as any)?.details?.quality ??
        (rawList[0] as any)?.quality ??
        null,
      tags:
        first.tags ??
        (rawList[0] as any)?.details?.tags ??
        (rawList[0] as any)?.tags ??
        null,
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

  // Hover Trailer Logic
  useEffect(() => {
    // Reset state when movie changes
    setShowHoverTrailer(false);
    setHoverTrailerUrl(null);
    setIsTrailerMuted(true);
    
    // Initialize trailers from movie props if available (overrides)
    const initialTrailers = (activeMovie as any)?.trailers || [];
    const normalizedInitial = Array.isArray(initialTrailers) ? initialTrailers : [initialTrailers];
    setActiveTrailers(normalizedInitial);
    
    // If we have initial trailers, try to set the URL immediately
    const initialYoutube = normalizedInitial.find((t: any) => {
      const src = getEmbedSrcFromTrailer(t);
      return src && src.includes("youtube.com/embed");
    });
    if (initialYoutube) {
      let src = getEmbedSrcFromTrailer(initialYoutube);
      if (src) {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const separator = src.includes("?") ? "&" : "?";
        src += `${separator}autoplay=1&mute=1&controls=0&playsinline=1&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&enablejsapi=1&origin=${origin}&widget_referrer=${origin}`;
        setHoverTrailerUrl(src);
      }
    }

    if (hoverTrailerTimerRef.current) {
      clearTimeout(hoverTrailerTimerRef.current);
    }

    if (!activeMovie?.id) return;

    const movieId = String(activeMovie.id);

    // Fetch trailer data immediately (or from cache) to show the button ASAP
    const fetchTrailer = async () => {
      try {
        const cache = (globalThis as any).__movieDataCache || ((globalThis as any).__movieDataCache = {});
        let fullData = cache[movieId];

        if (!fullData) {
          const res = await fetch(`https://api.vokino.pro/v2/view/${movieId}`);
          if (res.ok) {
            const movieData = await res.json();
            fullData = { movieData };
            cache[movieId] = fullData;
          }
        }

        if (fullData?.movieData) {
          const apiTrailers = fullData.movieData.details?.trailers || fullData.movieData.trailers || [];
          const movieTrailers = (activeMovie as any)?.trailers || [];
          
          const combined = [
            ...(Array.isArray(movieTrailers) ? movieTrailers : [movieTrailers]),
            ...(Array.isArray(apiTrailers) ? apiTrailers : [apiTrailers])
          ].filter(Boolean);

          const normalizedTrailers = Array.from(new Set(combined.map(t => JSON.stringify(t))))
            .map(s => JSON.parse(s));
            
          setActiveTrailers(normalizedTrailers);

          // Find first valid YouTube trailer
          const youtubeTrailer = normalizedTrailers.find((t: any) => {
            const src = getEmbedSrcFromTrailer(t);
            return src && src.includes("youtube.com/embed");
          });

          if (youtubeTrailer) {
            let src = getEmbedSrcFromTrailer(youtubeTrailer);
            if (src) {
              const origin = typeof window !== "undefined" ? window.location.origin : "";
              const separator = src.includes("?") ? "&" : "?";
              src += `${separator}autoplay=1&mute=1&controls=0&playsinline=1&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&enablejsapi=1&origin=${origin}&widget_referrer=${origin}`;
              setHoverTrailerUrl(src);
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch trailer", e);
      }
    };

    // Use a smaller debounce for the actual API call if not in cache
    const cache = (globalThis as any).__movieDataCache;
    if (cache && cache[movieId]) {
      fetchTrailer();
    } else {
      hoverTrailerTimerRef.current = setTimeout(fetchTrailer, 300);
    }

    return () => {
      if (hoverTrailerTimerRef.current) {
        clearTimeout(hoverTrailerTimerRef.current);
      }
    };
  }, [activeMovie?.id]);

  // Handle YouTube messages to detect when trailer ends
  useEffect(() => {
    if (!showHoverTrailer) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.youtube.com" && event.origin !== "https://www.youtube-nocookie.com") return;
      
      try {
        const data = JSON.parse(event.data);
        if (data.event === "infoDelivery" && data.info && data.info.playerState === 0) {
          // playerState 0 is ended
          setShowHoverTrailer(false);
        }
      } catch (e) {
        // Not a JSON or not from YT
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [showHoverTrailer]);

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
      setIsFetchingOverride(!ov);

      const normalized = {
        id: m.id,
        title: m.title,
        poster: ov?.poster ?? m.poster,
        backdrop: ov?.bg_poster?.backdrop ?? m.backdrop ?? m.poster,
        year: m.year,
        rating: m.rating,
        country: m.country,
        genre: m.genre,
        description: ov?.about || m.description || "",
        duration: m.duration,
        logo: ov?.poster_logo ?? m.logo ?? null,
        studio_logo:
          (ov as any)?.studio_logo ?? (m as any)?.studio_logo ?? null,
        poster_colors: ov?.poster_colors,
        type: m.type ?? null,
        quality: m.quality ?? null,
        tags: m.tags ?? null,
        trailers: ov?.trailers ?? m.trailers ?? null,
      };
      activeIdRef.current = String(normalized.id);
      setActiveMovie((prev: any) => {
        // Всегда обновляем, даже если id совпадает, чтобы триггерить пересчет цветов
        // если изменились poster, backdrop или другие поля
        if (prev && String(prev.id) === String(normalized.id)) {
          // Проверяем, действительно ли что-то изменилось
          const posterChanged = prev.poster !== normalized.poster;
          const backdropChanged = prev.backdrop !== normalized.backdrop;
          const colorsChanged = prev.poster_colors !== normalized.poster_colors;
          if (!posterChanged && !backdropChanged && !colorsChanged) {
            return prev; // Ничего не изменилось
          }
        }
        return normalized;
      });
    });
  }, []);

  // Helper to get high-res image if possible, or fallback
  const getBackdrop = (movie: any) => {
    if (isFetchingOverride) return "";
    if (!movie) return "";
    return movie.backdrop || movie.poster || "";
  };

  const isMobile = false;
  const showColorLayer = !isMobile;
  const layerOpacity = enablePosterColors && paletteReady ? 0.6 : 0;

  // Динамические размеры через clamp() + vh для автоматического масштабирования
  const logoHeightClass = isFullscreen
    ? "h-[clamp(120px,18vh,200px)]"
    : "h-[clamp(60px,12vh,110px)]";
  const netflixTopLogoHeightClass = isFullscreen
    ? "h-[clamp(26px,3.8vh,44px)]"
    : "h-[clamp(20px,3vh,40px)]";

  // Ограничиваем количество строк описания через line-clamp + min-height для стабильности
  const descriptionHeightClass = isFullscreen
    ? "line-clamp-2 min-h-[clamp(40px,6vh,52px)]"
    : "line-clamp-2 min-h-[clamp(40px,6vh,52px)]";

  const sliderAnimClass = !isMounted
    ? ""
    : slideDirection === "next"
    ? "animate-in fade-in slide-in-from-bottom-6 duration-500"
    : slideDirection === "prev"
    ? "animate-in fade-in slide-in-from-top-6 duration-500"
    : "animate-in fade-in duration-500";

  // Отступ слайдера - динамический через vh, зависит от типа карточек
  // backdrop (расширенные) меньше по высоте → значительно больший отступ
  // poster (обычные) выше → меньший отступ
  // isVeryTinyHeight (<700px) → минимальные отступы
  const sliderMarginClass = isVeryTinyHeight
    ? cardDisplayMode === "backdrop"
      ? "mt-[clamp(16px,3vh,32px)]"
      : "mt-[clamp(12px,2vh,24px)]"
    : isWideAndTall
    ? cardDisplayMode === "backdrop"
      ? "mt-[clamp(120px,15vh,230px)]"
      : "mt-[clamp(70px,8vh,130px)]"
    : cardDisplayMode === "backdrop"
    ? "mt-[clamp(60px,9vh,120px)]"
    : "mt-[clamp(28px,4vh,56px)]";

  // Отступ блока логотипа - динамический с учётом полноэкранного режима
  const logoBlockMarginClass = isFullscreen
    ? "mt-[clamp(16px,2.5vh,40px)]"
    : "mt-[clamp(8px,1.5vh,24px)]";

  // Убираем line-clamp, чтобы не было двойных многоточий при обрезке
  const descriptionClampClass = "";

  // Динамические размеры кнопок
  const ctaGapClass = "gap-[clamp(12px,1.5vh,16px)]";
  const primaryButtonSizeBase =
    "px-[clamp(20px,3vw,32px)] py-[clamp(10px,1.2vh,14px)] min-w-[clamp(100px,12vw,140px)]";
  // Для широких экранов (например MacBook 16\" при масштабе 100–125%) чуть крупнее, как в fullscreen
  const primaryButtonSizeClass = showWideClock
    ? `${primaryButtonSizeBase} md:px-[clamp(24px,3.6vw,40px)] md:py-[clamp(12px,1.5vh,18px)] md:min-w-[clamp(120px,14vw,168px)]`
    : primaryButtonSizeBase;
  const primaryButtonTextClass = showWideClock
    ? "text-[clamp(15px,1.8vh,20px)]"
    : "text-[clamp(14px,1.6vh,18px)]";
  const favoriteButtonPaddingBase = "p-[clamp(10px,1.2vh,14px)]";
  const favoriteButtonPaddingClass = showWideClock
    ? "p-[clamp(12px,1.6vh,18px)]"
    : favoriteButtonPaddingBase;
  const playIconSize = 20;
  const favoriteIconSize = showWideClock ? 22 : 20;

  // Динамические паддинги main
  const mainPaddingClass =
    "pt-[clamp(48px,9vh,192px)] pb-[clamp(10px,3vh,48px)] gap-[clamp(12px,2vh,32px)] overflow-hidden";

  const isFavoriteActiveMovie = isFavorite(
    activeMovie?.id ? String(activeMovie.id) : null
  );
  const isWatchedActiveMovie = isWatched(
    activeMovie?.id ? String(activeMovie.id) : null
  );

  const activeStudioLogos: string[] = (() => {
    const raw = (activeMovie as any)?.studio_logo;
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
  const activeStudioLogo = activeStudioLogos[0] ?? null;
  const showStudioTopLogo = activeStudioLogos.length > 0;

  const headerViewAllSlides = new Set([
    "watching",
    "trending",
    "movies",
    "serials",
    "new_year",
    "dolbyv",
    "netflix_serials",
  ]);

  const computeThemeColor = useCallback(() => {
    const hex = (ubColors?.tl || "").trim();
    const match = hex.match(/^#?[0-9a-fA-F]{6}$/);
    if (match) return hex.startsWith("#") ? hex : `#${hex}`;
    return "#0f172a";
  }, [ubColors]);

  const getPrimaryCountry = useCallback((country: any): string | null => {
    if (!country) return null;
    if (Array.isArray(country)) {
      const first = country.find(
        (c) => c != null && String(c).trim().length > 0
      );
      return first != null ? String(first).trim() : null;
    }
    const parts = String(country)
      .split(/[,/|]/)
      .map((p) => p.trim())
      .filter(Boolean);
    return parts[0] || null;
  }, []);

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

  const handleWatchedToggle = () => {
    if (!activeMovie) return;
    toggleWatched({
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





  const dropdownSlides = useMemo(() => 
    slides.map(s => ({
      id: s.id,
      title: String((typeof s.title === 'string' ? s.title : s.navTitle) || "Раздел")
    })), 
  [slides]);

  const handleDropdownSlideChange = useCallback((id: string) => {
    const idx = slides.findIndex(s => s.id === id);
    if (idx !== -1 && idx !== slideIndex) {
      setSlideDirection(idx > slideIndex ? "next" : "prev");
      setSlideIndex(idx);
    }
  }, [slides, slideIndex]);

  return (
    <div
      className={`relative min-h-screen min-h-[100dvh] w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans selection:bg-orange-500/30 ${
        isFullscreen ? "fullscreen-mode" : ""
      }`}
    >
      {/* Background Backdrop */}
      {showHoverTrailer && hoverTrailerUrl ? (
        <div className="absolute top-0 right-0 w-[85%] h-[70vh] overflow-hidden z-0">
          <iframe
            ref={iframeRef}
            src={`${hoverTrailerUrl}${hoverTrailerUrl.includes("?") ? "&" : "?"}autoplay=1&mute=1&enablejsapi=1`}
            className="w-full h-full object-cover scale-[1.35]"
            allow="autoplay; encrypted-media"
            style={{ border: "none" }}
          />

          {/* Gradients to match BackdropImage */}
          <div className="absolute inset-0 bg-linear-to-r from-zinc-950 via-zinc-950/30 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-zinc-950 to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-32 bg-linear-to-b from-zinc-950/80 to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 bottom-0 w-96 bg-linear-to-l from-zinc-950 via-zinc-950/60 to-transparent pointer-events-none" />
        </div>
      ) : (
        <BackdropImage src={getBackdrop(activeMovie)} />
      )}
      {/* Цветовой слой из постера (отключен) */}
      {showColorLayer && (
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
        watchedActive={watchedActiveOverride}
        watchedCount={watchedCount}
        enablePosterColors={enablePosterColors}
        onTogglePosterColors={handlePosterColorsChange}
      />

      <div className="hidden md:grid absolute top-4 left-0 right-0 z-[60] h-11 max-h-11 overflow-hidden items-center px-10 gap-4 grid-cols-[1fr_auto_1fr] ml-16 lg:ml-20">
        <div className={`flex items-center justify-start gap-4 h-full transition-all duration-700 ${showOnboarding && !onboardingPersonalizationDone ? "opacity-0 pointer-events-none translate-y-[-10px]" : "opacity-100 translate-y-0"}`}>
          {/* Categories Dropdown moved to the left */}
          <div className="flex items-center gap-1.5 h-full">
            <DropdownMenu onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button className={`h-full px-3 flex items-center gap-2 text-[13px] font-black transition-all uppercase tracking-widest outline-none group rounded-[10px] shrink-0 ${
                  isDropdownOpen 
                    ? "bg-white/10 text-white border border-white/10" 
                    : "text-white/50 hover:text-white border border-transparent"
                }`}>
                  <Layers className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="hidden lg:inline">Категории</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="start" 
                sideOffset={10}
                className="w-[240px] bg-zinc-950/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] p-1.5 z-[100] animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 duration-200"
              >
                <div className="px-2 py-2 mb-1">
                  <span className="text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase">
                    Навигация
                  </span>
                </div>
                
                <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto pr-1 customize-scrollbar">
                  {dropdownSlides.map((slide) => {
                    const isActive = activeSlide.id === slide.id;
                    return (
                      <DropdownMenuItem
                        key={slide.id}
                        onClick={() => handleDropdownSlideChange(slide.id)}
                        className={`group relative flex items-center justify-between px-4 py-3 rounded-lg outline-none cursor-pointer border border-transparent transition-all duration-300 ease-out hover:bg-white focus:bg-white ${
                          isActive ? "bg-white/10" : ""
                        }`}
                      >
                        <span className={`text-[13px] uppercase tracking-widest font-black transition-all duration-300 ease-out group-hover:translate-x-1 group-focus:translate-x-1 ${isActive ? "text-white" : "text-zinc-400 group-hover:text-black group-focus:text-black"}`}>
                          {slide.title}
                        </span>

                        {isActive && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Active Category Badge */}
            <div className="hidden xl:flex items-center gap-4 h-11 shrink-0">
              <div className="w-px h-4 bg-white/10 hidden sm:block" />
              <div className="flex items-center min-w-[150px] h-full overflow-hidden">
                <span className="text-[14px] font-black uppercase leading-none tracking-wider bg-gradient-to-r from-white via-white/90 to-white/40 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] truncate py-1">
                  {activeSlide.title}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={`flex items-center justify-center h-full pointer-events-none select-none transition-opacity duration-700 ${showOnboarding ? "opacity-0" : "opacity-100"}`}>
          {(showStudioTopLogo || showNetflixTopLogo || showWarnersTopLogo) &&
            (showStudioTopLogo ? (
              <div className="flex items-center gap-2 translate-x-[40px]">
                {activeStudioLogos.map((src, index) => (
                  <img
                    key={`${src}-${index}`}
                    src={src}
                    alt="Логотип студии"
                    className={`${netflixTopLogoHeightClass} w-auto opacity-95 drop-shadow-[0_14px_40px_rgba(0,0,0,0.85),0_0_22px_rgba(0,0,0,0.9)]`}
                  />
                ))}
              </div>
            ) : (
              <img
                src={
                  showNetflixTopLogo
                    ? "/movies/logo/netflix.svg"
                    : "/movies/warners.svg"
                }
                alt={showNetflixTopLogo ? "Netflix" : "Warner Bros"}
                className={`${netflixTopLogoHeightClass} w-auto opacity-95 drop-shadow-[0_14px_40px_rgba(0,0,0,0.85),0_0_22px_rgba(0,0,0,0.9)] translate-x-[40px]`}
              />
            ))}
        </div>

        <div className={`flex items-center justify-end gap-3 transition-all duration-700 ${showOnboarding && !onboardingPersonalizationDone ? "opacity-0 pointer-events-none translate-y-[-10px]" : "opacity-100 translate-y-0"}`}>
          <div
            ref={searchWrapRef}
            className={`relative transition-all duration-200 ease-out z-50 group ${
              searchExpanded ? "w-[400px]" : "w-11"
            }`}
          >
            <div
              className={`relative flex items-center h-11 overflow-hidden transition-all duration-200 rounded-[10px] ${
                searchExpanded
                  ? "bg-[#161616]/95 border border-white/10 w-full backdrop-blur-md focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/40 shadow-xl"
                  : "bg-transparent border border-transparent w-11 justify-center hover:bg-white/10"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setSearchExpanded((prev) => !prev);
                  if (!searchExpanded) {
                    setTimeout(
                      () =>
                        document.getElementById("netflix-search-input")?.focus(),
                      50
                    );
                  }
                }}
                className={`z-10 p-1.5 cursor-pointer transition-colors flex-shrink-0 flex items-center justify-center ${
                  searchExpanded
                    ? "absolute left-1 text-white"
                    : "relative text-white/60 group-hover:text-white"
                }`}
              >
                <Search className="w-5 h-5" />
              </button>

              {searchExpanded && (
                <input
                  type="text"
                  maxLength={4}
                  value={searchYear}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setSearchYear(val);
                    setSearchPage(1);
                  }}
                  onBlur={(e) => {
                    // Используем setTimeout, чтобы дать время событию click/focus сработать в другом месте
                    setTimeout(() => {
                      const active = document.activeElement;
                      const mainInput = document.getElementById(
                        "netflix-search-input"
                      );
                      // Если фокус перешел не на основное поле и не на инпут года, и всё пусто -> закрываем
                      const isFocusInside =
                        active === e.target || active === mainInput;
                      if (
                        !isFocusInside &&
                        !searchQuery &&
                        !historyOpen &&
                        !searchYear
                      ) {
                        setSearchExpanded(false);
                        setSearchOpen(false);
                      }
                    }, 100);
                  }}
                  placeholder="Год"
                  className="absolute left-9 top-1/2 -translate-y-1/2 w-11 h-full bg-transparent text-white/80 text-[13px] text-center outline-none placeholder:text-zinc-600 border-r border-white/10 z-20"
                />
              )}

              <input
                id="netflix-search-input"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchPage(1);
                  if (historyOpen) setHistoryOpen(false);
                }}
                onFocus={() => {
                  const q = searchQuery.trim();
                  if (historyOpen) {
                    setSearchOpen(true);
                    return;
                  }
                  if (q.length >= 2) setSearchOpen(true);
                }}
                onBlur={(e) => {
                  // Используем setTimeout, чтобы проверить, куда ушел фокус
                  setTimeout(() => {
                    // Если ввели год, то не закрываем
                    if (searchYear) return;

                    const active = document.activeElement;
                    // Если фокус ушел на инпут года (предыдущий элемент по DOM, но мы проверим по типу/классу или просто не закроем если есть year)
                    // Но year может быть пуст.
                    // Проще: если ничего нет в обоих полях и кликнули вовне -> закрываем.
                    if (!searchQuery && !historyOpen) {
                      // Важно: если мы кликнули на инпут года, он станет activeElement
                      // Но так как он рендерится условно, он есть в DOM.
                      // Проверяем:
                      const isYearInput =
                        active instanceof HTMLInputElement &&
                        active.placeholder === "Год";

                      if (!isYearInput) {
                        setSearchExpanded(false);
                        setSearchOpen(false);
                      }
                    }
                  }, 100);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const q = searchQuery.trim();
                    if (q) {
                      setHistoryOpen(false);
                      setSearchOpen(false);
                      router.push(
                        `/search?q=${encodeURIComponent(q)}${
                          searchYear ? `&year=${searchYear}` : ""
                        }`
                      );
                    }
                  }
                }}
                placeholder="Поиск фильмов и сериалов"
                className={`w-full h-full bg-transparent text-white text-[13px] outline-none pr-9 placeholder:text-zinc-500 transition-opacity duration-200 absolute inset-0 ${
                  searchExpanded
                    ? "opacity-100 pl-[5.5rem]"
                    : "opacity-0 pointer-events-none pl-9"
                }`}
              />

              {/* Правая часть (лоадер / история) */}
              {searchExpanded && (
                <div className="absolute right-2 flex items-center gap-2 z-10">
                  {!historyOpen && searchLoading && (
                    <Loader2 className="w-3.5 h-3.5 text-white/60 animate-spin" />
                  )}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()} // prevent blur
                    onClick={() => {
                      setHistoryOpen((v) => {
                        const next = !v;
                        if (next) setSearchOpen(true);
                        return next;
                      });
                    }}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all"
                    title="История поиска"
                  >
                    <IconClock className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {searchOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-[12px] bg-black/55 border border-white/10 backdrop-blur-md shadow-[0_18px_60px_rgba(0,0,0,0.55)] overflow-hidden">
                <div className="p-2">
                  {historyOpen ? (
                    searchHistory.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-white/60">
                        История пуста
                      </div>
                    ) : (
                      <div
                        className="max-h-[420px] overflow-auto overscroll-contain"
                        onWheelCapture={(e) => {
                          e.stopPropagation();
                        }}
                        onTouchMoveCapture={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        {searchHistory.slice(0, 10).map((m) => (
                          <button
                            key={String(m.id)}
                            type="button"
                            onClick={() => {
                              setHistoryOpen(false);
                              setSearchOpen(false);
                              setSearchQuery(String(m.title));
                              router.push(`/movie/${m.id}`);
                            }}
                            className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-[10px] hover:bg-white/7 transition text-left"
                          >
                            <span className="min-w-0 flex-1 text-[13px] font-semibold text-white truncate">
                              {m.title}
                            </span>
                            <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )
                  ) : (
                    <>
                      {searchLoading && (
                        <div className="px-3 py-2 text-xs text-white/60">
                          Ищем…
                        </div>
                      )}
                      {!searchLoading && searchError && (
                        <div className="px-3 py-2 text-xs text-white/60">
                          {searchError}
                        </div>
                      )}
                      {!searchLoading &&
                        !searchError &&
                        searchItems.length === 0 && (
                          <div className="px-3 py-2 text-xs text-white/60">
                            Ничего не найдено
                          </div>
                        )}
                      {!searchError && searchItems.length > 0 && (
                        <div
                          className="max-h-[420px] overflow-auto overscroll-contain"
                          onWheelCapture={(e) => {
                            e.stopPropagation();
                          }}
                          onTouchMoveCapture={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          {searchItems.map((it) => {
                            const ratingValue = (() => {
                              const raw = (it as any)?.rating;
                              if (raw == null) return null;
                              const s = String(raw).trim();
                              if (!s || s === "0" || s === "0.0")
                                return null;
                              const n = parseFloat(s);
                              if (Number.isNaN(n) || n === 0) return null;
                              return n;
                            })();

                            const year = it.year != null ? String(it.year) : "";
                            const country =
                              getPrimaryCountry((it as any)?.country) || "";
                            const genres = (() => {
                              const raw =
                                (it as any)?.genre ?? (it as any)?.tags;
                              const items: string[] = Array.isArray(raw)
                                ? raw
                                    .map((v: any) => String(v || "").trim())
                                    .filter((v: string) => v.length > 0)
                                : typeof raw === "string"
                                  ? raw
                                      .split(/[,/|]/)
                                      .map((p) => p.trim())
                                      .filter(Boolean)
                                  : [];
                              return items.slice(0, 2);
                            })();

                            const metaNodes = [
                              ratingValue != null ? (
                                <span
                                  key="rating"
                                  className={[
                                    "font-semibold tabular-nums",
                                    ratingColor(ratingValue),
                                  ].join(" ")}
                                >
                                  {formatRatingLabel(ratingValue)}
                                </span>
                              ) : null,
                              country ? (
                                <span key="country">{country}</span>
                              ) : null,
                              year ? <span key="year">{year}</span> : null,
                              genres.length > 0 ? (
                                <span key="genres">{genres.join(" ")}</span>
                              ) : null,
                            ].filter(Boolean);

                            return (
                              <Link
                                key={String(it.id)}
                                href={`/movie/${it.id}`}
                                onClick={() => {
                                  pushSearchHistoryMovie({
                                    id: it.id,
                                    title: String(it.title || "").trim(),
                                    poster: it.poster ?? null,
                                    year: it.year ?? null,
                                  });
                                  setHistoryOpen(false);
                                  setSearchOpen(false);
                                }}
                                className="flex items-center gap-3 px-3 py-2 rounded-[10px] hover:bg-white/7 transition"
                              >
                                <div className="w-10 h-14 rounded-md bg-white/5 border border-white/10 overflow-hidden shrink-0">
                                  {it.poster ? (
                                    <img
                                      src={it.poster}
                                      alt={it.title}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-linear-to-b from-white/10 to-white/0" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-[13px] font-semibold text-white truncate">
                                    {it.title}
                                  </div>
                                  {metaNodes.length > 0 && (
                                    <div className="mt-0.5 text-[11px] text-white/55 truncate">
                                      {metaNodes.map((node, idx) => (
                                        <React.Fragment key={idx}>
                                          {idx > 0 ? " " : null}
                                          {node}
                                        </React.Fragment>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <ChevronRight className="w-4 h-4 text-white/40" />
                              </Link>
                            );
                          })}
                          {hasMore && (
                            <div
                              ref={observerTarget}
                              className="w-full py-4 flex items-center justify-center"
                            >
                              {searchLoading && (
                                <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={
                    enablePosterColors ? "Отключить цвета" : "Включить цвета"
                  }
                  onClick={() => handlePosterColorsChange(!enablePosterColors)}
                  className={`h-11 w-11 items-center justify-center rounded-[10px] transition-all flex ${
                    enablePosterColors
                      ? "text-white bg-white/10"
                      : "text-white/60 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={8}
                className="bg-white text-black border-0 shadow-xl"
              >
                <p className="text-xs font-semibold">
                  {enablePosterColors
                    ? "Цвета от фона (Вкл)"
                    : "Цвета от фона (Выкл)"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

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
      </div>

      {/* Main Content Area */}
      <main
        className={`relative ${showOnboarding && !onboardingExiting ? "" : "z-10"} ml-[clamp(64px,8vw,96px)] h-[100dvh] max-h-[100dvh] flex flex-col px-0 ${mainPaddingClass} transition-[padding] duration-500 ease-out`}
      >
        <div className={`flex-1 w-full flex flex-col gap-[clamp(12px,2vh,28px)] ${showOnboarding ? "overflow-visible" : "overflow-hidden"}`}>
          <div className={`w-full px-3 lg:px-4 2xl:px-6 max-w-none flex flex-col gap-[clamp(12px,2vh,28px)] ${showOnboarding ? "overflow-visible" : "overflow-hidden"}`}>
            {/* Movie Info */}
            {activeMovie ? (
              <>
                <div className={`max-w-5xl w-full transition-[margin] duration-500 ease-out ${showOnboarding ? "relative overflow-visible" : ""} ${onboardingExiting ? "z-[60]" : ""}`}>
                  <div
                    className={`${logoHeightClass} mb-[clamp(10px,1.5vh,22px)] flex items-center transition-[height] duration-500 ease-out ${logoBlockMarginClass}`}
                  >
                    {activeMovie.logo ? (
                      <img
                        src={activeMovie.logo}
                        alt={activeMovie.title}
                        className={`h-full w-auto object-contain transition-all duration-500 ease-out max-w-[min(52vw,520px)] ${
                          cardDisplayMode === "backdrop" 
                            ? "drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" 
                            : "drop-shadow-2xl"
                        }`}
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

                  <div className="flex items-center flex-wrap gap-2 md:gap-3 mb-[clamp(12px,2vh,24px)]">
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
                    {getPrimaryCountry(activeMovie.country) && (
                      <span className="text-zinc-300 text-xs md:text-sm lg:text-base">
                        {getPrimaryCountry(activeMovie.country)}
                      </span>
                    )}
                    {activeMovie.year && (
                      <span className="text-zinc-300 text-xs md:text-sm lg:text-base">
                        {activeMovie.year}
                      </span>
                    )}
                    {activeMovie.genre && (
                      <span className="text-zinc-300 text-xs md:text-sm lg:text-base">
                        {activeMovie.genre?.split(",").slice(0, 2).join(",")}
                      </span>
                    )}
                    {(() => {
                      const rawTags = (activeMovie as any)?.tags;
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
                      const quality = (activeMovie as any)?.quality;
                      if (!tagLabel && !quality) return null;
                      return (
                        <div className="flex items-center gap-2">
                          {quality && (
                            <span className="px-2 md:px-2 py-[3px] md:py-1 rounded-full text-[11px] md:text-[12px] text-black font-black tracking-tight bg-white border border-white/70 shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
                              {String(quality)}
                            </span>
                          )}
                          {tagLabel && (
                            <span className="px-2 md:px-2 py-[3px] md:py-1 rounded-md text-[11px] md:text-[12px] bg-white text-black font-black tracking-tight border border-white/70 shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
                              {tagLabel}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <p
                    className={`relative text-zinc-300 text-[clamp(15px,1.6vw,19px)] ${descriptionClampClass} max-w-[clamp(400px,50vw,768px)] mb-[clamp(18px,3vh,36px)] drop-shadow-md font-light leading-relaxed ${descriptionHeightClass} pr-[2px]`}
                  >
                    {activeMovie.description ||
                      "Описание к этому фильму пока не добавлено, но мы уверены, что оно того стоит."}
                  </p>

                  <div className={`flex items-center ${ctaGapClass}`}>
                    <Link
                      href={`/movie/${activeMovie.id}`}
                      className={`bg-white text-black rounded-[4px] font-bold flex items-center justify-center gap-2 hover:bg-white/90 transition active:scale-95 flex-1 md:flex-none shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.6)] ${primaryButtonSizeClass}`}
                    >
                      <Play
                        size={playIconSize}
                        fill="currentColor"
                        className="ml-1 w-[clamp(18px,2vh,24px)] h-[clamp(18px,2vh,24px)]"
                      />
                      <span className={primaryButtonTextClass}>Смотреть</span>
                    </Link>

                    {(() => {
                      const hasTrailers = activeTrailers.length > 0 || (activeMovie as any)?.trailers?.length > 0;
                      
                      if (!hasTrailers && !showHoverTrailer) return null;

                      if (showHoverTrailer) {
                        return (
                          <div className="flex items-center gap-2">
                            {/* Mute Toggle */}
                            <button
                              onClick={() => {
                                const newMute = !isTrailerMuted;
                                setIsTrailerMuted(newMute);
                                if (iframeRef.current?.contentWindow) {
                                  iframeRef.current.contentWindow.postMessage(
                                    JSON.stringify({
                                      event: "command",
                                      func: newMute ? "mute" : "unMute",
                                    }),
                                    "*"
                                  );
                                }
                              }}
                              className={`rounded-full transition active:scale-95 backdrop-blur-md border-2 border-zinc-400/50 text-zinc-200 hover:border-white hover:text-white hover:bg-white/10 p-2 md:p-3 shadow-[0_4px_12px_rgba(0,0,0,0.5)]`}
                              title={isTrailerMuted ? "Включить звук" : "Выключить звук"}
                            >
                              {isTrailerMuted ? <VolumeX size={playIconSize} /> : <Volume2 size={playIconSize} />}
                            </button>

                            {/* Close Trailer */}
                            <button
                              onClick={() => setShowHoverTrailer(false)}
                              className={`rounded-full transition active:scale-95 backdrop-blur-md border-2 border-zinc-400/50 text-zinc-200 hover:border-white hover:text-white hover:bg-white/10 p-2 md:p-3 shadow-[0_4px_12px_rgba(0,0,0,0.5)]`}
                              title="Закрыть трейлер"
                            >
                              <X size={playIconSize} />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <button
                          disabled={!hasTrailers}
                          onClick={() => {
                            if (hoverTrailerUrl) {
                              setShowHoverTrailer(true);
                            } else {
                              setIsTrailerDialogOpen(true);
                            }
                          }}
                          className={`rounded-[4px] font-bold flex items-center justify-center gap-2 transition active:scale-95 flex-1 md:flex-none backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.5)] ${primaryButtonSizeClass} ${
                            hasTrailers 
                              ? "bg-zinc-600/40 text-white hover:bg-zinc-600/60" 
                              : "bg-zinc-800/20 text-zinc-500 cursor-not-allowed opacity-50"
                          }`}
                        >
                          <Clapperboard
                            size={playIconSize}
                            className="w-[clamp(18px,2vh,24px)] h-[clamp(18px,2vh,24px)]"
                          />
                          <span className={primaryButtonTextClass}>Трейлер</span>
                        </button>
                      );
                    })()}
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={handleFavoriteToggle}
                            className={`${favoriteButtonPaddingClass} rounded-full border-2 transition active:scale-95 backdrop-blur-sm shadow-[0_4px_12px_rgba(0,0,0,0.5)] ${
                              isFavoriteActiveMovie
                                ? "border-white bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                                : "border-zinc-400/50 text-zinc-200 hover:border-white hover:text-white hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                            }`}
                            aria-pressed={isFavoriteActiveMovie}
                          >
                            {isFavoriteActiveMovie ? (
                              <Heart
                                size={favoriteIconSize}
                                fill="currentColor"
                              />
                            ) : (
                              <Plus size={favoriteIconSize} />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="font-bold bg-white text-black border-0 shadow-xl mb-2"
                        >
                          <p>
                            {isFavoriteActiveMovie
                              ? "Убрать из избранного"
                              : "Добавить в избранное"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={handleWatchedToggle}
                            className={`${favoriteButtonPaddingClass} rounded-full border-2 transition active:scale-95 backdrop-blur-sm shadow-[0_4px_12px_rgba(0,0,0,0.5)] ${
                              isWatchedActiveMovie
                                ? "border-white bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                                : "border-zinc-400/50 text-zinc-200 hover:border-white hover:text-white hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                            }`}
                            aria-pressed={isWatchedActiveMovie}
                          >
                            {isWatchedActiveMovie ? (
                              <EyeOff size={favoriteIconSize} fill="currentColor" />
                            ) : (
                              <Eye size={favoriteIconSize} />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="font-bold bg-white text-black border-0 shadow-xl mb-2"
                        >
                          <p>
                            {isWatchedActiveMovie
                              ? "Убрать из просмотренного"
                              : "В просмотренное"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Trending Slider */}
                <div className={`w-full ${sliderMarginClass} relative transition-all duration-700 ${showOnboarding && !onboardingPersonalizationDone ? "scale-[1.01] z-[60]" : "z-10"}`}>
                  {/* Neon highlight for movie slider during onboarding (Steps 1, 2 & 3) */}
                  {showOnboarding && !onboardingPersonalizationDone && (
                    <div className="absolute -inset-x-8 -inset-y-6 bg-blue-500/10 border border-blue-500/40 rounded-[40px] blur-2xl animate-pulse -z-10 shadow-[0_0_80px_rgba(59,130,246,0.3)]" />
                  )}
                  <div className="w-full relative">
                    <div className="slider-fade-in">
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
                        showAge
                        availableSlides={dropdownSlides}
                        onSlideChange={handleDropdownSlideChange}
                        currentSlideId={activeSlide.id}
                      />
                    </div>
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
          className={`absolute right-0 top-[clamp(200px,28vh,350px)] w-[clamp(160px,16vw,256px)] pointer-events-none flex flex-col items-end pr-[clamp(24px,3vw,40px)] transition-all duration-700 ${
            activeMovie ? "opacity-100" : "opacity-0"
          } ${showOnboarding && onboardingSliderDone && !onboardingNavDone ? "scale-105 z-[60]" : "z-40"}`}
        >
          {/* Neon highlight for sidebar during onboarding Step 2 */}
          {showOnboarding && onboardingSliderDone && !onboardingNavDone && (
            <div className="absolute inset-0 -m-4 bg-blue-500/10 border border-blue-500/40 rounded-[40px] blur-xl animate-pulse -z-10 shadow-[0_0_60px_rgba(59,130,246,0.3)]" />
          )}
          {/* 
            Container height = 3 * Stride. 
            Stride = clamp(28px, 4vh, 36px).
            We want to show 3 items, centered.
          */}
          <div className="h-[calc(3*clamp(28px,4vh,36px))] w-full relative overflow-hidden mask-[linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)]">
            <div
              className="absolute top-0 right-0 flex flex-col gap-[clamp(4px,0.6vh,8px)] items-end transition-transform duration-500 ease-out w-full"
              style={{
                // Stride * (1 - index) centers the active item (index) in the 2nd slot (1)
                transform: `translateY(calc(clamp(28px,4vh,36px) * (1 - ${slideIndex})))`,
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
                  className="group flex items-center gap-[clamp(8px,1vh,12px)] focus:outline-none pointer-events-auto h-[calc(clamp(28px,4vh,36px)-clamp(4px,0.6vh,8px))] px-2 rounded-lg transition-all duration-300"
                >
                  <div className="relative flex items-center justify-center w-[clamp(24px,3vw,32px)]">
                    <div
                      className={`rounded-full transition-all duration-500 ${
                        slideIndex === i
                          ? "w-1 h-4 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]"
                          : "w-1 h-1 bg-white/20 group-hover:bg-white/50"
                      }`}
                    />
                    {slideIndex === i && (
                      <div className="absolute inset-0 bg-white/20 blur-md rounded-full animate-pulse" />
                    )}
                  </div>
                  <span
                    className={`font-semibold uppercase tracking-[0.2em] transition-all duration-500 text-right whitespace-nowrap ${
                      slideIndex === i
                        ? "text-white text-[clamp(11px,1.3vh,14px)]"
                        : "text-zinc-500 text-[clamp(9px,1vh,11px)] group-hover:text-zinc-300"
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

        {/* Onboarding Overlay - Interactive Tasks */}
        {showOnboarding && (
          <div className={`fixed inset-0 z-50 bg-black/95 backdrop-blur-md pointer-events-auto overflow-hidden ${onboardingExiting ? "animate-out fade-out duration-1000 fill-mode-forwards" : "animate-in fade-in duration-1000"}`}>
            <div className={`relative w-full h-full p-10 flex flex-col items-center justify-start pt-[12vh] z-[70] ${onboardingExiting ? "animate-out zoom-out-95 duration-1000 fill-mode-forwards" : ""}`}>
              
              {/* Central Sequential Kvests Container */}
              {/* Central Sequential Kvests Container */}
              <div className="relative w-full max-w-4xl h-[400px] flex items-center justify-center scale-110">
                {/* Horizontal Slider Hint (Step 1) */}
                <div 
                  className={`absolute flex flex-col items-center gap-8 transition-all duration-700 pointer-events-none ${
                    !onboardingSliderDone 
                      ? "opacity-100 scale-100 translate-y-0" 
                      : "opacity-0 scale-90 -translate-y-10"
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="flex items-center gap-3 mb-2">
                       <h3 className="text-3xl font-black text-white drop-shadow-2xl tracking-tighter italic uppercase transition-colors">Листать подборки</h3>
                    </div>
                    <p className="text-base max-w-[320px] leading-relaxed drop-shadow-md text-white">
                      {!onboardingSliderRightDone
                        ? <>Нажмите <span className="text-blue-400 font-black animate-pulse drop-shadow-[0_0_10px_#3b82f6]">ВПРАВО →</span></>
                        : <>Теперь <span className="text-blue-400 font-black animate-pulse drop-shadow-[0_0_10px_#3b82f6]">ВЛЕВО ←</span></>
                      }
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-10">
                      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all duration-500 ${onboardingSliderLeftDone ? "bg-green-500/20 border-green-500/50" : (onboardingSliderRightDone ? "bg-blue-500/30 border-blue-400 animate-pulse shadow-[0_0_25px_#3b82f6]" : "bg-white/5 border-white/10 opacity-20")}`}>
                        <span className={`text-xl font-black ${onboardingSliderLeftDone ? "text-green-500" : (onboardingSliderRightDone ? "text-white" : "text-white/20")}`}>←</span>
                      </div>
                      <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all duration-500 ${onboardingSliderRightDone ? (onboardingSliderLeftDone ? "bg-green-500/20 border-green-500/50" : "bg-green-500/20 border-green-500/50") : "bg-blue-500/30 border-blue-400 animate-pulse shadow-[0_0_25px_#3b82f6]"}`}>
                        <span className={`text-xl font-black ${onboardingSliderRightDone ? "text-green-500" : "text-white"}`}>→</span>
                      </div>
                  </div>
                </div>

                {/* Vertical Categories Hint (Step 2) */}
                <div 
                  className={`absolute flex flex-col items-center gap-8 transition-all duration-700 pointer-events-none ${
                    onboardingSliderDone && !onboardingNavDone 
                      ? "opacity-100 scale-100 translate-y-0" 
                      : onboardingNavDone ? "opacity-0 scale-90 -translate-y-10" : "opacity-0 scale-110 translate-y-10"
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="flex items-center gap-3 mb-2">
                       <h3 className="text-3xl font-black text-white drop-shadow-2xl tracking-tighter italic uppercase transition-colors">Разделы кино</h3>
                    </div>
                    <p className="text-base max-w-[320px] leading-relaxed drop-shadow-md text-zinc-300">
                      {!onboardingNavDownDone 
                        ? <>Нажми <span className="text-blue-400 font-black animate-pulse drop-shadow-[0_0_8px_#3b82f6]">ВНИЗ ↓</span></>
                        : !onboardingNavUpDone
                          ? <>Теперь <span className="text-blue-400 font-black animate-pulse drop-shadow-[0_0_8px_#3b82f6]">ВВЕРХ ↑</span></>
                          : !onboardingNavWheelDownDone
                            ? <>Теперь <span className="text-indigo-400 font-black animate-pulse drop-shadow-[0_0_8px_#6366f1]">КОЛЕСИКОМ ↓</span></>
                            : <>И напоследок <span className="text-indigo-400 font-black animate-pulse drop-shadow-[0_0_8px_#6366f1]">КОЛЕСИКОМ ↑</span></>
                      }
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-10">
                      <div className="flex flex-col items-center gap-2">
                         <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300 ${onboardingNavUpDone ? "bg-green-500/20 border-green-500/50" : (onboardingNavDownDone ? "bg-blue-500/40 border-blue-400 animate-pulse shadow-[0_0_15px_#3b82f6]" : "bg-white/5 border-white/10 opacity-20")}`}>
                            <span className={`text-lg font-black ${onboardingNavUpDone ? "text-green-500" : (onboardingNavDownDone ? "text-white" : "text-white/20")}`}>↑</span>
                         </div>
                         <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all duration-300 ${onboardingNavDownDone ? (onboardingNavUpDone ? "bg-green-500/20 border-green-500/50" : "bg-green-500/20 border-green-500/50") : "bg-blue-500/40 border-blue-400 animate-pulse shadow-[0_0_15px_#3b82f6]"}`}>
                            <span className={`text-lg font-black ${onboardingNavDownDone ? "text-green-500" : "text-white"}`}>↓</span>
                         </div>
                      </div>

                      <div className={`w-14 h-20 rounded-[28px] border-2 transition-all duration-500 flex items-center justify-center relative shadow-[0_0_30px_rgba(255,255,255,0.05)] border-white/20 bg-white/5`}>
                        <div className={`w-1.5 h-4 rounded-full transition-all duration-500 absolute ${
                          (onboardingNavWheelDownDone && !onboardingNavWheelUpDone)
                            ? "bg-indigo-400 animate-[bounce_1s_infinite] shadow-[0_0_10px_#6366f1] top-10"
                            : (onboardingNavUpDone && !onboardingNavWheelDownDone)
                              ? "bg-indigo-400 animate-[bounce_1s_infinite] shadow-[0_0_10px_#6366f1] top-4"
                              : onboardingNavDownDone
                                ? "bg-white/10 top-10"
                                : "bg-white/10 top-4"
                        }`} />
                        <div className={`w-0.5 h-10 bg-white/10 rounded-full绝对 transition-opacity opacity-100`} />
                      </div>
                  </div>
                </div>

                {/* Step 3: Personalization */}
                <div 
                  className={`absolute flex flex-col items-center transition-all duration-700 pointer-events-none ${
                    isSmallHeight ? "gap-4" : "gap-8"
                  } ${
                    onboardingNavDone && !onboardingPersonalizationDone 
                      ? `opacity-100 ${isSmallHeight ? "-translate-y-12 scale-[0.85]" : "translate-y-0 scale-100"}` 
                      : onboardingPersonalizationDone ? "opacity-0 scale-90 -translate-y-10" : "opacity-0 scale-110 translate-y-10"
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <h3 className="text-3xl font-black text-white drop-shadow-2xl tracking-tighter italic uppercase mb-2">Внешний вид</h3>
                    <p className="text-base max-w-[320px] leading-relaxed drop-shadow-md text-zinc-300">
                      Настройте интерфейс под себя
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-4 w-[320px] pointer-events-auto">
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold text-white">Широкие карточки</span>
                          <span className="text-[10px] text-zinc-500">Backdrop режим</span>
                        </div>
                        <Switch 
                          checked={cardDisplayMode === "backdrop"}
                          onCheckedChange={(checked) => {
                            handleDisplayModeChange(checked);
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold text-white">Инфо под постером</span>
                          <span className="text-[10px] text-zinc-500">Названия и метаданные</span>
                        </div>
                        <Switch 
                          checked={showPosterMetadata}
                          onCheckedChange={(show) => {
                            handleMetadataChange(show);
                          }}
                        />
                      </div>

                      <button 
                        onClick={() => setOnboardingPersonalizationDone(true)}
                        className="w-full py-3 rounded-xl bg-blue-500 text-white font-black uppercase text-sm shadow-[0_10px_30px_rgba(59,130,246,0.3)] hover:bg-blue-400 transition-colors"
                      >
                        Продолжить
                      </button>
                  </div>
                </div>
              </div>

              {/* Step 4: Top UI Hints (Only after basic nav & personalization is done) */}
              {onboardingNavDone && onboardingSliderDone && onboardingPersonalizationDone && (
                <>
                  {/* Fullscreen Hint */}
                  <div className={`absolute right-6 top-[60px] flex flex-col items-center gap-1 transition-all duration-700 z-[70] animate-in fade-in slide-in-from-top-2 fill-mode-both delay-300 ${onboardingFullscreenDone ? "opacity-100" : "animate-bounce"}`}>
                    <div className={`w-1.5 h-3 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)] ${onboardingFullscreenDone ? "bg-green-500 shadow-[0_0_15px_#22c55e]" : "bg-blue-500 shadow-[0_0_15px_#3b82f6]"}`} />
                    <span className={`px-2 py-0.5 text-white text-[8px] font-black rounded-md shadow-2xl uppercase transition-colors ${onboardingFullscreenDone ? "bg-green-500" : "bg-blue-500"}`}>{onboardingFullscreenDone ? "Ок" : "Экран"}</span>
                  </div>
                  {/* Search Hint */}
                  <div className={`absolute right-[128px] top-[60px] flex flex-col items-center gap-1 transition-all duration-700 z-[70] animate-in fade-in slide-in-from-top-2 fill-mode-both delay-500 ${onboardingSearchDone ? "opacity-100" : "animate-bounce"}`}>
                    <div className={`w-1.5 h-3 rounded-full shadow-[0_0_15px_rgba(14,165,233,0.6)] ${onboardingSearchDone ? "bg-green-500 shadow-[0_0_15px_#22c55e]" : "bg-sky-500 shadow-[0_0_15px_#0ea5e9]"}`} />
                    <span className={`px-2 py-0.5 text-white text-[8px] font-black rounded-md shadow-2xl uppercase transition-colors ${onboardingSearchDone ? "bg-green-500" : "bg-sky-500"}`}>{onboardingSearchDone ? "Ок" : "Поиск"}</span>
                  </div>
                </>
              )}

              {/* Status Indicator */}
              <div className="absolute top-10 left-1/2 -translate-x-1/2 animate-in fade-in duration-500 delay-700">
                  <div className="flex gap-2 p-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                    <div className={`w-8 h-1.5 rounded-full transition-all duration-500 ${onboardingSliderDone ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-white/20"}`} />
                    <div className={`w-8 h-1.5 rounded-full transition-all duration-500 ${onboardingNavDone ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-white/20"}`} />
                    <div className={`w-8 h-1.5 rounded-full transition-all duration-500 ${onboardingPersonalizationDone ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-white/20"}`} />
                    <div className={`w-8 h-1.5 rounded-full transition-all duration-500 ${onboardingFullscreenDone ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-white/20"}`} />
                    <div className={`w-8 h-1.5 rounded-full transition-all duration-500 ${onboardingSearchDone ? "bg-green-500 shadow-[0_0_10px_#22c55e]" : "bg-white/20"}`} />
                  </div>
              </div>

              {/* Success Message - Solid Background & Interactive */}
              {onboardingNavDone && onboardingSliderDone && onboardingFullscreenDone && onboardingSearchDone && onboardingPersonalizationDone && (
                <div className={`absolute inset-0 flex items-center justify-center bg-zinc-950/98 backdrop-blur-[50px] pointer-events-auto z-[110] ${onboardingExiting ? "animate-out fade-out duration-1000" : "animate-in fade-in zoom-in duration-700"}`}>
                   <Confetti />
                   <div className="max-w-5xl w-full text-center space-y-16 px-6 relative z-10">
                      <div className="space-y-6">
                        <div className="relative inline-block group">
                          <div className="w-24 h-24 rounded-[32px] bg-green-500 mx-auto flex items-center justify-center shadow-[0_0_80px_rgba(34,197,94,0.5)] transition-all duration-500 group-hover:rotate-6 group-hover:scale-110">
                            <Check className="w-12 h-12 text-black stroke-[4px]" />
                          </div>
                          <div className="absolute -top-2 -right-6 bg-white text-black text-[10px] font-black px-2 py-1 rounded-[4px] shadow-xl uppercase tracking-tighter animate-pulse">
                            Ок
                          </div>
                        </div>
                        <div className="space-y-4">
                          <h2 className="text-6xl font-black text-white italic tracking-tighter uppercase leading-tight drop-shadow-2xl">
                            Всё настроено!
                          </h2>
                          <p className="text-zinc-500 text-xl font-medium max-w-xl mx-auto leading-relaxed">
                            Обучение завершено. Теперь вы готовы к комфортному просмотру любимых фильмов.
                          </p>
                        </div>
                      </div>

                      {/* Feature Row - Cleaner, No blocks */}
                      <div className="flex flex-wrap items-start justify-center gap-x-16 gap-y-10 max-w-4xl mx-auto">
                         <div className="flex flex-col items-center gap-3 w-40 group">
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-all duration-300">
                               <IconDeviceTv className="w-7 h-7" />
                            </div>
                            <div className="space-y-1">
                               <h4 className="font-black text-white text-xs uppercase tracking-widest">4K качество</h4>
                               <p className="text-[10px] text-zinc-500 leading-tight">UHD & HDR на любом экране</p>
                            </div>
                         </div>

                         <div className="flex flex-col items-center gap-3 w-40 group">
                            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover:bg-rose-500/20 transition-all duration-300">
                               <Heart className="w-7 h-7" />
                            </div>
                            <div className="space-y-1 text-center">
                               <h4 className="font-black text-white text-xs uppercase tracking-widest">Избранное</h4>
                               <p className="text-[10px] text-zinc-500 leading-tight">Собирайте свою коллекцию одним нажатием</p>
                            </div>
                         </div>

                         <div className="flex flex-col items-center gap-3 w-40 group">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/20 transition-all duration-300">
                               <Eye className="w-7 h-7" />
                            </div>
                            <div className="space-y-1 text-center">
                               <h4 className="font-black text-white text-xs uppercase tracking-widest">Просмотрено</h4>
                               <p className="text-[10px] text-zinc-500 leading-tight">История ваших просмотров всегда под рукой</p>
                            </div>
                         </div>

                         <div className="flex flex-col items-center gap-3 w-40 group">
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 transition-all duration-300">
                               <Zap className="w-7 h-7" />
                            </div>
                            <div className="space-y-1 text-center">
                               <h4 className="font-black text-white text-xs uppercase tracking-widest">Хоткеи</h4>
                               <p className="text-[10px] text-zinc-500 leading-tight">Управляйте интерфейсом как профи</p>
                            </div>
                         </div>
                      </div>

                      <div className="pt-8">
                        <button 
                           onClick={() => {
                              setOnboardingExiting(true);
                              setTimeout(() => {
                                localStorage.setItem("desktop_onboarding_done", "true");
                                setShowOnboarding(false);
                              }, 1100);
                           }}
                           className="group relative px-14 py-5 overflow-hidden rounded-[20px] bg-white text-black text-xl font-black uppercase transition-all hover:scale-105 active:scale-95 shadow-[0_20px_60px_rgba(255,255,255,0.15)]"
                        >
                           <span className="relative z-10 flex items-center gap-3">
                              Начать <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                           </span>
                           <div className="absolute inset-0 bg-linear-to-r from-white via-zinc-100 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </div>
                   </div>
                </div>
              )}

              {/* Skip Button - Always Interactive */}
              <button 
                onClick={() => {
                  setOnboardingExiting(true);
                  setTimeout(() => {
                    localStorage.setItem("desktop_onboarding_done", "true");
                    setShowOnboarding(false);
                  }, 1100);
                }}
                className={`absolute top-32 right-10 px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40 text-xs font-bold hover:bg-white/10 hover:text-white transition-all pointer-events-auto ${onboardingExiting ? "opacity-0 scale-95 duration-500" : ""}`}
              >
                Пропустить обучение
              </button>

            </div>
          </div>
        )}
      </main>

      {/* Trailer Dialog */}
      <Dialog open={isTrailerDialogOpen} onOpenChange={setIsTrailerDialogOpen}>
        <DialogContent className="max-w-4xl bg-zinc-950 border-zinc-800 p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-4 bg-zinc-900/50 border-b border-zinc-800">
            <DialogTitle className="text-white flex items-center gap-2">
              <Clapperboard className="w-5 h-5 text-zinc-400" />
              Трейлеры: {activeMovie?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="p-1">
            <TrailerPlayer trailers={activeTrailers} mode="carousel" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


function Confetti() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[105]">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-sm"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-20px`,
            backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"][
              Math.floor(Math.random() * 5)
            ],
            animation: `confetti-fall ${2.5 + Math.random() * 2}s linear infinite`,
            animationDelay: `${Math.random() * 5}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg) scale(1); opacity: 1; }
          50% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg) scale(0.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

