"use client"

import MovieSlider from "./movie-slider"
import { APP_SETTINGS } from "@/lib/settings"

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
  {
    title: "Фильмы",
    playlist_url:
      "https://api.vokino.pro/v2/list?sort=popular&type=movie&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352",
  },
  {
    title: "Сериалы",
    playlist_url:
      "https://api.vokino.pro/v2/list?sort=popular&type=serial&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352",
  },
]

type TrendingSectionProps = {
  activeBackdropId?: string | null
}

export function TrendingSection({ activeBackdropId }: TrendingSectionProps) {
  return (
    <section className="relative z-10">
      <div className="p-5 rounded-sm">
        <div className="space-y-6">
          {TRENDING_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-3">
              {section.title === "В тренде" ? (
                <MovieSlider
                  url={section.playlist_url}
                  title={section.title}
                  autoplay={APP_SETTINGS.slider.trending.syncWithBackdrop ? APP_SETTINGS.slider.trending.autoplay : false}
                  autoplayIntervalMs={APP_SETTINGS.slider.trending.intervalSeconds * 1000}
                  hoverPause={APP_SETTINGS.slider.trending.hoverPause}
                  perPageOverride={APP_SETTINGS.slider.trending.perPage}
                  loop={APP_SETTINGS.slider.trending.loop}
                  activeItemId={APP_SETTINGS.slider.trending.syncWithBackdrop ? activeBackdropId ?? undefined : undefined}
                  compactOnMobile
                />
              ) : (
                <MovieSlider
                  url={section.playlist_url}
                  title={section.title}
                  viewAllHref={section.title === "Фильмы" ? "/movies?tab=popular" : section.title === "Сериалы" ? "/serials?tab=popular" : undefined}
                  compactOnMobile
                />
              )}
              
            </div>
          ))}
          {/* Отдельный блок: Топ 250 фильмов — после списка секций */}
          <div className="space-y-3">
            <MovieSlider
              url="https://api.vokino.pro/v2/compilations/content/66fa5fc9dd606aae9ea0a9dc?token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352"
              title="Топ 250 фильмов"
              viewAllHref="/top250"
              compactOnMobile
            />
          </div>
        </div>
      </div>
    </section>
  )
}
