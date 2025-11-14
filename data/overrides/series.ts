// Overrides для сериалов: ключ — id из /movie/[id] (детальная страница сериалов тоже /movie)
export const seriesOverrides: Record<string, { backdrop?: string; bg_poster?: { backdrop?: string }; poster_logo?: string }> = {
  // Комбэк 
  "68e43c01704f07b2131a8034": {
    bg_poster: { backdrop: "/series/comeback.webp" },
  },
};