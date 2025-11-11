import { HeaderCategories } from "@/components/header-categories";
import { MovieGrid } from "@/components/movie-grid";

export default function Top250Page() {
  const apiUrl = "https://api.vokino.pro/v2/compilations/content/66fa5fc9dd606aae9ea0a9dc?token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352";
  return (
    <div className="min-h-[100dvh] min-h-screen">
      <main className="mx-auto max-w-7xl px-0 md:px-6 pt-6 pb-6">
        <div className="mb-4">
          <HeaderCategories variant="horizontal" />
        </div>
        <section>
          <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 p-5 rounded-sm">
            <div className="-mx-5 -mt-5 px-5 pt-5 pb-3 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800/50 rounded-t-sm">
              <div className="flex items-center justify-between">
                <h1 className="text-lg md:text-xl font-semibold text-zinc-200">Топ 250 фильмов</h1>
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