"use client";

import { useState, useRef, useEffect } from "react";
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
    poster: "https://imagetmdb.com/t/p/original/vy6udfAuHvOy5MAoPqs5hLNPR8O.jpg",
    href: "/franchise/lyudi-x",
    overlay: X_MEN_OVERLAY,
  },
];

import { usePathname } from "next/navigation";
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
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const parallaxRef = useRef<Map<string, { mx: number; my: number; targetMx: number; targetMy: number; hover: boolean }>>(new Map());

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

  useEffect(() => {
    let rafId = 0;
    const start = performance.now();
    const offsetOf = (key: string) => {
      let s = 0;
      for (let i = 0; i < key.length; i++) s += key.charCodeAt(i);
      return s * 0.001;
    };
    const tick = (t: number) => {
      const dt = t - start;
      cardRefs.current.forEach((el, key) => {
        const st = parallaxRef.current.get(key) || { mx: 0, my: 0, targetMx: 0, targetMy: 0, hover: false };
        if (st.hover) {
          st.mx += (st.targetMx - st.mx) * 0.22;
          st.my += (st.targetMy - st.my) * 0.22;
        } else {
          const off = offsetOf(key);
          st.mx = 0.24 * Math.sin(dt * 0.0012 + off);
          st.my = 0.20 * Math.cos(dt * 0.001 + off);
          el.style.setProperty("--x", "50%");
          el.style.setProperty("--y", "50%");
        }
        el.style.setProperty("--mx", String(st.mx));
        el.style.setProperty("--my", String(st.my));
        el.style.setProperty("--tx", `${st.mx * 42}px`);
        el.style.setProperty("--ty", `${st.my * 30}px`);
        el.style.setProperty("--degx", `${-st.my * 8}deg`);
        el.style.setProperty("--degy", `${st.mx * 12}deg`);
        el.style.setProperty("--degz", `${st.mx * st.my * 6}deg`);
        parallaxRef.current.set(key, st);
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [hoveredKey, items]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Carousel className="w-full" opts={{ dragFree: true, loop: false, align: "start" }} setApi={setCarouselApi}>
          <CarouselContent className="-ml-0 cursor-grab active:cursor-grabbing">
            {items.map((item, idx: number) => (
              <CarouselItem key={item.href ?? idx} className="basis-full pl-0">
                <Link
                  href={item.href}
                  className="group block bg-transparent hover:bg-transparent outline-none transition-all duration-200 rounded-sm overflow-hidden"
                  title={item.title}
                  onMouseEnter={() => {
                    setHoveredKey(item.href)
                    const st = parallaxRef.current.get(item.href) || { mx: 0, my: 0, targetMx: 0, targetMy: 0, hover: false };
                    st.hover = true;
                    parallaxRef.current.set(item.href, st);
                  }}
                  onMouseMove={(e) => {
                    const posterEl = cardRefs.current.get(item.href) as HTMLElement | undefined;
                    if (!posterEl) return;
                    const rect = posterEl.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const mx = x / rect.width * 2 - 1;
                    const my = y / rect.height * 2 - 1;
                    posterEl.style.setProperty('--x', `${x}px`);
                    posterEl.style.setProperty('--y', `${y}px`);
                    const st = parallaxRef.current.get(item.href) || { mx: 0, my: 0, targetMx: 0, targetMy: 0, hover: true };
                    st.targetMx = Math.max(-1, Math.min(1, mx));
                    st.targetMy = Math.max(-1, Math.min(1, my));
                    parallaxRef.current.set(item.href, st);
                  }}
                  onMouseLeave={(e) => {
                    const posterEl = cardRefs.current.get(item.href) as HTMLElement | undefined;
                    if (!posterEl) return;
                    posterEl.style.setProperty('--mx', '0');
                    posterEl.style.setProperty('--my', '0');
                    const st = parallaxRef.current.get(item.href) || { mx: 0, my: 0, targetMx: 0, targetMy: 0, hover: false };
                    st.hover = false;
                    st.targetMx = 0;
                    st.targetMy = 0;
                    parallaxRef.current.set(item.href, st);
                    setHoveredKey(null);
                  }}
                  onClick={(e) => {
                    const api = carouselApi as unknown as { clickAllowed?: () => boolean } | null
                    if (api?.clickAllowed && !api.clickAllowed()) {
                      e.preventDefault()
                    }
                  }}
                >
                  <div
                    className="relative aspect-[1/1] sm:aspect-[4/3] md:aspect-[2/1] lg:aspect-[2/1] bg-transparent overflow-hidden rounded-[10px] poster-card"
                    style={{
                      WebkitMaskImage:
                        "radial-gradient(farthest-side at 55% 50%, black 70%, transparent 100%)",
                      maskImage:
                        "radial-gradient(farthest-side at 55% 50%, black 70%, transparent 100%)",
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                      WebkitMaskSize: "100% 100%",
                      maskSize: "100% 100%",
                    }}
                    ref={(el) => { if (el) cardRefs.current.set(item.href, el) }}
                  >
                    {!loadedImages.has(item.href) && (
                      <Skeleton className="absolute inset-0 w-full h-full" />
                    )}
                    <img
                      src={posterSrc(item.poster)}
                      alt={item.title}
                      loading="lazy"
                      className={`w-full h-full object-cover transition-all ease-out poster-media ${loadedImages.has(item.href) ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-md scale-[1.02]"}`}
                      style={{ transition: "opacity 250ms ease-out, filter 500ms ease-out, transform 500ms ease-out", willChange: "opacity, filter, transform", WebkitMaskImage: "radial-gradient(farthest-side at 55% 50%, black 68%, transparent 100%)", maskImage: "radial-gradient(farthest-side at 55% 50%, black 68%, transparent 100%)", WebkitMaskSize: "100% 100%", maskSize: "100% 100%", transform: "perspective(1000px) translate3d(var(--tx), var(--ty), 0) rotateY(var(--degy)) rotateX(var(--degx)) rotateZ(var(--degz)) scale(1.05)" }}
                      onLoad={() => setLoadedImages((prev) => {
                        const next = new Set(prev);
                        next.add(item.href);
                        return next;
                      })}
                    />
                    {loadedImages.has(item.href) && (
                      <div
                        className="pointer-events-none absolute inset-0 z-10"
                        style={{
                          background: "radial-gradient(140px circle at var(--x) var(--y), rgba(255,255,255,0.10), rgba(0,0,0,0) 60%)",
                          transition: "background 400ms ease-out",
                        }}
                      />
                    )}
                    {loadedImages.has(item.href) && item.overlay?.[0] && (
                      <div
                        className="pointer-events-none absolute left-1/2 top-[56%] md:top-[54%] -translate-x-1/2 flex justify-center items-center w-[55%] md:w-[40%] z-20"
                        style={{
                          transform: "translate3d(calc(var(--mx) * 6px), calc(var(--my) * 4px), 0) scale(1.02)",
                          transition: "transform 450ms ease-out, filter 450ms ease-out",
                          filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.35))",
                        }}
                      >
                        <img
                          src={item.overlay[0]}
                          alt={`${item.title} logo`}
                          loading="lazy"
                          decoding="async"
                          className="h-12 md:h-14 lg:h-16 w-auto"
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
