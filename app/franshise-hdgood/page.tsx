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
          <div className="space-y-3 mb-4">
            <h1 className="text-lg md:text-xl font-semibold text-zinc-200">
              Франшиза: Джон Уик
            </h1>
            <p className="text-xs text-zinc-400">
              Карточки частей, сериалов и спин-оффов по Джону Уику.
            </p>
          </div>
          <MovieGrid url={apiUrl} />
        </section>
      </main>
    </div>
  );
}