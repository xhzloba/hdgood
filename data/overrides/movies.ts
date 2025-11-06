// Overrides для фильмов: ключ — id из /movie/[id]
export const moviesOverrides: Record<string, { backdrop?: string; bg_poster?: { backdrop?: string } }> = {
  // Долгая прогулка
  "68c497e0af41faf6fd964f3a": {
    bg_poster: { backdrop: "/movies/dolgaya-progulka.jpg" },
  },
  // Грешники
  "680179e10d9f8c659d28ffd9": {
    bg_poster: { backdrop: "/movies/greshniki.jpg" },
  },
};