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
      return {
        id: d.id,
        title: d.name || d.title,
        backdrop: d.bg_poster?.backdrop || d.backdrop || d.poster,
        poster: d.poster, // fallback or for transition
        rating: d.rating_kp || d.rating,
        genre: d.genre,
        year: d.released || d.year,
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

  const movies = useMemo(() => extractNetflixMovies(data), [data]);

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
            {movies.map((movie, index) => (
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

                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col justify-end p-4">
                    <div className="flex items-end gap-2">
                      {/* Big Number */}
                      <span
                        className="text-5xl font-bold leading-none text-white/90 drop-shadow-md"
                        style={{
                          fontFamily: "var(--font-sans), sans-serif",
                          textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                        }}
                      >
                        {index + 1}
                      </span>

                      {/* Info */}
                      <div className="pb-1 min-w-0 flex-1">
                         {/* Title */}
                        <h3 className="truncate text-lg font-bold text-white drop-shadow-sm leading-tight mb-0.5">
                          {movie.title}
                        </h3>
                        
                        {/* Genre */}
                        <p className="truncate text-sm font-medium text-zinc-300/90 drop-shadow-sm">
                          {movie.genre?.split(",")[0] || "Сериал"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rating Badge (Top Right) */}
                  {movie.rating && (
                    <div
                      className={`absolute right-3 top-3 rounded-full px-2 py-1 text-xs font-bold text-white shadow-sm ${ratingBgColor(
                        parseFloat(movie.rating)
                      )}`}
                    >
                      {formatRatingLabel(parseFloat(movie.rating))}
                    </div>
                  )}
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex left-2 top-1/2 -translate-y-1/2 md:top-1/2" />
          <CarouselNext className="hidden md:flex right-2 top-1/2 -translate-y-1/2 md:top-1/2" />
        </Carousel>
      )}
    </section>
  );
}
