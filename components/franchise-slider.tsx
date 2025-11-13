"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";

type FranchiseItem = {
  title: string;
  poster?: string | null;
  href: string;
  overlay?: string[];
};

// Мини-постеры-логотипы для оверлея (локальные из public/movies/logo)
const JOHN_WICK_OVERLAY: string[] = [
  "/movies/logo/logo-jonh.png",
];

const VENOM_OVERLAY: string[] = [
  "/movies/logo/venom-logo.png",
];

const X_MEN_OVERLAY: string[] = [
  "/movies/logo/lyudi-x-logo.png",
];

// Список франшиз в слайдере
const FRANCHISE_ITEMS: FranchiseItem[] = [
  {
    title: "Джон Уик",
    poster: "/movies/franshise-jon.jpg",
    href: "/franchise/john-wick",
    overlay: JOHN_WICK_OVERLAY,
  },
  {
    title: "Веном",
    poster: "/movies/venom-franshise.jpg",
    href: "/franchise/venom",
    overlay: VENOM_OVERLAY,
  },
  {
    title: "Люди Икс",
    poster: "/movies/lyudi-x.jpg",
    href: "/franchise/lyudi-x",
    overlay: X_MEN_OVERLAY,
  },
];

import { usePathname } from "next/navigation";
import { useEffect } from "react";
// Рандомный порядок: тасуем на каждом монтировании/смене роута (без sessionStorage)
function orderFranchiseItems(_pathname: string): typeof FRANCHISE_ITEMS {
  if (typeof window !== "undefined") {
    return shuffleArray(FRANCHISE_ITEMS);
  }
  // На сервере возвращаем исходный порядок (избежать SSR рассинхронизации)
  return FRANCHISE_ITEMS;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function FranchiseSlider() {
  const posterSrc = (p?: string | null) => p || "/placeholder.jpg";
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const pathname = usePathname();
  const [items, setItems] = useState<typeof FRANCHISE_ITEMS>(FRANCHISE_ITEMS);
  const [ready, setReady] = useState(false)

  // Перемешивать элементы при первом рендере и каждой смене роута
  useEffect(() => {
    const ordered = orderFranchiseItems(pathname)
    setItems(ordered)
    setReady(true)
  }, [pathname]);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      setLoadedImages(new Set(items.map((it) => it.href)));
    }, 1000);
    return () => clearTimeout(t);
  }, [ready, items]);

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

  return (
    <div className="space-y-3">
      <div className="relative">
        <Carousel className="w-full" opts={{ dragFree: true, loop: false, align: "start" }} setApi={setCarouselApi}>
          <CarouselContent className="-ml-0 cursor-grab active:cursor-grabbing">
            {items.map((item, idx: number) => (
              <CarouselItem key={item.href ?? idx} className="basis-full pl-0">
                <Link
                  href={item.href}
          className="block bg-zinc-900/60 hover:bg-zinc-800/80 border border-transparent hover:border-zinc-700 active:border-zinc-700 focus-visible:border-zinc-700 rounded-sm overflow-hidden transition-colors"
                  title={item.title}
                  onClick={(e) => {
                    const api = carouselApi as unknown as { clickAllowed?: () => boolean } | null
                    if (api?.clickAllowed && !api.clickAllowed()) {
                      e.preventDefault()
                    }
                  }}
                >
                  <div className="relative aspect-[1/1] sm:aspect-[4/3] md:aspect-[7/3] lg:aspect-[3/1] bg-zinc-950">
                    {!loadedImages.has(item.href) && (
                      <Skeleton className="absolute inset-0 w-full h-full" />
                    )}
                    <img
                      src={posterSrc(item.poster)}
                      alt={item.title}
                      loading="lazy"
                      className={`w-full h-full object-cover transition-opacity duration-500 ${loadedImages.has(item.href) ? "opacity-100" : "opacity-0"}`}
                      onLoad={() => setLoadedImages((prev) => {
                        const next = new Set(prev);
                        next.add(item.href);
                        return next;
                      })}
                    />
                    {/* Оверлей: оставляем только первый логотип, поверх градиента */}
                    {loadedImages.has(item.href) && item.overlay?.[0] && (
                      <div className="pointer-events-none absolute left-1/2 top-[56%] md:top-[54%] -translate-x-1/2 flex justify-center items-center w-[55%] md:w-[40%] z-20">
                        <img
                          src={item.overlay[0]}
                          alt={`${item.title} logo`}
                          loading="lazy"
                          decoding="async"
                          className="h-12 md:h-14 lg:h-16 w-auto drop-shadow-lg"
                        />
                      </div>
                    )}
                    {/* Левый верхний угол: растушевка (градиент) для Джона Уика */}
                    {item.title === "Джон Уик" && (
                      <div className="pointer-events-none absolute inset-y-0 left-0 w-[60%] md:w-[45%] bg-gradient-to-r from-black/90 via-black/70 to-transparent z-0" />
                    )}
                    {item.title === "Веном" && (
                      <div className="pointer-events-none absolute inset-y-0 left-0 w-[60%] md:w-[45%] bg-gradient-to-r from-black/90 via-black/70 to-transparent z-0" />
                    )}
                    {item.title === "Люди Икс" && (
                      <div className="pointer-events-none absolute inset-y-0 left-0 w-[60%] md:w-[45%] bg-gradient-to-r from-black/90 via-black/70 to-transparent z-0" />
                    )}
                    
                    {/* Правая растушовка для Джона Уика */}
                    {item.title === "Джон Уик" && (
                      <div className="pointer-events-none absolute inset-y-0 right-0 w-[40%] md:w-[35%] bg-gradient-to-l from-black/90 via-black/70 to-transparent z-0" />
                    )}
                    {item.title === "Веном" && (
                      <div className="pointer-events-none absolute inset-y-0 right-0 w-[40%] md:w-[35%] bg-gradient-to-l from-black/90 via-black/70 to-transparent z-0" />
                    )}
                    {item.title === "Люди Икс" && (
                      <div className="pointer-events-none absolute inset-y-0 right-0 w-[40%] md:w-[35%] bg-gradient-to-l from-black/90 via-black/70 to-transparent z-0" />
                    )}
                  </div>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>
        <div className="hidden md:flex items-center justify-center gap-1 mt-3 min-h-[10px]">
          {(carouselApi?.scrollSnapList() || Array.from({ length: items.length })).map((_: any, i: number) => (
            <button
              key={i}
              type="button"
              aria-label={`К слайду ${i + 1}`}
              aria-current={selectedIndex === i}
              onClick={() => carouselApi?.scrollTo?.(i)}
              className={`${selectedIndex === i ? "w-6 bg-blue-500" : "w-2 bg-white/30"} h-2 rounded-full transition-all duration-300`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default FranchiseSlider;
