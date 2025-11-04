import { HeaderCategories } from "@/components/header-categories";
import { MovieGrid } from "@/components/movie-grid";

export default function JohnWickFranchisePage() {
  const apiUrl = "/api/franchise-johnwick";
  return (
    <div className="min-h-[100dvh] min-h-screen">
      <main className="mx-auto max-w-7xl px-0 md:px-6 pt-6 pb-6">
        <div className="mb-4">
          <HeaderCategories variant="horizontal" />
        </div>
        {/* На странице франшизы слайдер скрыт — он только на главной */}
        <section>
          <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 p-5 rounded-sm">
            <div className="-mx-5 -mt-5 px-5 pt-5 pb-3 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800/50 rounded-t-sm">
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
              <MovieGrid url={apiUrl} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}