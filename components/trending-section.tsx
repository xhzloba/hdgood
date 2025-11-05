"use client"

import MovieSlider from "./movie-slider"

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
    title: "Новинки",
    playlist_url: "https://api.vokino.pro/v2/list?sort=new&page=1",
  },
  {
    title: "Обновления",
    playlist_url: "https://api.vokino.pro/v2/list?sort=updatings",
  },
  {
    title: "Сейчас смотрят",
    playlist_url: "https://api.vokino.pro/v2/list?sort=watching",
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
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
