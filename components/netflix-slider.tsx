"use client";

import useSWR from "swr";
import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ratingBgColor, formatRatingLabel } from "@/lib/utils";
import { getMovieOverride, getSeriesOverride } from "@/lib/overrides";

type NetflixSliderProps = {
  url: string;
  title: string;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

function extractNetflixMovies(data: any): any[] {
  if (data?.channels) {
    return data.channels.map((item: any) => {
      const d = item.details || item;
      const override = getSeriesOverride(d.id) || getMovieOverride(d.id);
      
      return {
        id: d.id,
        title: d.name || d.title,
        backdrop: d.bg_poster?.backdrop || d.backdrop || d.poster,
        poster: d.poster, // fallback or for transition
        rating: d.rating_kp || d.rating,
        genre: d.genre,
        year: d.released || d.year,
        logo: override?.poster_logo,
      };
    });
  }
  return [];
}

export function NetflixSlider({ url, title }: NetflixSliderProps) {
  const { data, isLoading, error } = useSWR(url, fetcher);
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, any>>({});

  const movies = useMemo(() => extractNetflixMovies(data), [data]);

  // Fetch overrides for movies
  useEffect(() => {
    if (movies.length === 0) return;
    
    const ids = movies.map((m) => m.id).filter(Boolean);
    if (ids.length === 0) return;

    // Check which IDs we don't have overrides for yet
    const missingIds = ids.filter(id => overrides[id] === undefined);
    if (missingIds.length === 0) return;

    const fetchOverrides = async () => {
      try {
        const res = await fetch(`/api/overrides/movies?ids=${missingIds.join(",")}`);
        if (!res.ok) return;
        const newOverrides = await res.json();
        setOverrides((prev) => {
          const next = { ...prev, ...newOverrides };
          // Mark missing IDs as null so we don't fetch them again
          missingIds.forEach(id => {
            if (!(id in next)) {
              next[id] = null;
            }
          });
          return next;
        });
      } catch (e) {
        console.error("Failed to fetch overrides for NetflixSlider", e);
      }
    };

    fetchOverrides();
  }, [movies, overrides]);

  useEffect(() => {
    if (!carouselApi) return;
    const update = () => setSelectedIndex(carouselApi.selectedScrollSnap());
    update();
    carouselApi.on("select", update);
    return () => {
      carouselApi.off("select", update);
    };
  }, [carouselApi]);

  const handleImageLoad = (id: string | number) => {
    const key = String(id);
    setLoadedImages((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  if (error || (movies.length === 0 && !isLoading)) return null;

  return (
    <section className="space-y-4 py-6">
      <h2 className="text-lg md:text-xl font-semibold text-zinc-200 px-1">
        {title}
      </h2>
      
      {isLoading ? (
        <Carousel className="w-full" opts={{ dragFree: true, loop: false, align: "start" }}>
          <CarouselContent className="-ml-4 px-1">
            {[1, 2, 3, 4].map((i) => (
              <CarouselItem
                key={i}
                className="pl-4 basis-[85%] sm:basis-[60%] md:basis-1/2 lg:basis-1/3"
              >
                <div className="aspect-video w-full overflow-hidden rounded-[12px] bg-zinc-900">
                  <Skeleton className="w-full h-full" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      ) : (
        <Carousel
          opts={{
            align: "start",
            loop: false,
            dragFree: true,
          }}
          setApi={setCarouselApi}
          className="w-full"
        >
          <CarouselContent className="-ml-4 px-1">
            {movies.map((movie, index) => {
               const override = overrides[movie.id];
               const logo = override?.poster_logo || movie.logo;
               
               return (
              <CarouselItem
                key={movie.id}
                className="pl-4 basis-[85%] sm:basis-[60%] md:basis-1/2 lg:basis-1/3"
              >
                <Link
                  href={`/movie/${movie.id}`}
                  className="group relative block aspect-video w-full overflow-hidden rounded-[12px] bg-zinc-900 isolate"
                >
                  {/* Background Image */}
                  <img
                    src={movie.backdrop}
                    alt={movie.title}
                    loading="lazy"
                    onLoad={() => handleImageLoad(movie.id)}
                    className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-105 ${
                      loadedImages.has(String(movie.id))
                        ? "opacity-100 blur-0"
                        : "opacity-0 blur-md"
                    }`}
                  />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 transition-opacity group-hover:opacity-90" />

                  {/* Logo (Centered, shifted down from center) */}
                  {logo && (
                    <div className="absolute inset-0 flex items-center justify-center p-8 z-10 pt-12">
                      <img
                        src={logo}
                        alt={movie.title}
                        className="w-full max-h-[50%] object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)] filter transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col justify-end p-4 z-20">
                    <div className="flex items-end gap-2">
                      {/* Info */}
                      <div className={`pb-1 min-w-0 flex-1 ${logo ? 'text-center mb-2' : ''}`}>
                        {/* Genre (Only shown if logo exists) */}
                        {logo && (
                          <p className="truncate text-sm font-medium text-zinc-300/90 drop-shadow-sm">
                            {movie.genre?.split(",")[0] || "Сериал"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rating Badge (Top Right) */}
                  {movie.rating && (
                    <div
                      className={`absolute right-3 top-3 rounded-full md:rounded-md md:shadow-[0_4px_12px_rgba(0,0,0,0.5)] md:font-black md:border md:border-white/10 px-2 py-1 text-xs font-bold text-white shadow-sm ${ratingBgColor(
                        parseFloat(movie.rating)
                      )}`}
                    >
                      {formatRatingLabel(parseFloat(movie.rating))}
                    </div>
                  )}
                </Link>
              </CarouselItem>
            );
            })}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex left-2 top-1/2 -translate-y-1/2 md:top-1/2" />
          <CarouselNext className="hidden md:flex right-2 top-1/2 -translate-y-1/2 md:top-1/2" />
        </Carousel>
      )}
    </section>
  );
}
