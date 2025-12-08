"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type FavoriteMovie = {
  id: string;
  title: string;
  poster?: string | null;
  backdrop?: string | null;
  year?: any;
  rating?: any;
  country?: any;
  genre?: any;
  description?: string | null;
  duration?: any;
  logo?: string | null;
  poster_colors?: any;
  type?: string | null;
};

const STORAGE_KEY = "favorites:list";

const normalizeMovie = (movie: FavoriteMovie): FavoriteMovie => {
  return {
    ...movie,
    id: String(movie.id),
    title: movie.title || "Без названия",
    poster: movie.poster ?? movie.backdrop ?? null,
    backdrop: movie.backdrop ?? movie.poster ?? null,
    description: movie.description ?? null,
    logo: movie.logo ?? null,
    type: movie.type ?? null,
  };
};

export function useFavorites() {
  const readStorage = () => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((m) => normalizeMovie(m));
      }
    } catch {}
    return [];
  };

  const [favorites, setFavorites] = useState<FavoriteMovie[]>(
    () => readStorage() ?? []
  );
  const [ready, setReady] = useState<boolean>(true);

  const loadFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    const next = readStorage();
    setFavorites(next);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready && typeof window !== "undefined") {
      setReady(true);
    }
    const handler = (e: StorageEvent) => {
      if (e.key && e.key !== STORAGE_KEY) return;
      loadFromStorage();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [loadFromStorage, ready]);

  const persist = useCallback((list: FavoriteMovie[]) => {
    setFavorites(list);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(
        new CustomEvent("favorites:updated", {
          detail: { ids: list.map((m) => String(m.id)) },
        })
      );
    } catch {}
  }, []);

  const addFavorite = useCallback(
    (movie: FavoriteMovie) => {
      if (!movie?.id) return;
      const normalized = normalizeMovie(movie);
      const exists = (favorites || []).some((m) => String(m.id) === normalized.id);
      if (exists) return;
      persist([normalized, ...(favorites || [])]);
    },
    [favorites, persist]
  );

  const removeFavorite = useCallback(
    (id?: string | null) => {
      if (!id) return;
      const next = (favorites || []).filter((m) => String(m.id) !== String(id));
      persist(next);
    },
    [favorites, persist]
  );

  const toggleFavorite = useCallback(
    (movie: FavoriteMovie) => {
      if (!movie?.id) return;
      const exists = (favorites || []).some((m) => String(m.id) === String(movie.id));
      if (exists) removeFavorite(movie.id);
      else addFavorite(movie);
    },
    [favorites, addFavorite, removeFavorite]
  );

  const isFavorite = useCallback(
    (id?: string | null) => {
      if (!id) return false;
      return (favorites || []).some((m) => String(m.id) === String(id));
    },
    [favorites]
  );

  const idsSet = useMemo(
    () => new Set((favorites || []).map((m) => String(m.id))),
    [favorites]
  );

  return {
    favorites,
    ready,
    favoritesIds: idsSet,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
  };
}

