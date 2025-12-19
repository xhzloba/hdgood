"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { DesktopSidebar } from "@/components/desktop-home";
import { MovieGrid } from "@/components/movie-grid";
import Link from "next/link";
import { useFavorites } from "@/hooks/use-favorites";

type Tab = {
  title: string;
  url: string;
  key: string;
};

type ViewAllTabsPageProps = {
  title: string;
  tabs: Tab[];
};

export function ViewAllTabsPage({ title, tabs }: ViewAllTabsPageProps) {
  const { favorites } = useFavorites();
  const favoritesCount = (favorites || []).length;
  const [activeTab, setActiveTab] = useState(0);
  
  const prevYRef = useRef<number | null>(null);
  
  const preserveScroll = (cb: () => void) => {
    if (typeof window !== "undefined") {
      prevYRef.current = window.scrollY;
    }
    cb();
  };

  useLayoutEffect(() => {
    const y = prevYRef.current;
    if (typeof window !== "undefined" && y != null) {
      prevYRef.current = null;
      requestAnimationFrame(() => window.scrollTo({ top: y }));
    }
  }, [activeTab]);

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
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight drop-shadow-sm">
              {title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-2">
              {tabs.map((tab, idx) => (
                <button
                  key={tab.key}
                  onClick={() => preserveScroll(() => setActiveTab(idx))}
                  className={`inline-flex items-center justify-center h-9 px-4 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeTab === idx
                      ? "text-white shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                      : "text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10"
                  }`}
                  style={
                    activeTab === idx
                      ? { backgroundColor: "rgb(var(--ui-accent-rgb))" }
                      : undefined
                  }
                >
                  {tab.title}
                </button>
              ))}
            </div>
          </div>

          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            ← На главную
          </Link>
        </div>

        <div className="overflow-hidden min-h-[50vh]">
          <MovieGrid
            key={tabs[activeTab].url}
            url={tabs[activeTab].url}
            viewMode="loadmore"
            navigateOnClick
            hideLoadMoreOverride
          />
        </div>
      </main>
    </div>
  );
}
