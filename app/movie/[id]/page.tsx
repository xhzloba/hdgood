"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useMemo } from "react";
import { Loader } from "@/components/loader";
import { ArrowLeft, Play, Info, Plus, ThumbsUp, ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerSelector } from "@/components/player-selector";
import { toast } from "@/hooks/use-toast";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

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

import { CastList } from "@/components/cast-list";
import {
  TrailerPlayer,
  getEmbedSrcFromTrailer,
} from "@/components/trailer-player";
import { ratingColor } from "@/lib/utils";
import { TriviaSection } from "@/components/trivia-section";
import { getMovieOverride, getSeriesOverride } from "@/lib/overrides";
import { VideoPosterRef } from "@/components/video-poster";

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
  const tabsRef = useRef<HTMLDivElement>(null);
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
  const [navIds, setNavIds] = useState<string[]>([]);
  const [navIndex, setNavIndex] = useState<number | null>(null);
  const [returnHref, setReturnHref] = useState<string | null>(null);
  const router = useRouter();

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

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("__navContext") : null;
      if (!raw) {
        setNavIds([]);
        setNavIndex(null);
        return;
      }
      const ctx = JSON.parse(raw || "{}");
      const ids = Array.isArray(ctx?.ids) ? ctx.ids.map((s: any) => String(s)) : [];
      setNavIds(ids);
      const idx = ids.indexOf(String(id));
      setNavIndex(idx >= 0 ? idx : null);
    } catch {
      setNavIds([]);
      setNavIndex(null);
    }
  }, [id]);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("__returnTo") : null;
      const obj = raw ? JSON.parse(raw) : null;
      const href = obj?.href ? String(obj.href) : null;
      setReturnHref(href);
    } catch {
      setReturnHref(null);
    }
  }, [id]);

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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-white/20 relative">
      <header className="absolute top-0 left-0 w-full z-50 p-6 md:p-8 flex items-center justify-between pointer-events-none">
          <Link
            href={returnHref ?? "/"}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full hover:bg-black/40 pointer-events-auto"
            onClick={(e) => {
              try {
                const sameOriginRef = typeof document !== "undefined" && document.referrer && document.referrer.startsWith(location.origin);
                if (sameOriginRef) {
                  e.preventDefault();
                  router.back();
                  return;
                }
                if (returnHref) {
                  e.preventDefault();
                  router.push(returnHref);
                  return;
                }
              } catch {}
            }}
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Назад</span>
          </Link>
        </header>

      {/* Hero Background */}
      <div className="relative h-[85vh] w-full overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent z-10" />
         <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/20 to-transparent z-10" />
         {(movie as any).backdrop || (movie as any).bg_poster?.backdrop ? (
           <img 
             src={(movie as any).backdrop || (movie as any).bg_poster?.backdrop} 
             alt={movie.name} 
             className="w-full h-full object-cover object-top"
           />
         ) : (
           <img 
             src={movie.poster} 
             alt={movie.name} 
             className="w-full h-full object-cover object-top opacity-40 blur-xl scale-110"
           />
         )}
         
         {/* Hero Content Overlay */}
         <div className="absolute bottom-0 left-0 z-20 p-6 md:p-12 w-full md:w-2/3 lg:w-1/2 flex flex-col gap-4 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent pt-32 pb-12">
            {(movie as any).poster_logo ? (
              <img 
                src={(movie as any).poster_logo} 
                alt={movie.name} 
                className="h-24 md:h-32 w-auto object-contain self-start mb-2"
              />
            ) : (
              <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-lg leading-tight">
                 {movie.name}
              </h1>
            )}
            
            <div className="flex items-center gap-3 text-sm md:text-base text-zinc-200 font-medium drop-shadow-md">
               <span className="text-green-400 font-bold">98% совпадение</span>
               <span>{titleYear}</span>
               <span className="border border-zinc-400/50 px-1.5 py-0.5 rounded text-xs bg-black/30 backdrop-blur-sm">{movie.age_limit || "16+"}</span>
               <span>{formatDuration()}</span>
               <span className="border border-zinc-400/50 px-1.5 py-0.5 rounded text-xs bg-black/30 backdrop-blur-sm">HD</span>
            </div>

            <p className="text-zinc-200 text-sm md:text-lg line-clamp-3 md:line-clamp-4 drop-shadow-md max-w-2xl font-light leading-relaxed">
               {movie.description || movie.about || "Нет описания"}
            </p>

            <div className="flex items-center gap-3 mt-4">
               <button 
                 onClick={() => {
                    setShowPlayerSelector(true);
                    setTimeout(() => {
                      document.getElementById('player-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                 }}
                 className="bg-white text-black px-8 py-3 rounded-[4px] font-bold flex items-center gap-2.5 hover:bg-white/90 transition active:scale-95"
               >
                 <Play size={24} fill="currentColor" className="ml-1" /> 
                 <span className="text-lg">Смотреть</span>
               </button>
               <button 
                 onClick={() => {
                   tabsRef.current?.scrollIntoView({ behavior: 'smooth' });
                 }}
                 className="bg-zinc-500/40 text-white px-6 py-3 rounded-[4px] font-bold flex items-center gap-2.5 hover:bg-zinc-500/50 transition backdrop-blur-sm active:scale-95"
               >
                 <Info size={24} /> 
                 <span className="text-lg">Подробнее</span>
               </button>
               <button className="p-3 rounded-full border-2 border-zinc-400/50 text-zinc-200 hover:border-white hover:text-white hover:bg-white/10 transition active:scale-95 backdrop-blur-sm" title="Добавить в список">
                  <Plus size={20} />
               </button>
               <button className="p-3 rounded-full border-2 border-zinc-400/50 text-zinc-200 hover:border-white hover:text-white hover:bg-white/10 transition active:scale-95 backdrop-blur-sm" title="Оценить">
                  <ThumbsUp size={20} />
               </button>
            </div>
         </div>
      </div>
      
      {/* Tabs Section */}
      <div ref={tabsRef} className="relative z-30 bg-zinc-950 px-4 md:px-12 pb-20 min-h-screen">
          <Tabs 
            defaultValue="overview" 
            className="w-full"
            onValueChange={() => {
               tabsRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <TabsList className="flex items-center gap-6 overflow-x-auto scrollbar-hide border-b border-white/10 bg-transparent p-0 mb-8 w-full justify-start h-auto">
              <TabsTrigger 
                value="overview" 
                className="rounded-none border-t-4 border-transparent px-0 py-3 text-sm font-bold uppercase text-zinc-400 hover:text-zinc-200 data-[state=active]:border-red-600 data-[state=active]:text-white data-[state=active]:bg-transparent transition-colors"
              >
                Обзор
              </TabsTrigger>
              <TabsTrigger 
                value="trailers" 
                className="rounded-none border-t-4 border-transparent px-0 py-3 text-sm font-bold uppercase text-zinc-400 hover:text-zinc-200 data-[state=active]:border-red-600 data-[state=active]:text-white data-[state=active]:bg-transparent transition-colors"
              >
                Трейлеры и другое
              </TabsTrigger>
              {franchise?.seasons && Array.isArray(franchise.seasons) && franchise.seasons.length > 0 && (
                <TabsTrigger 
                  value="episodes" 
                  className="rounded-none border-t-4 border-transparent px-0 py-3 text-sm font-bold uppercase text-zinc-400 hover:text-zinc-200 data-[state=active]:border-red-600 data-[state=active]:text-white data-[state=active]:bg-transparent transition-colors"
                >
                  Эпизоды
                </TabsTrigger>
              )}
              {Array.isArray(seqList) && seqList.length > 0 && (
                <TabsTrigger 
                  value="sequels" 
                  className="rounded-none border-t-4 border-transparent px-0 py-3 text-sm font-bold uppercase text-zinc-400 hover:text-zinc-200 data-[state=active]:border-red-600 data-[state=active]:text-white data-[state=active]:bg-transparent transition-colors"
                >
                  Сиквелы и приквелы
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="similar" 
                className="rounded-none border-t-4 border-transparent px-0 py-3 text-sm font-bold uppercase text-zinc-400 hover:text-zinc-200 data-[state=active]:border-red-600 data-[state=active]:text-white data-[state=active]:bg-transparent transition-colors"
              >
                Похожие
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="animate-in fade-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none">
              <div className="grid md:grid-cols-[2fr_1fr] gap-8 md:gap-16">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-2xl font-semibold text-white">Сюжет</h3>
                    <p className="text-zinc-300 text-base md:text-lg leading-relaxed">
                      {movie.description || movie.about || "Описание отсутствует."}
                    </p>
                  </div>
                  
                  {/* Ratings Block */}
                  <div className="flex items-center gap-6 p-4 bg-zinc-900/50 rounded-lg border border-white/5">
                     <div className="flex flex-col">
                        <span className="text-zinc-400 text-xs uppercase tracking-wider mb-1">IMDb</span>
                        <span className={`text-2xl font-bold ${ratingColor(movie.rating_imdb)}`}>{movie.rating_imdb || "—"}</span>
                     </div>
                     <div className="w-px h-8 bg-white/10" />
                     <div className="flex flex-col">
                        <span className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Кинопоиск</span>
                        <span className={`text-2xl font-bold ${ratingColor(movie.rating_kp)}`}>{movie.rating_kp || "—"}</span>
                     </div>
                  </div>

                  {franchise?.trivia && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold text-white">Знаете ли вы?</h3>
                      <TriviaSection trivia={franchise.trivia} />
                    </div>
                  )}
                </div>

                <div className="space-y-8 text-sm text-zinc-400">
                  <div>
                    <span className="block text-zinc-500 mb-2 uppercase text-xs font-bold tracking-wider">В ролях</span>
                    <CastList casts={movie.casts || []} />
                  </div>
                  
                  <div>
                    <span className="block text-zinc-500 mb-2 uppercase text-xs font-bold tracking-wider">О фильме</span>
                    <div className="space-y-2">
                       <div className="grid grid-cols-[100px_1fr] gap-2">
                          <span className="text-zinc-500">Режиссер</span>
                          <span className="text-zinc-200">{Array.isArray(movie.director) ? movie.director.join(", ") : movie.director || "—"}</span>
                       </div>
                       <div className="grid grid-cols-[100px_1fr] gap-2">
                          <span className="text-zinc-500">Жанры</span>
                          <span className="text-zinc-200">{Array.isArray(movie.genre) ? movie.genre.join(", ") : movie.genre || "—"}</span>
                       </div>
                       <div className="grid grid-cols-[100px_1fr] gap-2">
                          <span className="text-zinc-500">Страна</span>
                          <span className="text-zinc-200">{Array.isArray(movie.country) ? movie.country.join(", ") : movie.country || "—"}</span>
                       </div>
                       <div className="grid grid-cols-[100px_1fr] gap-2">
                          <span className="text-zinc-500">Премьера</span>
                          <span className="text-zinc-200">{formatReleaseDate()}</span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Trailers Tab */}
            <TabsContent value="trailers" className="animate-in fade-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none">
               <div id="player-section" className="space-y-8">
                  {showPlayerSelector && (
                    <div className="w-full bg-black rounded-xl overflow-hidden shadow-2xl border border-zinc-800">
                        <PlayerSelector
                          onPlayerSelect={(playerId: number) =>
                            setSelectedPlayer(playerId)
                          }
                          iframeUrl={franchise?.iframe_url || movie.iframe_url}
                          kpId={kpId}
                        />
                    </div>
                  )}
                  <div>
                     <h3 className="text-xl font-semibold text-white mb-4">Трейлеры и тизеры</h3>
                     <TrailerPlayer trailers={rawTrailers} mode="carousel" />
                  </div>
               </div>
            </TabsContent>

            {/* Episodes Tab */}
            {franchise?.seasons && (
              <TabsContent value="episodes" className="animate-in fade-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none">
                 <div className="space-y-4">
                    {franchise.seasons.map((season: any) => (
                        <div key={season.season} className="bg-zinc-900/30 border border-white/5 rounded-lg overflow-hidden">
                           <button 
                             onClick={() => toggleSeason(season.season)}
                             className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left"
                           >
                             <div className="flex items-center gap-4">
                               <div className="bg-zinc-800 w-12 h-12 flex items-center justify-center rounded text-xl font-bold text-zinc-400">
                                 {season.season}
                               </div>
                               <div>
                                 <h4 className="font-semibold text-zinc-200">Сезон {season.season}</h4>
                                 <span className="text-xs text-zinc-500">{season.episodes?.length || 0} эпизодов</span>
                               </div>
                             </div>
                             <ChevronDown size={20} className={`text-zinc-500 transition-transform ${openSeasons.has(season.season) ? 'rotate-180' : ''}`} />
                           </button>
                           
                           {openSeasons.has(season.season) && (
                             <div className="p-4 pt-0 border-t border-white/5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {season.episodes?.map((episode: any) => (
                                   <button 
                                     key={episode.episode}
                                     onClick={() => {
                                        if(episode.iframe_url) playEpisode(season.season, episode.iframe_url, `S${season.season} E${episode.episode}`);
                                     }}
                                     className="flex items-start gap-3 p-3 rounded hover:bg-white/10 transition text-left group"
                                   >
                                      <div className="mt-1 relative min-w-[24px]">
                                         <Play size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
                                      </div>
                                      <div>
                                         <span className="block text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
                                            {episode.episode}. {episode.name || `Эпизод ${episode.episode}`}
                                         </span>
                                         <span className="text-xs text-zinc-500">
                                            {episode.release_ru ? formatDate(episode.release_ru) : ''}
                                         </span>
                                      </div>
                                   </button>
                                ))}
                             </div>
                           )}
                        </div>
                    ))}
                 </div>
              </TabsContent>
            )}

            {/* Sequels Tab */}
            <TabsContent value="sequels" className="animate-in fade-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none">
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {seqList.map((item: any) => {
                     const linkId = item.id || item.movieId || item.kp_id || item.kinopoisk_id;
                     const posterSrc = item.poster || item.cover || item.poster_url;
                     const titleText = item.title || item.name || item.original_title || item.en_name || "Без названия";
                     
                     if (!linkId) return null;

                     return (
                     <Link 
                       key={linkId} 
                       href={`/movie/${linkId}`}
                       className="group block relative aspect-2/3 bg-zinc-900 rounded overflow-hidden"
                     >
                        {posterSrc ? (
                          <img 
                            src={posterSrc} 
                            alt={titleText}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600 text-xs text-center p-2">
                              Нет постера
                           </div>
                        )}
                        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                           <span className="text-sm font-medium text-white line-clamp-2">{titleText}</span>
                        </div>
                     </Link>
                  );
                  })}
               </div>
            </TabsContent>

            {/* Similar Tab */}
            <TabsContent value="similar" className="animate-in fade-in slide-in-from-bottom-4 duration-500 focus-visible:outline-none">
               {(movie as any).similar_movies && Array.isArray((movie as any).similar_movies) && (movie as any).similar_movies.length > 0 ? (
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {(movie as any).similar_movies.map((item: any) => {
                       const linkId = item.id || item.movieId || item.kp_id || item.kinopoisk_id;
                       const posterSrc = item.poster || item.cover || item.poster_url;
                       const titleText = item.title || item.name || item.original_title || item.en_name || "Без названия";
                       
                       if (!linkId) return null;

                       return (
                       <Link 
                         key={linkId} 
                         href={`/movie/${linkId}`}
                         className="group block relative aspect-2/3 bg-zinc-900 rounded overflow-hidden"
                       >
                          {posterSrc ? (
                            <img 
                              src={posterSrc} 
                              alt={titleText}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                             <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600 text-xs text-center p-2">
                                Нет постера
                             </div>
                          )}
                          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                             <span className="text-sm font-medium text-white line-clamp-2">{titleText}</span>
                          </div>
                       </Link>
                    );
                    })}
                 </div>
               ) : (
                 <div className="text-center text-zinc-500 py-12">Похожих фильмов пока нет</div>
               )}
            </TabsContent>
          </Tabs>
       </div>
    </div>
  );
}
