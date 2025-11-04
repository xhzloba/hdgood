"use client"

import React from "react"

type PosterBackgroundProps = {
  posterUrl?: string | null
  bgPosterUrl?: string | null
  children?: React.ReactNode
  className?: string
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }
  return [h * 360, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360
  let r: number, g: number, b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

function refineColor(rgb: [number, number, number]): [number, number, number] {
  const [r, g, b] = rgb
  let [h, s, l] = rgbToHsl(r, g, b)
  // Аккуратно усиливаем насыщенность, если цвет слишком тусклый
  if (s < 0.2) s = Math.min(1, s * 1.3)
  // Контролируем светлоту, чтобы избежать слишком тёмных/светлых пятен
  if (l > 0.88) l = 0.75
  if (l < 0.18) l = 0.25
  return hslToRgb(h, s, l)
}

function getCornerColors(img: HTMLImageElement): { tl: [number, number, number]; br: [number, number, number]; bl: [number, number, number] } {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  const w = 128
  const h = 128
  canvas.width = w
  canvas.height = h
  if (!ctx) return { tl: [64, 64, 64], br: [64, 64, 64], bl: [64, 64, 64] }
  // Отключаем сглаживание при даунскейле, чтобы не размывать насыщенный текст/каймы в окрестности
  // (иначе яркие акцентные пиксели могут «растекаться» и искажать доминирующий цвет)
  // @ts-ignore
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, 0, 0, w, h)
  const image = ctx.getImageData(0, 0, w, h)
  const data = image.data

  // Глобальный анализ: определяем, преобладает ли нейтральная (серая/чёрно-белая) палитра или какой-то цветовой тон (например, красный)
  function computeGlobalTone():
    | { mode: "neutral"; color: [number, number, number]; neutralShare: number }
    | { mode: "colored"; color: [number, number, number]; hueBin: number; hueShare: number }
    | null {
    let total = 0
    let neutralCount = 0
    let neutralRSum = 0,
      neutralGSum = 0,
      neutralBSum = 0
    const bins = 12 // 30° шаг по тону
    const hueBins: Array<{ count: number; rSum: number; gSum: number; bSum: number; sSum: number; lSum: number }> = Array.from(
      { length: bins },
      () => ({ count: 0, rSum: 0, gSum: 0, bSum: 0, sSum: 0, lSum: 0 })
    )
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4
        const a = data[idx + 3]
        if (a < 128) continue
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        const [hue, s, l] = rgbToHsl(r, g, b)
        total++
        if (s < 0.12) {
          // Нейтральный пиксель (включая белые/чёрные/серые)
          neutralCount++
          neutralRSum += r
          neutralGSum += g
          neutralBSum += b
        } else {
          // Цветной пиксель – учитываем в соответствующей hue-bin
          const hh = ((hue % 360) + 360) % 360
          const bin = Math.min(bins - 1, Math.floor(hh / (360 / bins)))
          const e = hueBins[bin]
          e.count++
          e.rSum += r
          e.gSum += g
          e.bSum += b
          e.sSum += s
          e.lSum += l
        }
      }
    }
    if (total === 0) return null
    const neutralShare = neutralCount / total
    const coloredCount = total - neutralCount
    let topBin = -1
    let topCount = 0
    for (let i = 0; i < bins; i++) {
      if (hueBins[i].count > topCount) {
        topCount = hueBins[i].count
        topBin = i
      }
    }
    const hueShare = topBin >= 0 ? topCount / total : 0
    // Правило выбора:
    // - Если нейтральная доля велика (>= 60%) — считаем постер нейтральным и берём серый.
    // - Иначе, если у доминирующего тона приличная доля (>= 25%) — считаем постер цветным с этим тоном.
    // - Иначе возвращаем null и используем угловые акценты как есть.
    if (neutralShare >= 0.6) {
      const nCount = Math.max(1, neutralCount)
      return {
        mode: "neutral",
        color: [Math.round(neutralRSum / nCount), Math.round(neutralGSum / nCount), Math.round(neutralBSum / nCount)],
        neutralShare,
      }
    }
    if (topBin >= 0 && hueShare >= 0.25 && coloredCount > 0) {
      const e = hueBins[topBin]
      const c = Math.max(1, e.count)
      return {
        mode: "colored",
        color: [Math.round(e.rSum / c), Math.round(e.gSum / c), Math.round(e.bSum / c)],
        hueBin: topBin,
        hueShare,
      }
    }
    return null
  }

  function dominantColorInRegion(x0: number, y0: number, x1: number, y1: number): [number, number, number] {
    const bin = 24 // шаг квантования для укрупнения палитры
    const freq = new Map<string, { count: number; rSum: number; gSum: number; bSum: number; sSum: number; lSum: number }>()
    let rTot = 0, gTot = 0, bTot = 0, cTot = 0
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = (y * w + x) * 4
        const a = data[idx + 3]
        if (a < 128) continue
        const r = data[idx], g = data[idx + 1], b = data[idx + 2]
        const [_, s, l] = rgbToHsl(r, g, b)
        // Отбрасываем явные белые/серые пиксели, чтобы палитра была ближе к реальным цветам постера
        if (s < 0.08 && l > 0.9) continue
        // Отбрасываем почти чёрные нейтральные (чтобы они не «заглушали» акценты)
        if (s < 0.06 && l < 0.12) continue
        const key = `${Math.floor(r / bin)}-${Math.floor(g / bin)}-${Math.floor(b / bin)}`
        const entry = freq.get(key) || { count: 0, rSum: 0, gSum: 0, bSum: 0, sSum: 0, lSum: 0 }
        entry.count++
        entry.rSum += r
        entry.gSum += g
        entry.bSum += b
        entry.sSum += s
        entry.lSum += l
        freq.set(key, entry)
        rTot += r
        gTot += g
        bTot += b
        cTot++
      }
    }
    if (freq.size > 0) {
      const entries = [...freq.values()].map((e) => {
        const avgS = e.sSum / Math.max(1, e.count)
        const avgL = e.lSum / Math.max(1, e.count)
        const share = e.count / Math.max(1, cTot)
        return { ...e, avgS, avgL, share }
      })
      // Слегка игнорируем совсем крошечные кластеры (<0.5%), чтобы текст не побеждал
      let pool = entries.filter((e) => e.share >= 0.005)
      if (pool.length === 0) pool = entries

      // Скоринговая функция: предпочитаем более насыщенные, но учитываем и размер кластера
      const score = (e: typeof pool[number]) => e.count * (0.7 + 0.6 * Math.pow(e.avgS, 1.1))
      pool.sort((a, b) => score(b) - score(a))

      let chosen = pool[0]
      // Если победитель почти нейтральный, но рядом есть умеренно насыщенный кластер с достаточной долей — выберем его
      if (chosen && chosen.avgS < 0.12) {
        const alt = pool
          .filter((e) => e.avgS >= 0.3 && e.share >= 0.01)
          .sort((a, b) => score(b) - score(a))[0]
        if (alt) chosen = alt
      }

      return [
        Math.round(chosen.rSum / chosen.count),
        Math.round(chosen.gSum / chosen.count),
        Math.round(chosen.bSum / chosen.count),
      ]
    }
    if (cTot === 0) return [64, 64, 64]
    return [Math.round(rTot / cTot), Math.round(gTot / cTot), Math.round(bTot / cTot)]
  }

  // Вводим внутренние отступы от границ, чтобы не захватывать текст/каймы у краёв
  const m = Math.floor(w * 0.08)
  const tlRaw = dominantColorInRegion(m, m, Math.floor(w * 0.5) - m, Math.floor(h * 0.5) - m)
  const brRaw = dominantColorInRegion(Math.floor(w * 0.5) + m, Math.floor(h * 0.5) + m, w - m, h - m)
  const blRaw = dominantColorInRegion(m, Math.floor(h * 0.5) + m, Math.floor(w * 0.5) - m, h - m)

  // По умолчанию – угловые акценты
  let tl = refineColor(tlRaw)
  let br = refineColor(brRaw)
  let bl = refineColor(blRaw)

  // Если есть глобальная доминанта (красный/серый и т.п.), используем её для унификации
  const globalTone = computeGlobalTone()
  if (globalTone) {
    if (globalTone.mode === "neutral") {
      const g = refineColor(globalTone.color)
      tl = g
      br = g
      bl = g
    } else if (globalTone.mode === "colored") {
      const g = refineColor(globalTone.color)
      tl = g
      br = g
      bl = g
    }
  }
  return { tl, br, bl }
}

export function PosterBackground({ posterUrl, bgPosterUrl, children, className }: PosterBackgroundProps) {
  const [colors, setColors] = React.useState<{ tl: [number, number, number]; br: [number, number, number]; bl: [number, number, number] } | null>(null)
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    if (!posterUrl) return
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const colors = getCornerColors(img)
      setColors(colors)
      setReady(true)
    }
    img.onerror = () => {
      setReady(true)
    }
    img.src = posterUrl
  }, [posterUrl])

  const style: React.CSSProperties = React.useMemo(() => {
    const baseStyle: React.CSSProperties = {}
    
    // Добавляем bg_poster как фоновое изображение, если оно есть
    if (bgPosterUrl) {
      // Если цвета еще не готовы, показываем только базовые темные оверлеи
      // Если цвета готовы или posterUrl отсутствует, показываем полный фон
      const shouldShowBackground = !posterUrl || ready
      
      if (shouldShowBackground) {
        baseStyle.backgroundImage = `url(${bgPosterUrl})`
        baseStyle.backgroundSize = 'cover'
        baseStyle.backgroundPosition = '60% center' // Смещение вправо
        baseStyle.backgroundRepeat = 'no-repeat'
        // Добавляем backgroundAttachment: 'fixed' для десктопа (будет отключено на мобильных через CSS)
        baseStyle.backgroundAttachment = 'fixed'
        
        // Добавляем полупрозрачный оверлей поверх bg_poster
        const overlayGradients = [
          'linear-gradient(135deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0.6) 100%)',
          // Дополнительное затемнение в центре для читаемости текста
          'radial-gradient(ellipse 80% 60% at center, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.5) 60%, transparent 100%)'
        ]
        
        if (colors) {
          const [rtl, gtl, btl] = colors.tl
          const [rbr, gbr, bbr] = colors.br
          const [rbl, gbl, bbl2] = colors.bl
          
          // Увеличиваем яркость и насыщенность цветов для лучшей видимости
          const enhanceColor = (r: number, g: number, b: number) => {
            const [h, s, l] = rgbToHsl(r, g, b)
            
            // Проверяем, является ли цвет серым (низкая насыщенность)
            const isGrayish = s < 0.15
            
            // Для серых цветов не увеличиваем насыщенность, чтобы избежать нежелательных оттенков
            const enhancedS = isGrayish ? s : Math.min(1, s + 0.3)
            // Для серых цветов увеличиваем только яркость
            const enhancedL = Math.min(0.8, l + (isGrayish ? 0.1 : 0.2))
            
            return hslToRgb(h, enhancedS, enhancedL)
          }
          
          const [ertl, egtl, ebtl] = enhanceColor(rtl, gtl, btl)
          const [erbr, egbr, ebbr] = enhanceColor(rbr, gbr, bbr)
          const [erbl, egbl, ebbl2] = enhanceColor(rbl, gbl, bbl2)
          
          const accentTL = `rgba(${ertl}, ${egtl}, ${ebtl}, 0.9)`
          const accentBR = `rgba(${erbr}, ${egbr}, ${ebbr}, 0.9)`
          const accentBL = `rgba(${erbl}, ${egbl}, ${ebbl2}, 0.9)`
          const ar = Math.round((ertl + erbr + erbl) / 3)
          const ag = Math.round((egtl + egbr + egbl) / 3)
          const ab = Math.round((ebtl + ebbr + ebbl2) / 3)
          const accentSoft = `rgba(${ar}, ${ag}, ${ab}, 0.5)`
          
          overlayGradients.push(
            `radial-gradient( 1600px 800px at 0% 0%, ${accentTL}, transparent )`,
            `radial-gradient( 1600px 800px at 0% 100%, ${accentBL}, transparent )`,
            `radial-gradient( 1600px 800px at 100% 100%, ${accentBR}, transparent )`,
            `linear-gradient(180deg, ${accentSoft}, rgba(24,24,27,0.2) 60%)`
          )
          
          // Expose accent color for children via CSS variable
          ;(baseStyle as any)["--poster-accent-rgb"] = `${ar}, ${ag}, ${ab}`
          ;(baseStyle as any)["--poster-accent-tl-rgb"] = `${ertl}, ${egtl}, ${ebtl}`
          ;(baseStyle as any)["--poster-accent-br-rgb"] = `${erbr}, ${egbr}, ${ebbr}`
          ;(baseStyle as any)["--poster-accent-bl-rgb"] = `${erbl}, ${egbl}, ${ebbl2}`
        }
        
        baseStyle.backgroundImage = `${overlayGradients.join(', ')}, url(${bgPosterUrl})`
      } else {
        // Пока цвета не готовы, показываем только темный фон
        baseStyle.backgroundColor = 'rgba(0, 0, 0, 0.98)'
      }
      
      return baseStyle
    }
    
    // Если нет bg_poster, используем старую логику
    if (!colors) return baseStyle
    const [rtl, gtl, btl] = colors.tl
    const [rbr, gbr, bbr] = colors.br
    const [rbl, gbl, bbl2] = colors.bl
    const accentTL = `rgba(${rtl}, ${gtl}, ${btl}, 0.6)`
    const accentBR = `rgba(${rbr}, ${gbr}, ${bbr}, 0.6)`
    const accentBL = `rgba(${rbl}, ${gbl}, ${bbl2}, 0.6)`
    const ar = Math.round((rtl + rbr + rbl) / 3)
    const ag = Math.round((gtl + gbr + gbl) / 3)
    const ab = Math.round((btl + bbr + bbl2) / 3)
    const accentSoft = `rgba(${ar}, ${ag}, ${ab}, 0.25)`
    return {
      ...baseStyle,
      backgroundImage: [
        `radial-gradient( 1600px 800px at 0% 0%, ${accentTL}, transparent )`,
        `radial-gradient( 1600px 800px at 0% 100%, ${accentBL}, transparent )`,
        `radial-gradient( 1600px 800px at 100% 100%, ${accentBR}, transparent )`,
        `linear-gradient(180deg, ${accentSoft}, rgba(24,24,27,0.4) 60%)`,
      ].join(", "),
      // Убираем backgroundAttachment: "fixed" для мобильных устройств
      backgroundRepeat: "no-repeat, no-repeat, no-repeat, no-repeat",
      // Expose accent color for children via CSS variable
      ["--poster-accent-rgb" as any]: `${ar}, ${ag}, ${ab}`,
      ["--poster-accent-tl-rgb" as any]: `${rtl}, ${gtl}, ${btl}`,
      ["--poster-accent-br-rgb" as any]: `${rbr}, ${gbr}, ${bbr}`,
      ["--poster-accent-bl-rgb" as any]: `${rbl}, ${gbl}, ${bbl2}`,
    }
  }, [colors, bgPosterUrl])

  // Создаем стили для псевдоэлемента на мобильных устройствах
  const mobileBackgroundStyle = React.useMemo(() => {
    if (!bgPosterUrl) return {}
    
    // Показываем мобильный фон только когда цвета готовы или posterUrl отсутствует
    const shouldShowBackground = !posterUrl || ready
    
    if (shouldShowBackground) {
      // Получаем полный backgroundImage из style для мобильных
      const fullBackgroundImage = style.backgroundImage || `url(${bgPosterUrl})`
      
      return {
        ['--mobile-bg-image' as any]: fullBackgroundImage,
      }
    }
    
    return {
      ['--mobile-bg-image' as any]: 'none',
    }
  }, [bgPosterUrl, style.backgroundImage, posterUrl, ready])

  const combinedClassName = React.useMemo(() => {
    const classes = []
    if (className) classes.push(className)
    if (bgPosterUrl) classes.push('poster-background-mobile')
    return classes.join(' ')
  }, [className, bgPosterUrl])

  return (
    <div 
      className={combinedClassName || undefined} 
      style={{
        ...style, 
        ...mobileBackgroundStyle,
        // Добавляем плавный переход для фона
        transition: 'background-image 0.5s ease-in-out, background-color 0.5s ease-in-out'
      }}
    >
      {children}
      {!ready && <div style={{ height: 0, width: 0 }} />}
    </div>
  )
}