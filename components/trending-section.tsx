"use client"

import MovieSlider from "./movie-slider"
import CoverflowMovieSlider from "./coverflow-movie-slider"
import { APP_SETTINGS } from "@/lib/settings"
import { useIsMobile } from "@/hooks/use-mobile"

interface TrendingItem {
  title: string
  playlist_url: string
}

const DESKTOP_SECTIONS: TrendingItem[] = [
  {
    title: "Сейчас смотрят",
    playlist_url: "https://api.vokino.pro/v2/list?sort=watching",
  },
]

const MOBILE_SECTIONS: TrendingItem[] = [
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
  const isMobile = useIsMobile()
  const sections = isMobile ? MOBILE_SECTIONS : DESKTOP_SECTIONS

  return (
    <section className="relative z-10 w-full">
      <div className="w-full p-2 md:p-5">
        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.title} className="space-y-4">
              {isMobile && section.title === "В тренде" ? (
                <CoverflowMovieSlider
                  url={section.playlist_url}
                  title={section.title}
                  autoplay={APP_SETTINGS.slider.trending.syncWithBackdrop ? APP_SETTINGS.slider.trending.autoplay : false}
                  autoplayIntervalMs={APP_SETTINGS.slider.trending.intervalSeconds * 1000}
                  hoverPause={APP_SETTINGS.slider.trending.hoverPause}
                  perPageOverride={APP_SETTINGS.slider.trending.perPage}
                  loop={true}
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
          {/* Отдельный блок: Топ 250 фильмов — только для мобильных */}
          {isMobile && (
            <div className="space-y-4">
              <MovieSlider
                url="https://api.vokino.pro/v2/compilations/content/66fa5fc9dd606aae9ea0a9dc?token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352"
                title="Топ 250 фильмов"
                viewAllHref="/top250"
                compactOnMobile
              />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
