"use client"

import { useState, useRef, useEffect } from "react"
import MovieSlider from "./movie-slider"
import { APP_SETTINGS } from "@/lib/settings"

// Компонент для отложенной загрузки слайдеров
function LazySlider({ children, eager = false }: { children: React.ReactNode; eager?: boolean }) {
  const [isVisible, setIsVisible] = useState(eager)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (eager || isVisible) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "400px" } // Грузим заранее за 400px до появления
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [eager, isVisible])

  return (
    <div ref={ref} className="min-h-[280px]">
      {isVisible ? children : null}
    </div>
  )
}

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
  const [activeTab, setActiveTab] = useState(0)

  return (
    <section className="relative z-10 w-full">
      <div className="w-full p-2 md:px-5 md:py-0">
        
        {/* Mobile Layout (visible on mobile only) */}
        <div className="block md:hidden space-y-8">
          {MOBILE_SECTIONS.map((section, index) => (
            <LazySlider key={section.title} eager={index < 2}>
              <div className="space-y-4">
                <MovieSlider
                  url={section.playlist_url}
                  title={section.title}
                  autoplay={
                    section.title === "В тренде" && APP_SETTINGS.slider.trending.syncWithBackdrop
                      ? APP_SETTINGS.slider.trending.autoplay
                      : false
                  }
                  autoplayIntervalMs={APP_SETTINGS.slider.trending.intervalSeconds * 1000}
                  hoverPause={APP_SETTINGS.slider.trending.hoverPause}
                  perPageOverride={APP_SETTINGS.slider.trending.perPage}
                  loop={false}
                  activeItemId={
                    section.title === "В тренде" && APP_SETTINGS.slider.trending.syncWithBackdrop
                      ? activeBackdropId ?? undefined
                      : undefined
                  }
                  viewAllHref={
                    section.title === "В тренде"
                      ? "/trending"
                      : section.title === "Фильмы"
                        ? "/movies?tab=popular"
                        : section.title === "Сериалы"
                          ? "/serials?tab=popular"
                          : undefined
                  }
                  compactOnMobile
                />
              </div>
            </LazySlider>
          ))}
          {/* Отдельный блок: Топ 250 фильмов — только для мобильных */}
          <LazySlider>
            <div className="space-y-4">
              <MovieSlider
                url="https://api.vokino.pro/v2/compilations/content/66fa5fc9dd606aae9ea0a9dc?token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352"
                title="Топ 250 фильмов"
                viewAllHref="/top250"
                compactOnMobile
              />
            </div>
          </LazySlider>
        </div>

        {/* Desktop Layout (visible on desktop only) */}
        <div className="hidden md:block">
          {/* Tabs Header */}
          <div className="flex items-center justify-center md:justify-start mb-6 md:mb-8 px-2 md:px-12">
             <div className="channel-tabs flex flex-wrap md:flex md:flex-nowrap items-center rounded-full px-1.5 py-0.5 gap-1.5 bg-transparent">
              {DESKTOP_TABS.map((tab, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveTab(idx)}
                  className={`channel-tab-btn inline-flex items-center gap-2 h-9 px-4 rounded-full md:rounded-md text-[13px] lg:text-[14px] xl:text-[15px] font-medium transition-all duration-200 ${
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

      </div>
    </section>
  )
}