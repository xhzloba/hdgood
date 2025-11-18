import { HeaderCategories } from "@/components/header-categories";
import { MovieGrid } from "@/components/movie-grid";

export default function Top250Page() {
  const apiUrl = "https://api.vokino.pro/v2/compilations/content/66fa5fc9dd606aae9ea0a9dc?token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352";
  return (
    <div className="min-h-[100dvh] min-h-screen">
      <main className="mx-auto max-w-7xl px-0 md:px-6 pt-0 md:pt-6 pb-16 md:pb-10">
        <div className="mb-4 hidden md:block">
          <HeaderCategories variant="horizontal" />
        </div>
        <section>
          <div className="md:bg-zinc-900/40 md:backdrop-blur-sm md:border md:border-zinc-800/50 p-5 rounded-sm">
            <div className="-mx-5 md:-mt-5 px-5 pt-0 md:pt-5 pb-3 md:bg-zinc-900/80 md:backdrop-blur-sm md:border-b md:border-zinc-800/50 rounded-t-sm">
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
