"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Search, User, Play, Plus, Settings } from "lucide-react"
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
} from "@tabler/icons-react"
import { CATEGORIES } from "@/lib/categories"
import MovieSlider from "@/components/movie-slider"
import useSWR from "swr"
import Link from "next/link"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

const TRENDING_URL = "https://api.vokino.pro/v2/list?sort=popular&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352"
const WATCHING_URL = "https://api.vokino.pro/v2/list?sort=watching&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352"
const MOVIES_URL = "https://api.vokino.pro/v2/list?sort=popular&type=movie&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352"
const SERIALS_URL = "https://api.vokino.pro/v2/list?sort=popular&type=serial&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352"

const PROFILE_AVATARS = [
  "https://i.pinimg.com/564x/1b/71/b8/1b71b85dd741ad27bffa5c834a7ed797.jpg",
  "https://i.pinimg.com/564x/1b/a2/e6/1ba2e6d1d4874546c70c91f1024e17fb.jpg",
  "https://i.pinimg.com/236x/ec/74/7a/ec747a688a5d6232663caaf114bad1c3.jpg",
  "https://i.pinimg.com/236x/89/51/35/89513597910ab6ce4285402ab7c0e591.jpg",
  "https://i.pinimg.com/474x/b6/77/cd/b677cd1cde292f261166533d6fe75872.jpg",
  "https://pbs.twimg.com/media/GvFs5kxWEAAJpzR.jpg",
  "https://i.pinimg.com/474x/60/80/81/60808105ca579916a1b3eda8768dd570.jpg"
]

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

const SLIDES = [
    { id: "watching", title: "Сейчас смотрят", url: WATCHING_URL },
    { id: "trending", title: "В тренде", url: TRENDING_URL },
    { id: "movies", title: "Фильмы", url: MOVIES_URL },
    { id: "serials", title: "Сериалы", url: SERIALS_URL },
    { id: "fast_furious", title: "Франшиза: Форсаж", navTitle: "Форсаж", url: "https://api.vokino.pro/v2/compilations/content/65a6d50302d4113c4cce4fc4", fetchAll: true },
]

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
      <path clipRule="evenodd" fillRule="evenodd" d="M31.0012 13.7598C31.0546 13.3494 30.8569 12.9479 30.4999 12.7417C30.1428 12.5355 29.6963 12.5652 29.3675 12.8166L19.0718 20.6938C18.9639 20.7763 18.8699 20.8853 18.802 21.0031C18.734 21.1207 18.6901 21.2507 18.6725 21.3854L16.9985 34.2402C16.9452 34.6508 17.1428 35.0522 17.4999 35.2584C17.8569 35.4645 18.3035 35.435 18.6323 35.1835L28.928 27.3064C29.0358 27.2238 29.1298 27.1148 29.1977 26.9971C29.2656 26.8794 29.3097 26.7494 29.3273 26.6148L31.0012 13.7598ZM26.1649 25.25C25.4746 26.4458 23.9456 26.8554 22.7499 26.1651C21.5541 25.4747 21.1444 23.9458 21.8348 22.75C22.5252 21.5543 24.0541 21.1446 25.2499 21.835C26.4456 22.5253 26.8553 24.0543 26.1649 25.25Z" />
      <path clipRule="evenodd" fillRule="evenodd" d="M45 24C45 35.598 35.598 45 24 45C12.402 45 3 35.598 3 24C3 12.402 12.402 3 24 3C35.598 3 45 12.402 45 24ZM42 24C42 33.9411 33.9411 42 24 42C14.0589 42 6 33.9411 6 24C6 14.0589 14.0589 6 24 6C33.9411 6 42 14.0589 42 24Z" />
    </svg>
  )
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
  )
}

function CategoryIcon({ name, className = "" }: { name: string; className?: string }) {
  const props = { className, size: 28, stroke: 1.5 } as const
  switch (name) {
    case "clock":
      return <IconClock {...props} />
    case "4k":
      return <Icon4kCustom {...props} />
    case "movie":
      return <IconMovie {...props} />
    case "serial":
      return <IconDeviceTv {...props} />
    case "multfilm":
      return <IconMoodKid {...props} />
    case "multserial":
      return <IconLayoutGrid {...props} />
    case "anime":
      return <IconPokeball {...props} />
    case "documovie":
      return <IconFileText {...props} />
    case "docuserial":
      return <IconFiles {...props} />
    case "tvshow":
      return <IconMicrophone {...props} />
    case "compilations":
      return <IconCategory {...props} />
    default:
      return <IconMovie {...props} />
  }
}

function NavItem({ icon, label, href, active, onClick }: { icon: React.ReactNode, label: string, href?: string, active?: boolean, onClick?: () => void }) {
    const className = `p-3 rounded-xl transition-all group relative flex items-center justify-center ${active ? 'text-white bg-white/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`
    
    return (
        <TooltipProvider delayDuration={0}>
            <Tooltip>
                <TooltipTrigger asChild>
                    {onClick ? (
                        <button onClick={onClick} className={className}>
                            {icon}
                        </button>
                    ) : (
                        <Link 
                            href={href || "#"} 
                            className={className}
                        >
                            {icon}
                        </Link>
                    )}
                </TooltipTrigger>
                <TooltipContent side="right" className="font-bold bg-white text-black border-0 shadow-xl ml-2">
                    <p>{label}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
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
              className={`absolute inset-0 w-full h-full object-cover object-top transition-all duration-700 blur-xl scale-105 ${isLoading ? 'opacity-100' : 'opacity-0'}`}
              alt=""
           />
        )}
  
        {/* Current Image Layer */}
        {current && (
          <img
            ref={imgRef}
            key={current}
            src={current}
            className={`absolute inset-0 w-full h-full object-cover object-top transition-all duration-700 ${isLoading ? 'opacity-0 blur-xl scale-105' : 'opacity-100 blur-0 scale-100'}`}
            onLoad={handleLoad}
            alt=""
          />
        )}
        
        {/* Gradient Masks for smooth blend */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-950 to-transparent" />
        {/* Top Gradient for Text Visibility */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-zinc-950/80 to-transparent" />
        {/* Right Gradient for Indicators */}
        <div className="absolute top-0 right-0 bottom-0 w-96 bg-gradient-to-l from-zinc-950 via-zinc-950/60 to-transparent" />
      </div>
    );
}

// --- Main Component ---

export function DesktopHome({ initialDisplayMode = "backdrop" }: { initialDisplayMode?: "backdrop" | "poster" }) {
  const [activeMovie, setActiveMovie] = useState<any>(null)
  const [slideIndex, setSlideIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isFetchingOverride, setIsFetchingOverride] = useState(false)
  const [profileAvatar, setProfileAvatar] = useState(PROFILE_AVATARS[0])
  const lastUrlRef = useRef<string | null>(null)
  const lastInputTimeRef = useRef(0)
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [cardDisplayMode, setCardDisplayMode] = useState<"backdrop" | "poster">(initialDisplayMode)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleDisplayModeChange = (checked: boolean) => {
    const newMode = checked ? "backdrop" : "poster"
    setCardDisplayMode(newMode)
    // Save to cookie for server-side persistence (1 year)
    document.cookie = `desktop_home_card_display_mode=${newMode}; path=/; max-age=31536000`
  }

  const activeSlide = SLIDES[slideIndex]

  useEffect(() => {
    setProfileAvatar(PROFILE_AVATARS[Math.floor(Math.random() * PROFILE_AVATARS.length)])
  }, [])

  const { data } = useSWR(activeSlide.url, fetcher)

  // Scroll Jacking Logic
  useEffect(() => {
    const COOLDOWN = 1000; // ms between switches

    const handleInput = (direction: 'next' | 'prev') => {
        const now = Date.now();
        if (now - lastInputTimeRef.current < COOLDOWN) return;

        if (direction === 'next') {
            if (slideIndex < SLIDES.length - 1) {
                lastInputTimeRef.current = now;
                setSlideIndex(prev => prev + 1);
            }
        } else {
             if (slideIndex > 0) {
                lastInputTimeRef.current = now;
                setSlideIndex(prev => prev - 1);
            }
        }
    };

    const handleWheel = (e: WheelEvent) => {
        // Down scroll -> Next Slide
        if (e.deltaY > 0) handleInput('next');
        // Up scroll -> Prev Slide
        else if (e.deltaY < 0) handleInput('prev');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            handleInput('next');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            handleInput('prev');
        }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
        window.removeEventListener("wheel", handleWheel);
        window.removeEventListener("keydown", handleKeyDown);
    };
  }, [slideIndex]);

  // Fetch override for the initial movie or when activeMovie changes
  useEffect(() => {
    if (!activeMovie) return;
    
    // If we already have a logo, no need to fetch
    // BUT if we just switched slides (isFetchingOverride is true manually set), we MUST proceed
    if (activeMovie.logo && !isFetchingOverride) return;

    const fetchOverride = async () => {
      if (!isFetchingOverride) setIsFetchingOverride(true) // Ensure loading state is on
      try {
        const res = await fetch(`/api/overrides/movies?ids=${activeMovie.id}`)
        if (res.ok) {
          const overrides = await res.json()
          const ov = overrides[String(activeMovie.id)]
          if (ov) {
            // Update cache
            const overridesCache = (globalThis as any).__movieOverridesCache || ((globalThis as any).__movieOverridesCache = {});
            overridesCache[String(activeMovie.id)] = ov;
            
            setActiveMovie((prev: any) => {
                // If the active movie changed while we were fetching, don't update
                if (!prev || prev.id !== activeMovie.id) return prev;
                
                return {
                    ...prev,
                    logo: ov.poster_logo || prev.logo,
                    // Prioritize override backdrop (bg_poster.backdrop)
                    backdrop: ov.bg_poster?.backdrop || prev.backdrop
                };
            })
          }
        }
      } catch (e) {
        console.error("Failed to fetch override", e)
      } finally {
        setIsFetchingOverride(false)
      }
    }

    fetchOverride()
  }, [activeMovie?.id, activeSlide.id]) // Re-run if ID changes or if slide changes

  useEffect(() => {
    if (data) {
      const movies = data.channels || data
      if (movies && movies.length > 0) {
        const first = movies[0]
        const normalized = {
          id: first.details?.id || first.id,
          title: first.details?.name || first.title,
          poster: first.details?.poster || first.poster,
          // Priority: API bg_poster > API wide_poster > API backdrop > API poster
          backdrop: first.details?.bg_poster?.backdrop || first.details?.wide_poster || first.details?.backdrop || first.poster,
          year: first.details?.released || first.year,
          rating: first.details?.rating_kp || first.rating,
          country: first.details?.country || first.country,
          genre: first.details?.genre || first.genre,
          description: first.details?.about || first.about || "Описание отсутствует",
          duration: first.details?.duration || first.duration,
          logo: null, // Will be fetched
        }
        
        // If URL changed (slide switched) or first load, update activeMovie
        if (lastUrlRef.current !== activeSlide.url || !activeMovie) {
            // Try to restore from cache immediately if available
            const overridesCache = (globalThis as any).__movieOverridesCache || {};
            const cachedOverride = overridesCache[String(normalized.id)];
            if (cachedOverride) {
                normalized.logo = cachedOverride.poster_logo || normalized.logo;
                normalized.backdrop = cachedOverride.bg_poster?.backdrop || normalized.backdrop;
            } else {
                 // Pre-emptively clear logo if we are switching slides to avoid showing old logo
                 if (lastUrlRef.current !== activeSlide.url) {
                    normalized.logo = null; 
                 }
            }
            
            setActiveMovie(normalized)
            lastUrlRef.current = activeSlide.url
            
            // Trigger fetch immediately for the new first movie
            // We need to manually trigger this check because activeMovie update might be batched
            // or we want to ensure 'isFetchingOverride' is true BEFORE the component re-renders with the new title
            // IF we didn't have it cached
            if (!cachedOverride) {
                 setIsFetchingOverride(true)
            }
        }
      }
    }
  }, [data, activeMovie, activeSlide.url])

  const handleMovieHover = useCallback((movie: any) => {
    if (!movie) return
    // Normalize on hover as well
    const normalized = {
      id: movie.id,
      title: movie.title,
      poster: movie.poster,
      // MovieSlider now provides 'backdrop' which handles bg_poster logic
      // If it's still missing, fallback to poster
      backdrop: movie.backdrop || movie.poster, 
      year: movie.year,
      rating: movie.rating,
      country: movie.country,
      genre: movie.genre,
      description: movie.description || "", // Might be missing in list view
      duration: movie.duration,
      logo: movie.logo || null, // Keep logo if passed from slider
    }
    setActiveMovie(normalized)
  }, [])
  
  // Helper to get high-res image if possible, or fallback
  const getBackdrop = (movie: any) => {
    if (!movie) return ""
    return movie.backdrop || movie.poster || "" 
  }

  return (
    <div className="relative h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans selection:bg-orange-500/30">
      
      {/* Background Backdrop */}
      <BackdropImage src={getBackdrop(activeMovie)} />

      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 bottom-0 w-24 z-50 flex flex-col items-center py-10 gap-10 bg-zinc-950">
         <div className="text-orange-500 font-black text-2xl mb-4 tracking-tighter">HD</div>
         
         <nav className="flex flex-col gap-6 flex-1 justify-center w-full items-center">
            <NavItem icon={<Search size={28} />} label="Поиск" href="/search" />
            <NavItem icon={<IconHomeCustom className="w-7 h-7" />} label="Главная" href="/" active />
            
            {CATEGORIES.filter(cat => cat.route && cat.route !== "/updates").map((cat, i) => (
                <NavItem 
                    key={i}
                    icon={<CategoryIcon name={cat.ico} className="w-7 h-7" />} 
                    label={cat.title} 
                    href={cat.route || "#"} 
                />
            ))}
         </nav>

         <div className="mt-auto">
            <NavItem 
              icon={
                <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-white/10 group-hover:ring-white/30 transition-all">
                  <img src={profileAvatar} className="w-full h-full object-cover" alt="Профиль" />
                </div>
              } 
              label="Профиль" 
              onClick={() => setIsSettingsOpen(true)}
            />
         </div>
      </aside>

      {/* Main Content Area */}
      <main className="relative z-10 ml-24 h-full flex flex-col pb-[8vh] px-0 pt-24 overflow-hidden transition-[padding] duration-500 ease-out">
        <div className="min-h-full w-full flex flex-col justify-end">
        {/* Movie Info */}
        {activeMovie ? (
            <div className="mb-[6vh] max-w-3xl mt-auto px-16 transition-[margin] duration-500 ease-out">
                <div className="h-[16vh] max-h-[200px] min-h-[100px] mb-6 flex items-end transition-[height] duration-500 ease-out">
                    {activeMovie.logo ? (
                        <img 
                          src={activeMovie.logo} 
                          alt={activeMovie.title} 
                          className="max-w-[240px] h-full w-auto object-contain drop-shadow-2xl transition-all duration-500 ease-out md:max-w-[340px] lg:max-w-[460px]"
                        />
                    ) : isFetchingOverride ? (
                         // Show nothing or skeleton while checking for logo
                         <div className="h-[80px] w-[240px] bg-transparent" />
                    ) : (
                      <h1 className="text-4xl md:text-6xl font-black leading-tight drop-shadow-2xl tracking-tight">
                          {activeMovie.title}
                      </h1>
                    )}
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                    {activeMovie.rating && (
                         <span className={`px-2 py-1 rounded text-sm font-bold ${Number(activeMovie.rating) >= 7 ? 'bg-green-600' : 'bg-zinc-700'}`}>
                             {Number(activeMovie.rating).toFixed(1)}
                         </span>
                    )}
                    <span className="text-zinc-300 text-sm">{activeMovie.year}</span>
                    <span className="text-zinc-300 text-sm">
                        {activeMovie.genre?.split(',').slice(0, 2).join(',')}
                    </span>
                    {activeMovie.country && <span className="text-zinc-300 text-sm">{activeMovie.country}</span>}
                </div>
                
                <p className="text-zinc-300 text-lg line-clamp-3 max-w-2xl mb-8 drop-shadow-md font-light leading-relaxed">
                    {activeMovie.description || "Описание к этому фильму пока не добавлено, но мы уверены, что оно того стоит."}
                </p>
                
                <div className="flex items-center gap-4">
                    <Link 
                        href={`/movie/${activeMovie.id}`}
                        className="bg-white text-black px-6 py-3 md:px-8 rounded-[4px] font-bold flex items-center justify-center gap-2 hover:bg-white/90 transition active:scale-95 flex-1 md:flex-none min-w-[140px]"
                    >
                        <Play size={20} fill="currentColor" className="ml-1 md:w-6 md:h-6" />
                        <span className="text-base md:text-lg">Смотреть</span>
                    </Link>
                     <button className="p-3 rounded-full border-2 border-zinc-400/50 text-zinc-200 hover:border-white hover:text-white hover:bg-white/10 transition active:scale-95 backdrop-blur-sm" title="Добавить в список">
                        <Plus size={20} />
                    </button>
                </div>
            </div>
        ) : (
            <div className="mb-[6vh] max-w-3xl mt-auto px-16 transition-[margin] duration-500 ease-out">
                {/* Logo/Title Skeleton */}
                <div className="mb-6 h-[16vh] max-h-[200px] min-h-[100px] flex items-end">
                    <div className="h-[80px] w-[240px] bg-white/5 rounded-lg animate-pulse" />
                </div>
                
                {/* Meta Row Skeleton */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-6 w-12 bg-white/5 rounded animate-pulse" />
                    <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
                    <div className="h-4 w-20 bg-white/5 rounded animate-pulse" />
                    <div className="h-5 w-16 bg-white/5 rounded animate-pulse" />
                </div>
                
                {/* Description Skeleton */}
                <div className="mb-8 space-y-2 max-w-2xl">
                    <div className="h-5 w-full bg-white/5 rounded animate-pulse" />
                    <div className="h-5 w-[90%] bg-white/5 rounded animate-pulse" />
                    <div className="h-5 w-[80%] bg-white/5 rounded animate-pulse" />
                </div>
                
                {/* Buttons Skeleton */}
                <div className="flex items-center gap-4">
                    <div className="h-[52px] w-[160px] bg-white/5 rounded-[4px] animate-pulse" />
                    <div className="h-[52px] w-[52px] bg-white/5 rounded-full animate-pulse" />
                </div>
            </div>
        )}

        {/* Trending Slider */}
        <div className="w-full">
            <div key={slideIndex} className="w-full">
                {activeMovie ? (
                    <MovieSlider 
                        key={activeSlide.id}
                        url={activeSlide.url}
                        title={activeSlide.title}
                        onMovieHover={handleMovieHover}
                        compactOnMobile={false}
                        perPageOverride={15}
                        hideIndicators
                        hideMetadata
                        enableGlobalKeyNavigation
                        cardType={cardDisplayMode}
                        fetchAllPages={(activeSlide as any).fetchAll}
                    />
                ) : (
                     <div className="w-full mb-8 px-4 md:px-12">
                        <div className="h-8 w-32 bg-white/5 rounded mb-4 animate-pulse" />
                        <div className="flex gap-2 overflow-hidden">
                            {cardDisplayMode === "backdrop" ? (
                                [...Array(4)].map((_, i) => (
                                    <div key={i} className="w-[25%] aspect-video bg-white/5 rounded-[10px] shrink-0 animate-pulse" />
                                ))
                            ) : (
                                [...Array(7)].map((_, i) => (
                                    <div key={i} className="w-[14%] aspect-[2/3] bg-white/5 rounded-[10px] shrink-0 animate-pulse" />
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
        </div>
        {/* Vertical Slider Indicators - Scrollable & Compact */}
        <div className="absolute right-0 top-32 w-80 z-40 pointer-events-none flex flex-col items-end pr-12">
            <div className="h-[160px] w-full relative overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)]">
                <div 
                    className="absolute top-0 right-0 flex flex-col gap-6 items-end transition-transform duration-500 ease-out w-full"
                    style={{ 
                        transform: `translateY(${60 - slideIndex * 50}px)` 
                    }}
                >
                    {SLIDES.map((slide, i) => (
                        <button
                            key={slide.id}
                            onClick={() => setSlideIndex(i)}
                            className="group flex items-center gap-5 focus:outline-none pointer-events-auto min-h-[30px]"
                        >
                            <span className={`font-black tracking-widest uppercase transition-all duration-500 text-right whitespace-nowrap ${
                                slideIndex === i 
                                    ? "text-xl text-white drop-shadow-lg scale-105" 
                                    : "text-sm text-zinc-600 group-hover:text-zinc-300"
                            }`}>
                                {(slide as any).navTitle || slide.title}
                            </span>
                            
                            <div className={`transition-all duration-500 rounded-full ${
                                slideIndex === i 
                                    ? "w-1 h-10 bg-white shadow-[0_0_20px_rgba(255,255,255,0.5)]" 
                                    : "w-1.5 h-1.5 bg-zinc-600 group-hover:bg-zinc-400 group-hover:scale-125"
                            }`} />
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Настройки</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Настройте внешний вид главной страницы.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
              <div className="flex items-center justify-between space-x-4 rounded-lg border border-zinc-800 p-4 bg-zinc-900/50">
                  <div className="flex flex-col space-y-1">
                      <Label htmlFor="display-mode" className="text-base font-medium text-zinc-100">
                          Широкие обложки
                      </Label>
                      <span className="text-sm text-zinc-400">
                          Показывать карточки с логотипами вместо постеров
                      </span>
                  </div>
                  <Switch
                      id="display-mode"
                      checked={cardDisplayMode === "backdrop"}
                      onCheckedChange={handleDisplayModeChange}
                      className="data-[state=checked]:bg-white data-[state=unchecked]:bg-zinc-700"
                  />
              </div>
          </div>
        </DialogContent>
      </Dialog>

      </main>
    </div>
  )
}
