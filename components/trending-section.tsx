"use client"

import { useState } from "react"
import MovieSlider from "./movie-slider"
import CoverflowMovieSlider from "./coverflow-movie-slider"
import { APP_SETTINGS } from "@/lib/settings"
import { useIsMobile } from "@/hooks/use-mobile"

interface TrendingItem {
  title: string
  playlist_url: string
}

const DESKTOP_TABS: TrendingItem[] = [
  {
    title: "Сейчас смотрят",
    playlist_url: "https://api.vokino.pro/v2/list?sort=watching",
  },
  {
    title: "В тренде",
    playlist_url: "https://api.vokino.pro/v2/list?sort=popular&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352",
  },
  {
    title: "Фильмы",
    playlist_url: "https://api.vokino.pro/v2/list?sort=popular&type=movie&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352",
  },
  {
    title: "Сериалы",
    playlist_url: "https://api.vokino.pro/v2/list?sort=popular&type=serial&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352",
  },
]

const MOBILE_SECTIONS: TrendingItem[] = [
  {
    title: "В тренде",
    playlist_url: "https://api.vokino.pro/v2/list?sort=popular&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352",
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
    playlist_url: "https://api.vokino.pro/v2/list?sort=popular&type=movie&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352",
  },
  {
    title: "Сериалы",
    playlist_url: "https://api.vokino.pro/v2/list?sort=popular&type=serial&page=1&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352",
  },
]

type TrendingSectionProps = {
  activeBackdropId?: string | null
}

export function TrendingSection({ activeBackdropId }: TrendingSectionProps) {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState(0)

  if (isMobile) {
    return (
      <section className="relative z-10 w-full">
        <div className="w-full p-2 md:p-5">
          <div className="space-y-8">
            {MOBILE_SECTIONS.map((section) => (
              <div key={section.title} className="space-y-4">
                {section.title === "В тренде" ? (
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
            <div className="space-y-4">
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

  return (
    <section className="relative z-10 w-full">
      <div className="w-full p-2 md:p-5">
        {/* Tabs Header */}
        <div className="flex items-center justify-center md:justify-start mb-6 md:mb-8 px-2 md:px-12">
           <div className="channel-tabs flex flex-wrap md:flex md:flex-nowrap items-center rounded-full px-1.5 py-0.5 gap-1.5 bg-transparent">
            {DESKTOP_TABS.map((tab, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={`channel-tab-btn inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-medium transition-all duration-200 ${
                  activeTab === idx
                    ? "text-white h-10 shadow-[0_20px_40px_rgba(0,0,0,0.9)] -my-[5px] scale-[1.12]"
                    : "text-zinc-300/90 hover:text-white"
                }`}
                style={activeTab === idx ? { backgroundColor: "rgb(var(--ui-accent-rgb))" } : undefined}
              >
                {tab.title}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
            <div key={DESKTOP_TABS[activeTab].title} className="space-y-4 animate-in fade-in duration-300 slide-in-from-bottom-2">
                <MovieSlider
                  url={DESKTOP_TABS[activeTab].playlist_url}
                  title=""
                  compactOnMobile
                />
            </div>
        </div>
      </div>
    </section>
  )
}