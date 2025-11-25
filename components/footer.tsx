"use client"

import Link from "next/link"

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="hidden md:block fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
      <div
        className="group relative overflow-hidden rounded-full bg-zinc-900/50 px-4 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_18px_36px_rgba(0,0,0,0.55)]"
        style={{
          WebkitMaskImage: "radial-gradient(120% 100% at 50% 50%, black 60%, transparent 100%)",
          maskImage: "radial-gradient(120% 100% at 50% 50%, black 60%, transparent 100%)",
          backdropFilter: "blur(8px) saturate(1.4)",
          WebkitBackdropFilter: "blur(8px) saturate(1.4)",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 opacity-0 peer-hover/link:opacity-45 transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(80% 60% at 50% 50%, rgba(255,255,255,0.12), rgba(255,255,255,0) 60%)",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 opacity-0 peer-hover/link:opacity-45 transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 50%, rgba(255,255,255,0.12), rgba(255,255,255,0) 62%)",
          }}
        />

        <div className="relative z-10 flex items-center gap-4 text-xs">
          <Link href="/" className="peer/link flex items-center gap-2 text-zinc-100 hover:text-white">
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold text-white"
              style={{ backgroundColor: "rgb(var(--ui-accent-rgb))" }}
            >
              HD
            </span>
            <span className="font-semibold tracking-tight">GOOD</span>
          </Link>
          <div className="flex items-center gap-3 text-zinc-300">
            <Link href="/movies" className="peer/link hover:text-white transition-colors">Фильмы</Link>
            <Link href="/serials" className="peer/link hover:text-white transition-colors">Сериалы</Link>
            <Link href="/uhd" className="peer/link hover:text-white transition-colors">4K UHD</Link>
            <Link href="/search" className="peer/link hover:text-white transition-colors">Поиск</Link>
            <Link href="/dmca" className="peer/link hover:text-white transition-colors">DMCA</Link>
          </div>
          <span className="text-zinc-500/70">© {year}</span>
        </div>

        
      </div>
    </footer>
  )
}
