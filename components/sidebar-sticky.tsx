"use client"

import { useEffect, useState, type ReactNode } from "react"

interface SidebarStickyProps {
  children: ReactNode
  className?: string
}

export function SidebarSticky({ children, className = "" }: SidebarStickyProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const base = "md:sticky md:self-start"
  const atTop = "md:top-4"
  const centered = "md:top-1/2 md:-translate-y-1/2"

  return (
    <aside className={`${base} ${scrolled ? centered : atTop} ${className}`}>
      {children}
    </aside>
  )
}