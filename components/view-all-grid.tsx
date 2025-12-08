"use client";

import { DesktopSidebar } from "@/components/desktop-home";
import MovieGrid from "@/components/movie-grid";
import Link from "next/link";
import { useFavorites } from "@/hooks/use-favorites";

type ViewAllGridPageProps = {
  title: string;
  apiUrl: string;
};

export function ViewAllGridPage({ title, apiUrl }: ViewAllGridPageProps) {
  const { favorites } = useFavorites();
  const favoritesCount = (favorites || []).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <DesktopSidebar
        showFavorites={true}
        favoritesCount={favoritesCount}
        favoritesActive={false}
      />
      <main className="relative z-10 ml-24 flex flex-col px-4 md:px-8 lg:px-10 py-8 gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight drop-shadow-sm">
            {title}
          </h1>
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            ← На главную
          </Link>
        </div>

        <div className="overflow-hidden">
          <MovieGrid
            url={apiUrl}
            viewMode="loadmore"
            navigateOnClick
            hideLoadMoreOverride
          />
        </div>
      </main>
    </div>
  );
}

