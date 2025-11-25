"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader } from "@/components/loader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Share2 } from "lucide-react";
import { PlayerSelector } from "@/components/player-selector";
import { toast } from "@/hooks/use-toast";

// Кеш dynamic overrides по id фильма, переживает размонтирование страницы и переиспользуется из списка/слайдера
const movieOverrideCache: Record<string, any> =
  (globalThis as any).__movieOverridesCache ||
  ((globalThis as any).__movieOverridesCache = {});

const fetcher = async (
  url: string,
  timeout: number = 5000,
  retries: number = 2
) => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        // Keep-alive для переиспользования соединений (ускоряет запросы)
        keepalive: true,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          // Указываем что можем принимать сжатые ответы
          "Accept-Encoding": "gzip, deflate, br",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        lastError = error;

        // Если это последняя попытка - выбрасываем ошибку
        if (attempt === retries - 1) {
          if (error.name === "AbortError") {
            throw new Error("Request timeout");
          }
          throw error;
        }

        // Экспоненциальная задержка: 300мс, 600мс для повторных попыток
        const delay = 300 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw new Error("Unknown error occurred");
      }
    }
  }

  throw lastError || new Error("Failed to fetch");
};

// Функция для franchise API с retry логикой для надежности
const fetchFranchise = async (
  kpId: number,
  retries: number = 2
): Promise<any | null> => {
  // Используем наш Next.js API route для избежания CORS проблем
  const url = `/api/franchise?kinopoisk_id=${kpId}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Если это последняя попытка - логируем ошибку
        if (attempt === retries - 1) {
          console.warn(
            `⚠️ Franchise API HTTP error: ${response.status} для kp_id: ${kpId}`
          );
          return null;
        }
        // Пробуем еще раз
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }

      const data = await response.json();

      // Проверяем что данные не пустые
      if (
        !data ||
        (typeof data === "object" && Object.keys(data).length === 0)
      ) {
        if (attempt === retries - 1) {
          console.warn(
            `⚠️ Franchise API вернул пустой объект для kp_id: ${kpId}`
          );
          return null;
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }

      return data;
    } catch (error) {
      // Если это последняя попытка - логируем и возвращаем null
      if (attempt === retries - 1) {
        console.warn(`⚠️ Franchise API error для kp_id: ${kpId}:`, error);
        return null;
      }
      // Пробуем еще раз через 300мс
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  return null;
};

// Функция для форматирования дат
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Если дата невалидна, возвращаем как есть

    return date.toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    return dateString; // В случае ошибки возвращаем оригинальную строку
  }
};

import { ActorCard } from "@/components/actor-card";
import { CastList } from "@/components/cast-list";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  TrailerPlayer,
  getEmbedSrcFromTrailer,
} from "@/components/trailer-player";
import { ratingColor, ratingBgColor, formatRatingLabel } from "@/lib/utils";
import { PosterBackground } from "@/components/poster-background";
import { TriviaSection } from "@/components/trivia-section";
import { getMovieOverride, getSeriesOverride } from "@/lib/overrides";
import { VideoPoster, VideoPosterRef } from "@/components/video-poster";
function getPrimaryGenreFromItem(item: any): string | null {
  const raw = item?.genre ?? item?.tags;
  if (!raw) return null;
  if (Array.isArray(raw)) {
    const first = raw.find((v) => v != null && String(v).trim().length > 0);
    return first != null ? String(first).trim() : null;
  }
  if (typeof raw === "string") {
    const parts = raw
      .split(/[,/|]/)
      .map((p) => p.trim())
      .filter(Boolean);
    return parts[0] || null;
  }
  return null;
}
// Inline SVG icons to avoid external icon dependencies
function IconThumbUp({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
    >
      <path d="M8.864.046C7.908-.193 7.02.53 6.956 1.466c-.072 1.051-.23 2.016-.428 2.59-.125.36-.479 1.013-1.04 1.639-.557.623-1.282 1.178-2.131 1.41C2.685 7.288 2 7.87 2 8.72v4.001c0 .845.682 1.464 1.448 1.545 1.07.114 1.564.415 2.068.723l.048.03c.272.165.578.348.97.484.397.136.861.217 1.466.217h3.5c.937 0 1.599-.477 1.934-1.064a1.86 1.86 0 0 0 .254-.912c0-.152-.023-.312-.077-.464.201-.263.38-.578.488-.901.11-.33.172-.762.004-1.149.069-.13.12-.269.159-.403.077-.27.113-.568.113-.857 0-.288-.036-.585-.113-.856a2 2 0 0 0-.138-.362 1.9 1.9 0 0 0 .234-1.734c-.206-.592-.682-1.1-1.2-1.272-.847-.282-1.803-.276-2.516-.211a10 10 0 0 0-.443.05 9.4 9.4 0 0 0-.062-4.509A1.38 1.38 0 0 0 9.125.111zM11.5 14.721H8c-.51 0-.863-.069-1.14-.164-.281-.097-.506-.228-.776-.393l-.04-.024c-.555-.339-1.198-.731-2.49-.868-.333-.036-.554-.29-.554-.55V8.72c0-.254.226-.543.62-.65 1.095-.3 1.977-.996 2.614-1.708.635-.71 1.064-1.475 1.238-1.978.243-.7.407-1.768.482-2.85.025-.362.36-.594.667-.518l.262.066c.16.04.258.143.288.255a8.34 8.34 0 0 1-.145 4.725.5.5 0 0 0 .595.644l.003-.001.014-.003.058-.014a9 9 0 0 1 1.036-.157c.663-.06 1.457-.054 2.11.164.175.058.45.3.57.65.107.308.087.67-.266 1.022l-.353.353.353.354c.043.043.105.141.154.315.048.167.075.37.075.581 0 .212-.027.414-.075.582-.05.174-.111.272-.154.315l-.353.353.353.354c.047.047.109.177.005.488a2.2 2.2 0 0 1-.505.805l-.353.353.353.354c.006.005.041.05.041.17a.9.9 0 0 1-.121.416c-.165.288-.503.56-1.066.56z" />
    </svg>
  );
}

function IconThumbDown({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
    >
      <path d="M8.864 15.674c-.956.24-1.843-.484-1.908-1.42-.072-1.05-.23-2.015-.428-2.59-.125-.36-.479-1.012-1.04-1.638-.557-.624-1.282-1.179-2.131-1.41C2.685 8.432 2 7.85 2 7V3c0-.845.682-1.464 1.448-1.546 1.07-.113 1.564-.415 2.068-.723l.048-.029c.272-.166.578-.349.97-.484C6.931.08 7.395 0 8 0h3.5c.937 0 1.599.478 1.934 1.064.164.287.254.607.254.913 0 .152-.023.312-.077.464.201.262.38.577.488.9.11.33.172.762.004 1.15.069.13.12.268.159.403.077.27.113.567.113.856s-.036.586-.113.856c-.035.12-.08.244-.138.363.394.571.418 1.2.234 1.733-.206.592-.682 1.1-1.2 1.272-.847.283-1.803.276-2.516.211a10 10 0 0 1-.443-.05 9.36 9.36 0 0 1-.062 4.51c-.138.508-.55.848-1.012.964zM11.5 1H8c-.51 0-.863.068-1.14.163-.281.097-.506.229-.776.393l-.04.025c-.555.338-1.198.73-2.49.868-.333.035-.554.29-.554.55V7c0 .255.226.543.62.65 1.095.3 1.977.997 2.614 1.709.635.71 1.064 1.475 1.238 1.977.243.7.407 1.768.482 2.85.025.362.36.595.667.518l.262-.065c.16-.04.258-.144.288-.255a8.34 8.34 0 0 0-.145-4.726.5.5 0 0 1 .595-.643h.003l.014.004.058.013a9 9 0 0 0 1.036.157c.663.06 1.457.054 2.11-.163.175-.059.45-.301.57-.651.107-.308.087-.67-.266-1.021L12.793 7l.353-.354c.043-.042.105-.14.154-.315.048-.167.075-.37.075-.581s-.027-.414-.075-.581c-.05-.174-.111-.273-.154-.315l-.353-.354.353-.354c.047-.047.109-.176.005-.488a2.2 2.2 0 0 0-.505-.804l-.353-.354.353-.354c.006-.005.041-.05.041-.17a.9.9 0 0 0-.121-.415C12.4 1.272 12.063 1 11.5 1" />
    </svg>
  );
}

function IconNeutral({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
    >
      <path d="M8.5 4.466V1.75a1.75 1.75 0 1 0-3.5 0v5.34l-1.2.24a1.5 1.5 0 0 0-1.196 1.636l.345 3.106a2.5 2.5 0 0 0 .405 1.11l1.433 2.15A1.5 1.5 0 0 0 6.035 16h6.385a1.5 1.5 0 0 0 1.302-.756l1.395-2.441a3.5 3.5 0 0 0 .444-1.389l.271-2.715a2 2 0 0 0-1.99-2.199h-.581a5 5 0 0 0-.195-.248c-.191-.229-.51-.568-.88-.716-.364-.146-.846-.132-1.158-.108l-.132.012a1.26 1.26 0 0 0-.56-.642 2.6 2.6 0 0 0-.738-.288c-.31-.062-.739-.058-1.05-.046z" />
    </svg>
  );
}

export default function MoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [franchiseData, setFranchiseData] = useState<any>(null);
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState<string>("");
  const [kpId, setKpId] = useState<string>("");
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<number>(1);
  const currentIdRef = useRef<string>(""); // Ref для отслеживания текущего id
  const [openSeasons, setOpenSeasons] = useState<Set<number>>(new Set([1])); // По умолчанию открыт только первый сезон
  const [playingEpisode, setPlayingEpisode] = useState<{
    seasonNumber: number;
    url: string;
    title: string;
  } | null>(null); // Для inline iframe
  const [detailsOpen, setDetailsOpen] = useState(true); // Десктоп: сворачиваем «О фильме/О сериале», «В ролях», «Актёры дубляжа»
  const [overrideData, setOverrideData] = useState<any>(null);
  const [shareFiles, setShareFiles] = useState<File[] | undefined>(undefined);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 768px)").matches
      : true
  );
  const [posterLoaded, setPosterLoaded] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const videoPosterRef = useRef<VideoPosterRef>(null);
  const [isVideoLooping, setIsVideoLooping] = useState(false);

  const normalizeTrailers = (val: any): any[] => {
    try {
      if (Array.isArray(val)) return val.filter(Boolean);
      if (val && typeof val === "object") return [val];
      if (typeof val === "string" && val.trim()) return [{ url: val.trim() }];
      return [];
    } catch {
      return [];
    }
  };

  const rawTrailers = useMemo(() => {
    try {
      const ov = (overrideData as any)?.trailers;
      const dt = (data as any)?.details?.trailers ?? (data as any)?.trailers;
      const ovN = normalizeTrailers(ov);
      const dtN = normalizeTrailers(dt);
      return ovN.length > 0 ? ovN : dtN;
    } catch {
      return [] as any[];
    }
  }, [data, overrideData]);

  const hasTrailers = useMemo(() => {
    try {
      return (rawTrailers || []).some((t: any) => {
        const src = getEmbedSrcFromTrailer(t);
        return !!src && src.includes("youtube.com/embed");
      });
    } catch {
      return false;
    }
  }, [rawTrailers]);

  const handleShare = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const name =
      (data?.name ?? overrideData?.name ?? "") ||
      (typeof (data as any)?.movie === "object"
        ? (data as any).movie?.name ?? ""
        : "");
    const descRaw = (data?.about ??
      (data as any)?.description ??
      overrideData?.about ??
      "") as any;
    const desc = Array.isArray(descRaw)
      ? descRaw.filter(Boolean).join(" ")
      : String(descRaw || "").trim();

    // Получаем год из данных фильма
    const movie = data || overrideData;
    const yearRaw =
      (movie as any)?.year ??
      (movie as any)?.released ??
      (movie as any)?.release_year ??
      (movie as any)?.releaseYear;
    let yearPart = "";
    if (yearRaw != null) {
      const s = String(yearRaw).trim();
      if (s && s !== "0") {
        const match = s.match(/\d{4}/);
        if (match) yearPart = ` (${match[0]})`;
      }
    }

    // Формируем заголовок с названием и годом
    const title = name
      ? `Смотреть онлайн: ${name}${yearPart}`
      : "Смотреть онлайн в 4K качестве";
    const text = [desc || null, shareUrl].filter(Boolean).join("\n\n");
    const files: File[] | undefined = shareFiles;

    const hasWebShare =
      typeof navigator !== "undefined" &&
      typeof (navigator as any).share === "function";
    const isSecure =
      typeof window !== "undefined" && (window as any).isSecureContext === true;
    const isTopLevel =
      typeof window !== "undefined" && window.top === window.self;
    if (hasWebShare && isSecure && isTopLevel) {
      try {
        const canShareFiles =
          files &&
          (navigator as any).canShare &&
          (navigator as any).canShare({ files });
        if (canShareFiles) {
          await (navigator as any).share({ title, text, files });
        } else {
          await (navigator as any).share({ title, text, url: shareUrl });
        }
        toast({ title: "Ссылка отправлена" });
      } catch (e: any) {
        const msg = String(e?.name || e || "").toLowerCase();
        if (msg.includes("aborterror")) {
          return; // пользователь отменил — ничего не делаем
        }
        // Если Web Share поддерживается, но произошла ошибка — не копируем в буфер,
        // чтобы не было двойных действий и дублирования.
        toast({ title: "Не удалось поделиться" });
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(
        `${title ? title + "\n\n" : ""}${text}`
      );
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = `${title ? title + "\n\n" : ""}${text}`;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {}
    }
    toast({ title: "Ссылка скопирована" });
  };

  // Копирование ident (id из маршрута) в буфер обмена по клику на постер
  const copyIdentToClipboard = async () => {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = id;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch (e) {
        console.warn("Не удалось скопировать ident:", e);
      }
    }
  };

  useEffect(() => {
    const posterUrl =
      (overrideData as any)?.poster ??
      (data as any)?.poster ??
      (data as any)?.details?.poster ??
      (data as any)?.movie?.poster;
    if (!posterUrl || typeof posterUrl !== "string" || !posterUrl.trim()) {
      setShareFiles(undefined);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const proxyUrl = `/api/share-poster?url=${encodeURIComponent(
          posterUrl
        )}`;
        const res = await fetch(proxyUrl, { cache: "force-cache" });
        if (!res.ok) {
          if (!cancelled) setShareFiles(undefined);
          return;
        }
        const blob = await res.blob();
        let outBlob: Blob = blob;
        let outExt = (blob.type.split("/")[1] || "jpg").toLowerCase();
        const canShare =
          typeof navigator !== "undefined" && (navigator as any).canShare;
        if (canShare) {
          const testFile = new File([blob], `poster.${outExt}`, {
            type: blob.type,
          });
          const ok = (navigator as any).canShare({ files: [testFile] });
          const preferredType = "image/jpeg";
          if (!ok && blob.type !== preferredType) {
            const url = URL.createObjectURL(blob);
            const img = new Image();
            const converted: Blob | null = await new Promise((resolve) => {
              img.onload = () => {
                URL.revokeObjectURL(url);
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth || img.width || 600;
                canvas.height = img.naturalHeight || img.height || 900;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                  resolve(null);
                  return;
                }
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                if (typeof (canvas as any).toBlob === "function") {
                  (canvas as any).toBlob(
                    (b: Blob | null) => resolve(b || null),
                    preferredType,
                    0.92
                  );
                } else {
                  try {
                    const dataUrl = canvas.toDataURL(preferredType, 0.92);
                    fetch(dataUrl)
                      .then((r) => r.blob())
                      .then((b) => resolve(b))
                      .catch(() => resolve(null));
                  } catch {
                    resolve(null);
                  }
                }
              };
              img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(null);
              };
              img.src = url;
            });
            if (converted) {
              outBlob = converted;
              outExt = "jpg";
            }
          }
        }
        const file = new File([outBlob], `poster-${id || "movie"}.${outExt}`, {
          type: outBlob.type || "image/jpeg",
        });
        if (!cancelled) setShareFiles([file]);
      } catch {
        if (!cancelled) setShareFiles(undefined);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, overrideData, data]);

  // Функция переключения открытия/закрытия сезона
  const toggleSeason = (seasonNumber: number) => {
    setOpenSeasons((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(seasonNumber)) {
        newSet.delete(seasonNumber);
      } else {
        newSet.add(seasonNumber);
      }
      return newSet;
    });
  };

  // Функции для управления inline iframe с эпизодом
  const playEpisode = (seasonNumber: number, url: string, title: string) => {
    setPlayingEpisode({ seasonNumber, url, title });
  };

  const closeEpisode = (seasonNumber: number) => {
    setPlayingEpisode(null);
  };

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setId(resolvedParams.id);
    };
    loadParams();
  }, [params]);

  useEffect(() => {
    try {
      const mq =
        typeof window !== "undefined"
          ? window.matchMedia("(min-width: 768px)")
          : null;
      const update = () => setIsDesktop(!!mq?.matches);
      update();
      mq?.addEventListener("change", update);
      return () => mq?.removeEventListener("change", update);
    } catch {}
  }, []);

  // Загружаем динамический override из JSON API
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    // Мгновенно подставляем override из кеша, если уже загружали его для этого id
    if (!cancelled && movieOverrideCache[id] !== undefined) {
      setOverrideData(movieOverrideCache[id]);
    }

    (async () => {
      try {
        const res = await fetch(`/api/overrides/movies/${id}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) || null;
        if (!cancelled) {
          setOverrideData(data);
          movieOverrideCache[id] = data;
          try {
            const ref: any = globalThis as any;
            const cache = (ref.__movieOverridesCache ||= {});
            cache[id] = data;
          } catch {}
        }
      } catch {
        if (!cancelled) {
          // Если в кеше уже было значение — оставляем его, иначе фиксируем отсутствие override
          setOverrideData((prev: any) => (prev === null ? null : prev));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;

    let isCancelled = false;
    currentIdRef.current = id; // Сохраняем текущий id

    const loadData = async () => {
      console.log(`🔄 Загрузка фильма ${id} - loading=true`);
      setLoading(true);
      setError(null);
      setErrorDetails("");
      // Сбрасываем franchise данные при загрузке нового фильма
      setFranchiseData(null);

      try {
        const startTime = Date.now();

        // Запускаем view и timeline параллельно
        console.log("📡 View API запущен...");
        const viewStart = Date.now();
        const viewPromise = fetcher(
          `https://api.vokino.pro/v2/view/${id}`,
          5000,
          2
        )
          .then((data) => {
            console.log(`✅ View API: ${Date.now() - viewStart}мс`);
            return data;
          })
          .catch((e) => {
            console.error(
              `❌ View API ошибка: ${Date.now() - viewStart}мс -`,
              e.message
            );
            throw e;
          });

        console.log("📡 Timeline API запущен...");
        const timelineStart = Date.now();
        const timelinePromise = fetcher(
          `https://api.vokino.tv/v2/timeline/watch?ident=${id}&current=100&time=100&token=mac_23602515ddd41e2f1a3eba4d4c8a949a_1225352`,
          3000,
          2
        )
          .then((data) => {
            console.log(`✅ Timeline API: ${Date.now() - timelineStart}мс`);
            return data;
          })
          .catch((e) => {
            console.warn(
              `⚠️ Timeline API ошибка: ${Date.now() - timelineStart}мс -`,
              e.message
            );
            return null;
          });

        // Ждем view и timeline
        const [movieData, timelineData] = await Promise.all([
          viewPromise,
          timelinePromise,
        ]);

        if (isCancelled) return;

        if (!movieData || typeof movieData !== "object") {
          throw new Error("Invalid data format received from API");
        }

        // Получаем kp_id для franchise
        const kpId =
          timelineData?.kp_id ||
          timelineData?.data?.kp_id ||
          movieData?.kp_id ||
          movieData?.details?.kp_id ||
          movieData?.details?.kinopoisk_id;

        // КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Не ждем franchise - показываем страницу сразу!
        // Franchise загрузится асинхронно и обновится когда готов (как в hdbox)
        if (isCancelled) return;

        const totalTime = Date.now() - startTime;
        if (totalTime > 2000) {
          console.warn(
            `⚠️ Медленная загрузка: ${(totalTime / 1000).toFixed(1)}с`
          );
        }

        // Показываем страницу сразу с основными данными
        setData(movieData);
        setLoading(false); // Скрываем loader сразу! (не ждем franchise)

        // Загружаем franchise асинхронно (не блокируем отображение страницы)
        if (kpId) {
          setKpId(kpId); // Сохраняем kpId в состояние
          console.log(`📡 kp_id найден: ${kpId} - начинаем загрузку franchise`);
          const franchiseStart = Date.now();
          const currentIdForFranchise = id; // Сохраняем id для проверки

          // Функция для загрузки franchise
          const loadFranchise = async (attemptNumber: number = 1) => {
            try {
              const data = await fetchFranchise(kpId, 2);

              // Проверяем что мы все еще на той же странице (id не изменился)
              if (currentIdRef.current !== currentIdForFranchise) {
                console.log(
                  `⏭️ Franchise пропущен - id изменился (${currentIdRef.current} !== ${currentIdForFranchise})`
                );
                return;
              }

              console.log(
                `✅ Franchise API (попытка ${attemptNumber}): ${
                  Date.now() - franchiseStart
                }мс`
              );

              if (data) {
                setFranchiseData(data);
                console.log(
                  `✅ Franchise данные установлены для id: ${currentIdForFranchise}`
                );
              } else {
                // Если данные не получены и это первая попытка - пробуем еще раз через 2 секунды
                if (attemptNumber === 1) {
                  console.log(
                    `⏳ Franchise не загрузился, повторная попытка через 2 сек...`
                  );
                  setTimeout(() => {
                    // Проверяем что мы все еще на той же странице перед повторной попыткой
                    if (currentIdRef.current === currentIdForFranchise) {
                      loadFranchise(2);
                    }
                  }, 2000);
                } else {
                  console.warn(
                    `⚠️ Franchise API не удалось загрузить после ${attemptNumber} попыток для kp_id: ${kpId}`
                  );
                }
              }
            } catch (e) {
              // Проверяем что мы все еще на той же странице даже при ошибке
              if (currentIdRef.current !== currentIdForFranchise) {
                return;
              }

              // Если это первая попытка - пробуем еще раз через 2 секунды
              if (attemptNumber === 1) {
                console.log(
                  `⏳ Franchise ошибка (попытка ${attemptNumber}), повтор через 2 сек...`
                );
                setTimeout(() => {
                  if (currentIdRef.current === currentIdForFranchise) {
                    loadFranchise(2);
                  }
                }, 2000);
              } else {
                console.warn(
                  `⚠️ Franchise API ошибка после ${attemptNumber} попыток: ${
                    Date.now() - franchiseStart
                  }мс -`,
                  e
                );
              }
            }
          };

          // Запускаем первую попытку
          loadFranchise(1);
        } else {
          console.warn(
            `⚠️ kp_id не найден - franchise не будет загружен. Timeline: ${
              timelineData?.kp_id || "нет"
            }, Movie: ${movieData?.details?.kinopoisk_id || "нет"}`
          );
        }

        console.log(
          `✅ Загрузка фильма ${id} завершена - loading=false (cancelled: ${isCancelled})`
        );
      } catch (e) {
        if (!isCancelled) {
          setError(e);
          console.error("MoviePage error:", e);

          if (!errorDetails) {
            setErrorDetails(
              e instanceof Error ? e.message : "Неизвестная ошибка"
            );
          }
        }
        // Скрываем loader при ошибке
        setLoading(false);
      }
    };

    loadData();

    // Cleanup функция - отменяет обработку результатов при размонтировании или смене id
    return () => {
      isCancelled = true;
    };
  }, [id]);

  // Убрали эффект прокрутки для хедера: чистый, без blur и границы

  if (loading) {
    return (
      <div className="min-h-[100dvh] min-h-screen relative bg-zinc-950">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-zinc-950/95 backdrop-blur-3xl -z-10" />

        

        <div className="max-w-6xl mx-auto px-4 pt-0 pb-6 md:py-8 relative z-0">
          <div className="flex items-center justify-center min-h-[100dvh] min-h-screen">
            <Loader size="lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data || !data.details) {
    return (
      <div className="min-h-[100dvh] min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-950/50 border border-red-900/50 p-6 text-red-400 rounded backdrop-blur-sm max-w-md text-center">
          <h2 className="text-lg font-semibold mb-2">Ошибка загрузки</h2>
          <p className="text-sm text-red-300 mb-4">{errorDetails}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-800 hover:bg-red-700 rounded text-white text-sm transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  let movie = data.details;
  // Локальная копия данных франшизы для отображения
  let franchise = franchiseData;

  // Мердж локальных оверрайдов (например, bg_poster/backdrop)
  // Определяем тип контента и выбираем соответствующий набор оверрайдов
  const typeRawForOverride = (movie as any).type ?? (data as any).type ?? "";
  const tForOverride = String(typeRawForOverride).toLowerCase();
  const isSerialForOverride =
    tForOverride.includes("serial") ||
    tForOverride.includes("series") ||
    tForOverride.includes("tv") ||
    tForOverride.includes("сериал");
  // Применяем override приоритетно ко всем полям
  const override =
    overrideData ??
    (isSerialForOverride ? getSeriesOverride(id) : getMovieOverride(id));
  if (override) {
    const deepMergePreferOverride = (base: any, ov: any) => {
      if (!ov || typeof ov !== "object") return base;
      const result: any = Array.isArray(base) ? [...base] : { ...base };
      for (const key of Object.keys(ov)) {
        const ovVal = (ov as any)[key];
        const baseVal = (base as any)?.[key];
        if (ovVal && typeof ovVal === "object" && !Array.isArray(ovVal)) {
          result[key] = deepMergePreferOverride(baseVal || {}, ovVal);
        } else {
          result[key] = ovVal; // override имеет приоритет
        }
      }
      return result;
    };

    movie = deepMergePreferOverride(movie, override);

    // Применяем оверрайды франшизы, если есть
    if (override?.franchise) {
      const deepMergePreferOverrideFr = (base: any, ov: any) => {
        if (!ov || typeof ov !== "object") return base;
        const result: any = Array.isArray(base) ? [...base] : { ...base };
        for (const key of Object.keys(ov)) {
          const ovVal = (ov as any)[key];
          const baseVal = (base as any)?.[key];
          if (ovVal && typeof ovVal === "object" && !Array.isArray(ovVal)) {
            result[key] = deepMergePreferOverrideFr(baseVal || {}, ovVal);
          } else {
            result[key] = ovVal; // override имеет приоритет
          }
        }
        return result;
      };
      franchise = deepMergePreferOverrideFr(
        franchise || {},
        override.franchise
      );
    }
  }

  const seqList = Array.isArray((movie as any).sequelsAndPrequels)
    ? (movie as any).sequelsAndPrequels
    : Array.isArray((data as any).sequelsAndPrequels)
    ? (data as any).sequelsAndPrequels
    : [];

  const detailsTitle = (() => {
    const typeRaw = (movie as any).type ?? (data as any).type ?? "";
    const t = String(typeRaw).toLowerCase();
    const isSerial =
      t.includes("serial") ||
      t.includes("series") ||
      t.includes("tv") ||
      t.includes("сериал");
    return isSerial ? "О сериале" : "О фильме";
  })();

  // Год для заголовка: добавляем в скобках, если есть
  const titleYear = (() => {
    const raw =
      (movie as any).year ??
      (movie as any).released ??
      (movie as any).release_year ??
      (movie as any).releaseYear;
    if (raw == null) return null;
    const s = String(raw).trim();
    if (!s || s === "0") return null;
    const match = s.match(/\d{4}/);
    return match ? match[0] : s;
  })();

  const formatQuality = () => {
    const quality = (movie as any).quality;
    const tags = Array.isArray((movie as any).tags)
      ? (movie as any).tags.join(", ")
      : (movie as any).tags ?? "";
    const combined = [quality, tags]
      .filter((v) => v && String(v).trim().length > 0)
      .join(" • ");
    return combined || "-";
  };

  const formatDuration = () => {
    const raw =
      (movie as any).duration ??
      (movie as any).time ??
      (movie as any).runtime ??
      (movie as any).length;
    const toMinutes = (val: any): number | null => {
      if (val == null) return null;
      if (typeof val === "number" && !Number.isNaN(val)) return Math.round(val);
      if (typeof val === "string") {
        const s = val.trim().toLowerCase();
        if (s.includes(":")) {
          const parts = s.split(":").map((p) => parseInt(p, 10));
          if (parts.every((n) => !Number.isNaN(n))) {
            if (parts.length === 3) {
              const [h, m] = parts;
              return h * 60 + m;
            }
            if (parts.length === 2) {
              const [h, m] = parts;
              return h * 60 + m;
            }
          }
        }
        const hoursMatch = s.match(
          /(\d+)\s*(ч|час|часа|часов|h|hr|hour|hours)/
        );
        const minutesMatch = s.match(/(\d+)\s*(мин|м|m|min|minute|minutes)/);
        if (hoursMatch || minutesMatch) {
          const h = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
          const m = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
          return h * 60 + m;
        }
        const num = parseInt(s.replace(/[^0-9]/g, ""), 10);
        if (!Number.isNaN(num)) return num;
      }
      return null;
    };
    const mins = toMinutes(raw);
    if (mins == null) return "—";
    if (mins % 60 === 0) return `${mins} мин`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}ч ${m} мин` : `${m} мин`;
  };

  const formatDate = (dateValue: any): string => {
    if (!dateValue) return "—";

    const tryParse = (val: any): Date | null => {
      if (val instanceof Date && !isNaN(val.getTime())) return val;
      if (typeof val === "number") {
        if (val > 1e12) return new Date(val); // ms
        if (val > 1e9) return new Date(val * 1000); // sec
        return null;
      }
      if (typeof val === "string") {
        const s = val.trim();
        if (!s) return null;
        // Пропустим чисто год вида "2020"
        if (/^\d{4}$/.test(s)) return null;
        // ISO 8601 YYYY-MM-DD
        let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
        if (m) {
          const y = parseInt(m[1], 10);
          const mo = parseInt(m[2], 10);
          const d = parseInt(m[3], 10);
          if (!isNaN(y) && !isNaN(mo) && !isNaN(d))
            return new Date(y, mo - 1, d);
        }
        // DD.MM.YYYY
        m = s.match(/^(\d{1,2})[.](\d{1,2})[.](\d{4})$/);
        if (m) {
          const d = parseInt(m[1], 10);
          const mo = parseInt(m[2], 10);
          const y = parseInt(m[3], 10);
          if (!isNaN(y) && !isNaN(mo) && !isNaN(d))
            return new Date(y, mo - 1, d);
        }
        // DD/MM/YYYY
        m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) {
          const d = parseInt(m[1], 10);
          const mo = parseInt(m[2], 10);
          const y = parseInt(m[3], 10);
          if (!isNaN(y) && !isNaN(mo) && !isNaN(d))
            return new Date(y, mo - 1, d);
        }
        // Попытка нативного парсинга (на случай полнотекстовых дат)
        const t = Date.parse(s);
        if (!isNaN(t)) return new Date(t);
      }
      return null;
    };

    const dt = tryParse(dateValue);
    if (!dt) return "—";
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(dt);
  };

  const formatReleaseDate = () => {
    const pick = (...keys: string[]) => {
      for (const k of keys) {
        const v = (movie as any)[k];
        if (v != null && String(v).trim() !== "") return v;
      }
      return null;
    };
    // Поддержим разные наименования полей из API
    const raw = pick(
      "release_date",
      "releaseDate",
      "premiere_world",
      "premiere_ru",
      "worldPremiere",
      "premiere",
      "first_air_date",
      "air_date",
      "aired",
      "released_at",
      "releasedDate",
      "date",
      // как самый крайний фолбэк – released (часто это только год)
      "released"
    );
    return formatDate(raw);
  };

  // Подсчет среднего рейтинга (HDBOX) по КП и IMDb
  const getValidRating = (r: any): number | null => {
    if (r == null) return null;
    const v = parseFloat(String(r));
    if (Number.isNaN(v)) return null;
    if (String(r) === "0.0" || v === 0) return null;
    return v;
  };
  const ratingKP = getValidRating((movie as any).rating_kp);
  const ratingIMDb = getValidRating((movie as any).rating_imdb);
  const ratingHdbox =
    ratingKP != null && ratingIMDb != null
      ? Math.round(((ratingKP + ratingIMDb) / 2) * 10) / 10
      : null;
  return (
    <PosterBackground
      posterUrl={movie.poster}
      // Сначала используем API backdrop, если есть; иначе — локальный из overrides
      bgPosterUrl={
        (movie as any).backdrop || (movie as any).bg_poster?.backdrop
      }
      colorOverrides={(movie as any).poster_colors || null}
      className="min-h-[100dvh] min-h-screen"
    >
      <header className="relative z-10 bg-transparent">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Назад</span>
          </Link>
        </div>
      </header>

      {/* Movie Details */}
      <div className="max-w-6xl mx-auto px-4 pt-0 pb-6 md:py-8">
        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          {/* Poster */}
          <div className="space-y-4 md:sticky md:top-20 md:self-start">
            <div
              className="aspect-[2/3] bg-zinc-950 rounded overflow-hidden w-[75%] max-w-[280px] mx-auto md:w-full md:max-w-none relative"
              style={{ boxShadow: "0 6px 18px rgba(0,0,0,0.28)" }}
            >
              {movie.intro_video ? (
                <>
                  <VideoPoster
                    ref={videoPosterRef}
                    src={movie.intro_video}
                    poster={movie.poster}
                    className="w-full h-full"
                    alt={movie.name}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (videoPosterRef.current) {
                        videoPosterRef.current.replay();
                        videoPosterRef.current.toggleLoop();
                        setIsVideoLooping((prev) => !prev);
                      }
                    }}
                    className="absolute bottom-2 right-2 z-10 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/90 hover:bg-white text-black shadow-lg transition-all duration-200"
                    aria-label={
                      isVideoLooping ? "Отключить повтор" : "Включить повтор"
                    }
                  >
                    {isVideoLooping ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5"
                      >
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5 ml-0.5"
                      >
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    )}
                  </button>
                </>
              ) : movie.poster && !posterError ? (
                <img
                  src={movie.poster || "/placeholder.svg"}
                  alt={movie.name}
                  decoding="async"
                  loading="eager"
                  fetchPriority="high"
                  className={`w-full h-full object-cover transition-all ease-out poster-media ${
                    posterLoaded
                      ? "opacity-100 blur-0 scale-100"
                      : "opacity-0 blur-md scale-[1.02]"
                  }`}
                  style={{
                    transition:
                      "opacity 300ms ease-out, filter 600ms ease-out, transform 600ms ease-out",
                    willChange: "opacity, filter, transform",
                  }}
                  onLoad={() => setPosterLoaded(true)}
                  onError={() => setPosterError(true)}
                  onClick={copyIdentToClipboard}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                  Нет постера
                </div>
              )}
            </div>
            <div
              className="w-[75%] max-w-[280px] mx-auto md:w-full md:max-w-none border rounded-xl overflow-hidden"
              style={{ borderColor: "rgba(var(--ui-accent-rgb), 0.30)" }}
            >
              <Button
                id="watch-button"
                variant="secondary"
                size="lg"
                onClick={() => {
                  const newShowPlayerSelector = !showPlayerSelector;
                  setShowPlayerSelector(newShowPlayerSelector);
                  if (newShowPlayerSelector) {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="w-full h-12 text-white font-semibold tracking-wide rounded-xl transition-all duration-300 hover:brightness-110 active:brightness-95"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(0,0,0,.14), rgba(0,0,0,.14)), linear-gradient(90deg, rgba(var(--ui-accent-rgb), 0.92), rgba(var(--ui-accent-rgb), 0.78))",
                }}
                aria-label={
                  showPlayerSelector ? "Скрыть источники" : "Смотреть онлайн"
                }
              >
                <Play className="size-5 opacity-90" />
                <span>
                  {showPlayerSelector ? "Скрыть источники" : "Смотреть онлайн"}
                </span>
              </Button>
            </div>

            {isDesktop ? (
              <div id="watch" className="mt-3 relative">
                {hasTrailers ? (
                  <TrailerPlayer mode="carousel" trailers={rawTrailers} />
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Info */}
          <div className="space-y-6">
            {/* Player Selector - показывается только после клика на "Смотреть" */}
            {showPlayerSelector && (
              <PlayerSelector
                onPlayerSelect={(playerId: number) =>
                  setSelectedPlayer(playerId)
                }
                iframeUrl={franchise?.iframe_url}
                kpId={kpId}
                className="mb-4"
              />
            )}

            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-zinc-100 text-center md:text-left">
                <span>
                  {movie.name}
                  {titleYear ? ` (${titleYear})` : ""}
                </span>
                <Button
                  onClick={handleShare}
                  variant="ghost"
                  size="icon-sm"
                  className="hidden md:inline-flex align-middle ml-2 text-zinc-200 hover:text-white hover:bg-transparent focus-visible:ring-0"
                  aria-label="Поделиться"
                >
                  <Share2 className="size-4" />
                </Button>
              </h1>
              {movie.originalname && movie.originalname !== movie.name && (
                <p className="text-sm text-zinc-500 text-center md:text-left">{movie.originalname}</p>
              )}
              {(() => {
                const hasYear = !!(titleYear && titleYear.length > 0)
                const genreRaw = (movie as any).genre
                const hasGenre = Array.isArray(genreRaw)
                  ? genreRaw.length > 0
                  : !!genreRaw
                const countryRaw = (movie as any).country
                const countryStr = Array.isArray(countryRaw)
                  ? countryRaw.join(", ")
                  : countryRaw ? String(countryRaw) : ""
                const hasCountry = !!(countryStr && countryStr.trim() !== "")
                if (!hasYear && !hasGenre && !hasCountry) return null
                const parts: string[] = []
                if (hasCountry) parts.push(countryStr)
                if (hasYear) parts.push(titleYear as string)
                if (hasGenre)
                  parts.push(Array.isArray(genreRaw) ? genreRaw.join(", ") : String(genreRaw))
                return (
                  <div className="text-sm text-zinc-400 text-center md:hidden">
                    {parts.map((p, i) => (
                      <span key={i}>
                        {i > 0 && <span className="text-zinc-500/60 mx-1">•</span>}
                        <span>{p}</span>
                      </span>
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* Ratings */}
            <div className="grid md:grid-cols-2 gap-16 items-start text-sm">
              {/* Left: KP & IMDb */}
              <div className="flex items-center gap-4 justify-center md:justify-start">
                <div className="py-1 rounded flex items-center gap-2">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Kinopoisk_colored_square_icon.svg/2048px-Kinopoisk_colored_square_icon.svg.png"
                    alt="Кинопоиск"
                    className="w-6 h-6 rounded-sm"
                  />
                  {movie.rating_kp &&
                    movie.rating_kp !== "0.0" &&
                    parseFloat(String(movie.rating_kp)) > 8.5 && (
                      <img
                        src="data:image/svg+xml,%3csvg width='10' height='24' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M7.26 19.395s1.385-.617 1.768-1.806c.382-1.188-.384-2.498-.384-2.498s-1.386.618-1.768 1.806c-.382 1.189.384 2.498.384 2.498Z' fill='url(%23a)'/%3e%3cpath d='M6.583 19.679s-1.457.422-2.516-.24c-1.058-.662-1.317-2.157-1.317-2.157s1.457-.422 2.515.24c1.059.662 1.318 2.157 1.318 2.157Z' fill='url(%23b)'/%3e%3cpath d='M5.793 15.217s-.142-1.51.706-2.427c.847-.916 2.364-.892 2.364-.892s.143 1.51-.705 2.427-2.365.892-2.365.892Z' fill='url(%23c)'/%3e%3cpath d='M5.547 6.953s1.848-.823 2.357-2.407c.733-2.278-.28-4.048-.28-4.048s-2.344.66-3.085 2.965c-.742 2.305 1.008 3.49 1.008 3.49Z' fill='url(%23d)'/%3e%3cpath d='M4.806 10.864s-2.353-.03-3.626-1.488C-.094 7.918.194 5.583.194 5.583s2.353.029 3.626 1.487c1.274 1.459.986 3.794.986 3.794Z' fill='url(%23e)'/%3e%3cpath d='M5.484 10.822s-.189-2.014.942-3.235c1.13-1.221 3.153-1.188 3.153-1.188s.19 2.014-.942 3.236c-1.13 1.221-3.153 1.187-3.153 1.187Z' fill='url(%23f)'/%3e%3cpath d='M5.32 15.337s-1.989.366-3.305-.653C.698 13.665.554 11.648.554 11.648s1.99-.366 3.305.653c1.317 1.018 1.462 3.036 1.462 3.036Z' fill='url(%23g)'/%3e%3cpath fill-rule='evenodd' clip-rule='evenodd' d='M6.313 3.167c.205.034-.51 4.06-.544 4.264-.59 3.547-.394 9.795 3.33 15.285a.384.384 0 0 1-.08.518.373.373 0 0 1-.536-.083C4.61 17.453 4.416 10.978 5.025 7.308c.034-.205 1.083-4.175 1.288-4.141Z' fill='url(%23h)'/%3e%3cdefs%3e%3clinearGradient id='a' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='b' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='c' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='d' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='e' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='f' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='g' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='h' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3c/defs%3e%3c/svg%3e"
                        alt="Top"
                        className="w-[10px] h-[24px]"
                      />
                    )}
                  {movie.rating_kp && movie.rating_kp !== "0.0" ? (
                    parseFloat(String(movie.rating_kp)) > 8.5 ? (
                      <span
                        className="font-medium bg-clip-text text-transparent"
                        style={{
                          backgroundImage:
                            "linear-gradient(165deg, #ffd25e 16.44%, #b59646 63.42%)",
                          WebkitBackgroundClip: "text",
                          backgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        {formatRatingLabel(movie.rating_kp)}
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-[3px] rounded-sm text-white font-medium ${ratingBgColor(
                          movie.rating_kp
                        )}`}
                      >
                        {formatRatingLabel(movie.rating_kp)}
                      </span>
                    )
                  ) : (
                    <span className="text-zinc-500 font-medium">—</span>
                  )}
                  {movie.rating_kp &&
                    movie.rating_kp !== "0.0" &&
                    parseFloat(String(movie.rating_kp)) > 8.5 && (
                      <img
                        src="data:image/svg+xml,%3csvg width='10' height='24' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M2.74 19.395s-1.385-.617-1.768-1.806c-.382-1.188.384-2.498.384-2.498s1.386.618 1.768 1.806c.382 1.189-.384 2.498-.384 2.498Z' fill='url(%23a)'/%3e%3cpath d='M3.417 19.679s1.457.422 2.516-.24c1.058-.662 1.317-2.157 1.317-2.157s-1.457-.422-2.515.24c-1.059.662-1.318 2.157-1.318 2.157Z' fill='url(%23b)'/%3e%3cpath d='M4.207 15.217s.142-1.51-.706-2.427c-.847-.916-2.364-.892-2.364-.892s-.143 1.51.705 2.427 2.365.892 2.365.892Z' fill='url(%23c)'/%3e%3cpath d='M4.453 6.953S2.605 6.13 2.096 4.546c-.733-2.278.28-4.048.28-4.048s2.344.66 3.085 2.965c.742 2.305-1.008 3.49-1.008 3.49Z' fill='url(%23d)'/%3e%3cpath d='M5.194 10.864s2.353-.03 3.626-1.488c1.274-1.458.986-3.793.986-3.793S7.453 5.612 6.18 7.07c-1.274 1.459-.986 3.794-.986 3.794Z' fill='url(%23e)'/%3e%3cpath d='M4.516 10.822s.189-2.014-.942-3.235C2.444 6.366.421 6.399.421 6.399s-.19 2.014.942 3.236c1.13 1.221 3.153 1.187 3.153 1.187Z' fill='url(%23f)'/%3e%3cpath d='M4.68 15.337s1.989.366 3.305-.653c1.317-1.019 1.461-3.036 1.461-3.036s-1.99-.366-3.305.653c-1.317 1.018-1.462 3.036-1.462 3.036Z' fill='url(%23g)'/%3e%3cpath fill-rule='evenodd' clip-rule='evenodd' d='M3.687 3.167c-.205.034.51 4.06.544 4.264.59 3.547.394 9.795-3.33 15.285a.384.384 0 0 0 .08.518c.17.132.415.095.536-.083C5.39 17.453 5.584 10.978 4.975 7.308c-.034-.205-1.083-4.175-1.288-4.141Z' fill='url(%23h)'/%3e%3cdefs%3e%3clinearGradient id='a' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='b' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='c' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='d' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='e' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='f' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='g' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='h' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3c/defs%3e%3c/svg%3e"
                        alt="Top"
                        className="w-[10px] h-[24px]"
                      />
                    )}
                </div>
                <div className="py-1 rounded flex items-center gap-2">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/IMDB_Logo_2016.svg/1280px-IMDB_Logo_2016.svg.png"
                    alt="IMDb"
                    className="w-6 h-6 object-contain"
                  />
                  {movie.rating_imdb &&
                    movie.rating_imdb !== "0.0" &&
                    parseFloat(String(movie.rating_imdb)) > 8.5 && (
                      <img
                        src="data:image/svg+xml,%3csvg width='10' height='24' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M7.26 19.395s1.385-.617 1.768-1.806c.382-1.188-.384-2.498-.384-2.498s-1.386.618-1.768 1.806c-.382 1.189.384 2.498.384 2.498Z' fill='url(%23a)'/%3e%3cpath d='M6.583 19.679s-1.457.422-2.516-.24c-1.058-.662-1.317-2.157-1.317-2.157s1.457-.422 2.515.24c1.059.662 1.318 2.157 1.318 2.157Z' fill='url(%23b)'/%3e%3cpath d='M5.793 15.217s-.142-1.51.706-2.427c.847-.916 2.364-.892 2.364-.892s.143 1.51-.705 2.427-2.365.892-2.365.892Z' fill='url(%23c)'/%3e%3cpath d='M5.547 6.953s1.848-.823 2.357-2.407c.733-2.278-.28-4.048-.28-4.048s-2.344.66-3.085 2.965c-.742 2.305 1.008 3.49 1.008 3.49Z' fill='url(%23d)'/%3e%3cpath d='M4.806 10.864s-2.353-.03-3.626-1.488C-.094 7.918.194 5.583.194 5.583s2.353.029 3.626 1.487c1.274 1.459.986 3.794.986 3.794Z' fill='url(%23e)'/%3e%3cpath d='M5.484 10.822s-.189-2.014.942-3.235c1.13-1.221 3.153-1.188 3.153-1.188s.19 2.014-.942 3.236c-1.13 1.221-3.153 1.187-3.153 1.187Z' fill='url(%23f)'/%3e%3cpath d='M5.32 15.337s-1.989.366-3.305-.653C.698 13.665.554 11.648.554 11.648s1.99-.366 3.305.653c1.317 1.018 1.462 3.036 1.462 3.036Z' fill='url(%23g)'/%3e%3cpath fill-rule='evenodd' clip-rule='evenodd' d='M6.313 3.167c.205.034-.51 4.06-.544 4.264-.59 3.547-.394 9.795 3.33 15.285a.384.384 0 0 1-.08.518.373.373 0 0 1-.536-.083C4.61 17.453 4.416 10.978 5.025 7.308c.034-.205 1.083-4.175 1.288-4.141Z' fill='url(%23h)'/%3e%3cdefs%3e%3clinearGradient id='a' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='b' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='c' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='d' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='e' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='f' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='g' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='h' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3c/defs%3e%3c/svg%3e"
                        alt="Top"
                        className="w-[10px] h-[24px]"
                      />
                    )}
                  {movie.rating_imdb && movie.rating_imdb !== "0.0" ? (
                    parseFloat(String(movie.rating_imdb)) > 8.5 ? (
                      <span
                        className="font-medium bg-clip-text text-transparent"
                        style={{
                          backgroundImage:
                            "linear-gradient(165deg, #ffd25e 16.44%, #b59646 63.42%)",
                          WebkitBackgroundClip: "text",
                          backgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        {formatRatingLabel(movie.rating_imdb)}
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-[3px] rounded-sm text-white font-medium ${ratingBgColor(
                          movie.rating_imdb
                        )}`}
                      >
                        {formatRatingLabel(movie.rating_imdb)}
                      </span>
                    )
                  ) : (
                    <span className="text-zinc-500 font-medium">—</span>
                  )}
                  {movie.rating_imdb &&
                    movie.rating_imdb !== "0.0" &&
                    parseFloat(String(movie.rating_imdb)) > 8.5 && (
                      <img
                        src="data:image/svg+xml,%3csvg width='10' height='24' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M2.74 19.395s-1.385-.617-1.768-1.806c-.382-1.188.384-2.498.384-2.498s1.386.618 1.768 1.806c.382 1.189-.384 2.498-.384 2.498Z' fill='url(%23a)'/%3e%3cpath d='M3.417 19.679s1.457.422 2.516-.24c1.058-.662 1.317-2.157 1.317-2.157s-1.457-.422-2.515.24c-1.059.662-1.318 2.157-1.318 2.157Z' fill='url(%23b)'/%3e%3cpath d='M4.207 15.217s.142-1.51-.706-2.427c-.847-.916-2.364-.892-2.364-.892s-.143 1.51.705 2.427 2.365.892 2.365.892Z' fill='url(%23c)'/%3e%3cpath d='M4.453 6.953S2.605 6.13 2.096 4.546c-.733-2.278.28-4.048.28-4.048s2.344.66 3.085 2.965c.742 2.305-1.008 3.49-1.008 3.49Z' fill='url(%23d)'/%3e%3cpath d='M5.194 10.864s2.353-.03 3.626-1.488c1.274-1.458.986-3.793.986-3.793S7.453 5.612 6.18 7.07c-1.274 1.459-.986 3.794-.986 3.794Z' fill='url(%23e)'/%3e%3cpath d='M4.516 10.822s.189-2.014-.942-3.235C2.444 6.366.421 6.399.421 6.399s-.19 2.014.942 3.236c1.13 1.221 3.153 1.187 3.153 1.187Z' fill='url(%23f)'/%3e%3cpath d='M4.68 15.337s1.989.366 3.305-.653c1.317-1.019 1.461-3.036 1.461-3.036s-1.99-.366-3.305.653c-1.317 1.018-1.462 3.036-1.462 3.036Z' fill='url(%23g)'/%3e%3cpath fill-rule='evenodd' clip-rule='evenodd' d='M3.687 3.167c-.205.034.51 4.06.544 4.264.59 3.547.394 9.795-3.33 15.285a.384.384 0 0 0 .08.518c.17.132.415.095.536-.083C5.39 17.453 5.584 10.978 4.975 7.308c-.034-.205-1.083-4.175-1.288-4.141Z' fill='url(%23h)'/%3e%3cdefs%3e%3clinearGradient id='a' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='b' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='c' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='d' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='e' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='f' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='g' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='h' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3c/defs%3e%3c/svg%3e"
                        alt="Top"
                        className="w-[10px] h-[24px]"
                      />
                    )}
                </div>
              </div>
              {/* Right: HDBOX summary aligned to start of Cast column */}
              {ratingHdbox != null && (
                <div className="hidden md:flex flex-col items-center text-center md:items-start md:text-left md:pl-8">
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    {ratingHdbox > 8.5 ? (
                      <img
                        src="data:image/svg+xml,%3csvg width='10' height='24' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M7.26 19.395s1.385-.617 1.768-1.806c.382-1.188-.384-2.498-.384-2.498s-1.386.618-1.768 1.806c-.382 1.189.384 2.498.384 2.498Z' fill='url(%23a)'/%3e%3cpath d='M6.583 19.679s-1.457.422-2.516-.24c-1.058-.662-1.317-2.157-1.317-2.157s1.457-.422 2.515.24c1.059.662 1.318 2.157 1.318 2.157Z' fill='url(%23b)'/%3e%3cpath d='M5.793 15.217s-.142-1.51.706-2.427c.847-.916 2.364-.892 2.364-.892s.143 1.51-.705 2.427-2.365.892-2.365.892Z' fill='url(%23c)'/%3e%3cpath d='M5.547 6.953s1.848-.823 2.357-2.407c.733-2.278-.28-4.048-.28-4.048s-2.344.66-3.085 2.965c-.742 2.305 1.008 3.49 1.008 3.49Z' fill='url(%23d)'/%3e%3cpath d='M4.806 10.864s-2.353-.03-3.626-1.488C-.094 7.918.194 5.583.194 5.583s2.353.029 3.626 1.487c1.274 1.459.986 3.794.986 3.794Z' fill='url(%23e)'/%3e%3cpath d='M5.484 10.822s-.189-2.014.942-3.235c1.13-1.221 3.153-1.188 3.153-1.188s.19 2.014-.942 3.236c-1.13 1.221-3.153 1.187-3.153 1.187Z' fill='url(%23f)'/%3e%3cpath d='M5.32 15.337s-1.989.366-3.305-.653C.698 13.665.554 11.648.554 11.648s1.99-.366 3.305.653c1.317 1.018 1.462 3.036 1.462 3.036Z' fill='url(%23g)'/%3e%3cpath fill-rule='evenodd' clip-rule='evenodd' d='M6.313 3.167c.205.034-.51 4.06-.544 4.264-.59 3.547-.394 9.795 3.33 15.285a.384.384 0 0 1-.08.518.373.373 0 0 1-.536-.083C4.61 17.453 4.416 10.978 5.025 7.308c.034-.205 1.083-4.175 1.288-4.141Z' fill='url(%23h)'/%3e%3cdefs%3e%3clinearGradient id='a' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='b' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='c' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='d' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='e' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='f' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='g' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='h' x1='3.7' y1='3.033' x2='9.68' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3c/defs%3e%3c/svg%3e"
                        alt="Top"
                        className="w-[10px] h-[24px]"
                      />
                    ) : ratingHdbox >= 7 ? (
                      <IconThumbUp
                        className={`${ratingColor(ratingHdbox)} w-5 h-5`}
                      />
                    ) : ratingHdbox >= 6 ? (
                      <IconNeutral
                        className={`${ratingColor(ratingHdbox)} w-5 h-5`}
                      />
                    ) : (
                      <IconThumbDown
                        className={`${ratingColor(ratingHdbox)} w-5 h-5`}
                      />
                    )}
                    <span
                      className={
                        ratingHdbox > 8.5
                          ? "text-lg md:text-xl font-semibold bg-clip-text text-transparent"
                          : `${ratingColor(
                              ratingHdbox
                            )} text-lg md:text-xl font-semibold`
                      }
                      style={
                        ratingHdbox > 8.5
                          ? {
                              backgroundImage:
                                "linear-gradient(165deg, #ffd25e 16.44%, #b59646 63.42%)",
                              WebkitBackgroundClip: "text",
                              backgroundClip: "text",
                              WebkitTextFillColor: "transparent",
                            }
                          : undefined
                      }
                    >
                      {ratingHdbox.toFixed(1)}
                    </span>
                    {ratingHdbox > 8.5 && (
                      <img
                        src="data:image/svg+xml,%3csvg width='10' height='24' fill='none' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M2.74 19.395s-1.385-.617-1.768-1.806c-.382-1.188.384-2.498.384-2.498s1.386.618 1.768 1.806c.382 1.189-.384 2.498-.384 2.498Z' fill='url(%23a)'/%3e%3cpath d='M3.417 19.679s1.457.422 2.516-.24c1.058-.662 1.317-2.157 1.317-2.157s-1.457-.422-2.515.24c-1.059.662-1.318 2.157-1.318 2.157Z' fill='url(%23b)'/%3e%3cpath d='M4.207 15.217s.142-1.51-.706-2.427c-.847-.916-2.364-.892-2.364-.892s-.143 1.51.705 2.427 2.365.892 2.365.892Z' fill='url(%23c)'/%3e%3cpath d='M4.453 6.953S2.605 6.13 2.096 4.546c-.733-2.278.28-4.048.28-4.048s2.344.66 3.085 2.965c.742 2.305-1.008 3.49-1.008 3.49Z' fill='url(%23d)'/%3e%3cpath d='M5.194 10.864s2.353-.03 3.626-1.488c1.274-1.458.986-3.793.986-3.793S7.453 5.612 6.18 7.07c-1.274 1.459-.986 3.794-.986 3.794Z' fill='url(%23e)'/%3e%3cpath d='M4.516 10.822s.189-2.014-.942-3.235C2.444 6.366.421 6.399.421 6.399s-.19 2.014.942 3.236c1.13 1.221 3.153 1.187 3.153 1.187Z' fill='url(%23f)'/%3e%3cpath d='M4.68 15.337s1.989.366 3.305-.653c1.317-1.019 1.461-3.036 1.461-3.036s-1.99-.366-3.305.653c-1.317 1.018-1.462 3.036-1.462 3.036Z' fill='url(%23g)'/%3e%3cpath fill-rule='evenodd' clip-rule='evenodd' d='M3.687 3.167c-.205.034.51 4.06.544 4.264.59 3.547.394 9.795-3.33 15.285a.384.384 0 0 0 .08.518c.17.132.415.095.536-.083C5.39 17.453 5.584 10.978 4.975 7.308c-.034-.205-1.083-4.175-1.288-4.141Z' fill='url(%23h)'/%3e%3cdefs%3e%3clinearGradient id='a' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='b' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='c' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='d' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='e' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='f' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='g' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3clinearGradient id='h' x1='6.3' y1='3.033' x2='.32' y2='12.801' gradientUnits='userSpaceOnUse'%3e%3cstop stop-color='%23FFD25E'/%3e%3cstop offset='1' stop-color='%23B59646'/%3e%3c/linearGradient%3e%3c/defs%3e%3c/svg%3e"
                        alt="Top"
                        className="w-[10px] h-[24px]"
                      />
                    )}
                  </div>
                  <span className="hidden md:inline text-xs text-zinc-400 mt-0.5">
                    {ratingHdbox > 8.5
                      ? "Шедевр"
                      : ratingHdbox >= 7
                      ? "Рекомендую"
                      : ratingHdbox >= 6
                      ? "Нормально"
                      : "Не рекомендую"}
                  </span>
                </div>
              )}
            </div>

            {/* Desktop header with toggle placed right next to title */}
            <div className="hidden md:flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold text-zinc-200">
                {detailsTitle}
              </h2>
              <button
                type="button"
                onClick={() => setDetailsOpen((prev) => !prev)}
                aria-label={detailsOpen ? "Скрыть раздел" : "Показать раздел"}
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-zinc-900 border border-white/60 shadow-sm hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50"
                style={{
                  backgroundImage:
                    "linear-gradient(165deg, rgba(255,255,255,0.98) 18%, rgba(245,245,245,0.90) 60%, rgba(255,255,255,0.98) 100%)",
                }}
              >
                <span className="text-[12px] leading-none">
                  {detailsOpen ? "−" : "+"}
                </span>
              </button>
            </div>

            {/* Meta + Cast side-by-side */}
            <div
              className={`grid md:grid-cols-2 gap-16 ${
                detailsOpen ? "" : "md:hidden"
              }`}
            >
              {/* Meta Info */}
              <div className="hidden md:block space-y-2 text-sm">
                <h2 className="text-lg font-semibold text-zinc-200 mb-3 md:hidden">
                  {detailsTitle}
                </h2>
                <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">Год:</span>
                  <span className="text-white">{movie.released || "—"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">Релиз:</span>
                  <span className="text-white">{formatReleaseDate()}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">Страна:</span>
                  <span className="text-white">
                    {Array.isArray(movie.country)
                      ? movie.country.join(", ")
                      : movie.country || "—"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">Жанр:</span>
                  <span className="text-white">
                    {Array.isArray(movie.genre)
                      ? movie.genre.join(", ")
                      : movie.genre || "—"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">Режиссер:</span>
                  <span className="text-white">
                    {Array.isArray(movie.director)
                      ? movie.director.join(", ")
                      : movie.director || "—"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">Продюсер:</span>
                  <span className="text-white">
                    {(() => {
                      const val = franchise?.producer || movie.producer;
                      if (!val) return "—";
                      if (Array.isArray(val)) return val.join(", ");
                      const str = String(val);
                      // Разделяем имена: вставляем запятую между строчной и заглавной буквой
                      const formatted = str.replace(
                        /([a-zа-яё])([A-ZА-ЯЁ])/g,
                        "$1, $2"
                      );
                      return formatted;
                    })()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">Сценарист:</span>
                  <span className="text-white">
                    {(() => {
                      const val = franchise?.screenwriter || movie.screenwriter;
                      if (!val) return "—";
                      if (Array.isArray(val)) return val.join(", ");
                      const str = String(val);
                      // Разделяем имена: вставляем запятую между строчной и заглавной буквой
                      const formatted = str.replace(
                        /([a-zа-яё])([A-ZА-ЯЁ])/g,
                        "$1, $2"
                      );
                      return formatted;
                    })()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">Художник:</span>
                  <span className="text-white">
                    {(() => {
                      const val = franchise?.design || movie.design;
                      if (
                        !val ||
                        String(val).trim() === "" ||
                        val === "null" ||
                        val === "undefined"
                      )
                        return "—";
                      if (Array.isArray(val)) {
                        const filtered = val.filter(
                          (v) => v && String(v).trim() !== ""
                        );
                        if (filtered.length === 0) return "—";
                        return filtered.join(", ");
                      }
                      const str = String(val).trim();
                      if (str === "" || str === "null" || str === "undefined")
                        return "—";
                      // Разделяем имена: вставляем запятую между строчной и заглавной буквой
                      const formatted = str.replace(
                        /([a-zа-яё])([A-ZА-ЯЁ])/g,
                        "$1, $2"
                      );
                      return formatted;
                    })()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">Оператор:</span>
                  <span className="text-white">
                    {(() => {
                      const val = franchise?.operator || movie.operator;
                      if (
                        !val ||
                        String(val).trim() === "" ||
                        val === "null" ||
                        val === "undefined"
                      )
                        return "—";
                      if (Array.isArray(val)) {
                        const filtered = val.filter(
                          (v) => v && String(v).trim() !== ""
                        );
                        if (filtered.length === 0) return "—";
                        return filtered.join(", ");
                      }
                      const str = String(val).trim();
                      if (str === "" || str === "null" || str === "undefined")
                        return "—";
                      // Разделяем имена: вставляем запятую между строчной и заглавной буквой
                      const formatted = str.replace(
                        /([a-zа-яё])([A-ZА-ЯЁ])/g,
                        "$1, $2"
                      );
                      return formatted;
                    })()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">Возраст:</span>
                  <span className="text-white">{movie.age || "—"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">
                    Рейтинг MPAA:
                  </span>
                  <span className="text-white">
                    {(() => {
                      const v = franchise?.rate_mpaa;
                      return v && String(v).trim() !== "" ? v : "—";
                    })()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">Бюджет:</span>
                  <span className="text-white">
                    {franchise?.budget || movie.budget || "—"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">
                    Сборы США:
                  </span>
                  <span className="text-white">
                    {(() => {
                      const v = franchise?.fees_use;
                      return v && String(v).trim() !== "" ? v : "—";
                    })()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-zinc-400 min-w-[120px]">
                    Сборы мир:
                  </span>
                  <span className="text-zinc-200">
                    {(() => {
                      const v = franchise?.fees_world;
                      return v && String(v).trim() !== "" ? v : "—";
                    })()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">Сборы РФ:</span>
                  <span className="text-white">
                    {(() => {
                      const v = franchise?.fees_rus;
                      return v && String(v).trim() !== "" ? v : "—";
                    })()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">Премьера:</span>
                  <span className="text-white">
                    {formatDate(franchise?.premier || movie.premier)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">
                    Премьера РФ:
                  </span>
                  <span className="text-white">
                    {formatDate(franchise?.premier_rus || movie.premier_rus)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">Статус:</span>
                  <span className="text-white">
                    {franchise?.serial_status || movie.serial_status || "—"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">Слоган:</span>
                  <span className="text-white">
                    {franchise?.slogan || movie.slogan || "—"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">Качество:</span>
                  <span className="text-white">
                    {(() => {
                      const quality = franchise?.quality || movie.quality;
                      const tags = Array.isArray(movie.tags)
                        ? movie.tags.join(", ")
                        : movie.tags ?? "";
                      const combined = [quality, tags]
                        .filter((v) => v && String(v).trim().length > 0)
                        .join(" • ");
                      return combined || "—";
                    })()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">Озвучка:</span>
                  <span className="text-white">
                    {(() => {
                      const val = franchise?.voiceActing || movie.voiceActing;
                      if (!val) return "—";
                      if (Array.isArray(val)) return val.join(", ");
                      const str = String(val);
                      // Разделяем имена: вставляем запятую между строчной и заглавной буквой
                      const formatted = str.replace(
                        /([a-zа-яё])([A-ZА-ЯЁ])/g,
                        "$1, $2"
                      );
                      return formatted;
                    })()}
                  </span>
                </div>

                {/* Количество сезонов для сериалов */}
                {franchise?.seasons && Array.isArray(franchise?.seasons) && (
                  <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">
                    Сезонов:
                  </span>
                  <span className="text-white">
                    {franchise?.seasons.length}
                  </span>
                </div>
                )}
                <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">Время:</span>
                  <span className="text-white">{formatDuration()}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-white min-w-[120px]">Тип:</span>
                  <span className="text-white">
                    {movie.type || data.type || "—"}
                  </span>
                </div>
                
              </div>

              {/* Cast column list with "Показать ещё" */}
              {Array.isArray(data.casts) &&
                data.casts.some((actor: any) => {
                  const title = String(actor?.title ?? "").trim();
                  const name = String(actor?.name ?? "").trim();
                  return !!(title || name);
                }) && (
                  <div className="space-y-2 md:pl-8 hidden md:block">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-zinc-200 mb-3">
                        В ролях
                      </h2>
                    </div>
                    <CastList casts={data.casts} maxInitial={11} />
                    {(() => {
                      const raw = franchise?.actors_dubl ?? movie.actors_dubl;

                      const toList = (val: any): string[] => {
                        if (!val) return [];
                        if (Array.isArray(val)) {
                          return val
                            .map((v) => String(v).trim())
                            .filter(Boolean);
                        }
                        const str = String(val).trim();
                        if (!str || str === "null" || str === "undefined")
                          return [];
                        const normalized = str.replace(
                          /([a-zа-яё])([A-ZА-ЯЁ])/g,
                          "$1, $2"
                        );
                        return normalized
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean);
                      };

                      const names = toList(raw);
                      if (names.length === 0) return null;

                      return (
                        <div className="mt-6 space-y-2">
                          <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
                              Актёры дубляжа
                            </h2>
                          </div>
                          <CastList
                            casts={names.map((name) => ({ name }))}
                            maxInitial={11}
                          />
                        </div>
                      );
                    })()}
                  </div>
                )}
            </div>

            {movie.about && (
              <div className="mt-6 space-y-2 md:hidden">
                <h2 className="text-lg font-semibold text-zinc-200">Описание</h2>
                <p className="text-sm text-white leading-relaxed">{movie.about}</p>
              </div>
            )}

            {/* Description (moved above actors avatars) */}
            {movie.about && (
              <div className="space-y-2 hidden md:block">
                <h2 className="text-lg font-semibold text-zinc-200">
                  Описание
                </h2>
                <p className="text-sm text-white leading-relaxed">
                  {movie.about}
                </p>
              </div>
            )}

            {Array.isArray(data.casts) &&
              data.casts.some((actor: any) => {
                const title = String(actor?.title ?? "").trim();
                const name = String(actor?.name ?? "").trim();
                return !!(title || name);
              }) && (
                <div className="space-y-3 hidden md:block">
                  <h2 className="text-lg font-semibold text-zinc-200 mb-3">
                    Актеры
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 lg:gap-0 lg:-space-x-3 py-1">
                    {data.casts
                      .filter((actor: any) => {
                        const title = String(actor?.title ?? "").trim();
                        const name = String(actor?.name ?? "").trim();
                        return !!(title || name);
                      })
                      .map((actor: any, index: number) => {
                        const id = actor?.id ?? index;
                        const title =
                          String(actor?.title ?? "").trim() ||
                          String(actor?.name ?? "").trim();
                        const posterCandidate =
                          actor?.poster ??
                          actor?.photo ??
                          actor?.image ??
                          actor?.avatar ??
                          actor?.picture ??
                          actor?.pic;
                        const src = String(posterCandidate ?? "").trim();
                        const invalids = [
                          "null",
                          "undefined",
                          "—",
                          "none",
                          "n/a",
                          "no-image",
                        ];
                        const isImageLike =
                          src.startsWith("data:image") ||
                          /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(src) ||
                          src.startsWith("/") ||
                          src.startsWith("http");
                        const hasPoster =
                          !!src &&
                          !invalids.includes(src.toLowerCase()) &&
                          isImageLike;
                        const actorIdStr = String(actor?.id ?? "").trim();
                        const canLink = !!actorIdStr;
                        if (hasPoster) {
                          const imgEl = (
                            <img
                              src={src}
                              alt={title}
                              className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover hover:z-10 flex-shrink-0 cursor-pointer"
                              onError={(e) => {
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  e.currentTarget.style.display = "none";
                                  const fallback = document.createElement("div");
                                  fallback.setAttribute("aria-label", "нет фото");
                                  fallback.className =
                                    "w-16 h-16 md:w-20 md:h-20 rounded-full bg-zinc-700/50 text-zinc-300 flex items-center justify-center text-xs select-none";
                                  fallback.textContent = "нет фото";
                                  parent.appendChild(fallback);
                                }
                              }}
                            />
                          );
                          return canLink ? (
                            <Link href={`/actor/${actorIdStr}`} key={id}>
                              {imgEl}
                            </Link>
                          ) : (
                            imgEl
                          );
                        }
                        return canLink ? (
                          <Link href={`/actor/${actorIdStr}`} key={id}>
                            <div
                              className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-zinc-700/50 text-zinc-300 flex items-center justify-center text-xs select-none"
                              aria-label="нет фото"
                            >
                              нет фото
                            </div>
                          </Link>
                        ) : (
                          <div
                            key={id}
                            className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-zinc-700/50 text-zinc-300 flex items-center justify-center text-xs select-none"
                            aria-label="нет фото"
                          >
                            нет фото
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

            {/* Трейлеры для мобильной версии — сразу после блока «Актеры» */}
            {!isDesktop ? (
              <div className="mt-3 relative space-y-2">
                {hasTrailers ? (
                  <>
                    <h2 className="text-lg font-semibold text-zinc-200">Трейлеры</h2>
                    <TrailerPlayer trailers={rawTrailers} />
                  </>
                ) : null}
              </div>
            ) : null}

            {/* Сезоны и эпизоды */}
            {franchise?.seasons &&
              Array.isArray(franchise?.seasons) &&
              franchise?.seasons.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-zinc-200">
                    Сезоны
                  </h2>
                  <div className="space-y-4">
                    {franchise?.seasons.map((season: any) => {
                      const isOpen = openSeasons.has(season.season);
                      return (
                        <div
                          key={season.season}
                          className="bg-zinc-800/50 rounded-lg overflow-hidden"
                        >
                          {/* Кликабельный заголовок сезона */}
                          <div
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-700/30 transition-colors"
                            onClick={() => toggleSeason(season.season)}
                          >
                            <div className="flex items-center gap-3">
                              <h3 className="text-md font-medium text-zinc-300">
                                Сезон {season.season}
                              </h3>
                              <div className="text-sm text-zinc-400">
                                {season.episodes?.length || 0} эпизодов
                              </div>
                            </div>

                            {/* Иконка раскрытия/сворачивания */}
                            <div
                              className={`transform transition-transform duration-200 ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            >
                              <svg
                                className="w-5 h-5 text-zinc-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </div>
                          </div>

                          {/* Содержимое сезона (сворачиваемое) */}
                          {isOpen && (
                            <div className="px-4 pb-4 space-y-3">
                              {/* Проверяем, воспроизводится ли эпизод из этого сезона */}
                              {playingEpisode &&
                              playingEpisode.seasonNumber === season.season ? (
                                /* Показываем iframe вместо списка эпизодов */
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium text-zinc-300">
                                      {playingEpisode.title}
                                    </h4>
                                    <button
                                      onClick={() =>
                                        closeEpisode(season.season)
                                      }
                                      className="px-3.5 py-1.5 text-white text-sm rounded-full transition-all duration-200 hover:opacity-90"
                                      style={{
                                        backgroundColor: `rgb(var(--ui-accent-rgb))`,
                                        boxShadow: `0 2px 8px rgba(var(--ui-accent-rgb), 0.3)`,
                                      }}
                                    >
                                      Закрыть
                                    </button>
                                  </div>
                                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                    <iframe
                                      src={playingEpisode.url}
                                      className="w-full h-full"
                                      frameBorder="0"
                                      allowFullScreen
                                      title={playingEpisode.title}
                                    />
                                  </div>
                                </div>
                              ) : (
                                /* Показываем обычное содержимое сезона */
                                <>
                                  {/* Информация о сезоне */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                                    {season.release_world && (
                                      <div className="flex gap-2">
                                        <span className="text-zinc-400">
                                          Мировая премьера:
                                        </span>
                                        <span className="text-zinc-200">
                                          {formatDate(season.release_world)}
                                        </span>
                                      </div>
                                    )}
                                    {season.release_ru && (
                                      <div className="flex gap-2">
                                        <span className="text-zinc-400">
                                          Премьера РФ:
                                        </span>
                                        <span className="text-zinc-200">
                                          {formatDate(season.release_ru)}
                                        </span>
                                      </div>
                                    )}
                                    {season.availability && (
                                      <div className="flex gap-2">
                                        <span className="text-zinc-400">
                                          Доступен с:
                                        </span>
                                        <span className="text-zinc-200">
                                          {formatDate(season.availability)}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Кнопка просмотра сезона */}
                                  {season.iframe_url && (
                                    <div>
                                      <button
                                        onClick={() =>
                                          playEpisode(
                                            season.season,
                                            season.iframe_url,
                                            `Сезон ${season.season}`
                                          )
                                        }
                                        className="inline-flex items-center px-5 py-2.5 text-white text-sm font-medium rounded-full transition-all duration-200 hover:opacity-95"
                                        style={{
                                          backgroundImage: `linear-gradient(90deg, rgba(var(--ui-accent-rgb), 0.92), rgba(var(--ui-accent-rgb), 0.78))`,
                                          boxShadow: `0 4px 12px rgba(var(--ui-accent-rgb), 0.18)`,
                                        }}
                                      >
                                        <svg
                                          className="w-4 h-4 mr-2"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path d="M8 5v10l8-5-8-5z" />
                                        </svg>
                                        Смотреть сезон
                                      </button>
                                    </div>
                                  )}

                                  {/* Список эпизодов */}
                                  {season.episodes &&
                                    Array.isArray(season.episodes) &&
                                    season.episodes.length > 0 && (
                                      <div className="space-y-2">
                                        <h4 className="text-sm font-medium text-zinc-300 mb-2">
                                          Эпизоды:
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                          {season.episodes.map(
                                            (episode: any) => (
                                              <div
                                                key={episode.episode}
                                                className={`bg-zinc-700/50 rounded p-3 transition-all duration-200 border border-transparent ${
                                                  episode.iframe_url
                                                    ? "cursor-pointer"
                                                    : ""
                                                }`}
                                                style={
                                                  episode.iframe_url
                                                    ? ({
                                                        "--hover-border-color": `rgb(var(--ui-accent-rgb))`,
                                                      } as React.CSSProperties)
                                                    : {}
                                                }
                                                onMouseEnter={(e) => {
                                                  if (episode.iframe_url) {
                                                    e.currentTarget.style.borderColor = `rgb(var(--ui-accent-rgb))`;
                                                    e.currentTarget.style.backgroundColor = `rgba(var(--ui-accent-rgb), 0.15)`;
                                                  }
                                                }}
                                                onMouseLeave={(e) => {
                                                  if (episode.iframe_url) {
                                                    e.currentTarget.style.borderColor =
                                                      "transparent";
                                                    e.currentTarget.style.backgroundColor =
                                                      "";
                                                  }
                                                }}
                                                onClick={() => {
                                                  if (episode.iframe_url) {
                                                    const episodeTitle = `Сезон ${
                                                      season.season
                                                    }, Эпизод ${
                                                      episode.episode
                                                    }${
                                                      episode.name
                                                        ? `: ${episode.name}`
                                                        : ""
                                                    }`;
                                                    playEpisode(
                                                      season.season,
                                                      episode.iframe_url,
                                                      episodeTitle
                                                    );
                                                  }
                                                }}
                                              >
                                                <div className="flex items-center justify-between mb-2">
                                                  <span className="text-sm font-medium text-zinc-200">
                                                    Эпизод {episode.episode}
                                                  </span>
                                                  {episode.iframe_url && (
                                                    <div
                                                      className="transition-colors"
                                                      style={{
                                                        color: `rgb(var(--ui-accent-rgb))`,
                                                      }}
                                                    >
                                                      <svg
                                                        className="w-4 h-4"
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                      >
                                                        <path d="M8 5v10l8-5-8-5z" />
                                                      </svg>
                                                    </div>
                                                  )}
                                                </div>

                                                {episode.name && (
                                                  <div className="text-xs text-zinc-300 mb-1">
                                                    {episode.name}
                                                  </div>
                                                )}

                                                <div className="text-xs text-zinc-400 space-y-1">
                                                  {episode.release_world && (
                                                    <div>
                                                      Мир:{" "}
                                                      {formatDate(
                                                        episode.release_world
                                                      )}
                                                    </div>
                                                  )}
                                                  {episode.release_ru && (
                                                    <div>
                                                      РФ:{" "}
                                                      {formatDate(
                                                        episode.release_ru
                                                      )}
                                                    </div>
                                                  )}
                                                  {episode.voiceActing &&
                                                    Array.isArray(
                                                      episode.voiceActing
                                                    ) &&
                                                    episode.voiceActing.length >
                                                      0 && (
                                                      <div>
                                                        Озвучка:{" "}
                                                        {episode.voiceActing.join(
                                                          ", "
                                                        )}
                                                      </div>
                                                    )}
                                                </div>
                                              </div>
                                            )
                                          )}
                                        </div>
                                      </div>
                                    )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Факты */}
            {(() => {
              const trivia = franchise?.trivia;
              if (!trivia) return null;
              const triviaStr =
                typeof trivia === "string"
                  ? trivia.trim()
                  : String(trivia).trim();
              if (triviaStr === "") return null;
              return <TriviaSection trivia={triviaStr} />;
            })()}

            {/* Sequels & Prequels */}
            {Array.isArray(seqList) && seqList.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-zinc-200">
                  Сиквелы и приквелы
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 gap-2">
                  {seqList.slice(0, 12).map((item: any, index: number) => {
                    const id =
                      item?.id ?? item?.details?.id ?? item?.movieId ?? index;
                    const poster =
                      item?.poster ??
                      item?.details?.poster ??
                      item?.cover ??
                      item?.image;
                    const title =
                      item?.title ??
                      item?.name ??
                      item?.details?.name ??
                      "Без названия";
                    const year =
                      item?.year ?? item?.released ?? item?.details?.released;
                    const rating =
                      item?.rating ??
                      item?.rating_kp ??
                      item?.details?.rating_kp ??
                      item?.rating_imdb;
                    const quality = item?.quality ?? item?.details?.quality;
                    const genre = getPrimaryGenreFromItem(item);
                    return (
                      <Link
                        key={id}
                        href={`/movie/${id}`}
                        className="group block bg-transparent hover:bg-transparent outline-none hover:outline hover:outline-[1.5px] hover:outline-zinc-700 focus-visible:outline focus-visible:outline-[2px] focus-visible:outline-zinc-700 transition-all duration-200 cursor-pointer overflow-hidden rounded-sm"
                        onMouseMove={(e) => {
                          const posterEl =
                            (e.currentTarget.querySelector(
                              ".poster-card"
                            ) as HTMLElement) || null;
                          if (!posterEl) return;
                          const rect = posterEl.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const y = e.clientY - rect.top;
                          const mx = (x / rect.width) * 2 - 1;
                          const my = (y / rect.height) * 2 - 1;
                          posterEl.style.setProperty("--x", `${x}px`);
                          posterEl.style.setProperty("--y", `${y}px`);
                          posterEl.style.setProperty("--mx", `${mx}`);
                          posterEl.style.setProperty("--my", `${my}`);
                        }}
                        onMouseLeave={(e) => {
                          const posterEl =
                            (e.currentTarget.querySelector(
                              ".poster-card"
                            ) as HTMLElement) || null;
                          if (!posterEl) return;
                          posterEl.style.setProperty("--mx", "0");
                          posterEl.style.setProperty("--my", "0");
                        }}
                      >
                        <div className="aspect-[2/3] bg-zinc-950 flex items-center justify-center relative overflow-hidden rounded-[10px] poster-card">
                          {poster ? (
                            <img
                              src={poster ?? "/placeholder.svg"}
                              alt={title}
                              decoding="async"
                              loading="lazy"
                              fetchPriority="low"
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-zinc-600 text-[10px] text-center p-1">
                              Нет постера
                            </div>
                          )}
                          {rating && (
                            <div
                              className={`absolute top-1 right-1 md:top-2 md:right-2 px-2 md:px-2 py-[3px] md:py-1 rounded-sm text-[11px] md:text-[12px] text-white font-medium z-[3] ${ratingBgColor(
                                rating
                              )}`}
                            >
                              {formatRatingLabel(rating)}
                            </div>
                          )}
                          {quality && (
                            <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 px-2 md:px-2 py-[3px] md:py-1 rounded-sm text-[10px] md:text-[12px] bg-white text-black border border-white/70 z-[3] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                              {String(quality)}
                            </div>
                          )}
                          {poster && (
                            <div
                              className="pointer-events-none absolute inset-0 z-10 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300"
                              style={{
                                background:
                                  "radial-gradient(140px circle at var(--x) var(--y), rgba(var(--ui-accent-rgb),0.35), rgba(0,0,0,0) 60%)",
                              }}
                            />
                          )}
                        </div>
                        <div className="relative p-2 md:p-3 min-h-[48px] md:min-h-[56px] overflow-hidden">
                          <div className="relative z-[2]">
                            <h3
                              className="text-[11px] md:text-[12px] font-medium truncate mb-1 leading-tight text-zinc-300/80 transition-colors duration-200 group-hover:text-zinc-100 group-focus-visible:text-zinc-100"
                              title={title}
                            >
                              {title}
                            </h3>
                            <div className="flex items-center gap-2 text-[10px] md:text-[11px] text-zinc-400/70 transition-colors duration-200 group-hover:text-zinc-300 group-focus-visible:text-zinc-300">
                              {year && <span>{year}</span>}
                              {year && genre && (
                                <span className="text-zinc-500/60">•</span>
                              )}
                              {genre && (
                                <span className="truncate max-w-[70%]">
                                  {genre}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Similars */}
            {Array.isArray(data.similars) && data.similars.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-zinc-200">Похожие</h2>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 gap-2">
                  {data.similars
                    .slice(0, 12)
                    .map((item: any, index: number) => {
                      const id = item.id ?? item.details?.id ?? index;
                      const poster =
                        (item.poster || item.details?.poster) ?? null;
                      const title =
                        item.title || item.details?.name || "Без названия";
                      const year = item.year || item.details?.released;
                      const rating = item.rating || item.details?.rating_kp;
                      const quality = item.quality || item.details?.quality;
                      const genre = getPrimaryGenreFromItem(item);
                      return (
                        <Link
                          key={id}
                          href={`/movie/${id}`}
                          className="group block bg-transparent hover:bg-transparent outline-none hover:outline hover:outline-[1.5px] hover:outline-zinc-700 focus-visible:outline focus-visible:outline-[2px] focus-visible:outline-zinc-700 transition-all duration-200 cursor-pointer overflow-hidden rounded-sm"
                          onMouseMove={(e) => {
                            const posterEl =
                              (e.currentTarget.querySelector(
                                ".poster-card"
                              ) as HTMLElement) || null;
                            if (!posterEl) return;
                            const rect = posterEl.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const y = e.clientY - rect.top;
                            const mx = (x / rect.width) * 2 - 1;
                            const my = (y / rect.height) * 2 - 1;
                            posterEl.style.setProperty("--x", `${x}px`);
                            posterEl.style.setProperty("--y", `${y}px`);
                            posterEl.style.setProperty("--mx", `${mx}`);
                            posterEl.style.setProperty("--my", `${my}`);
                          }}
                          onMouseLeave={(e) => {
                            const posterEl =
                              (e.currentTarget.querySelector(
                                ".poster-card"
                              ) as HTMLElement) || null;
                            if (!posterEl) return;
                            posterEl.style.setProperty("--mx", "0");
                            posterEl.style.setProperty("--my", "0");
                          }}
                        >
                          <div className="aspect-[2/3] bg-zinc-950 flex items-center justify-center relative overflow-hidden rounded-[10px] poster-card">
                            {poster ? (
                              <img
                                src={poster}
                                alt={title}
                                decoding="async"
                                loading="lazy"
                                fetchPriority="low"
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-zinc-600 text-[10px] text-center p-1">
                                Нет постера
                              </div>
                            )}
                            {rating && (
                              <div
                                className={`absolute top-1 right-1 md:top-2 md:right-2 px-2 md:px-2 py-[3px] md:py-1 rounded-sm text-[11px] md:text-[12px] text-white font-medium z-[3] ${ratingBgColor(
                                  rating
                                )}`}
                              >
                                {formatRatingLabel(rating)}
                              </div>
                            )}
                            {quality && (
                              <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 px-2 md:px-2 py-[3px] md:py-1 rounded-sm text-[10px] md:text-[12px] bg-white text-black border border-white/70 z-[3] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                                {String(quality)}
                              </div>
                            )}
                            {poster && (
                              <div
                                className="pointer-events-none absolute inset-0 z-10 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300"
                                style={{
                                  background:
                                    "radial-gradient(140px circle at var(--x) var(--y), rgba(var(--ui-accent-rgb),0.35), rgba(0,0,0,0) 60%)",
                                }}
                              />
                            )}
                          </div>
                          <div className="relative p-2 md:p-3 min-h-[48px] md:min-h-[56px] overflow-hidden">
                            <div className="relative z-[2]">
                              <h3
                                className="text-[11px] md:text-[12px] font-medium truncate mb-1 leading-tight text-zinc-300/80 transition-colors duration-200 group-hover:text-zinc-100 group-focus-visible:text-zinc-100"
                                title={title}
                              >
                                {title}
                              </h3>
                              <div className="flex items-center gap-2 text-[10px] md:text-[11px] text-zinc-400/70 transition-colors duration-200 group-hover:text-zinc-300 group-focus-visible:text-zinc-300">
                                {year && <span>{year}</span>}
                                {year && genre && (
                                  <span className="text-zinc-500/60">•</span>
                                )}
                                {genre && (
                                  <span className="truncate max-w-[70%]">
                                    {genre}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PosterBackground>
  );
}
