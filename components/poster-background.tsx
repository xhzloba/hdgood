"use client";

import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";

type RGB = [number, number, number];

type ColorOverrides = {
  dominant1?: RGB;
  dominant2?: RGB;
  accentTl?: RGB;
  accentTr?: RGB;
  accentBr?: RGB;
  accentBl?: RGB;
  // Альтернативные ключи с подчёркиваниями (на случай других форматов)
  dominant_1?: RGB;
  dominant_2?: RGB;
  accent_tl?: RGB;
  accent_tr?: RGB;
  accent_br?: RGB;
  accent_bl?: RGB;
};

type PosterBackgroundProps = {
  posterUrl?: string | null;
  bgPosterUrl?: string | null;
  children?: React.ReactNode;
  className?: string;
  colorOverrides?: ColorOverrides | null;
  disableMobileBackdrop?: boolean;
  // Простой режим: не извлекать цвета, а просто затемнять углы поверх bgPosterUrl
  simpleDarkCorners?: boolean;
  softBottomFade?: boolean;
  strongUpperCorners?: boolean;
  persistComposite?: boolean;
};

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function refineColor(rgb: [number, number, number]): [number, number, number] {
  const [r, g, b] = rgb;
  let [h, s, l] = rgbToHsl(r, g, b);
  // Аккуратно усиливаем насыщенность, если цвет слишком тусклый
  if (s < 0.2) s = Math.min(1, s * 1.3);
  // Контролируем светлоту, чтобы избежать слишком тёмных/светлых пятен
  if (l > 0.88) l = 0.75;
  if (l < 0.18) l = 0.25;
  return hslToRgb(h, s, l);
}

// --- Hue helpers for more accurate dominant selection ---
function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function classifyHueFamily(
  h: number
):
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "cyan"
  | "blue"
  | "purple"
  | "magenta" {
  const hh = ((h % 360) + 360) % 360;
  if (hh >= 345 || hh < 15) return "red";
  if (hh >= 15 && hh < 45) return "orange";
  if (hh >= 45 && hh < 75) return "yellow";
  if (hh >= 75 && hh < 165) return "green";
  if (hh >= 165 && hh < 195) return "cyan";
  if (hh >= 195 && hh < 255) return "blue";
  if (hh >= 255 && hh < 285) return "purple";
  return "magenta";
}

function enhanceDominantHsl(
  h: number,
  s: number,
  l: number
): [number, number, number] {
  const fam = classifyHueFamily(h);
  let ns = s;
  let nl = l;
  switch (fam) {
    case "red":
      ns = clamp(s + 0.15, 0, 1);
      nl = clamp(l + 0.08, 0, 0.85);
      break;
    case "orange":
      ns = clamp(s + 0.12, 0, 1);
      nl = clamp(l + 0.06, 0, 0.85);
      break;
    case "yellow":
      ns = clamp(s + 0.05, 0, 1);
      nl = clamp(l - 0.04, 0.15, 0.78);
      break;
    case "green":
      ns = clamp(s + 0.1, 0, 1);
      nl = clamp(l + 0.05, 0, 0.85);
      break;
    case "cyan":
      ns = clamp(s + 0.08, 0, 1);
      nl = clamp(l + 0.05, 0, 0.85);
      break;
    case "blue":
      ns = clamp(s + 0.1, 0, 1);
      nl = clamp(l + 0.12, 0, 0.82);
      break;
    case "purple":
      ns = clamp(s + 0.12, 0, 1);
      nl = clamp(l + 0.08, 0, 0.83);
      break;
    case "magenta":
      ns = clamp(s + 0.12, 0, 1);
      nl = clamp(l + 0.06, 0, 0.83);
      break;
  }
  return [h, ns, nl];
}

// Глобальная палитра: выделение двух доминирующих цветов на всём постере
function getDominantColors(
  img: HTMLImageElement
): [[number, number, number], [number, number, number]] | null {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const w = 128;
  const h = 128;
  canvas.width = w;
  canvas.height = h;
  if (!ctx) return null;
  // @ts-ignore
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, w, h);
  const image = ctx.getImageData(0, 0, w, h);
  const data = image.data;

  const H_BINS = 36; // 10° шаг
  const S_BINS = 6;
  const L_BINS = 6;
  type Cluster = {
    count: number;
    weight: number;
    rSum: number;
    gSum: number;
    bSum: number;
    hSum: number;
    sSum: number;
    lSum: number;
  };
  const clusters = new Map<string, Cluster>();
  let total = 0;
  let colored = 0;

  const sWeight = (s: number) =>
    s < 0.12 ? 0.25 + s * 0.5 : Math.pow(s, 0.85);
  const lWeight = (l: number) => clamp(1 - Math.abs(l - 0.56) * 1.8, 0.25, 1);
  const hueWeightFn = (h: number) => {
    switch (classifyHueFamily(h)) {
      case "red":
      case "blue":
      case "purple":
      case "magenta":
        return 1.12;
      case "green":
        return 1.06;
      case "cyan":
        return 1.02;
      case "orange":
        return 1.04;
      case "yellow":
        return 0.95;
      default:
        return 1;
    }
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const a = data[idx + 3];
      if (a < 128) continue;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const [hh, ss, ll] = rgbToHsl(r, g, b);
      total++;
      // Отбрасываем явные белые/серые и почти чёрные
      if (ss < 0.08 && ll > 0.92) continue;
      if (ss < 0.06 && ll < 0.12) continue;

      const wS = sWeight(ss);
      const wL = lWeight(ll);
      const wH = hueWeightFn(hh);
      const wgt = wS * wL * wH;
      if (ss > 0.12) colored++;

      const hIdx = Math.floor((((hh % 360) + 360) % 360) / 10);
      const sIdx = Math.min(S_BINS - 1, Math.floor(ss * S_BINS));
      const lIdx = Math.min(L_BINS - 1, Math.floor(ll * L_BINS));
      const key = `${hIdx}|${sIdx}|${lIdx}`;
      let c = clusters.get(key);
      if (!c) {
        c = {
          count: 0,
          weight: 0,
          rSum: 0,
          gSum: 0,
          bSum: 0,
          hSum: 0,
          sSum: 0,
          lSum: 0,
        };
        clusters.set(key, c);
      }
      c.count += 1;
      c.weight += wgt;
      c.rSum += r * wgt;
      c.gSum += g * wgt;
      c.bSum += b * wgt;
      c.hSum += hh * wgt;
      c.sSum += ss * wgt;
      c.lSum += ll * wgt;
    }
  }

  if (clusters.size === 0 || total === 0) return null;

  const arr = Array.from(clusters.entries()).sort(
    (a, b) => b[1].weight - a[1].weight
  );
  const MIN_HUE_SEP = 35;

  const pickRGB = (entry: [string, Cluster]) => {
    const c = entry[1];
    const wgt = c.weight || c.count || 1;
    const h = c.hSum / wgt;
    const s = c.sSum / wgt;
    const l = c.lSum / wgt;
    const [eh, es, el] = enhanceDominantHsl(h, s, l);
    return hslToRgb(eh, es, el);
  };

  const first = arr[0];
  const firstHue = first[1].hSum / (first[1].weight || first[1].count || 1);
  const firstFam = classifyHueFamily(firstHue);
  const d1 = pickRGB(first);

  let second: [string, Cluster] | null = null;
  for (let i = 1; i < arr.length; i++) {
    const cand = arr[i];
    const h2 = cand[1].hSum / (cand[1].weight || cand[1].count || 1);
    const fam2 = classifyHueFamily(h2);
    if (hueDistance(firstHue, h2) >= MIN_HUE_SEP && fam2 !== firstFam) {
      second = cand;
      break;
    }
  }
  if (!second) second = arr[1] || first;
  const d2 = pickRGB(second!);

  return [d1, d2];
}

function getCornerColors(img: HTMLImageElement): {
  tl: [number, number, number];
  tr: [number, number, number];
  br: [number, number, number];
  bl: [number, number, number];
} {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const w = 128;
  const h = 128;
  canvas.width = w;
  canvas.height = h;
  if (!ctx)
    return {
      tl: [64, 64, 64],
      tr: [64, 64, 64],
      br: [64, 64, 64],
      bl: [64, 64, 64],
    };
  // Отключаем сглаживание при даунскейле, чтобы не размывать насыщенный текст/каймы в окрестности
  // (иначе яркие акцентные пиксели могут «растекаться» и искажать доминирующий цвет)
  // @ts-ignore
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, w, h);
  const image = ctx.getImageData(0, 0, w, h);
  const data = image.data;

  // Глобальный анализ: определяем, преобладает ли нейтральная (серая/чёрно-белая) палитра или какой-то цветовой тон (например, красный)
  function computeGlobalTone():
    | { mode: "neutral"; color: [number, number, number]; neutralShare: number }
    | {
        mode: "colored";
        color: [number, number, number];
        hueBin: number;
        hueShare: number;
      }
    | null {
    let total = 0;
    let neutralCount = 0;
    let neutralRSum = 0,
      neutralGSum = 0,
      neutralBSum = 0;
    const bins = 12; // 30° шаг по тону
    const hueBins: Array<{
      count: number;
      rSum: number;
      gSum: number;
      bSum: number;
      sSum: number;
      lSum: number;
    }> = Array.from({ length: bins }, () => ({
      count: 0,
      rSum: 0,
      gSum: 0,
      bSum: 0,
      sSum: 0,
      lSum: 0,
    }));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        const a = data[idx + 3];
        if (a < 128) continue;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const [hue, s, l] = rgbToHsl(r, g, b);
        total++;
        if (s < 0.12) {
          // Нейтральный пиксель (включая белые/чёрные/серые)
          neutralCount++;
          neutralRSum += r;
          neutralGSum += g;
          neutralBSum += b;
        } else {
          // Цветной пиксель – учитываем в соответствующей hue-bin
          const hh = ((hue % 360) + 360) % 360;
          const bin = Math.min(bins - 1, Math.floor(hh / (360 / bins)));
          const e = hueBins[bin];
          e.count++;
          e.rSum += r;
          e.gSum += g;
          e.bSum += b;
          e.sSum += s;
          e.lSum += l;
        }
      }
    }
    if (total === 0) return null;
    const neutralShare = neutralCount / total;
    const coloredCount = total - neutralCount;
    let topBin = -1;
    let topCount = 0;
    for (let i = 0; i < bins; i++) {
      if (hueBins[i].count > topCount) {
        topCount = hueBins[i].count;
        topBin = i;
      }
    }
    const hueShare = topBin >= 0 ? topCount / total : 0;
    // Правило выбора:
    // - Если нейтральная доля велика (>= 60%) — считаем постер нейтральным и берём серый.
    // - Иначе, если у доминирующего тона приличная доля (>= 25%) — считаем постер цветным с этим тоном.
    // - Иначе возвращаем null и используем угловые акценты как есть.
    if (neutralShare >= 0.6) {
      const nCount = Math.max(1, neutralCount);
      return {
        mode: "neutral",
        color: [
          Math.round(neutralRSum / nCount),
          Math.round(neutralGSum / nCount),
          Math.round(neutralBSum / nCount),
        ],
        neutralShare,
      };
    }
    if (topBin >= 0 && hueShare >= 0.25 && coloredCount > 0) {
      const e = hueBins[topBin];
      const c = Math.max(1, e.count);
      return {
        mode: "colored",
        color: [
          Math.round(e.rSum / c),
          Math.round(e.gSum / c),
          Math.round(e.bSum / c),
        ],
        hueBin: topBin,
        hueShare,
      };
    }
    return null;
  }

  function dominantColorInRegion(
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ): [number, number, number] {
    const bin = 24; // шаг квантования для укрупнения палитры
    const freq = new Map<
      string,
      {
        count: number;
        rSum: number;
        gSum: number;
        bSum: number;
        sSum: number;
        lSum: number;
      }
    >();
    let rTot = 0,
      gTot = 0,
      bTot = 0,
      cTot = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = (y * w + x) * 4;
        const a = data[idx + 3];
        if (a < 128) continue;
        const r = data[idx],
          g = data[idx + 1],
          b = data[idx + 2];
        const [_, s, l] = rgbToHsl(r, g, b);
        // Отбрасываем явные белые/серые пиксели, чтобы палитра была ближе к реальным цветам постера
        if (s < 0.08 && l > 0.9) continue;
        // Отбрасываем почти чёрные нейтральные (чтобы они не «заглушали» акценты)
        if (s < 0.06 && l < 0.12) continue;
        const key = `${Math.floor(r / bin)}-${Math.floor(g / bin)}-${Math.floor(
          b / bin
        )}`;
        const entry = freq.get(key) || {
          count: 0,
          rSum: 0,
          gSum: 0,
          bSum: 0,
          sSum: 0,
          lSum: 0,
        };
        entry.count++;
        entry.rSum += r;
        entry.gSum += g;
        entry.bSum += b;
        entry.sSum += s;
        entry.lSum += l;
        freq.set(key, entry);
        rTot += r;
        gTot += g;
        bTot += b;
        cTot++;
      }
    }
    if (freq.size > 0) {
      const entries = [...freq.values()].map((e) => {
        const avgS = e.sSum / Math.max(1, e.count);
        const avgL = e.lSum / Math.max(1, e.count);
        const share = e.count / Math.max(1, cTot);
        return { ...e, avgS, avgL, share };
      });
      // Слегка игнорируем совсем крошечные кластеры (<0.5%), чтобы текст не побеждал
      let pool = entries.filter((e) => e.share >= 0.005);
      if (pool.length === 0) pool = entries;

      // Скоринговая функция: предпочитаем более насыщенные, но учитываем и размер кластера
      const score = (e: (typeof pool)[number]) =>
        e.count * (0.7 + 0.6 * Math.pow(e.avgS, 1.1));
      pool.sort((a, b) => score(b) - score(a));

      let chosen = pool[0];
      // Если победитель почти нейтральный, но рядом есть умеренно насыщенный кластер с достаточной долей — выберем его
      if (chosen && chosen.avgS < 0.12) {
        const alt = pool
          .filter((e) => e.avgS >= 0.3 && e.share >= 0.01)
          .sort((a, b) => score(b) - score(a))[0];
        if (alt) chosen = alt;
      }

      return [
        Math.round(chosen.rSum / chosen.count),
        Math.round(chosen.gSum / chosen.count),
        Math.round(chosen.bSum / chosen.count),
      ];
    }
    if (cTot === 0) return [64, 64, 64];
    return [
      Math.round(rTot / cTot),
      Math.round(gTot / cTot),
      Math.round(bTot / cTot),
    ];
  }

  // Вводим внутренние отступы от границ, чтобы не захватывать текст/каймы у краёв
  const m = Math.floor(w * 0.08);
  const tlRaw = dominantColorInRegion(
    m,
    m,
    Math.floor(w * 0.5) - m,
    Math.floor(h * 0.5) - m
  );
  const trRaw = dominantColorInRegion(
    Math.floor(w * 0.5) + m,
    m,
    w - m,
    Math.floor(h * 0.5) - m
  );
  const brRaw = dominantColorInRegion(
    Math.floor(w * 0.5) + m,
    Math.floor(h * 0.5) + m,
    w - m,
    h - m
  );
  const blRaw = dominantColorInRegion(
    m,
    Math.floor(h * 0.5) + m,
    Math.floor(w * 0.5) - m,
    h - m
  );

  // По умолчанию – угловые акценты
  let tl = refineColor(tlRaw);
  let tr = refineColor(trRaw);
  let br = refineColor(brRaw);
  let bl = refineColor(blRaw);

  // Если есть глобальная доминанта (красный/серый и т.п.), используем её для унификации
  const globalTone = computeGlobalTone();
  if (globalTone) {
    if (globalTone.mode === "neutral") {
      const g = refineColor(globalTone.color);
      tl = g;
      tr = g;
      br = g;
      bl = g;
    } else if (globalTone.mode === "colored") {
      const g = refineColor(globalTone.color);
      tl = g;
      tr = g;
      br = g;
      bl = g;
    }
  }
  return { tl, tr, br, bl };
}

export function PosterBackground({
  posterUrl,
  bgPosterUrl,
  children,
  className,
  colorOverrides,
  disableMobileBackdrop,
  simpleDarkCorners,
  softBottomFade,
  strongUpperCorners,
  persistComposite,
}: PosterBackgroundProps) {
  type Palette = {
    corners: { tl: RGB; tr: RGB; br: RGB; bl: RGB } | null;
    dominants: [RGB, RGB] | null;
  };
  const [palette, setPalette] = React.useState<Palette>({
    corners: null,
    dominants: null,
  });
  const [ready, setReady] = React.useState(false);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    // В простом режиме для главной не извлекаем цвета вообще
    if (simpleDarkCorners) {
      setReady(true);
      return;
    }

    const src = posterUrl || bgPosterUrl;
    if (!src) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const corners = getCornerColors(img);
        const doms = getDominantColors(img);
        setPalette({ corners, dominants: doms });
      } catch (e) {
        console.warn(
          "PosterBackground: не удалось извлечь цвета (CORS/tainted)",
          e
        );
        setPalette({ corners: null, dominants: null });
      } finally {
        setReady(true);
      }
    };
    img.onerror = () => {
      setReady(true);
    };
    img.src = src;
  }, [posterUrl, bgPosterUrl, simpleDarkCorners]);

  // Нормализуем colorOverrides в формат RGB-массивов
  const normalizedOverrides: ColorOverrides | null = React.useMemo(() => {
    if (!colorOverrides) return null;
    const norm = (c: any): RGB | null => {
      if (!c) return null;
      if (Array.isArray(c) && c.length === 3) {
        const nums = c.map((v) => Number(v));
        if (nums.every((n) => Number.isFinite(n)))
          return [nums[0], nums[1], nums[2]];
      }
      if (typeof c === "string") {
        const s = c.trim();
        const rgbMatch = s.match(
          /^\s*(\d{1,3})\s*[ ,;\-]\s*(\d{1,3})\s*[ ,;\-]\s*(\d{1,3})\s*$/
        );
        if (rgbMatch) {
          const r = Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10)));
          const g = Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10)));
          const b = Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10)));
          return [r, g, b];
        }
        const hex = s.replace("#", "");
        if (/^[0-9a-fA-F]{6}$/.test(hex)) {
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          return [r, g, b];
        }
      }
      return null;
    };
    const pick = (key: keyof ColorOverrides): RGB | undefined => {
      const v = (colorOverrides as any)[key];
      const out = norm(v);
      return out == null ? undefined : out;
    };
    const result: ColorOverrides = {
      dominant1: pick("dominant1") ?? pick("dominant_1"),
      dominant2: pick("dominant2") ?? pick("dominant_2"),
      accentTl: pick("accentTl") ?? pick("accent_tl"),
      accentTr: pick("accentTr") ?? pick("accent_tr"),
      accentBr: pick("accentBr") ?? pick("accent_br"),
      accentBl: pick("accentBl") ?? pick("accent_bl"),
    };
    return result;
  }, [colorOverrides]);

  const style: React.CSSProperties = React.useMemo(() => {
    const baseStyle: React.CSSProperties = {};

    // --- Простой режим: не извлекаем цвета, просто затемняем углы поверх bgPosterUrl (главная) ---
    if (simpleDarkCorners) {
      if (isMobile && !!disableMobileBackdrop) {
        baseStyle.backgroundColor = "var(--app-bg, #0f0f0f)";
        return baseStyle;
      }
      if (bgPosterUrl) {
        const bottomFade = softBottomFade
          ? "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.25) 12%, rgba(0,0,0,0.6) 26%, rgba(0,0,0,0.72) 38%, rgba(0,0,0,0.8) 100%)"
          : "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.28) 10%, rgba(0,0,0,0.64) 24%, rgba(0,0,0,0.76) 34%, rgba(0,0,0,0.82) 100%)";

        const overlayGradients = [
          "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.22) 26%, transparent 60%)",
          strongUpperCorners
            ? "linear-gradient(to right, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.12) 18%, rgba(0,0,0,0.03) 50%, rgba(0,0,0,0.12) 82%, rgba(0,0,0,0.28) 100%)"
            : "linear-gradient(to right, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.14) 18%, rgba(0,0,0,0.04) 50%, rgba(0,0,0,0.14) 82%, rgba(0,0,0,0.4) 100%)",
          bottomFade,
        ];
        if (strongUpperCorners) {
          overlayGradients.unshift(
            "radial-gradient(1000px 700px at 0% 0%, rgba(0,0,0,0.36) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)",
            "radial-gradient(1000px 700px at 100% 0%, rgba(0,0,0,0.36) 0%, rgba(0,0,0,0.18) 55%, transparent 100%)"
          );
        }

        const gradientCount = overlayGradients.length;
        const bgHeightStr = "cover";
        const urlPos = "center top";
        const compositeImage = `${overlayGradients.join(
          ", "
        )}, url(${bgPosterUrl})`;
        const compositeSize = `${Array(gradientCount)
          .fill("cover")
          .join(", ")}, ${bgHeightStr}`;
        const compositePos = `${Array(gradientCount)
          .fill("center top")
          .join(", ")}, ${urlPos}`;

        (baseStyle as any).backgroundImage = compositeImage;
        (baseStyle as any).backgroundSize = compositeSize;
        (baseStyle as any).backgroundPosition = compositePos;
        (baseStyle as any).backgroundRepeat = "no-repeat";
        if (!isMobile) {
          (baseStyle as any).backgroundAttachment = "fixed";
        }
        (baseStyle as any).__compositeImage = compositeImage;
        (baseStyle as any).__compositeSize = compositeSize;
        (baseStyle as any).__compositePosition = compositePos;
        (baseStyle as any).__bgUrl = bgPosterUrl;
      } else {
        baseStyle.backgroundColor = "var(--app-bg, #0f0f0f)";
      }

      return baseStyle;
    }

    // Добавляем bg_poster как фоновое изображение, если оно есть
    if (bgPosterUrl) {
      // Если цвета еще не готовы, показываем только базовые темные оверлеи
      // Если цвета готовы или posterUrl отсутствует, показываем полный фон
      const paletteReady = !!palette.corners || !!normalizedOverrides;
      const shouldShowBackground = !posterUrl || paletteReady;

      if (shouldShowBackground) {
        const disableBG = isMobile && !!disableMobileBackdrop;
        if (disableBG) {
          (baseStyle as any).backgroundImage = "none";
          baseStyle.backgroundColor = "var(--app-bg, #0f0f0f)";
          return baseStyle;
        }
        baseStyle.backgroundImage = `url(${bgPosterUrl})`;
        baseStyle.backgroundSize = "cover";
        baseStyle.backgroundPosition = "center 20%";
        baseStyle.backgroundRepeat = "no-repeat";
        // Добавляем backgroundAttachment: 'fixed' для десктопа (будет отключено на мобильных через CSS)
        baseStyle.backgroundAttachment = "fixed";

        // Добавляем полупрозрачный оверлей поверх bg_poster
        const overlayGradients = [
          "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.22) 26%, transparent 60%)",
          "linear-gradient(135deg, rgba(0, 0, 0, 0.32) 0%, rgba(0, 0, 0, 0.18) 50%, rgba(0, 0, 0, 0.32) 100%)",
          "radial-gradient(ellipse 80% 60% at center, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.26) 60%, transparent 100%)",
        ];

        if (palette.corners || normalizedOverrides) {
          const useTl =
            normalizedOverrides?.accentTl ??
            (palette.corners ? palette.corners.tl : null);
          const useTr =
            normalizedOverrides?.accentTr ??
            (palette.corners ? palette.corners.tr : null);
          const useBr =
            normalizedOverrides?.accentBr ??
            (palette.corners ? palette.corners.br : null);
          const useBl =
            normalizedOverrides?.accentBl ??
            (palette.corners ? palette.corners.bl : null);
          const [rtl, gtl, btl] = useTl || [0, 0, 0];
          const [rtr, gtr, btr] = useTr || [0, 0, 0];
          const [rbr, gbr, bbr] = useBr || [0, 0, 0];
          const [rbl, gbl, bbl2] = useBl || [0, 0, 0];

          // Увеличиваем яркость и насыщенность цветов для лучшей видимости
          const enhanceColor = (r: number, g: number, b: number) => {
            const [h, s, l] = rgbToHsl(r, g, b);

            // Проверяем, является ли цвет серым (низкая насыщенность)
            const isGrayish = s < 0.15;

            // Для серых цветов не увеличиваем насыщенность, чтобы избежать нежелательных оттенков
            const enhancedS = isGrayish ? s : Math.min(1, s + 0.3);
            // Для серых цветов увеличиваем только яркость
            const enhancedL = Math.min(0.8, l + (isGrayish ? 0.1 : 0.2));

            return hslToRgb(h, enhancedS, enhancedL);
          };

          const [ertl, egtl, ebtl] = enhanceColor(rtl, gtl, btl);
          const [ertr, egtr, ebtr] = enhanceColor(rtr, gtr, btr);
          const [erbr, egbr, ebbr] = enhanceColor(rbr, gbr, bbr);
          const [erbl, egbl, ebbl2] = enhanceColor(rbl, gbl, bbl2);

          // 4 угла как в примере — circle farthest-side
          const accentTL = `rgba(${ertl}, ${egtl}, ${ebtl}, 1)`;
          const accentTR = `rgba(${ertr}, ${egtr}, ${ebtr}, 0.85)`;
          const accentBR = `rgba(${erbr}, ${egbr}, ${ebbr}, 0.85)`;
          const accentBL = `rgba(${erbl}, ${egbl}, ${ebbl2}, 0.85)`;
          const ar = Math.round((ertl + ertr + erbr + erbl) / 4);
          const ag = Math.round((egtl + egtr + egbr + egbl) / 4);
          const ab = Math.round((ebtl + ebtr + ebbr + ebbl2) / 4);
          const accentSoft = `rgba(${ar}, ${ag}, ${ab}, 0.25)`;
          const accentBase = `${ar}, ${ag}, ${ab}`;

          // 4 угла с circle farthest-side как в примере
          // TL более плотный — держится до 50%, потом плавно в transparent
          overlayGradients.push(
            `radial-gradient(circle farthest-side at top left, ${accentTL} 0%, ${accentTL} 35%, rgba(${ertl}, ${egtl}, ${ebtl}, 0.5) 55%, transparent 75%)`,
            `radial-gradient(circle farthest-side at top right, ${accentTR}, transparent 70%)`,
            `radial-gradient(circle farthest-side at bottom right, ${accentBR}, transparent 70%)`,
            `radial-gradient(circle farthest-side at bottom left, ${accentBL}, transparent 70%)`
          );
          overlayGradients.push(
            "linear-gradient(to bottom, rgba(var(--app-bg-rgb, 24,24,27), 0) 45%, rgba(var(--app-bg-rgb, 24,24,27), 0.8) 85%, rgba(var(--app-bg-rgb, 24,24,27), 0.88) 100%)"
          );

          // Если посчитали два доминирующих — добавим мягкий линейный градиент между ними
          const domPair:
            | [[number, number, number], [number, number, number]]
            | null = (() => {
            if (
              normalizedOverrides?.dominant1 ||
              normalizedOverrides?.dominant2
            ) {
              const d1 =
                normalizedOverrides?.dominant1 ??
                (palette.dominants ? palette.dominants[0] : null);
              const d2 =
                normalizedOverrides?.dominant2 ??
                (palette.dominants ? palette.dominants[1] : null);
              if (d1 && d2) return [d1, d2];
              return null;
            }
            return palette.dominants;
          })();

          if (domPair) {
            const [[d1r, d1g, d1b], [d2r, d2g, d2b]] = domPair;
            const [ed1r, ed1g, ed1b] = enhanceColor(d1r, d1g, d1b);
            const [ed2r, ed2g, ed2b] = enhanceColor(d2r, d2g, d2b);
            (baseStyle as any)[
              "--poster-dominant-1-rgb"
            ] = `${ed1r}, ${ed1g}, ${ed1b}`;
            (baseStyle as any)[
              "--poster-dominant-2-rgb"
            ] = `${ed2r}, ${ed2g}, ${ed2b}`;
          }

          // Expose accent color for children via CSS variable
          (baseStyle as any)["--poster-accent-rgb"] = `${ar}, ${ag}, ${ab}`;
          (baseStyle as any)[
            "--poster-accent-tl-rgb"
          ] = `${ertl}, ${egtl}, ${ebtl}`;
          (baseStyle as any)[
            "--poster-accent-tr-rgb"
          ] = `${ertr}, ${egtr}, ${ebtr}`;
          (baseStyle as any)[
            "--poster-accent-br-rgb"
          ] = `${erbr}, ${egbr}, ${ebbr}`;
          (baseStyle as any)[
            "--poster-accent-bl-rgb"
          ] = `${erbl}, ${egbl}, ${ebbl2}`;
        }

        const compositeImage = `${overlayGradients.join(
          ", "
        )}, url(${bgPosterUrl})`;
        const gradientCount = overlayGradients.length;
        const bgHeightStr = `cover`;
        const urlPos = "center top";
        const compositeSize = `${Array(gradientCount)
          .fill("cover")
          .join(", ")}, ${bgHeightStr}`;
        const compositePos = `${Array(gradientCount)
          .fill("center top")
          .join(", ")}, ${urlPos}`;
        (baseStyle as any).backgroundImage = compositeImage;
        (baseStyle as any).backgroundSize = compositeSize;
        (baseStyle as any).backgroundPosition = compositePos;
        (baseStyle as any).__gradientLayers = overlayGradients.join(", ");
        (baseStyle as any).__gradientSize = Array(gradientCount)
          .fill("cover")
          .join(", ");
        (baseStyle as any).__gradientPosition = Array(gradientCount)
          .fill("center top")
          .join(", ");
        (baseStyle as any).__compositeImage = compositeImage;
        (baseStyle as any).__compositeSize = compositeSize;
        (baseStyle as any).__compositePosition = compositePos;
        (baseStyle as any).__bgUrl = bgPosterUrl;
      } else {
        // Пока цвета не готовы, показываем только темный фон
        baseStyle.backgroundColor = "rgba(0, 0, 0, 0.98)";
      }

      return baseStyle;
    }

    // Если нет bg_poster, используем старую логику
    if (!palette.corners && !normalizedOverrides) return baseStyle;
    const useTl2 =
      normalizedOverrides?.accentTl ??
      (palette.corners ? palette.corners.tl : null);
    const useTr2 =
      normalizedOverrides?.accentTr ??
      (palette.corners ? palette.corners.tr : null);
    const useBr2 =
      normalizedOverrides?.accentBr ??
      (palette.corners ? palette.corners.br : null);
    const useBl2 =
      normalizedOverrides?.accentBl ??
      (palette.corners ? palette.corners.bl : null);
    const [rtl, gtl, btl] = useTl2 || [0, 0, 0];
    const [rtr, gtr, btr] = useTr2 || [0, 0, 0];
    const [rbr, gbr, bbr] = useBr2 || [0, 0, 0];
    const [rbl, gbl, bbl2] = useBl2 || [0, 0, 0];
    const accentTL = `rgba(${rtl}, ${gtl}, ${btl}, 1)`;
    const accentTR = `rgba(${rtr}, ${gtr}, ${btr}, 0.85)`;
    const accentBR = `rgba(${rbr}, ${gbr}, ${bbr}, 0.85)`;
    const accentBL = `rgba(${rbl}, ${gbl}, ${bbl2}, 0.85)`;
    const ar = Math.round((rtl + rtr + rbr + rbl) / 4);
    const ag = Math.round((gtl + gtr + gbr + gbl) / 4);
    const ab = Math.round((btl + btr + bbr + bbl2) / 4);
    const accentSoft = `rgba(${ar}, ${ag}, ${ab}, 0.25)`;
    // Базовые слои — 4 угла с circle farthest-side
    // TL более плотный — держится до 50%, потом плавно в transparent
    const layers = [
      "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.22) 26%, transparent 60%)",
      `radial-gradient(circle farthest-side at top left, ${accentTL} 0%, ${accentTL} 35%, rgba(${rtl}, ${gtl}, ${btl}, 0.5) 55%, transparent 75%)`,
      `radial-gradient(circle farthest-side at top right, ${accentTR}, transparent 70%)`,
      `radial-gradient(circle farthest-side at bottom right, ${accentBR}, transparent 70%)`,
      `radial-gradient(circle farthest-side at bottom left, ${accentBL}, transparent 70%)`,
      "linear-gradient(to bottom, rgba(var(--app-bg-rgb, 24,24,27), 0) 45%, rgba(var(--app-bg-rgb, 24,24,27), 0.8) 85%, rgba(var(--app-bg-rgb, 24,24,27), 0.88) 100%)",
    ];

    // Добавим доминирующие, если есть
    const domPair2:
      | [[number, number, number], [number, number, number]]
      | null = (() => {
      if (normalizedOverrides?.dominant1 || normalizedOverrides?.dominant2) {
        const d1 =
          normalizedOverrides?.dominant1 ??
          (palette.dominants ? palette.dominants[0] : null);
        const d2 =
          normalizedOverrides?.dominant2 ??
          (palette.dominants ? palette.dominants[1] : null);
        if (d1 && d2) return [d1, d2];
        return null;
      }
      return palette.dominants;
    })();

    if (domPair2) {
      const [[d1r, d1g, d1b], [d2r, d2g, d2b]] = domPair2;
      layers.push(
        `linear-gradient(90deg, rgba(${d1r}, ${d1g}, ${d1b}, 0.35), rgba(${d2r}, ${d2g}, ${d2b}, 0.35))`
      );
    }

    const bg = layers.join(", ");
    return {
      ...baseStyle,
      backgroundImage: bg,
      // Убираем backgroundAttachment: "fixed" для мобильных устройств
      backgroundRepeat: "no-repeat, no-repeat, no-repeat, no-repeat",
      // Expose accent color for children via CSS variable
      ["--poster-accent-rgb" as any]: `${ar}, ${ag}, ${ab}`,
      ["--poster-accent-tl-rgb" as any]: `${rtl}, ${gtl}, ${btl}`,
      ["--poster-accent-tr-rgb" as any]: `${rtr}, ${gtr}, ${btr}`,
      ["--poster-accent-br-rgb" as any]: `${rbr}, ${gbr}, ${bbr}`,
      ["--poster-accent-bl-rgb" as any]: `${rbl}, ${gbl}, ${bbl2}`,
      ...(domPair2
        ? {
            ["--poster-dominant-1-rgb" as any]: `${domPair2[0][0]}, ${domPair2[0][1]}, ${domPair2[0][2]}`,
            ["--poster-dominant-2-rgb" as any]: `${domPair2[1][0]}, ${domPair2[1][1]}, ${domPair2[1][2]}`,
          }
        : {}),
      __gradientLayers: bg,
      __gradientSize: Array(6).fill("cover").join(", "),
      __gradientPosition: Array(6).fill("center top").join(", "),
    };
  }, [
    bgPosterUrl,
    normalizedOverrides,
    palette,
    isMobile,
    disableMobileBackdrop,
  ]);

  const [lastCompImg, setLastCompImg] = React.useState<string | undefined>(
    undefined
  );
  const [lastCompSize, setLastCompSize] = React.useState<string | undefined>(
    undefined
  );
  const [lastCompPos, setLastCompPos] = React.useState<string | undefined>(
    undefined
  );
  const [lastCompUrl, setLastCompUrl] = React.useState<string | undefined>(
    undefined
  );

  React.useLayoutEffect(() => {
    try {
      if (!simpleDarkCorners) return;
      if (lastCompImg && lastCompSize && lastCompPos) return;
      const raw =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("homeBackdrop:lastComposite")
          : null;
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && data.img) {
        const el = containerRef.current;
        if (el) {
          el.style.backgroundImage = data.img || "";
          el.style.backgroundSize = data.size || "";
          el.style.backgroundPosition = data.pos || "";
          if (!isMobile) el.style.backgroundAttachment = "fixed";
        }
        setLastCompImg(data.img);
        setLastCompSize(data.size);
        setLastCompPos(data.pos);
        setLastCompUrl(data.url);
      }
    } catch {}
  }, [simpleDarkCorners]);

  React.useEffect(() => {
    const newImg = (style as any).__compositeImage as string | undefined;
    const newSize = (style as any).__compositeSize as string | undefined;
    const newPos = (style as any).__compositePosition as string | undefined;
    const newUrl = (style as any).__bgUrl as string | undefined;
    if (!newImg) return;
    if (!lastCompImg) {
      setLastCompImg(newImg);
      setLastCompSize(newSize);
      setLastCompPos(newPos);
      setLastCompUrl(newUrl);
      return;
    }
    const changed =
      newImg !== lastCompImg ||
      newSize !== lastCompSize ||
      newPos !== lastCompPos;
    if (changed) {
      if (newUrl && newUrl !== lastCompUrl) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          setLastCompImg(newImg);
          setLastCompSize(newSize);
          setLastCompPos(newPos);
          setLastCompUrl(newUrl);
        };
        img.onerror = () => {
          setLastCompImg(newImg);
          setLastCompSize(newSize);
          setLastCompPos(newPos);
          setLastCompUrl(newUrl);
        };
        img.src = newUrl;
        return;
      }
      setLastCompImg(newImg);
      setLastCompSize(newSize);
      setLastCompPos(newPos);
      setLastCompUrl(newUrl);
      return;
    }
  }, [
    (style as any).__compositeImage,
    (style as any).__compositeSize,
    (style as any).__compositePosition,
    (style as any).__bgUrl,
  ]);

  React.useEffect(() => {
    try {
      if (!simpleDarkCorners) return;
      if (persistComposite === false) return;
      const payload = JSON.stringify({
        img: lastCompImg,
        size: lastCompSize,
        pos: lastCompPos,
        url: lastCompUrl,
      });
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("homeBackdrop:lastComposite", payload);
      }
    } catch {}
  }, [
    lastCompImg,
    lastCompSize,
    lastCompPos,
    lastCompUrl,
    simpleDarkCorners,
    persistComposite,
  ]);

  React.useEffect(() => {
    try {
      if (!simpleDarkCorners) return;
      if (persistComposite !== false) return;
      if (bgPosterUrl) return;
      const raw =
        typeof window !== "undefined"
          ? window.sessionStorage.getItem("homeBackdrop:lastComposite")
          : null;
      if (!raw) {
        setLastCompImg(undefined);
        setLastCompSize(undefined);
        setLastCompPos(undefined);
        setLastCompUrl(undefined);
        return;
      }
      const data = JSON.parse(raw);
      if (data && data.img) {
        setLastCompImg(data.img);
        setLastCompSize(data.size);
        setLastCompPos(data.pos);
        setLastCompUrl(data.url);
      } else {
        setLastCompImg(undefined);
        setLastCompSize(undefined);
        setLastCompPos(undefined);
        setLastCompUrl(undefined);
      }
    } catch {}
  }, [bgPosterUrl, simpleDarkCorners, persistComposite]);

  // Создаем стили для псевдоэлемента на мобильных устройствах
  const mobileBackgroundStyle = React.useMemo(() => {
    const paletteReadyMobile = !!palette.corners || !!normalizedOverrides;
    const shouldShowBackground = !posterUrl || paletteReadyMobile;

    if (!disableMobileBackdrop) {
      if (bgPosterUrl && shouldShowBackground) {
        const fullBackgroundImage =
          style.backgroundImage || `url(${bgPosterUrl})`;
        const gradientCount = (
          fullBackgroundImage.match(/(linear-gradient|radial-gradient)\(/g) ||
          []
        ).length;
        const mobileSizes = `${Array(gradientCount).fill("cover").join(", ")}${
          gradientCount ? ", " : ""
        }cover`;
        const mobilePositions = `${Array(gradientCount)
          .fill("center top")
          .join(", ")}${gradientCount ? ", " : ""}center top`;
        return {
          ["--mobile-bg-image" as any]: fullBackgroundImage,
          ["--mobile-bg-size" as any]: mobileSizes,
          ["--mobile-bg-position" as any]: mobilePositions,
        };
      }
      if (simpleDarkCorners && !bgPosterUrl && lastCompImg) {
        const fullBackgroundImage = lastCompImg;
        const gradientCount = (
          fullBackgroundImage.match(/(linear-gradient|radial-gradient)\(/g) ||
          []
        ).length;
        const mobileSizes = `${Array(gradientCount).fill("cover").join(", ")}${
          gradientCount ? ", " : ""
        }cover`;
        const mobilePositions = `${Array(gradientCount)
          .fill("center top")
          .join(", ")}${gradientCount ? ", " : ""}center top`;
        return {
          ["--mobile-bg-image" as any]: fullBackgroundImage,
          ["--mobile-bg-size" as any]: mobileSizes,
          ["--mobile-bg-position" as any]: mobilePositions,
        };
      }
    }

    return {
      ["--mobile-bg-image" as any]: "none",
    };
  }, [
    bgPosterUrl,
    style.backgroundImage,
    posterUrl,
    ready,
    disableMobileBackdrop,
    lastCompImg,
    simpleDarkCorners,
  ]);

  const combinedClassName = React.useMemo(() => {
    const classes = [];
    if (className) classes.push(className);
    if (bgPosterUrl) classes.push("poster-background-mobile");
    return classes.join(" ");
  }, [className, bgPosterUrl]);

  const showFixedMobileBackdrop =
    !!bgPosterUrl && isMobile && !disableMobileBackdrop;
  const containerRef = React.useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className={
        (
          (combinedClassName || "") +
          (showFixedMobileBackdrop ? " mobile-fixed" : "")
        ).trim() || undefined
      }
      style={{
        ...style,
        backgroundImage:
          isMobile && !!disableMobileBackdrop
            ? simpleDarkCorners
              ? lastCompImg || "none"
              : "none"
            : simpleDarkCorners
            ? lastCompImg || style.backgroundImage
            : style.backgroundImage,
        backgroundSize:
          isMobile && !!disableMobileBackdrop
            ? simpleDarkCorners
              ? lastCompSize || undefined
              : undefined
            : simpleDarkCorners
            ? lastCompSize || (style as any).backgroundSize
            : (style as any).backgroundSize,
        backgroundPosition:
          isMobile && !!disableMobileBackdrop
            ? simpleDarkCorners
              ? lastCompPos || undefined
              : undefined
            : simpleDarkCorners
            ? lastCompPos || (style as any).backgroundPosition
            : (style as any).backgroundPosition,
        ...(simpleDarkCorners
          ? {
              ["--poster-accent-rgb" as any]: "var(--app-bg-rgb)",
              ["--poster-accent-tl-rgb" as any]: "var(--app-bg-rgb)",
              ["--poster-accent-tr-rgb" as any]: "var(--app-bg-rgb)",
              ["--poster-accent-br-rgb" as any]: "var(--app-bg-rgb)",
              ["--poster-accent-bl-rgb" as any]: "var(--app-bg-rgb)",
              ["--poster-dominant-1-rgb" as any]: "var(--app-bg-rgb)",
              ["--poster-dominant-2-rgb" as any]: "var(--app-bg-rgb)",
            }
          : {}),
        ...mobileBackgroundStyle,
        transition: "none",
      }}
    >
      {showFixedMobileBackdrop && (
        <div
          aria-hidden
          role="presentation"
          className="poster-background-mobile-fixed"
          style={{
            backgroundImage: "var(--mobile-bg-image)",
            backgroundSize: "var(--mobile-bg-size, auto 100svh)",
            backgroundPosition: "var(--mobile-bg-position, center top)",
            backgroundRepeat: "no-repeat",
          }}
        />
      )}
      {children}
      {!ready && <div style={{ height: 0, width: 0 }} />}
    </div>
  );
}
