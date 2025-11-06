import { PosterBackground } from "@/components/poster-background"

// Простая dev-страница для визуальной проверки извлечения двух доминирующих цветов
// Используем data URI SVG с двумя доминирующими половинами (красная/синяя)
// и несколькими акцентами, чтобы проверить угловые акценты и глобальный тон.

const svgPoster = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200">
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#d93025"/>
        <stop offset="50%" stop-color="#d93025"/>
        <stop offset="50%" stop-color="#2563eb"/>
        <stop offset="100%" stop-color="#2563eb"/>
      </linearGradient>
    </defs>
    <rect width="800" height="1200" fill="url(#grad)" />
    <!-- Акцент в левом нижнем углу -->
    <circle cx="160" cy="980" r="120" fill="#f59e0b" opacity="0.9"/>
    <!-- Акцент в правом верхнем углу -->
    <rect x="560" y="100" width="160" height="160" fill="#10b981" opacity="0.85"/>
    <!-- Лёгкая текстура, чтобы избежать полностью плоских областей -->
    <g opacity="0.15">
      <rect x="0" y="0" width="800" height="1200" fill="#000"/>
    </g>
  </svg>
`)

const dataUrl = `data:image/svg+xml;utf8,${svgPoster}`

export default function DevPosterPage() {
  return (
    <PosterBackground posterUrl={dataUrl} bgPosterUrl={dataUrl} className="min-h-[100vh]">
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-10 space-y-6">
        <h1 className="text-2xl font-semibold text-white">Проверка доминирующих цветов постера</h1>
        <p className="text-sm text-zinc-300">Эта страница использует встроенный SVG, чтобы гарантировать корректную работу извлечения цветов (включая CORS-безопасность). Слева — красный, справа — синий; в углах — дополнительные акценты (оранжевый, зелёный).</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded border border-zinc-700 bg-zinc-900/60">
            <div className="text-xs text-zinc-400 mb-2">Dominant #1</div>
            <div style={{ width: 64, height: 64, backgroundColor: "rgba(var(--poster-dominant-1-rgb), 1)" }} />
          </div>
          <div className="p-4 rounded border border-zinc-700 bg-zinc-900/60">
            <div className="text-xs text-zinc-400 mb-2">Dominant #2</div>
            <div style={{ width: 64, height: 64, backgroundColor: "rgba(var(--poster-dominant-2-rgb), 1)" }} />
          </div>
          <div className="p-4 rounded border border-zinc-700 bg-zinc-900/60">
            <div className="text-xs text-zinc-400 mb-2">Accent TL</div>
            <div style={{ width: 64, height: 64, backgroundColor: "rgba(var(--poster-accent-tl-rgb), 1)" }} />
          </div>
          <div className="p-4 rounded border border-zinc-700 bg-zinc-900/60">
            <div className="text-xs text-zinc-400 mb-2">Accent BR</div>
            <div style={{ width: 64, height: 64, backgroundColor: "rgba(var(--poster-accent-br-rgb), 1)" }} />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            className="px-4 py-2 rounded border text-white"
            style={{
              borderColor: "rgba(var(--poster-accent-tl-rgb), 0.35)",
              backgroundImage:
                "linear-gradient(90deg, rgba(var(--poster-dominant-1-rgb),0.45), rgba(var(--poster-dominant-2-rgb),0.45))",
            }}
          >
            Кнопка на доминирующих цветах
          </button>
          <div className="text-xs text-zinc-400">Градиенты применяются к фону и кнопке. Смотри плавные оверлеи.</div>
        </div>
      </div>
    </PosterBackground>
  )
}