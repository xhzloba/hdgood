"use client";

import { HeaderCategories } from "@/components/header-categories";
import MovieSlider from "@/components/movie-slider";
import { PosterBackground } from "@/components/poster-background";

export default function JohnWickFranchisePage() {
  const apiUrl = "/api/franchise-johnwick";
  const backdropUrl = "/movies/franshise-jon.jpg";
  const logoUrl = "/movies/logo/logo-jonh.png";

  return (
    <PosterBackground
      bgPosterUrl={backdropUrl}
      posterUrl={backdropUrl}
      disableMobileBackdrop
      className="min-h-[100dvh] min-h-screen"
    >
      <main className="mx-auto max-w-7xl px-0 md:px-6 pt-0 md:pt-6 pb-16 md:pb-6 relative">
        <div className="mb-4 hidden md:block">
          <HeaderCategories
            variant="horizontal"
            className="!bg-transparent !border-transparent relative z-40"
          />
        </div>
        
        {/* Отступ как для логотипа */}
        <div className="relative z-30 hidden md:flex justify-center mt-[22vh] h-[96px]" />

        <section className="relative">
          <div className="relative z-20 mt-[2vh] md:mt-[10vh]">
            <div className="p-5">
              <div className="-mx-5 px-5 pt-0 pb-3">
                <div className="space-y-2">
                  <h1 className="text-lg md:text-xl font-semibold text-zinc-200">
                    Франшиза: Джон Уик
                  </h1>
                  <p className="text-xs text-zinc-400">
                    Карточки частей, сериалов и спин-оффов по Джону Уику.
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <MovieSlider url={apiUrl} title="" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </PosterBackground>
  );
}
