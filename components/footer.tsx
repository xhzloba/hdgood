"use client"

import Link from "next/link"

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="hidden md:block fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
      <div className="rounded-full bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 px-3.5 py-2 shadow-[0_18px_36px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-4 text-xs">
          <Link href="/" className="flex items-center gap-2 text-zinc-100 hover:text-white">
            <span
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold text-white"
              style={{ backgroundColor: "rgb(var(--ui-accent-rgb))" }}
            >
              HD
            </span>
            <span className="font-semibold tracking-tight">GOOD</span>
          </Link>
          <div className="flex items-center gap-3 text-zinc-300">
            <Link href="/movies" className="hover:text-white transition-colors">Фильмы</Link>
            <Link href="/serials" className="hover:text-white transition-colors">Сериалы</Link>
            <Link href="/uhd" className="hover:text-white transition-colors">4K UHD</Link>
            <Link href="/search" className="hover:text-white transition-colors">Поиск</Link>
            <Link href="/dmca" className="hover:text-white transition-colors">DMCA</Link>
          </div>
          <span className="text-zinc-500/70">© {year}</span>
        </div>
      </div>
    </footer>
  )
}
