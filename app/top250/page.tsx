"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { HeaderCategories } from "@/components/header-categories";
import { MovieGrid } from "@/components/movie-grid";
import { PosterBackground } from "@/components/poster-background";
import { Skeleton } from "@/components/ui/skeleton";
import { ratingColor, formatRatingLabel } from "@/lib/utils";

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
  const hasOverrideBg = overrideBg != null;
  const effLogoSrc = hasOverrideBg ? overrideHeroLogoSrc : logoSrc;
  const effLogoId = hasOverrideBg ? overrideHeroLogoId : logoId;
  const effMeta = hasOverrideBg ? overrideHeroMeta : meta;
  return (
    <PosterBackground disableMobileBackdrop simpleDarkCorners softBottomFade className="min-h-[100dvh] min-h-screen" posterUrl={overridePoster ?? undefined} bgPosterUrl={overrideBg ?? undefined}>
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
          <div className="text-base md:text-lg font-semibold text-zinc-100 px-4 text-center h-6 md:h-7 leading-none w-full flex items-center justify-center">
            {hasOverrideBg && effMeta ? (
              (() => {
                const yearVal = effMeta.year && String(effMeta.year).trim() ? String(effMeta.year).trim() : null;
                const restArr = [effMeta.country, effMeta.genre, effMeta.duration].filter((v) => v && String(v).trim().length > 0) as string[];
                return (
                  <span className="inline-block max-w-[80vw] truncate whitespace-nowrap">
                    {(effMeta.ratingKP != null || effMeta.ratingIMDb != null) && (
                      <>
                        <span className="inline-flex items-center gap-2 align-middle">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Kinopoisk_colored_square_icon.svg/2048px-Kinopoisk_colored_square_icon.svg.png" alt="Кинопоиск" className="w-5 h-5 rounded-sm" />
                          <span className={effMeta.ratingKP != null && effMeta.ratingKP > 8.5 ? "font-semibold bg-clip-text text-transparent" : `${ratingColor(effMeta.ratingKP ?? undefined)} font-semibold`} style={effMeta.ratingKP != null && effMeta.ratingKP > 8.5 ? { backgroundImage: "linear-gradient(165deg, #ffd25e 16.44%, #b59646 63.42%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" } : undefined}>
                            {effMeta.ratingKP != null ? formatRatingLabel(effMeta.ratingKP) : "—"}
                          </span>
                        </span>
                        {effMeta.ratingIMDb != null && (
                          <span className="inline-flex items-center gap-2 align-middle ml-3">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/IMDB_Logo_2016.svg/1280px-IMDB_Logo_2016.svg.png" alt="IMDb" className="w-5 h-5 object-contain" />
                            <span className={effMeta.ratingIMDb != null && effMeta.ratingIMDb > 8.5 ? "font-semibold bg-clip-text text-transparent" : `${ratingColor(effMeta.ratingIMDb ?? undefined)} font-semibold`} style={effMeta.ratingIMDb != null && effMeta.ratingIMDb > 8.5 ? { backgroundImage: "linear-gradient(165deg, #ffd25e 16.44%, #b59646 63.42%)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" } : undefined}>
                              {formatRatingLabel(effMeta.ratingIMDb)}
                            </span>
                          </span>
                        )}
                      </>
                    )}
                    {(effMeta.ratingKP != null || effMeta.ratingIMDb != null) && (yearVal || restArr.length > 0) && <span className="text-zinc-400/60"> / </span>}
                    {yearVal && (
                      <span className="inline-flex items-center rounded-full text-white px-3 py-[3px] mr-2" style={{ backgroundColor: "rgb(var(--ui-accent-rgb))" }}>
                        <span className="truncate">{yearVal}</span>
                      </span>
                    )}
                    {yearVal && restArr.length > 0 && <span className="text-zinc-400/60"> / </span>}
                    {restArr.length > 0 && <span className="truncate max-w-[60vw]">{restArr.join(" / ")}</span>}
                  </span>
                );
              })()
            ) : (!hasOverrideBg ? (
              <div className="flex justify-center">
                <Skeleton className="h-5 md:h-6 w-[40vw] max-w-[540px]" />
              </div>
            ) : null)}
          </div>
        </div>
        <section className="relative">
          <div className="relative z-20 mt-[1vh] md:mt-[4vh]">
            <div className="p-5">
              <div className="-mx-5 px-5 pt-0 md:pt-5 pb-3">
                <div className="flex items-center justify-between">
                  <h1 className="text-lg md:text-xl font-semibold text-zinc-200">Топ 250 фильмов</h1>
                </div>
              </div>
              <div className="mt-4 overflow-anchor-none">
                <MovieGrid url={apiUrl} onBackdropOverrideChange={(bg, poster) => { setOverrideBg(bg ?? null); setOverridePoster(poster ?? null); }} onHeroInfoOverrideChange={(info) => { setOverrideHeroMeta(info?.meta ?? null); setOverrideHeroLogoSrc(info?.logo ?? null); setOverrideHeroLogoId(info?.logoId ?? null); setOverrideHeroTitle(info?.title ?? null); }} />
              </div>
            </div>
          </div>
        </section>
      </main>
    </PosterBackground>
  );
}
