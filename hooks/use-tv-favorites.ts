"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type FavoriteChannel = {
  id: string;
  title: string;
  logo: string | null;
  group?: string;
  url?: string;
  type?: string | null;
};

const STORAGE_KEY = "favorites:tv";

const normalizeChannel = (channel: FavoriteChannel): FavoriteChannel => {
  return {
    ...channel,
    id: String(channel.id),
    title: channel.title || "Без названия",
    logo: channel.logo ?? null,
    type: channel.type ?? "tv-channel",
  };
};

export function useTvFavorites() {
  const readStorage = () => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((m: any) => normalizeChannel(m));
      }
    } catch {}
    return [];
  };

  const [favorites, setFavorites] = useState<FavoriteChannel[]>([]);
  const [ready, setReady] = useState<boolean>(false);

  const loadFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    const next = readStorage();
    setFavorites(next);
    setReady(true);
  }, []);

  useEffect(() => {
    loadFromStorage();

    const handleStorage = (e: StorageEvent) => {
      if (e.key && e.key !== STORAGE_KEY) return;
      loadFromStorage();
    };

    const handleCustom = () => {
      loadFromStorage();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("favorites:tv:updated", handleCustom);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("favorites:tv:updated", handleCustom);
    };
  }, [loadFromStorage]);

  const persist = useCallback((list: FavoriteChannel[]) => {
    setFavorites(list);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(
        new CustomEvent("favorites:tv:updated", {
          detail: { ids: list.map((m) => String(m.id)) },
        })
      );
    } catch {}
  }, []);

  const addFavorite = useCallback(
    (channel: FavoriteChannel) => {
      if (!channel?.id) return;
      const normalized = normalizeChannel(channel);
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
    (channel: FavoriteChannel) => {
      if (!channel?.id) return;
      const exists = (favorites || []).some((m) => String(m.id) === String(channel.id));
      if (exists) removeFavorite(channel.id);
      else addFavorite(channel);
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
