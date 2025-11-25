"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getKpIdFromTimeline } from "../../lib/api";
import { PosterBackground } from "@/components/poster-background";

type Primitive = string | number | boolean | null;

type FlatField = {
  path: string; // dot path
  value: Primitive | Primitive[] | Record<string, any> | any;
  type: "string" | "number" | "boolean" | "array" | "object" | "null";
};

function isPrimitive(v: any): v is Primitive {
  return v === null || ["string", "number", "boolean"].includes(typeof v);
}

function flatten(obj: any, basePath: string = ""): FlatField[] {
  const res: FlatField[] = [];
  if (!obj || typeof obj !== "object") return res;
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const path = basePath ? `${basePath}.${key}` : key;
    if (isPrimitive(val)) {
      res.push({
        path,
        value: val,
        type: val === null ? "null" : (typeof val as any),
      });
    } else if (Array.isArray(val)) {
      // Показываем только массивы примитивов как строку
      const isPrimArray = val.every(isPrimitive);
      res.push({ path, value: val, type: "array" });
      if (!isPrimArray) {
        // Для сложных массивов — отдельный JSON-редактор ниже
      }
    } else if (typeof val === "object") {
      // Добавляем узел-объект и раскрываем
      res.push({ path, value: val, type: "object" });
      res.push(...flatten(val, path));
    }
  }
  return res;
}

function setDeep(obj: Record<string, any>, path: string, value: any) {
  const parts = path.split(".");
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!(p in cursor) || typeof cursor[p] !== "object" || cursor[p] == null) {
      cursor[p] = {};
    }
    cursor = cursor[p];
  }
  cursor[parts[parts.length - 1]] = value;
}

function parseIdent(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  // Если это прямо 24-х символный идентификатор (hex-like) — принимаем
  if (/^[a-zA-Z0-9]{24}$/.test(s)) return s;
  try {
    // Пытаемся извлечь из URL параметры `ident`
    const url = new URL(s);
    const ident = url.searchParams.get("ident");
    if (ident && /^[a-zA-Z0-9]{24}$/.test(ident)) return ident;
    // Иногда идентификатор может быть в пути
    const m = url.href.match(/([a-zA-Z0-9]{24})/);
    if (m) return m[1];
  } catch {}
  // Как fallback — пробуем найти 24-символную подстроку
  const m = s.match(/([a-zA-Z0-9]{24})/);
  return m ? m[1] : null;
}

export default function AdminOverridesPage() {
  const posterImgRef = useRef<HTMLImageElement | null>(null);
  const previewVarsRef = useRef<HTMLDivElement | null>(null);
  const [activePickField, setActivePickField] = useState<string | null>(null);
  const [pipetteMessage, setPipetteMessage] = useState<string | null>(null);

  const anyWin = typeof window !== "undefined" ? (window as any) : null;

  async function pickWithEyedropper(): Promise<string | null> {
    if (anyWin?.EyeDropper) {
      try {
        const ed = new anyWin.EyeDropper();
        const res = await ed.open();
        return res?.sRGBHex ?? null;
      } catch (err) {
        console.warn("Eyedropper cancelled or failed", err);
        return null;
      }
    }
    return null;
  }

  // Преобразует значение override в строку для инпутов
  function toDisplayString(val: any): string {
    if (val == null) return "";
    if (Array.isArray(val))
      return val.map((v) => (v == null ? "" : String(v))).join(",");
    if (typeof val === "object") {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    return String(val);
  }

  function setFieldFromCssVar(field: string, varName: string) {
    try {
      const el = previewVarsRef.current;
      if (!el) return;
      const val = getComputedStyle(el).getPropertyValue(varName).trim();
      if (!val) return;
      updateField(field, val);
    } catch (err) {
      console.warn("Failed to read CSS variable", varName, err);
    }
  }

  async function handlePosterClick(e: React.MouseEvent<HTMLImageElement>) {
    if (!activePickField) return;
    e.stopPropagation();
    e.preventDefault();
    setPipetteMessage(null);

    // Prefer system EyeDropper when available (CORS-safe)
    const hex = await pickWithEyedropper();
    if (hex) {
      updateField(activePickField, hex);
      setActivePickField(null);
      return;
    }

    const img = posterImgRef.current;
    if (!img) {
      setActivePickField(null);
      return;
    }

    try {
      const rect = img.getBoundingClientRect();
      const scaleX = img.naturalWidth / img.clientWidth;
      const scaleY = img.naturalHeight / img.clientHeight;
      const x = Math.floor((e.clientX - rect.left) * scaleX);
      const y = Math.floor((e.clientY - rect.top) * scaleY);

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No 2d context");
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(x, y, 1, 1).data;
      const hexPick = `#${d[0].toString(16).padStart(2, "0")}${d[1]
        .toString(16)
        .padStart(2, "0")}${d[2].toString(16).padStart(2, "0")}`;
      updateField(activePickField, hexPick);
    } catch (err) {
      console.warn("Canvas sampling failed (likely CORS)", err);
      setPipetteMessage(
        "Не удалось считать пиксель с постера (CORS). Используй системную пипетку."
      );
    } finally {
      setActivePickField(null);
    }
  }
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const [login, setLogin] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rawInput, setRawInput] = useState<string>("");
  const [ident, setIdent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [details, setDetails] = useState<any>(null);
  const [franchise, setFranchise] = useState<any>(null);
  const [kpId, setKpId] = useState<string>("");
  const [existingOverride, setExistingOverride] = useState<Record<
    string,
    any
  > | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [jsonOverrideText, setJsonOverrideText] = useState<string>("{}");

  useEffect(() => {
    // Простая локальная авторизация через localStorage
    const ok = localStorage.getItem("hdgood_admin_ok") === "1";
    setIsAuthed(ok);
  }, []);

  // Поля из details (как прежде)
  const detailsFields: FlatField[] = useMemo(() => {
    if (!details || !details.details) return [];
    return flatten(details.details);
  }, [details]);

  // Ключи franchise, которые реально используются на странице фильма
  const franchiseKeys = useMemo(
    () => [
      "iframe_url",
      "producer",
      "screenwriter",
      "design",
      "operator",
      "rate_mpaa",
      "budget",
      "fees_use",
      "fees_world",
      "fees_rus",
      "premier",
      "premier_rus",
      "serial_status",
      "slogan",
      "quality",
      "voiceActing",
      "seasons",
      "actors_dubl",
      "trivia",
    ],
    []
  );

  // Только используемые поля из franchise, с базовым путём 'franchise'
  const franchiseFields: FlatField[] = useMemo(() => {
    // Делаем поля франшизы видимыми всегда:
    // 1) берем override.franchise если он есть,
    // 2) иначе берем загруженные данные франшизы,
    // 3) иначе заполняем null, чтобы поле появилось в форме.
    const source: Record<string, any> = {};
    const overrideFr = (existingOverride as any)?.franchise || {};
    for (const k of franchiseKeys) {
      if (overrideFr && Object.prototype.hasOwnProperty.call(overrideFr, k)) {
        source[k] = overrideFr[k];
      } else if (
        franchise &&
        Object.prototype.hasOwnProperty.call(franchise, k)
      ) {
        source[k] = (franchise as any)[k];
      } else {
        source[k] = null; // отображаем как пустое значение, но поле есть
      }
    }
    return flatten(source, "franchise");
  }, [franchise, franchiseKeys, existingOverride]);

  // Все поля для таблицы
  const fields: FlatField[] = useMemo(() => {
    return [...detailsFields, ...franchiseFields];
  }, [detailsFields, franchiseFields]);

  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    if (login.trim() === "user" && password.trim() === "user") {
      localStorage.setItem("hdgood_admin_ok", "1");
      setIsAuthed(true);
    } else {
      setError("Неверные логин/пароль (используй user/user)");
    }
  }

  async function searchByInput(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const id = parseIdent(rawInput);
    if (!id) {
      setError("Не удалось извлечь ident из строки");
      return;
    }
    setIdent(id);
    setLoading(true);
    try {
      const viewUrl = `https://api.vokino.pro/v2/view/${id}`;
      const res = await fetch(viewUrl);
      const data = await res.json();
      setDetails(data);
      // Определяем kpId для franchise
      const localKpId =
        data?.details?.kp_id ||
        data?.details?.kinopoisk_id ||
        data?.kp_id ||
        "";
      // Фоллбек: пробуем получить kp_id из timeline, если не найден в view
      let kpParam =
        localKpId && String(localKpId).trim() !== "" ? String(localKpId) : "";
      if (!kpParam) {
        try {
          const kpFromTimeline = await getKpIdFromTimeline(id);
          if (kpFromTimeline != null) {
            kpParam = String(kpFromTimeline);
          }
        } catch (err) {
          console.warn("Не удалось получить kp_id из timeline:", err);
        }
      }

      setKpId(kpParam);
      setFranchise(null);
      if (kpParam) {
        try {
          const fRes = await fetch(`/api/franchise?kinopoisk_id=${kpParam}`);
          if (fRes.ok) {
            const fData = await fRes.json();
            setFranchise(fData || null);
          } else {
            console.warn("Franchise API вернул статус:", fRes.status);
          }
        } catch (err) {
          console.warn("Ошибка запроса Franchise API:", err);
        }
      }
      // Загружаем текущий override
      const oRes = await fetch(`/api/overrides/movies/${id}`);
      const oData = await oRes.json();
      setExistingOverride(oData || null);
      setJsonOverrideText(JSON.stringify(oData || {}, null, 2));
      setFormValues({});
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  // Загружает существующий override в поля формы для удобного редактирования
  function loadOverrideIntoForm() {
    if (!existingOverride) return;
    const next: Record<string, string> = {};
    // Проходим только по видимым полям таблицы
    for (const f of fields) {
      const v = getDeep(existingOverride, f.path);
      if (v !== undefined) next[f.path] = toDisplayString(v);
    }
    // И отдельные поля цветов постера
    const pc = (existingOverride as any)?.poster_colors || {};
    const asCsv = (arr: any) =>
      Array.isArray(arr) ? arr.join(",") : toDisplayString(arr);
    if (pc?.dominant1 != null)
      next["poster_colors.dominant1"] = asCsv(pc.dominant1);
    if (pc?.dominant2 != null)
      next["poster_colors.dominant2"] = asCsv(pc.dominant2);
    if (pc?.accentTl != null)
      next["poster_colors.accentTl"] = asCsv(pc.accentTl);
    if (pc?.accentTr != null)
      next["poster_colors.accentTr"] = asCsv(pc.accentTr);
    if (pc?.accentBr != null)
      next["poster_colors.accentBr"] = asCsv(pc.accentBr);
    if (pc?.accentBl != null)
      next["poster_colors.accentBl"] = asCsv(pc.accentBl);
    const posterLogo = (existingOverride as any)?.poster_logo;
    if (posterLogo != null) next["poster_logo"] = String(posterLogo);
    const introVideo = (existingOverride as any)?.intro_video;
    if (introVideo != null) next["intro_video"] = String(introVideo);
    setFormValues(next);
  }

  // Удаляет текущий override
  async function deleteOverride() {
    if (!ident) {
      setError("Сначала укажи ident");
      return;
    }
    try {
      const res = await fetch(`/api/overrides/movies/${ident}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setExistingOverride(null);
      setJsonOverrideText("{}");
      setFormValues({});
    } catch (e: any) {
      setError(e?.message || "Ошибка удаления override");
    }
  }

  function updateField(path: string, rawVal: string) {
    setFormValues((prev) => ({ ...prev, [path]: rawVal }));
  }

  async function saveOverride() {
    if (!ident) {
      setError("Сначала укажи ident");
      return;
    }
    const overrideObj: Record<string, any> = {};
    // Составляем nested объект из формы
    for (const [path, raw] of Object.entries(formValues)) {
      if (!raw || raw.trim() === "") continue;
      // Пытаемся разобрать тип
      let val: any = raw;
      if (/^\d+$/.test(raw)) {
        val = parseInt(raw, 10);
      } else if (/^\d+\.\d+$/.test(raw)) {
        val = parseFloat(raw);
      } else if (
        /^\s*(\d{1,3})\s*[ ,;\-]\s*(\d{1,3})\s*[ ,;\-]\s*(\d{1,3})\s*$/.test(
          raw
        )
      ) {
        // Формат RGB тройки: "r,g,b" или "r g b"
        const m = raw.match(
          /^\s*(\d{1,3})\s*[ ,;\-]\s*(\d{1,3})\s*[ ,;\-]\s*(\d{1,3})\s*$/
        )!;
        const r = Math.min(255, Math.max(0, parseInt(m[1], 10)));
        const g = Math.min(255, Math.max(0, parseInt(m[2], 10)));
        const b = Math.min(255, Math.max(0, parseInt(m[3], 10)));
        val = [r, g, b];
      } else if (/^#?[0-9a-fA-F]{6}$/.test(raw)) {
        // Формат HEX: "#rrggbb" или "rrggbb"
        const hex = raw.replace("#", "");
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        val = [r, g, b];
      } else if (raw === "true" || raw === "false") {
        val = raw === "true";
      } else if (raw.includes(",")) {
        // Простая обработка массивов строк по запятым
        val = raw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      setDeep(overrideObj, path, val);
    }

    // Дополнительно учитываем JSON-редактор для сложных структур
    try {
      const jsonExtra = JSON.parse(jsonOverrideText || "{}");
      // Глубокий мердж: jsonExtra имеет приоритет
      const deepMerge = (dst: any, src: any) => {
        if (src && typeof src === "object" && !Array.isArray(src)) {
          for (const k of Object.keys(src)) {
            if (
              src[k] &&
              typeof src[k] === "object" &&
              !Array.isArray(src[k])
            ) {
              dst[k] = deepMerge(dst[k] || {}, src[k]);
            } else {
              dst[k] = src[k];
            }
          }
          return dst;
        }
        return src;
      };
      // База — JSON-редактор, но значения из формы имеют приоритет
      // То есть при конфликте значение из формы переигрывает JSON
      const merged = deepMerge({} as any, jsonExtra);
      deepMerge(merged, overrideObj);
      Object.assign(overrideObj, merged);
    } catch (e) {
      // Игнорируем, если JSON невалиден
    }

    try {
      const res = await fetch(`/api/overrides/movies/${ident}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(overrideObj),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setExistingOverride(overrideObj);
    } catch (e: any) {
      setError(e?.message || "Ошибка сохранения");
    }
  }

  if (!isAuthed) {
    return (
      <div className="min-h-[100dvh] min-h-screen bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800/60">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="text-sm text-zinc-300 hover:text-white">
              ← Назад
            </Link>
            <div className="text-sm">Админка Overrides</div>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">
          <form
            onSubmit={doLogin}
            className="max-w-sm mx-auto bg-zinc-900/70 border border-zinc-800 rounded p-4 space-y-3"
          >
            <div className="text-lg font-semibold">Вход</div>
            {error && <div className="text-red-400 text-sm">{error}</div>}
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Логин</label>
              <input
                className="w-full h-9 rounded bg-zinc-800 border border-zinc-700 px-2 text-sm"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="user"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Пароль</label>
              <input
                type="password"
                className="w-full h-9 rounded bg-zinc-800 border border-zinc-700 px-2 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="user"
              />
            </div>
            <button
              className="w-full h-9 rounded text-sm hover:opacity-90 active:opacity-95"
              type="submit"
              style={{
                backgroundColor: "rgb(var(--ui-accent-rgb))",
                color: "#fff",
              }}
            >
              Войти
            </button>
          </form>
        </main>
      </div>
    );
  }

  function getDeep(obj: any, path: string): any {
    if (!obj || typeof obj !== "object") return undefined;
    const parts = path.split(".");
    let cur: any = obj;
    for (const p of parts) {
      if (cur == null) return undefined;
      cur = cur[p];
    }
    return cur;
  }

  return (
    <div className="min-h-[100dvh] min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/60">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-300 hover:text-white">
            ← Назад
          </Link>
          <div className="text-sm">Админка Overrides</div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-zinc-900/70 border border-zinc-800 rounded p-4">
          <div className="text-sm mb-2">Найти фильм по ссылке или ident</div>
          {error && <div className="text-red-400 text-sm mb-2">{error}</div>}
          <form onSubmit={searchByInput} className="flex gap-2">
            <input
              className="flex-1 h-9 rounded bg-zinc-800 border border-zinc-700 px-2 text-sm"
              placeholder="Вставь ссылку или ident (например 68fff9749630419905edf217)"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
            />
            <button
              className="h-9 px-4 rounded text-sm hover:opacity-90 active:opacity-95"
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: "rgb(var(--ui-accent-rgb))",
                color: "#fff",
              }}
            >
              {loading ? "Загрузка..." : "Искать"}
            </button>
          </form>
          {ident && (
            <div className="text-xs text-zinc-400 mt-2">
              Текущий ident: {ident}
            </div>
          )}
        </section>

        {details?.details && (
          <section className="bg-zinc-900/70 border border-zinc-800 rounded p-4">
            <div className="text-sm font-medium mb-3">
              Превью постера и цвета
            </div>
            <div className="text-xs text-zinc-400 mb-4">
              Слева загружается постер по текущему ident. Цвета извлекаются
              автоматически, как на детальной странице. Ниже можно задать свои
              цвета для 4 углов и 2 доминантов.
            </div>

            <div className="grid md:grid-cols-[320px_1fr] gap-4">
              {/* Левая колонка: постер + фон */}
              <div>
                {(() => {
                  // В превью в админке приоритетно используем постер из override,
                  // чтобы локальные пути из public/ работали и цвета извлекались без CORS.
                  const posterUrl =
                    (existingOverride as any)?.poster ||
                    (details as any)?.details?.poster ||
                    null;
                  const bgPosterUrl =
                    (existingOverride as any)?.bg_poster?.backdrop ||
                    (details as any)?.details?.backdrop ||
                    null;

                  // Собираем colorOverrides из формы
                  const parseColor = (
                    s?: string
                  ): [number, number, number] | undefined => {
                    if (!s) return undefined;
                    const sm = s.match(
                      /^\s*(\d{1,3})\s*[ ,;\-]\s*(\d{1,3})\s*[ ,;\-]\s*(\d{1,3})\s*$/
                    );
                    if (sm) {
                      const r = Math.min(255, Math.max(0, parseInt(sm[1], 10)));
                      const g = Math.min(255, Math.max(0, parseInt(sm[2], 10)));
                      const b = Math.min(255, Math.max(0, parseInt(sm[3], 10)));
                      return [r, g, b];
                    }
                    const hex = s.replace("#", "");
                    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
                      const r = parseInt(hex.slice(0, 2), 16);
                      const g = parseInt(hex.slice(2, 4), 16);
                      const b = parseInt(hex.slice(4, 6), 16);
                      return [r, g, b];
                    }
                    return undefined;
                  };

                  const colorOverrides = {
                    dominant1:
                      parseColor(formValues["poster_colors.dominant1"]) ||
                      (existingOverride as any)?.poster_colors?.dominant1,
                    dominant2:
                      parseColor(formValues["poster_colors.dominant2"]) ||
                      (existingOverride as any)?.poster_colors?.dominant2,
                    accentTl:
                      parseColor(formValues["poster_colors.accentTl"]) ||
                      (existingOverride as any)?.poster_colors?.accentTl,
                    accentTr:
                      parseColor(formValues["poster_colors.accentTr"]) ||
                      (existingOverride as any)?.poster_colors?.accentTr,
                    accentBr:
                      parseColor(formValues["poster_colors.accentBr"]) ||
                      (existingOverride as any)?.poster_colors?.accentBr,
                    accentBl:
                      parseColor(formValues["poster_colors.accentBl"]) ||
                      (existingOverride as any)?.poster_colors?.accentBl,
                  } as any;

                  return (
                    <div className="rounded border border-zinc-800 overflow-hidden">
                      <PosterBackground
                        posterUrl={posterUrl}
                        bgPosterUrl={bgPosterUrl}
                        colorOverrides={colorOverrides}
                        className="h-[420px]"
                      >
                        <div className="relative z-10 w-full h-full grid grid-rows-[1fr_auto]">
                          <div className="flex items-center justify-center">
                            {posterUrl ? (
                              <img
                                ref={posterImgRef}
                                src={posterUrl}
                                crossOrigin="anonymous"
                                onClick={handlePosterClick}
                                alt="Постер"
                                decoding="async"
                                loading="lazy"
                                fetchPriority="low"
                                className="h-[360px] w-auto rounded-sm shadow cursor-crosshair"
                                title={
                                  activePickField
                                    ? "Кликни по постеру, чтобы выбрать цвет"
                                    : undefined
                                }
                              />
                            ) : (
                              <div className="h-[360px] w-[240px] flex items-center justify-center text-zinc-400">
                                Нет постера
                              </div>
                            )}
                          </div>
                          <div
                            ref={previewVarsRef}
                            className="grid grid-cols-3 gap-2 p-3 bg-zinc-900/40"
                          >
                            <div className="p-2 rounded border border-zinc-700/60 bg-zinc-900/40">
                              <div className="text-[11px] text-zinc-400 mb-1">
                                Dominant #1
                              </div>
                              <button
                                type="button"
                                className="w-11 h-11 rounded border border-zinc-700/50"
                                style={{
                                  backgroundColor:
                                    "rgba(var(--poster-dominant-1-rgb), 1)",
                                }}
                                title="Кликни, чтобы подставить в Dominant #1"
                                onClick={() =>
                                  setFieldFromCssVar(
                                    "poster_colors.dominant1",
                                    "--poster-dominant-1-rgb"
                                  )
                                }
                              />
                            </div>
                            <div className="p-2 rounded border border-zinc-700/60 bg-zinc-900/40">
                              <div className="text-[11px] text-zinc-400 mb-1">
                                Dominant #2
                              </div>
                              <button
                                type="button"
                                className="w-11 h-11 rounded border border-zinc-700/50"
                                style={{
                                  backgroundColor:
                                    "rgba(var(--poster-dominant-2-rgb), 1)",
                                }}
                                title="Кликни, чтобы подставить в Dominant #2"
                                onClick={() =>
                                  setFieldFromCssVar(
                                    "poster_colors.dominant2",
                                    "--poster-dominant-2-rgb"
                                  )
                                }
                              />
                            </div>
                            <div className="p-2 rounded border border-zinc-700/60 bg-zinc-900/40">
                              <div className="text-[11px] text-zinc-400 mb-1">
                                Accent TL
                              </div>
                              <button
                                type="button"
                                className="w-11 h-11 rounded border border-zinc-700/50"
                                style={{
                                  backgroundColor:
                                    "rgba(var(--poster-accent-tl-rgb), 1)",
                                }}
                                title="Кликни, чтобы подставить в Accent TL"
                                onClick={() =>
                                  setFieldFromCssVar(
                                    "poster_colors.accentTl",
                                    "--poster-accent-tl-rgb"
                                  )
                                }
                              />
                            </div>
                            <div className="p-2 rounded border border-zinc-700/60 bg-zinc-900/40">
                              <div className="text-[11px] text-zinc-400 mb-1">
                                Accent TR
                              </div>
                              <button
                                type="button"
                                className="w-11 h-11 rounded border border-zinc-700/50"
                                style={{
                                  backgroundColor:
                                    "rgba(var(--poster-accent-tr-rgb), 1)",
                                }}
                                title="Кликни, чтобы подставить в Accent TR"
                                onClick={() =>
                                  setFieldFromCssVar(
                                    "poster_colors.accentTr",
                                    "--poster-accent-tr-rgb"
                                  )
                                }
                              />
                            </div>
                            <div className="p-2 rounded border border-zinc-700/60 bg-zinc-900/40">
                              <div className="text-[11px] text-zinc-400 mb-1">
                                Accent BR
                              </div>
                              <button
                                type="button"
                                className="w-11 h-11 rounded border border-zinc-700/50"
                                style={{
                                  backgroundColor:
                                    "rgba(var(--poster-accent-br-rgb), 1)",
                                }}
                                title="Кликни, чтобы подставить в Accent BR"
                                onClick={() =>
                                  setFieldFromCssVar(
                                    "poster_colors.accentBr",
                                    "--poster-accent-br-rgb"
                                  )
                                }
                              />
                            </div>
                            <div className="p-2 rounded border border-zinc-700/60 bg-zinc-900/40">
                              <div className="text-[11px] text-zinc-400 mb-1">
                                Accent BL
                              </div>
                              <button
                                type="button"
                                className="w-11 h-11 rounded border border-zinc-700/50"
                                style={{
                                  backgroundColor:
                                    "rgba(var(--poster-accent-bl-rgb), 1)",
                                }}
                                title="Кликни, чтобы подставить в Accent BL"
                                onClick={() =>
                                  setFieldFromCssVar(
                                    "poster_colors.accentBl",
                                    "--poster-accent-bl-rgb"
                                  )
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </PosterBackground>
                    </div>
                  );
                })()}
              </div>

              {/* Правая колонка: поля оверрайда цветов */}
              <div>
                <div className="text-sm font-medium mb-2">
                  Цвета постера (override)
                </div>
                <div className="text-xs text-zinc-400 mb-3">
                  Вводи как "r,g,b" или HEX "#rrggbb". Пустые поля — берутся из
                  авто-извлечения.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Dominant #1
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        className="w-full h-8 rounded bg-zinc-800 border border-zinc-700 px-2 text-xs"
                        value={formValues["poster_colors.dominant1"] ?? ""}
                        onChange={(e) =>
                          updateField("poster_colors.dominant1", e.target.value)
                        }
                        placeholder={(() => {
                          const v = (existingOverride as any)?.poster_colors
                            ?.dominant1;
                          return Array.isArray(v) ? v.join(",") : "";
                        })()}
                      />
                      <button
                        type="button"
                        className="h-8 px-2 bg-zinc-700/60 hover:bg-zinc-600 rounded text-xs"
                        onClick={async () => {
                          const hex = await pickWithEyedropper();
                          if (hex) updateField("poster_colors.dominant1", hex);
                        }}
                      >
                        Пипетка
                      </button>
                      <button
                        type="button"
                        className={`h-8 px-2 rounded text-xs ${
                          activePickField === "poster_colors.dominant1"
                            ? "text-white"
                            : "bg-zinc-700/60 hover:bg-zinc-600"
                        }`}
                        onClick={() =>
                          setActivePickField((p) =>
                            p === "poster_colors.dominant1"
                              ? null
                              : "poster_colors.dominant1"
                          )
                        }
                        style={
                          activePickField === "poster_colors.dominant1"
                            ? { backgroundColor: "rgb(var(--ui-accent-rgb))" }
                            : undefined
                        }
                      >
                        С постера
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Dominant #2
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        className="w-full h-8 rounded bg-zinc-800 border border-zinc-700 px-2 text-xs"
                        value={formValues["poster_colors.dominant2"] ?? ""}
                        onChange={(e) =>
                          updateField("poster_colors.dominant2", e.target.value)
                        }
                        placeholder={(() => {
                          const v = (existingOverride as any)?.poster_colors
                            ?.dominant2;
                          return Array.isArray(v) ? v.join(",") : "";
                        })()}
                      />
                      <button
                        type="button"
                        className="h-8 px-2 bg-zinc-700/60 hover:bg-zinc-600 rounded text-xs"
                        onClick={async () => {
                          const hex = await pickWithEyedropper();
                          if (hex) updateField("poster_colors.dominant2", hex);
                        }}
                      >
                        Пипетка
                      </button>
                      <button
                        type="button"
                        className={`h-8 px-2 rounded text-xs ${
                          activePickField === "poster_colors.dominant2"
                            ? "text-white"
                            : "bg-zinc-700/60 hover:bg-zinc-600"
                        }`}
                        onClick={() =>
                          setActivePickField((p) =>
                            p === "poster_colors.dominant2"
                              ? null
                              : "poster_colors.dominant2"
                          )
                        }
                        style={
                          activePickField === "poster_colors.dominant2"
                            ? { backgroundColor: "rgb(var(--ui-accent-rgb))" }
                            : undefined
                        }
                      >
                        С постера
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Accent TL (верх-лево)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        className="w-full h-8 rounded bg-zinc-800 border border-zinc-700 px-2 text-xs"
                        value={formValues["poster_colors.accentTl"] ?? ""}
                        onChange={(e) =>
                          updateField("poster_colors.accentTl", e.target.value)
                        }
                        placeholder={(() => {
                          const v = (existingOverride as any)?.poster_colors
                            ?.accentTl;
                          return Array.isArray(v) ? v.join(",") : "";
                        })()}
                      />
                      <button
                        type="button"
                        className="h-8 px-2 bg-zinc-700/60 hover:bg-zinc-600 rounded text-xs"
                        onClick={async () => {
                          const hex = await pickWithEyedropper();
                          if (hex) updateField("poster_colors.accentTl", hex);
                        }}
                      >
                        Пипетка
                      </button>
                      <button
                        type="button"
                        className={`h-8 px-2 rounded text-xs ${
                          activePickField === "poster_colors.accentTl"
                            ? "text-white"
                            : "bg-zinc-700/60 hover:bg-zinc-600"
                        }`}
                        onClick={() =>
                          setActivePickField((p) =>
                            p === "poster_colors.accentTl"
                              ? null
                              : "poster_colors.accentTl"
                          )
                        }
                        style={
                          activePickField === "poster_colors.accentTl"
                            ? { backgroundColor: "rgb(var(--ui-accent-rgb))" }
                            : undefined
                        }
                      >
                        С постера
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Accent TR (верх-право)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        className="w-full h-8 rounded bg-zinc-800 border border-zinc-700 px-2 text-xs"
                        value={formValues["poster_colors.accentTr"] ?? ""}
                        onChange={(e) =>
                          updateField("poster_colors.accentTr", e.target.value)
                        }
                        placeholder={(() => {
                          const v = (existingOverride as any)?.poster_colors
                            ?.accentTr;
                          return Array.isArray(v) ? v.join(",") : "";
                        })()}
                      />
                      <button
                        type="button"
                        className="h-8 px-2 bg-zinc-700/60 hover:bg-zinc-600 rounded text-xs"
                        onClick={async () => {
                          const hex = await pickWithEyedropper();
                          if (hex) updateField("poster_colors.accentTr", hex);
                        }}
                      >
                        Пипетка
                      </button>
                      <button
                        type="button"
                        className={`h-8 px-2 rounded text-xs ${
                          activePickField === "poster_colors.accentTr"
                            ? "text-white"
                            : "bg-zinc-700/60 hover:bg-zinc-600"
                        }`}
                        onClick={() =>
                          setActivePickField((p) =>
                            p === "poster_colors.accentTr"
                              ? null
                              : "poster_colors.accentTr"
                          )
                        }
                        style={
                          activePickField === "poster_colors.accentTr"
                            ? { backgroundColor: "rgb(var(--ui-accent-rgb))" }
                            : undefined
                        }
                      >
                        С постера
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Accent BR (низ-право)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        className="w-full h-8 rounded bg-zinc-800 border border-zinc-700 px-2 text-xs"
                        value={formValues["poster_colors.accentBr"] ?? ""}
                        onChange={(e) =>
                          updateField("poster_colors.accentBr", e.target.value)
                        }
                        placeholder={(() => {
                          const v = (existingOverride as any)?.poster_colors
                            ?.accentBr;
                          return Array.isArray(v) ? v.join(",") : "";
                        })()}
                      />
                      <button
                        type="button"
                        className="h-8 px-2 bg-zinc-700/60 hover:bg-zinc-600 rounded text-xs"
                        onClick={async () => {
                          const hex = await pickWithEyedropper();
                          if (hex) updateField("poster_colors.accentBr", hex);
                        }}
                      >
                        Пипетка
                      </button>
                      <button
                        type="button"
                        className={`h-8 px-2 rounded text-xs ${
                          activePickField === "poster_colors.accentBr"
                            ? "text-white"
                            : "bg-zinc-700/60 hover:bg-zinc-600"
                        }`}
                        onClick={() =>
                          setActivePickField((p) =>
                            p === "poster_colors.accentBr"
                              ? null
                              : "poster_colors.accentBr"
                          )
                        }
                        style={
                          activePickField === "poster_colors.accentBr"
                            ? { backgroundColor: "rgb(var(--ui-accent-rgb))" }
                            : undefined
                        }
                      >
                        С постера
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Accent BL (низ-лево)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        className="w-full h-8 rounded bg-zinc-800 border border-zinc-700 px-2 text-xs"
                        value={formValues["poster_colors.accentBl"] ?? ""}
                        onChange={(e) =>
                          updateField("poster_colors.accentBl", e.target.value)
                        }
                        placeholder={(() => {
                          const v = (existingOverride as any)?.poster_colors
                            ?.accentBl;
                          return Array.isArray(v) ? v.join(",") : "";
                        })()}
                      />
                      <button
                        type="button"
                        className="h-8 px-2 bg-zinc-700/60 hover:bg-zinc-600 rounded text-xs"
                        onClick={async () => {
                          const hex = await pickWithEyedropper();
                          if (hex) updateField("poster_colors.accentBl", hex);
                        }}
                      >
                        Пипетка
                      </button>
                      <button
                        type="button"
                        className={`h-8 px-2 rounded text-xs ${
                          activePickField === "poster_colors.accentBl"
                            ? "text-white"
                            : "bg-zinc-700/60 hover:bg-zinc-600"
                        }`}
                        onClick={() =>
                          setActivePickField((p) =>
                            p === "poster_colors.accentBl"
                              ? null
                              : "poster_colors.accentBl"
                          )
                        }
                        style={
                          activePickField === "poster_colors.accentBl"
                            ? { backgroundColor: "rgb(var(--ui-accent-rgb))" }
                            : undefined
                        }
                      >
                        С постера
                      </button>
                    </div>
                  </div>
                </div>
                {pipetteMessage && (
                  <div className="mt-2 text-xs text-amber-400">
                    {pipetteMessage}
                  </div>
                )}
                <div className="mt-3 text-xs text-zinc-400">
                  Совет: ты можешь задать только часть цветов — остальные
                  возьмутся из авто-извлечения.
                </div>
                <div className="mt-4">
                  <label className="block text-xs text-zinc-400 mb-1">
                    Логотип для главной (poster_logo)
                  </label>
                  <input
                    className="w-full h-8 rounded bg-zinc-800 border border-zinc-700 px-2 text-xs"
                    placeholder={(() => {
                      const v = (existingOverride as any)?.poster_logo;
                      return v == null ? "" : String(v);
                    })()}
                    value={formValues["poster_logo"] ?? ""}
                    onChange={(e) => updateField("poster_logo", e.target.value)}
                  />
                  <div className="mt-1 text-xs text-zinc-500">
                    Можно указывать путь из public/, например "/logos/movie.png"
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-xs text-zinc-400 mb-1">
                    Интро видео (intro_video)
                  </label>
                  <input
                    className="w-full h-8 rounded bg-zinc-800 border border-zinc-700 px-2 text-xs"
                    placeholder={(() => {
                      const v = (existingOverride as any)?.intro_video;
                      return v == null ? "" : String(v);
                    })()}
                    value={formValues["intro_video"] ?? ""}
                    onChange={(e) => updateField("intro_video", e.target.value)}
                  />
                  <div className="mt-1 text-xs text-zinc-500">
                    Путь к видео (mp4), например "/intro/sushnost.mp4". Заменяет
                    постер.
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {details?.details && (
          <section className="bg-zinc-900/70 border border-zinc-800 rounded p-4">
            <div className="text-sm font-medium mb-3">
              Поля для переопределения
            </div>
            <div className="text-xs text-zinc-400 mb-4">
              Доступны поля из details и franchise (только используемые на
              странице фильма). Любое значение из формы перекрывает данные из
              API. Для сложных структур используй JSON-редактор ниже. Путь вида{" "}
              <code>franchise.*</code> относится к данным франшизы.
            </div>

            {existingOverride && (
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="h-8 px-3 bg-zinc-700/60 hover:bg-zinc-600 rounded text-xs"
                  onClick={loadOverrideIntoForm}
                >
                  Заполнить поля из override
                </button>
                <button
                  type="button"
                  className="h-8 px-3 bg-red-600 hover:bg-red-500 rounded text-xs"
                  onClick={deleteOverride}
                >
                  Удалить override
                </button>
              </div>
            )}

            <div className="max-h-[420px] overflow-auto border border-zinc-800 rounded">
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="bg-zinc-800/40">
                    <th className="text-left p-2 w-[28%]">Путь</th>
                    <th className="text-left p-2 w-[32%]">Текущее значение</th>
                    <th className="text-left p-2 w-[40%]">Override</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((f, idx) => (
                    <tr
                      key={idx}
                      className="border-t border-zinc-800/60 align-top"
                    >
                      <td className="p-2 font-mono text-[12px] text-zinc-300">
                        {f.path}
                      </td>
                      <td className="p-2 text-zinc-400 break-words text-xs">
                        {f.type === "null"
                          ? ""
                          : f.type === "array"
                          ? Array.isArray(f.value)
                            ? (f.value as any[]).length > 0
                              ? (f.value as any[]).join(", ")
                              : "[]"
                            : String(f.value)
                          : typeof f.value === "object" && f.value !== null
                          ? "{...}"
                          : String(f.value)}
                      </td>
                      <td className="p-2">
                        <input
                          className="w-full h-8 rounded bg-zinc-800 border border-zinc-700 px-2 text-xs"
                          placeholder={(() => {
                            const v = existingOverride
                              ? getDeep(existingOverride, f.path)
                              : undefined;
                            return v == null ? "" : String(v);
                          })()}
                          value={formValues[f.path] ?? ""}
                          onChange={(e) => updateField(f.path, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <div className="text-sm mb-2">
                JSON-редактор (для сложных структур)
              </div>
              <textarea
                className="w-full min-h-32 h-40 rounded bg-zinc-800 border border-zinc-700 px-2 py-2 text-xs font-mono"
                value={jsonOverrideText}
                onChange={(e) => setJsonOverrideText(e.target.value)}
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                className="h-9 px-4 bg-green-600 hover:bg-green-500 rounded text-sm"
                onClick={saveOverride}
              >
                Сохранить override
              </button>
              {existingOverride && (
                <span className="text-xs text-zinc-400">
                  Override загружен, изменения будут применяться на детальной
                  странице.
                </span>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
