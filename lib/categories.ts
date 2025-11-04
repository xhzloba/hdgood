export interface Category {
  title: string
  ico: string
  playlist_url: string
}

export const CATEGORIES: Category[] = [
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