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
  const recognitionRef = useRef<any>(null)
  const finalTextRef = useRef<string>("")
  const autoSubmittedRef = useRef<boolean>(false)
  useEffect(() => {
    const q = params.get("q") || ""
    setQuery(q)
  }, [params])
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    const url = q ? `/search?q=${encodeURIComponent(q)}` : "/search"
    router.push(url)
  }
  const submitVoiceQuery = (text: string) => {
    const q = text.trim()
    if (!q) return
    if (autoSubmittedRef.current) return
    autoSubmittedRef.current = true
    try { recognitionRef.current?.stop() } catch {}
    setIsListening(false)
    const url = `/search?q=${encodeURIComponent(q)}`
    router.push(url)
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
            let hadFinal = false
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const result = e.results[i]
              const transcript = result?.[0]?.transcript || ""
              if (result.isFinal) { final += transcript + " "; hadFinal = true }
              else interim += transcript
            }
            finalTextRef.current = final
            const combined = (final + interim).trim()
            if (combined) {
              setQuery(combined)
              if (hadFinal && !autoSubmittedRef.current) {
                submitVoiceQuery(combined)
              }
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
          if (text && !autoSubmittedRef.current) submitVoiceQuery(text)
        }
        rec.onstart = () => {
          finalTextRef.current = ""
          setIsListening(true)
          autoSubmittedRef.current = false
          autoSubmittedRef.current = false
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
    autoSubmittedRef.current = false
  }, [])
  return (
    <form onSubmit={onSubmit} className="mx-auto w-full md:w-[680px]">
      <div className="relative">
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
            className="h-10 px-4 rounded-full text-white shadow-md hover:opacity-90 active:opacity-95 disabled:opacity-100 disabled:cursor-not-allowed"
            style={{ backgroundColor: "rgb(var(--ui-accent-rgb))" }}
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
        <div className="relative z-30 hidden md:flex justify-center mt-[13vh] h-[96px]">
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
