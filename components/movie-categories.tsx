"use client"

import { useState } from "react"
import { MovieGrid } from "./movie-grid"

interface Category {
  title: string
  ico: string
  playlist_url: string
}

const CATEGORIES: Category[] = [
  {
    title: "История",
    ico: "clock",
    playlist_url: "https://api.vokino.pro/v2/timeline/list",
  },
  {
    title: "4K UHD",
    ico: "4k",
    playlist_url: "https://api.vokino.pro/v2/category4k",
  },
  {
    title: "Фильмы",
    ico: "movie",
    playlist_url: "https://api.vokino.pro/v2/category?type=movie",
  },
  {
    title: "Сериалы",
    ico: "serial",
    playlist_url: "https://api.vokino.pro/v2/category?type=serial",
  },
  {
    title: "Мультфильмы",
    ico: "multfilm",
    playlist_url: "https://api.vokino.pro/v2/category?type=multfilm",
  },
  {
    title: "Мультсериалы",
    ico: "multserial",
    playlist_url: "https://api.vokino.pro/v2/category?type=multserial",
  },
  {
    title: "Аниме",
    ico: "anime",
    playlist_url: "https://api.vokino.pro/v2/category?type=anime",
  },
  {
    title: "Док. Фильмы",
    ico: "documovie",
    playlist_url: "https://api.vokino.pro/v2/category?type=documovie",
  },
  {
    title: "Док. Сериалы",
    ico: "docuserial",
    playlist_url: "https://api.vokino.pro/v2/category?type=docuserial",
  },
  {
    title: "ТВ Шоу",
    ico: "tvshow",
    playlist_url: "https://api.vokino.pro/v2/category?type=tvshow",
  },
  {
    title: "Подборки",
    ico: "compilations",
    playlist_url: "https://api.vokino.pro/v2/compilations/category",
  },
]

export function MovieCategories() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)

  return (
    <section>
      <h2 className="text-base font-bold mb-4 uppercase tracking-wide text-zinc-300">Категории</h2>

      <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mb-6">
        {CATEGORIES.map((category, index) => (
          <button
            key={index}
            onClick={() => setSelectedCategory(selectedCategory === index ? null : index)}
            className={`p-3 border text-left transition-all duration-200 rounded-sm ${
              selectedCategory === index
                ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20"
                : "bg-zinc-900/40 border-zinc-800/50 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60"
            }`}
          >
            <div className="text-[11px] font-medium">{category.title}</div>
          </button>
        ))}
      </div>

      {selectedCategory !== null && (
        <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 p-5 rounded-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-200">{CATEGORIES[selectedCategory].title}</h3>
            <button
              onClick={() => setSelectedCategory(null)}
              className="px-3 py-1 border border-zinc-700/50 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800 text-zinc-300 text-[11px] rounded-sm transition-all duration-200"
            >
              Закрыть
            </button>
          </div>
          <MovieGrid url={CATEGORIES[selectedCategory].playlist_url} />
        </div>
      )}
    </section>
  )
}
