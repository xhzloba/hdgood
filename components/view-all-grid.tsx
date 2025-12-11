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
      <div className="hidden md:block">
        <DesktopSidebar
          showFavorites={true}
          favoritesCount={favoritesCount}
          favoritesActive={false}
        />
      </div>
      <main className="relative z-10 ml-0 md:ml-[clamp(64px,8vw,96px)] flex flex-col px-3 md:px-6 lg:px-8 py-8 gap-6">
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
