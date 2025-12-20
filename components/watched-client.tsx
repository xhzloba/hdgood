"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { DesktopHome, DesktopSidebar } from "@/components/desktop-home";
import { useWatched } from "@/hooks/use-watched";
import { useFavorites } from "@/hooks/use-favorites";
import MovieSlider from "@/components/movie-slider";
import { useIsMobile } from "@/hooks/use-mobile";

type WatchedClientProps = {
  initialDisplayMode?: "backdrop" | "poster";
};

export default function WatchedClient({
  initialDisplayMode = "backdrop",
}: WatchedClientProps) {
  const { watched, ready } = useWatched();
  const { favorites } = useFavorites();
  const favoritesCount = (favorites || []).length;
  const [hydrated, setHydrated] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setHydrated(true);
  }, []);

  const loading = !hydrated || !ready || watched === null;
  const watchedList = watched ?? [];

  const splitByType = useMemo(() => {
    const movies: typeof watchedList = [];
    const serials: typeof watchedList = [];
    const isSerialType = (t: string | null | undefined) => {
      if (!t) return false;
      const s = String(t).toLowerCase();
      return (
        s.includes("serial") ||
        s.includes("series") ||
        s.includes("tv") ||
        s.includes("show") ||
        s.includes("сериал") ||
        s.includes("episode")
      );
    };
    const isMovieType = (t: string | null | undefined) => {
      if (!t) return false;
      const s = String(t).toLowerCase();
      return (
        s.includes("movie") ||
        s.includes("film") ||
        s.includes("кино") ||
        s.includes("фильм") ||
        s === "movie"
      );
    };
    for (const item of watchedList) {
      const t = item.type ?? null;
      if (isSerialType(t)) {
        serials.push(item);
      } else if (isMovieType(t)) {
        movies.push(item);
      }
    }
    return { movies, serials };
  }, [watchedList]);

  const slides = useMemo(
    () =>
      watchedList.length > 0
        ? [
            {
              id: "watched",
              title: "Просмотренное",
              navTitle: "Просмотренное",
              items: watchedList,
            },
            ...(splitByType.movies.length > 0
              ? [
                  {
                    id: "watched_movies",
                    title: "Просмотренные фильмы",
                    navTitle: "Фильмы",
                    items: splitByType.movies,
                  },
                ]
              : []),
            ...(splitByType.serials.length > 0
              ? [
                  {
                    id: "watched_serials",
                    title: "Просмотренные сериалы",
                    navTitle: "Сериалы",
                    items: splitByType.serials,
                  },
                ]
              : []),
          ]
        : [],
    [watchedList, splitByType.movies, splitByType.serials]
  );

  // Show loading while isMobile is being determined
  if (isMobile === undefined) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 relative">
        <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur-3xl -z-10" />
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-zinc-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (isMobile) {
    const hasAny = slides.length > 0;
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-16 pt-4 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Просмотренное</h1>
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            На главную
          </Link>
        </div>

        {!hasAny && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-center space-y-3">
            <div className="text-lg font-semibold">Пусто</div>
            <div className="text-sm text-zinc-400">
              Вы еще ничего не отметили как просмотренное.
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-white text-black font-semibold hover:bg-white/90 transition"
            >
              Вернуться на главную
            </Link>
          </div>
        )}

        {hasAny && (
          <div className="space-y-6">
            {slides.map((slide) => (
              <MovieSlider
                key={slide.id}
                url="/watched"
                title={slide.title}
                items={slide.items}
                compactOnMobile
                loop={false}
                cardType="poster"
                hideIndicators
                viewAllHref={undefined}
                fetchAllPages={false}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 relative">
        <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur-3xl -z-10" />
        <div className="ml-24 min-h-screen flex items-center justify-center px-6">
          <div className="w-16 h-16 rounded-full border-4 border-zinc-800 border-t-zinc-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 relative">
        <DesktopSidebar
          watchedActive
          watchedCount={0}
          favoritesCount={favoritesCount}
        />
        <div className="ml-24 min-h-screen flex items-center justify-center px-6">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="text-3xl font-black">Просмотренное пусто</h1>
            <p className="text-zinc-400">
              Отмечайте фильмы значком "глаз" на карточке, и они появятся здесь.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-5 py-3 rounded-md bg-white text-black font-semibold hover:bg-white/90 transition"
            >
              Вернуться на главную
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DesktopHome
      customSlides={slides}
      watchedActiveOverride
      initialDisplayMode={initialDisplayMode}
    />
  );
}
