// Локальные оверрайды для фильмов и сериалов.
// Позволяет вручную добавить недостающие поля, например backdrop/bg_poster.

export type BgPoster = { backdrop?: string };
export type ContentOverride = {
  backdrop?: string;
  bg_poster?: BgPoster;
};

// Импортируем данные из отдельных файлов
import { moviesOverrides } from "../data/overrides/movies";
import { seriesOverrides as seriesOverridesData } from "../data/overrides/series";

export const movieOverrides: Record<string, ContentOverride> = moviesOverrides as Record<string, ContentOverride>;
export const seriesOverrides: Record<string, ContentOverride> = seriesOverridesData as Record<string, ContentOverride>;

export function getMovieOverride(id: string): ContentOverride | null {
  return movieOverrides[String(id)] ?? null;
}

export function getSeriesOverride(id: string): ContentOverride | null {
  return seriesOverrides[String(id)] ?? null;
}