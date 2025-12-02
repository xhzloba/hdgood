"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Search, Home, ShoppingBag, Tv, Bookmark, User, Play, Plus } from "lucide-react"
import MovieSlider from "@/components/movie-slider"
import useSWR from "swr"
import Image from "next/image"
import Link from "next/link"

const TRENDING_URL = "https://api.vokino.pro/v2/list?sort=popular&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352"
const WATCHING_URL = "https://api.vokino.pro/v2/list?sort=watching&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

const SLIDES = [
    { id: "watching", title: "Сейчас смотрят", url: WATCHING_URL },
    { id: "trending", title: "В тренде", url: TRENDING_URL },
]

export function DesktopHome() {
  const [activeMovie, setActiveMovie] = useState<any>(null)
  const [slideIndex, setSlideIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isFetchingOverride, setIsFetchingOverride] = useState(false)
  const lastUrlRef = useRef<string | null>(null)
  
  const activeSlide = SLIDES[slideIndex]
  const { data } = useSWR(activeSlide.url, fetcher)

  // Scroll Jacking Logic
  useEffect(() => {
    let lastScrollTime = 0;
    const COOLDOWN = 1000; // ms between switches

    const handleWheel = (e: WheelEvent) => {
        const now = Date.now();
        if (now - lastScrollTime < COOLDOWN) return;

        // Down scroll -> Next Slide
        if (e.deltaY > 0) {
            if (slideIndex < SLIDES.length - 1) {
                lastScrollTime = now;
                setSlideIndex(prev => prev + 1);
            }
        } 
        // Up scroll -> Prev Slide
        else if (e.deltaY < 0) {
            if (slideIndex > 0) {
                lastScrollTime = now;
                setSlideIndex(prev => prev - 1);
            }
        }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
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
  }, [activeMovie?.id]) // Only re-run if ID changes

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
            // Pre-emptively clear logo if we are switching slides to avoid showing old logo
            if (lastUrlRef.current !== activeSlide.url) {
                normalized.logo = null; 
            }
            
            setActiveMovie(normalized)
            lastUrlRef.current = activeSlide.url
            
            // Trigger fetch immediately for the new first movie
            // We need to manually trigger this check because activeMovie update might be batched
            // or we want to ensure 'isFetchingOverride' is true BEFORE the component re-renders with the new title
            setIsFetchingOverride(true)
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
      <aside className="fixed left-0 top-0 bottom-0 w-24 z-50 flex flex-col items-center py-10 gap-10 glass-panel border-r border-white/5 bg-black/20 backdrop-blur-sm">
         <div className="text-orange-500 font-black text-2xl mb-4 tracking-tighter">HD</div>
         
         <nav className="flex flex-col gap-8 flex-1 justify-center">
            <NavItem icon={<Search size={24} />} label="Поиск" href="/search" />
            <NavItem icon={<Home size={24} />} label="Главная" href="/" active />
            <NavItem icon={<ShoppingBag size={24} />} label="Магазин" href="#" />
            <NavItem icon={<Tv size={24} />} label="ТВ" href="/serials" />
            <NavItem icon={<Bookmark size={24} />} label="Избранное" href="#" />
         </nav>

         <div className="mt-auto">
            <NavItem icon={<User size={24} />} label="Профиль" href="#" />
         </div>
      </aside>

      {/* Main Content Area */}
      <main className="relative z-10 ml-24 h-full flex flex-col pb-12 px-0 pt-24 overflow-hidden">
        <div className="min-h-full w-full flex flex-col justify-end">
        {/* Movie Info */}
        {activeMovie ? (
            <div className="mb-48 max-w-3xl mt-auto px-16">
                <div className="h-[120px] mb-6 flex items-end">
                    {activeMovie.logo ? (
                        <img 
                          src={activeMovie.logo} 
                          alt={activeMovie.title} 
                          className="max-w-[240px] max-h-[120px] object-contain drop-shadow-2xl"
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
            <div className="mb-48 max-w-3xl mt-auto px-16">
                {/* Logo/Title Skeleton */}
                <div className="mb-6">
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
            <div key={slideIndex} className="w-full animate-in slide-in-from-bottom-10 fade-in duration-700">
                {activeMovie ? (
                    <MovieSlider 
                        key={activeSlide.id}
                        url={activeSlide.url}
                        title={activeSlide.title}
                        onMovieHover={handleMovieHover}
                        compactOnMobile={false}
                        perPageOverride={15}
                        hideIndicators
                    />
                ) : (
                     <div className="w-full mb-8 px-4 md:px-12">
                        <div className="h-8 w-32 bg-white/5 rounded mb-4 animate-pulse" />
                        <div className="flex gap-2 overflow-hidden">
                            {[...Array(9)].map((_, i) => (
                                <div key={i} className="w-[12.5%] aspect-[2/3] bg-white/5 rounded-xl shrink-0 animate-pulse" />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
        </div>
        {/* Vertical Slider Indicators */}
        <div className="absolute right-0 top-32 w-80 z-40 pointer-events-none flex flex-col items-end pr-12">
            <div className="pointer-events-auto flex flex-col gap-8 items-end">
                {SLIDES.map((slide, i) => (
                    <button
                        key={slide.id}
                        onClick={() => setSlideIndex(i)}
                        className="group flex items-center gap-5 focus:outline-none"
                    >
                        <span className={`font-black tracking-widest uppercase transition-all duration-500 text-right whitespace-nowrap ${
                            slideIndex === i 
                                ? "text-xl text-white drop-shadow-lg scale-105" 
                                : "text-sm text-zinc-600 group-hover:text-zinc-300"
                        }`}>
                            {slide.title}
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

      </main>
    </div>
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

function NavItem({ icon, label, href, active }: { icon: React.ReactNode, label: string, href: string, active?: boolean }) {
    return (
        <Link 
            href={href} 
            className={`p-3 rounded-xl transition-all group relative flex items-center justify-center ${active ? 'text-white bg-white/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
            title={label}
        >
            {icon}
            {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-orange-500 rounded-r-full" />
            )}
        </Link>
    )
}
