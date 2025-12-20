"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type WatchedMovie = {
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

const STORAGE_KEY = "watched:list";

const normalizeMovie = (movie: WatchedMovie): WatchedMovie => {
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

export function useWatched() {
  const readStorage = () => {
    if (typeof window === "undefined") return [];
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

  const [watched, setWatched] = useState<WatchedMovie[]>([]);
  const [ready, setReady] = useState<boolean>(false);

  const loadFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    const next = readStorage();
    setWatched(next);
    setReady(true);
  }, []);

  useEffect(() => {
    loadFromStorage();
    const handler = (e: StorageEvent) => {
      if (e.key && e.key !== STORAGE_KEY) return;
      loadFromStorage();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [loadFromStorage]);

  const persist = useCallback((list: WatchedMovie[]) => {
    setWatched(list);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(
        new CustomEvent("watched:updated", {
          detail: { ids: list.map((m) => String(m.id)) },
        })
      );
    } catch {}
  }, []);

  const addWatched = useCallback(
    (movie: WatchedMovie) => {
      if (!movie?.id) return;
      const normalized = normalizeMovie(movie);
      const exists = (watched || []).some((m) => String(m.id) === normalized.id);
      if (exists) return;
      persist([normalized, ...(watched || [])]);
    },
    [watched, persist]
  );

  const removeWatched = useCallback(
    (id?: string | null) => {
      if (!id) return;
      const next = (watched || []).filter((m) => String(m.id) !== String(id));
      persist(next);
    },
    [watched, persist]
  );

  const toggleWatched = useCallback(
    (movie: WatchedMovie) => {
      if (!movie?.id) return;
      const isPresent = (watched || []).some(
        (m) => String(m.id) === String(movie.id)
      );
      if (isPresent) {
        removeWatched(String(movie.id));
      } else {
        addWatched(movie);
      }
    },
    [watched, addWatched, removeWatched]
  );

  const isWatched = useCallback(
    (id?: string | null) => {
      if (!id) return false;
      return (watched || []).some((m) => String(m.id) === String(id));
    },
    [watched]
  );

  return {
    watched,
    ready,
    addWatched,
    removeWatched,
    toggleWatched,
    isWatched,
  };
}
