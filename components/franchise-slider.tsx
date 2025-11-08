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

// Мини-постеры-логотипы для оверлея
const JOHN_WICK_OVERLAY: string[] = [
  "https://imagetmdb.com/t/p/w300/cfTgzNAP83WcbnZD4nRZuUgFNkF.png",
  "https://imagetmdb.com/t/p/w300/nuGV6mwU8frjFwEC7IglcCzEMPm.png",
  "https://imagetmdb.com/t/p/w300/yGSkH3OPENnRZncjSXQ1arP8TxV.png",
  "https://imagetmdb.com/t/p/w300/sWkArTph8sTQjGfCatO8hBL5mtB.png",
  "https://imagetmdb.com/t/p/w300/lXrfZhIwGVcrmfhwPLcQwkw8gg9.png",
];

const VENOM_OVERLAY: string[] = [
  "https://imagetmdb.com/t/p/w300/wzJo39PJigshbG7h3i51srByN58.png",
  "https://imagetmdb.com/t/p/w300/AoampNtf9uCCY8qWub8vXzEuJ9v.png",
  "https://imagetmdb.com/t/p/w300/7fXlkfavVPDxdLb7QT9RxdYeQNn.png",
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
  const pathname = usePathname();
  const [items, setItems] = useState<typeof FRANCHISE_ITEMS>(FRANCHISE_ITEMS);
  const [ready, setReady] = useState(false)

  // Перемешивать элементы при первом рендере и каждой смене роута
  useEffect(() => {
    const ordered = orderFranchiseItems(pathname)
    setItems(ordered)
    setReady(true)
  }, [pathname]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Carousel className="w-full" opts={{ dragFree: true, loop: false, align: "start" }} setApi={setCarouselApi}>
          <CarouselContent className={"-ml-0 cursor-grab active:cursor-grabbing transition-opacity duration-200 " + (ready ? "opacity-100" : "opacity-0") }>
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
                    <img
                      src={posterSrc(item.poster)}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    {/* Оверлей: оставляем только первый логотип, поверх градиента */}
                    {item.overlay?.[0] && (
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
                    {/* Текст под логотипом для Джона Уика */}
                    {item.title === "Джон Уик" && (
                      <div className="pointer-events-none absolute left-1/2 top-[78%] md:top-[74%] -translate-x-1/2 max-w-[60%] md:max-w-[45%] z-10">
                        <div className="bg-transparent p-3 md:p-4">
                          <p className="text-[12px] md:text-[14px] leading-relaxed text-zinc-100 text-center">
                            Серия боевиков с Киану Ривзом в главной роли, которая вернула актера в стан больших кинозвезд, попала в список главных фильмов десятилетия по версии Time и дала зрителю четкую установку: Киану потрясающий.
                          </p>
                        </div>
                      </div>
                    )}
                    {item.title === "Веном" && (
                      <div className="pointer-events-none absolute left-1/2 top-[78%] md:top-[74%] -translate-x-1/2 max-w-[60%] md:max-w-[45%] z-10">
                        <div className="bg-transparent p-3 md:p-4">
                          <p className="text-[12px] md:text-[14px] leading-relaxed text-zinc-100 text-center">
                            Антигерой Marvel с симбиотом: хоррор-эстетика, экшен и фирменный юмор Тома Харди. История Венома получила продолжения и расширяет вселенную.
                          </p>
                        </div>
                      </div>
                    )}
                    {/* Правая растушовка для Джона Уика */}
                    {item.title === "Джон Уик" && (
                      <div className="pointer-events-none absolute inset-y-0 right-0 w-[40%] md:w-[35%] bg-gradient-to-l from-black/90 via-black/70 to-transparent z-0" />
                    )}
                    {item.title === "Веном" && (
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
      </div>
    </div>
  );
}

export default FranchiseSlider;