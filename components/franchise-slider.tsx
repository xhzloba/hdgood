"use client";

import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
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
    poster:
      "https://imagetmdb.com/t/p/original/tHkujDqdPC9VQoFpEWU0QgWIZyM.jpg",
    href: "/franshise-hdgood",
    overlay: JOHN_WICK_OVERLAY,
  },
  {
    title: "Веном",
    poster:
      "https://imagetmdb.com/t/p/original/3V4kLQg0kSqPLctI5ziYWabAZYF.jpg",
    href: "/franshise-venom",
    overlay: VENOM_OVERLAY,
  },
];

export function FranchiseSlider() {
  const posterSrc = (p?: string | null) => p || "/placeholder.jpg";

  return (
    <div className="space-y-3">
      <div className="relative">
        <Carousel className="w-full">
          <CarouselContent className="-ml-0">
            {FRANCHISE_ITEMS.map((item, idx: number) => (
              <CarouselItem key={idx} className="basis-full pl-0">
                <Link
                  href={item.href}
                  className="block bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/50 hover:border-zinc-700 rounded-sm overflow-hidden transition-colors"
                  title={item.title}
                >
                  <div className="relative aspect-[1/1] sm:aspect-[4/3] md:aspect-[7/3] lg:aspect-[3/1] bg-zinc-950">
                    <img
                      src={posterSrc(item.poster)}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    {/* Оверлей: оставляем только первый логотип */}
                    {item.overlay?.[0] && (
                      <div className="pointer-events-none absolute left-1/2 top-[60%] md:top-[58%] -translate-x-1/2 flex justify-center items-center w-[55%] md:w-[40%]">
                        <img
                          src={item.overlay[0]}
                          alt={`${item.title} logo`}
                          loading="lazy"
                          decoding="async"
                          className="h-12 md:h-14 lg:h-16 w-auto drop-shadow-lg"
                        />
                      </div>
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