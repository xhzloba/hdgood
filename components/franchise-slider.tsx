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
};

// Мини-постеры для оверлея (нижний левый угол)
const OVERLAY_POSTERS: string[] = [
  "https://imagetmdb.com/t/p/w300/cfTgzNAP83WcbnZD4nRZuUgFNkF.png",
  "https://imagetmdb.com/t/p/w300/nuGV6mwU8frjFwEC7IglcCzEMPm.png",
  "https://imagetmdb.com/t/p/w300/yGSkH3OPENnRZncjSXQ1arP8TxV.png",
  "https://imagetmdb.com/t/p/w300/sWkArTph8sTQjGfCatO8hBL5mtB.png",
  "https://imagetmdb.com/t/p/w300/lXrfZhIwGVcrmfhwPLcQwkw8gg9.png",
];

// Статический список для франшизы «Джон Уик»: только одна картинка (баннер)
const FRANCHISE_ITEMS: FranchiseItem[] = [
  {
    title: "Джон Уик",
    poster:
      "https://imagetmdb.com/t/p/original/tHkujDqdPC9VQoFpEWU0QgWIZyM.jpg",
    href: "/franshise-hdgood",
  },
];

export function FranchiseSlider() {
  const posterSrc = (p?: string | null) => p || "/placeholder.jpg";

  return (
    <div className="space-y-3">
      <h2 className="text-base md:text-lg font-semibold text-zinc-200">
        Джон Уик
      </h2>
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
                  <div className="relative aspect-[1/1] md:aspect-[2/1] bg-zinc-950">
                    <img
                      src={posterSrc(item.poster)}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    {/* Оверлей с мини-постерами (нижний левый угол) */}
                    <div className="pointer-events-none absolute left-1/2 top-[64%] md:top-[62%] -translate-x-1/2 flex flex-wrap justify-center items-center gap-2 md:gap-3 w-[65%] md:w-[50%]">
                      {OVERLAY_POSTERS.map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt={`John Wick overlay ${i + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="h-8 md:h-10 w-auto rounded-sm shadow-md bg-black/40"
                        />
                      ))}
                    </div>
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