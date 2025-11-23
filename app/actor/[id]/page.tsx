"use client";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import { HeaderCategories } from "@/components/header-categories";
import { PosterBackground } from "@/components/poster-background";
import { MovieGrid } from "@/components/movie-grid";
import Link from "next/link";
import { IconLayoutGrid, IconList, IconFilter } from "@tabler/icons-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";

export default function ActorPage() {
  const params = useParams() as { id?: string };
  const id = String(params?.id ?? "");
  const [name, setName] = useState<string>("Актёр");
  const [photo, setPhoto] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"pagination" | "loadmore">("pagination");
  const [sortMode, setSortMode] = useState<"default" | "rating" | "year">("default");
  const [inlineInfoOpen, setInlineInfoOpen] = useState<boolean>(false);
  const [watchOpen, setWatchOpen] = useState<boolean>(false);
  const [paging, setPaging] = useState<{ page: number; scrolledCount: number } | null>(null);
  const [overrideBg, setOverrideBg] = useState<string | null>(null);
  const [overridePoster, setOverridePoster] = useState<string | null>(null);
  const [overrideHeroTitle, setOverrideHeroTitle] = useState<string | null>(null);
  const [overrideHeroLogoSrc, setOverrideHeroLogoSrc] = useState<string | null>(null);
  const [overrideHeroLogoId, setOverrideHeroLogoId] = useState<string | null>(null);
  const [initialBackdropSet, setInitialBackdropSet] = useState<boolean>(false);

  const handleBackdropOverrideChange = useCallback((bg: string | null, poster?: string | null) => {
    if (bg == null && (poster == null || poster === null)) return;
    if (viewMode === "loadmore" && initialBackdropSet) return;
    setOverrideBg(bg ?? null);
    setOverridePoster(poster ?? null);
  }, [viewMode, initialBackdropSet]);

  const handleHeroInfoOverrideChange = useCallback((info: { title?: string | null; logo?: string | null; logoId?: string | null } | null) => {
    if (viewMode === "loadmore" && info == null) return;
    setOverrideHeroTitle(info?.title ?? null);
    setOverrideHeroLogoSrc(info?.logo ?? null);
    setOverrideHeroLogoId(info?.logoId ?? null);
  }, [viewMode]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("__actorInfo");
      if (raw) {
        const map = JSON.parse(raw || "{}");
        const info = map?.[String(id)];
        if (info) {
          if (info.name) setName(String(info.name));
          if (info.photo) setPhoto(String(info.photo));
        }
      }
    } catch {}
  }, [id]);

  const apiUrl = useMemo(() => {
    let base = `https://api.vokino.pro/v2/list?cast=${encodeURIComponent(id)}`;
    if (sortMode === "rating") base += "&sort=rating";
    else if (sortMode === "year") base += "&sort=new";
    return base;
  }, [id, sortMode]);

  useEffect(() => {
    const mq = typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)") : null;
    const update = () => setIsDesktop(!!mq?.matches);
    update();
    mq?.addEventListener("change", update);
    return () => mq?.removeEventListener("change", update);
  }, []);

  const handlePagingInfo = useCallback((info: { page: number; scrolledCount: number; isArrowMode: boolean }) => {
    setPaging(info.isArrowMode ? { page: info.page, scrolledCount: info.scrolledCount } : null);
  }, []);

  useEffect(() => {
    setViewMode("pagination");
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl, { headers: { Accept: "application/json" }, cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const first = (() => {
          if (Array.isArray(data?.channels)) return data.channels[0] ?? null;
          if (Array.isArray(data)) return data[0] ?? null;
          return null;
        })();
        if (!first) return;
        const d = first?.details ?? first;
        const bg = d?.backdrop ?? d?.bg_poster?.backdrop ?? null;
        const poster = d?.poster ?? d?.bg_poster?.poster ?? bg ?? null;
        if (!cancelled) {
          setOverrideBg(bg ?? null);
          setOverridePoster(poster ?? null);
          setInitialBackdropSet(true);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [apiUrl]);

  return (
    <PosterBackground
      posterUrl={overridePoster ?? undefined}
      bgPosterUrl={overrideBg ?? undefined}
      disableMobileBackdrop
      simpleDarkCorners
      softBottomFade={!overrideBg}
      strongUpperCorners={!!overrideBg}
      persistComposite={false}
      className="min-h-[100dvh] min-h-screen"
    >
      <main className="mx-auto max-w-7xl px-0 md:px-6 pt-6 pb-6">
        <div className="mb-4 hidden md:block">
          <HeaderCategories variant="horizontal" className="!bg-transparent !border-transparent relative z-40" />
        </div>
        <div className="relative z-30 hidden md:flex justify-center mt-[12vh] h-[96px]">
          {overrideHeroLogoSrc && overrideHeroLogoId ? (
            <Link href={`/movie/${overrideHeroLogoId}`} className="block">
              <img src={overrideHeroLogoSrc} alt="Логотип" className="h-[96px] w-auto max-w-[80vw]" />
            </Link>
          ) : (
            <div className="h-[96px] flex items-center justify-center px-4">
              <span className="text-2xl md:text-4xl font-semibold text-zinc-100 truncate max-w-[80vw]">
                {overrideHeroTitle ?? name}
              </span>
            </div>
          )}
        </div>
        
        <section className="relative">
          <div className="relative z-20 mt-[1vh] md:mt-[4vh]">
            <div className="p-5 rounded-sm">
            <div className={`sticky top-0 z-20 -mx-5 md:-mt-5 px-5 pt-0 md:pt-5 pb-3 rounded-t-sm transition-all duration-300 ${watchOpen ? "opacity-0 pointer-events-none -translate-y-2" : "opacity-100 translate-y-0"}`}>
              <div className="flex items-center gap-3 w-full">
                <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border border-zinc-800/60 bg-zinc-900/40">
                  {photo ? (
                    <img src={photo} alt={name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-400">нет фото</div>
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg md:text-xl font-semibold text-zinc-100 truncate" title={name}>{name}</h1>
                  <div className="mt-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-medium text-white border border-transparent bg-gradient-to-r from-[rgba(var(--ui-accent-rgb),1)] to-[rgba(var(--ui-accent-rgb),0.85)] ring-1 ring-[rgba(var(--ui-accent-rgb),0.25)] shadow-xs hover:shadow-md hover:opacity-95 transition-all duration-200"
                    >
                      Подписаться
                    </button>
                  </div>
                </div>
                {isDesktop && !watchOpen && (
                  <div className="hidden md:flex items-center gap-2 ml-auto">
                    <div className={`${viewMode === "pagination" && inlineInfoOpen ? "opacity-0 pointer-events-none" : "opacity-100"} flex items-center gap-2`}>
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
                      <IconLayoutGrid size={14} className={viewMode === "pagination" ? undefined : "text-zinc-400"} />
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
                      <IconList size={14} className={viewMode === "loadmore" ? undefined : "text-zinc-400"} />
                    </button>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={`inline-flex items-center justify-center h-8 w-8 rounded-full text-[12px] font-medium transition-all duration-200 ${
                            sortMode === "default" ? "text-zinc-400 hover:text-zinc-200" : "text-white border border-[rgba(var(--ui-accent-rgb),0.6)]"
                          }`}
                          style={sortMode === "default" ? undefined : { backgroundColor: "rgba(var(--ui-accent-rgb),0.2)" }}
                          title="Фильтры"
                        >
                          <IconFilter size={14} className={sortMode === "default" ? "text-zinc-400" : undefined} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-0 p-1 shadow-md bg-zinc-900/90 backdrop-blur-sm">
                        <DropdownMenuLabel>Сортировка</DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={sortMode} onValueChange={(v) => setSortMode(v as any)}>
                          <DropdownMenuRadioItem className="rounded-full pr-3 pl-8 py-2" value="default">По умолчанию</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem className="rounded-full pr-3 pl-8 py-2" value="rating">По рейтингу</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem className="rounded-full pr-3 pl-8 py-2" value="year">По году (новые)</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {viewMode === "pagination" && (
                      <span className="hidden md:inline-flex items-center gap-2 ml-2 h-8 text-[13px] text-white font-medium">
                        {paging && (
                          <>
                            <span className="text-white">Стр.</span>
                            <span
                              className="inline-flex items-center rounded-full text-white px-2 py-[2px]"
                              style={{ backgroundColor: "rgb(var(--ui-accent-rgb))" }}
                            >
                              {paging.page}
                            </span>
                            <span className="text-white">•</span>
                            <span className="text-white">Пролистано</span>
                            <span className="text-white">{paging.scrolledCount}</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 overflow-anchor-none">
              <MovieGrid
                key={`${apiUrl}:${viewMode}`}
                url={apiUrl}
                onPagingInfo={handlePagingInfo}
                onWatchOpenChange={setWatchOpen}
                onInlineInfoOpenChange={setInlineInfoOpen}
                onBackdropOverrideChange={handleBackdropOverrideChange}
                onHeroInfoOverrideChange={handleHeroInfoOverrideChange}
                viewMode={isDesktop ? viewMode : undefined}
                resetOverridesOnNavigate
              />
            </div>
            </div>
          </div>
        </section>
      </main>
    </PosterBackground>
  );
}