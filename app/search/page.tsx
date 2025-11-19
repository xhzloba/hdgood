"use client"

import { useState, useEffect, Suspense, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { HeaderCategories } from "@/components/header-categories"
import { MovieGrid } from "@/components/movie-grid"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PosterBackground } from "@/components/poster-background"
import { IconMicrophone } from "@tabler/icons-react"

function SearchForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [query, setQuery] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isVoicePending, setIsVoicePending] = useState(false)
  const recognitionRef = useRef<any>(null)
  const finalTextRef = useRef<string>("")
  const autoSubmittedRef = useRef<boolean>(false)
  const debounceTimerRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const textMeasureRef = useRef<HTMLSpanElement | null>(null)
  useEffect(() => {
    const q = params.get("q") || ""
    setQuery(q)
  }, [params])
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    setIsVoicePending(false)
    const q = query.trim()
    const url = q ? `/search?q=${encodeURIComponent(q)}` : "/search"
    router.push(url)
  }
  const scheduleAutoSubmit = (text: string) => {
    try {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      setIsVoicePending(true)
      debounceTimerRef.current = window.setTimeout(() => {
        if (autoSubmittedRef.current) return
        autoSubmittedRef.current = true
        try { recognitionRef.current?.stop() } catch {}
        setIsListening(false)
        const url = `/search?q=${encodeURIComponent(text)}`
        router.push(url)
      }, 2000)
    } catch {}
  }

  const startVoice = () => {
    try {
      const SR = (window as any).webkitSpeechRecognition
      if (!SR) {
        alert("Голосовой ввод не поддерживается в этом браузере.")
        return
      }
      if (!recognitionRef.current) {
        const rec = new SR()
        rec.lang = "ru-RU"
        rec.interimResults = true
        rec.maxAlternatives = 1
        rec.continuous = true
        rec.onresult = (e: any) => {
          try {
            let interim = ""
            let final = finalTextRef.current
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const result = e.results[i]
              const transcript = result?.[0]?.transcript || ""
              if (result.isFinal) final += transcript + " "
              else interim += transcript
            }
            finalTextRef.current = final
            const combined = (final + interim).trim()
            if (combined) {
              setQuery(combined)
              scheduleAutoSubmit(combined)
            }
          } catch {}
        }
        rec.onerror = (ev: any) => {
          setIsListening(false)
          try {
            const name = ev?.error || "error"
            if (name === "not-allowed") alert("Доступ к микрофону запрещён. Разреши доступ в настройках браузера.")
          } catch {}
        }
        rec.onend = () => {
          setIsListening(false)
          const text = (finalTextRef.current || query).trim()
          if (text) scheduleAutoSubmit(text)
        }
        rec.onstart = () => {
          finalTextRef.current = ""
          setIsListening(true)
          autoSubmittedRef.current = false
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
            debounceTimerRef.current = null
          }
          setIsVoicePending(false)
        }
        recognitionRef.current = rec
      }
      finalTextRef.current = ""
      autoSubmittedRef.current = false
      recognitionRef.current.start()
    } catch {
      setIsListening(false)
    }
  }
  useEffect(() => {
    const handleFirstLoaded = () => {
      try {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
          debounceTimerRef.current = null
        }
        setIsVoicePending(false)
      } catch {}
    }
    if (typeof window !== "undefined") {
      window.addEventListener("search:firstResultsLoaded", handleFirstLoaded)
    }
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
      setIsVoicePending(false)
      if (typeof window !== "undefined") {
        window.removeEventListener("search:firstResultsLoaded", handleFirstLoaded)
      }
    }
  }, [])
  return (
    <form onSubmit={onSubmit} className="mx-auto w-full md:w-[680px]">
      <div className="relative" ref={containerRef}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск фильмов и сериалов"
          aria-label="Поиск"
          className="h-12 pl-10 pr-28 rounded-full bg-zinc-900/60 border border-zinc-800/70 text-zinc-100 placeholder:text-zinc-400 focus-visible:ring-ring/50"
        />
        <span ref={textMeasureRef} className="absolute opacity-0 pointer-events-none whitespace-pre px-0 font-normal text-[14px] md:text-[16px]">
          {query}
        </span>
        {isVoicePending && (() => {
          const textW = textMeasureRef.current?.offsetWidth || 0
          const containerW = containerRef.current?.offsetWidth || 0
          const textStart = 40 // pl-10
          const gap = 12
          const reservedRight = 120 // место под кнопки справа
          const left = Math.min(textStart + textW + gap, Math.max(textStart + gap, containerW - reservedRight))
          return (
            <div className="absolute top-1/2 -translate-y-1/2" style={{ left }}>
              <span className="inline-block h-4 w-4 rounded-full border-2 border-zinc-400/60 border-t-transparent animate-spin" />
            </div>
          )
        })()}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <button
            type="button"
            aria-label="Голосовой ввод"
            onClick={startVoice}
            className={`${isListening ? "text-red-600" : "text-zinc-300"} p-0 bg-transparent border-0 h-auto w-auto hover:text-zinc-100`}
          >
            <IconMicrophone size={18} />
          </button>
          <Button
            type="submit"
            disabled={!query.trim()}
            className="h-10 px-4 rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:text-white active:bg-blue-800 active:text-white disabled:bg-blue-600 disabled:text-white disabled:opacity-100 disabled:cursor-not-allowed"
          >
            Найти
          </Button>
        </div>
      </div>
    </form>
  )
}

function SearchResults() {
  const params = useSearchParams()
  const q = (params.get("q") || "").trim()
  if (!q) return null
  const apiUrl = `/api/search?q=${encodeURIComponent(q)}`
  return (
    <div className="mt-6">
      <MovieGrid url={apiUrl} />
    </div>
  )
}

export default function SearchPage() {
  const [logoSrc, setLogoSrc] = useState<string | null>(null)
  const [logoId, setLogoId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const ss = typeof window !== "undefined" ? window.sessionStorage : null
      if (!ss) return
      const src = ss.getItem("homeBackdrop:lastLogoSrc")
      const id = ss.getItem("homeBackdrop:lastLogoId")
      setLogoSrc(src)
      setLogoId(id)
    } catch {}
  }, [])

  return (
    <PosterBackground disableMobileBackdrop simpleDarkCorners softBottomFade className="min-h-[100dvh] min-h-screen">
      <main className="mx-auto max-w-7xl px-0 md:px-6 pt-0 md:pt-6 pb-16 md:pb-10 relative">
        <div className="mb-4 hidden md:block">
          <HeaderCategories variant="horizontal" className="!bg-transparent !border-transparent relative z-40" />
        </div>
        <div className="relative z-30 hidden md:flex justify-center mt-[22vh] h-[96px]">
          {logoSrc && logoId ? (
            <Link href={`/movie/${logoId}`} className="block">
              <img src={logoSrc} alt="Логотип" className="h-[96px] w-auto max-w-[80vw]" />
            </Link>
          ) : null}
        </div>
        <section className="relative">
          <div className="relative z-20">
            <div className="p-5">
              <div className="mt-3 md:mt-4">
                <Suspense fallback={null}>
                  <SearchForm />
                </Suspense>
              </div>
              <div className="mt-4">
                <Suspense fallback={null}>
                  <SearchResults />
                </Suspense>
              </div>
            </div>
          </div>
        </section>
      </main>
    </PosterBackground>
  )
}
