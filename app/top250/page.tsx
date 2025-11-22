"use client";

import { useState, useEffect } from "react";
import { IconLayoutGrid, IconList } from "@tabler/icons-react";
import Link from "next/link";
import { HeaderCategories } from "@/components/header-categories";
import { MovieGrid } from "@/components/movie-grid";
import { PosterBackground } from "@/components/poster-background";

export default function Top250Page() {
  const apiUrl = "https://api.vokino.pro/v2/compilations/content/66fa5fc9dd606aae9ea0a9dc?token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352";
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [logoId, setLogoId] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    ratingKP?: number | null;
    ratingIMDb?: number | null;
    year?: string | null;
    country?: string | null;
    genre?: string | null;
    duration?: string | null;
  } | null>(null);
  const [overrideBg, setOverrideBg] = useState<string | null>(null);
  const [overridePoster, setOverridePoster] = useState<string | null>(null);
  const [overrideHeroMeta, setOverrideHeroMeta] = useState<{
    ratingKP?: number | null;
    ratingIMDb?: number | null;
    year?: string | null;
    country?: string | null;
    genre?: string | null;
    duration?: string | null;
  } | null>(null);
  const [overrideHeroLogoSrc, setOverrideHeroLogoSrc] = useState<string | null>(null);
  const [overrideHeroLogoId, setOverrideHeroLogoId] = useState<string | null>(null);
  const [overrideHeroTitle, setOverrideHeroTitle] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"pagination" | "loadmore">("pagination");
  const [isDesktop, setIsDesktop] = useState(false);
  const [inlineInfoOpen, setInlineInfoOpen] = useState(false);
  const [watchOpen, setWatchOpen] = useState(false);
  useEffect(() => {
    try {
      const ss = typeof window !== "undefined" ? window.sessionStorage : null;
      if (!ss) return;
      const src = ss.getItem("homeBackdrop:lastLogoSrc");
      const id = ss.getItem("homeBackdrop:lastLogoId");
      setLogoSrc(src);
      setLogoId(id);
      const raw = ss.getItem("homeBackdrop:lastMeta");
      if (raw) {
        const data = JSON.parse(raw);
        if (data && data.meta) setMeta(data.meta);
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const mq = window.matchMedia("(min-width: 768px)");
      const update = () => setIsDesktop(!!mq.matches);
      update();
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    } catch {}
  }, []);
  const hasOverrideBg = overrideBg != null;
  const effLogoSrc = hasOverrideBg ? overrideHeroLogoSrc : logoSrc;
  const effLogoId = hasOverrideBg ? overrideHeroLogoId : logoId;
  const effMeta = hasOverrideBg ? overrideHeroMeta : meta;
  return (
    <PosterBackground disableMobileBackdrop simpleDarkCorners softBottomFade persistComposite={false} className="min-h-[100dvh] min-h-screen" posterUrl={overridePoster ?? undefined} bgPosterUrl={overrideBg ?? undefined}>
      <main className="mx-auto max-w-7xl px-0 md:px-6 pt-0 md:pt-6 pb-16 md:pb-6 relative">
        <div className="mb-4 hidden md:block">
          <HeaderCategories variant="horizontal" className="!bg-transparent !border-transparent relative z-40" />
        </div>
        <div className="relative z-30 hidden md:flex justify-center mt-[13vh] h-[96px]">
          {effLogoSrc && effLogoId ? (
            <Link href={`/movie/${effLogoId}`} className="block">
              <img src={effLogoSrc} alt="Логотип" className="h-[96px] w-auto max-w-[80vw]" />
            </Link>
          ) : hasOverrideBg && overrideHeroTitle ? (
            <div className="h-[96px] flex items-center justify-center px-4">
              <span className="text-2xl md:text-4xl font-semibold text-zinc-100 truncate max-w-[80vw]">
                {overrideHeroTitle}
              </span>
            </div>
          ) : null}
        </div>
        <div className="relative z-30 hidden md:flex justify-center mt-1">
          <div className="text-base md:text-lg font-semibold text-zinc-100 px-4 text-center h-6 md:h-7 leading-none w-full flex items-center justify-center" />
        </div>
        <section className="relative">
          <div className="relative z-20 mt-[1vh] md:mt-[4vh]">
            <div className="p-5">
              <div className="-mx-5 px-5 pt-0 md:pt-5 pb-3">
                <div className="flex items-center justify-between">
                  <h1 className="text-lg md:text-xl font-semibold text-zinc-200">Топ 250 фильмов</h1>
                  {isDesktop && (
                    <div className={`hidden md:flex items-center gap-2 ml-auto transition-opacity duration-200 ${(viewMode === "pagination" && (inlineInfoOpen || watchOpen)) ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
                      <button
                        onClick={() => setViewMode("pagination")}
                        className={`inline-flex items-center justify-center h-8 w-8 rounded-full text-[12px] font-medium transition-all duration-200 ${
                          viewMode === "pagination"
                            ? "text-white border border-[rgba(var(--ui-accent-rgb),0.6)]"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                        style={viewMode === "pagination" ? { backgroundColor: "rgba(var(--ui-accent-rgb),0.2)" } : undefined}
                        title="Режим пагинации"
                      >
                        <IconLayoutGrid size={14} />
                      </button>
                      <button
                        onClick={() => setViewMode("loadmore")}
                        className={`inline-flex items-center justify-center h-8 w-8 rounded-full text-[12px] font-medium transition-all duration-200 ${
                          viewMode === "loadmore"
                            ? "text-white border border-[rgba(var(--ui-accent-rgb),0.6)]"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                        style={viewMode === "loadmore" ? { backgroundColor: "rgba(var(--ui-accent-rgb),0.2)" } : undefined}
                        title="Режим загрузки"
                      >
                        <IconList size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 overflow-anchor-none">
                <MovieGrid url={apiUrl} viewMode={viewMode} onBackdropOverrideChange={(bg, poster) => { setOverrideBg(bg ?? null); setOverridePoster(poster ?? null); }} onHeroInfoOverrideChange={(info) => { setOverrideHeroMeta(info?.meta ?? null); setOverrideHeroLogoSrc(info?.logo ?? null); setOverrideHeroLogoId(info?.logoId ?? null); setOverrideHeroTitle(info?.title ?? null); }} onInlineInfoOpenChange={setInlineInfoOpen} onWatchOpenChange={setWatchOpen} />
              </div>
            </div>
          </div>
        </section>
      </main>
    </PosterBackground>
  );
}
