"use client"

import { useState, useEffect, useCallback } from "react"
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

export function DesktopHome() {
  const [activeMovie, setActiveMovie] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<"trending" | "watching">("trending")
  
  const currentUrl = activeTab === "trending" ? TRENDING_URL : WATCHING_URL
  const { data } = useSWR(currentUrl, fetcher)

  // When tab changes, we might want to reset activeMovie so the hero updates to the new list's first item
  useEffect(() => {
    setActiveMovie(null)
  }, [activeTab])

  // Fetch override for the initial movie or when activeMovie changes
  useEffect(() => {
    if (!activeMovie) return;
    
    // If we already have a logo, no need to fetch
    if (activeMovie.logo) return;

    const fetchOverride = async () => {
      try {
        const res = await fetch(`/api/overrides/movies?ids=${activeMovie.id}`)
        if (res.ok) {
          const overrides = await res.json()
          const ov = overrides[String(activeMovie.id)]
          if (ov) {
            setActiveMovie((prev: any) => ({
              ...prev,
              logo: ov.poster_logo || prev.logo,
              // Prioritize override backdrop (bg_poster.backdrop)
              backdrop: ov.bg_poster?.backdrop || prev.backdrop
            }))
          }
        }
      } catch (e) {
        console.error("Failed to fetch override", e)
      }
    }

    fetchOverride()
  }, [activeMovie?.id]) // Only re-run if ID changes

  useEffect(() => {
    if (data && !activeMovie) {
      const movies = data.channels || data
      if (movies && movies.length > 0) {
        // Normalize the first movie
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
        setActiveMovie(normalized)
      }
    }
  }, [data, activeMovie])

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
      logo: movie.logo || null,
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
      <main className="relative z-10 ml-24 h-full flex flex-col pb-12 px-0 pt-24 overflow-y-auto scrollbar-hide">
        <div className="min-h-full w-full flex flex-col justify-end">
        {/* Movie Info */}
        {activeMovie ? (
            <div className="mb-32 max-w-3xl animate-in slide-in-from-left-10 duration-700 fade-in mt-auto px-16">
                {activeMovie.logo ? (
                  <div className="mb-6">
                    <img 
                      src={activeMovie.logo} 
                      alt={activeMovie.title} 
                      className="max-w-[240px] max-h-[120px] object-contain drop-shadow-2xl"
                    />
                  </div>
                ) : (
                  <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight drop-shadow-2xl tracking-tight">
                      {activeMovie.title}
                  </h1>
                )}
                
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
            <div className="mb-32 max-w-3xl mt-auto px-16">
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
            <div className="w-full">
                {activeMovie ? (
                    <MovieSlider 
                        url={currentUrl}
                        title={
                            <div className="flex items-center gap-6">
                                <button 
                                    onClick={() => setActiveTab("trending")}
                                    className={`transition-all duration-300 ${activeTab === "trending" ? "text-white scale-105 font-bold drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" : "text-zinc-500 hover:text-zinc-300 font-medium"}`}
                                >
                                    В тренде
                                </button>
                                <div className="w-px h-5 bg-zinc-800" />
                                <button 
                                    onClick={() => setActiveTab("watching")}
                                    className={`transition-all duration-300 ${activeTab === "watching" ? "text-white scale-105 font-bold drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" : "text-zinc-500 hover:text-zinc-300 font-medium"}`}
                                >
                                    Сейчас смотрят
                                </button>
                            </div>
                        }
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
      </main>
    </div>
  )
}

function BackdropImage({ src }: { src: string }) {
    const [current, setCurrent] = useState(src);
    const [prev, setPrev] = useState(src);
    const [isLoading, setIsLoading] = useState(false);
  
    useEffect(() => {
      if (src !== current) {
        // Save current as prev before switching
        setPrev(current);
        setCurrent(src);
        setIsLoading(true);
      }
    }, [src, current]);
  
    const handleLoad = () => {
      setIsLoading(false);
      // Once loaded, we don't strictly need to clear prev immediately, 
      // but we can let the opacity transition handle the crossfade.
      // The 'prev' image is behind 'current', so as 'current' becomes opaque, 'prev' is covered.
    };
  
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 bg-zinc-950">
        {/* Previous Image Layer (Background) */}
        {prev && (
           <div 
              key={prev}
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
              style={{ 
                backgroundImage: `url(${prev})`,
                opacity: isLoading ? 1 : 0 // Fade out prev when new one finishes loading (optional, or just let new one cover it)
              }}
           />
        )}
  
        {/* Current Image Layer (Foreground) */}
        {current && (
          <img
            key={current}
            src={current}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out ${isLoading ? 'opacity-0 blur-xl scale-105' : 'opacity-100 blur-0 scale-100'}`}
            onLoad={handleLoad}
            alt=""
          />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent w-[70%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent h-full" />
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
