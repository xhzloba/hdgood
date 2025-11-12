"use client"

import MovieSlider from "./movie-slider"
import FranchiseSlider from "./franchise-slider"

interface TrendingItem {
  title: string
  playlist_url: string
}

const TRENDING_SECTIONS: TrendingItem[] = [
  {
    title: "В тренде",
    playlist_url: "https://api.vokino.pro/v2/list?sort=popular",
  },
  {
    title: "Сейчас смотрят",
    playlist_url: "https://api.vokino.pro/v2/list?sort=watching",
  },
  {
    title: "Новинки",
    playlist_url: "https://api.vokino.pro/v2/list?sort=new&page=1",
  },
  {
    title: "Обновления",
    playlist_url: "https://api.vokino.pro/v2/list?sort=updatings",
  },
]

export function TrendingSection() {
  return (
    <section>
      <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 p-5 rounded-sm">
        <div className="space-y-6">
          {TRENDING_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-3">
              <MovieSlider url={section.playlist_url} title={section.title} />
              {/* Баннер франшизы сразу после слайдера "В тренде" */}
              {section.title === "В тренде" && (
                <div className="space-y-3 mt-8 md:mt-10">
                  <FranchiseSlider />
                </div>
              )}
            </div>
          ))}
          {/* Отдельный блок: Топ 250 фильмов — после списка секций */}
          <div className="space-y-3">
            <MovieSlider
              url="https://api.vokino.pro/v2/compilations/content/66fa5fc9dd606aae9ea0a9dc?token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352"
              title="Топ 250 фильмов"
              viewAllHref="/top250"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
