import { HeaderCategories } from "@/components/header-categories";
import { MovieGrid } from "@/components/movie-grid";

export default function JohnWickFranchisePage() {
  const apiUrl = "/api/franchise-johnwick";
  return (
    <div className="min-h-[100dvh] min-h-screen">
      <main className="mx-auto max-w-7xl px-0 md:px-6 pt-6 pb-6">
        <div className="mb-4 hidden md:block">
          <HeaderCategories variant="horizontal" />
        </div>
        {/* На странице франшизы слайдер скрыт — он только на главной */}
        <section>
          <div className="md:bg-zinc-900/40 md:backdrop-blur-sm md:border md:border-zinc-800/50 p-5 rounded-sm">
            <div className="-mx-5 md:-mt-5 px-5 pt-0 md:pt-5 pb-3 md:bg-zinc-900/80 md:backdrop-blur-sm md:border-b md:border-zinc-800/50 rounded-t-sm">
              <div className="space-y-2">
                <h1 className="text-lg md:text-xl font-semibold text-zinc-200">
                  Франшиза: Джон Уик
                </h1>
                <p className="text-xs text-zинc-400">
                  Карточки частей, сериалов и спин-оффов по Джону Уику.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <MovieGrid url={apiUrl} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
