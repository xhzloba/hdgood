"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { DesktopHome, DesktopSidebar } from "@/components/desktop-home";
import { useFavorites } from "@/hooks/use-favorites";

export default function FavoritesClient() {
  const { favorites, ready } = useFavorites();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const loading = !hydrated || !ready || favorites === null;
  const favList = favorites ?? [];

  const splitByType = useMemo(() => {
    const movies: typeof favList = [];
    const serials: typeof favList = [];
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
      return s.includes("movie") || s.includes("film") || s.includes("кино") || s.includes("фильм");
    };
    for (const item of favList) {
      const t = item.type ?? null;
      if (isSerialType(t)) {
        serials.push(item);
      } else if (isMovieType(t)) {
        movies.push(item);
      } else {
        // fallback: если нет типа, кладём в общий "Избранное" (останется в favList)
        movies.push(item);
      }
    }
    return { movies, serials };
  }, [favList]);

  const slides = useMemo(
    () =>
      favList.length > 0
        ? [
            {
              id: "favorites",
              title: "Избранное",
              navTitle: "Избранное",
              items: favList,
            },
            ...(splitByType.movies.length > 0
              ? [
                  {
                    id: "favorites_movies",
                    title: "Избранные фильмы",
                    navTitle: "Фильмы",
                    items: splitByType.movies,
                  },
                ]
              : []),
            ...(splitByType.serials.length > 0
              ? [
                  {
                    id: "favorites_serials",
                    title: "Избранные сериалы",
                    navTitle: "Сериалы",
                    items: splitByType.serials,
                  },
                ]
              : []),
          ]
        : [],
    [favList, splitByType.movies, splitByType.serials]
  );

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
          showFavorites
          favoritesActive
          favoritesCount={0}
        />
        <div className="ml-24 min-h-screen flex items-center justify-center px-6">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="text-3xl font-black">Избранное пусто</h1>
            <p className="text-zinc-400">
              Добавьте фильм через кнопку с плюсом на главной, и он появится
              здесь.
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
      initialSlideId="favorites"
      favoritesActiveOverride
      forceShowFavoritesNav
    />
  );
}

