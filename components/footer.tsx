"use client"

import Link from "next/link"
import { LogoParticles } from "@/components/logo-particles"

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-10">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="border border-zinc-800 bg-zinc-900/60 rounded-sm backdrop-blur-sm px-4 md:px-6 py-4 md:py-6">
          {/* Десктопный футер — более компактный */}
          <div className="hidden md:flex items-start justify-between gap-10 text-sm text-zinc-400">
            <div className="space-y-2 max-w-md">
              <div className="flex items-center gap-2 text-zinc-100 logo-hdgood">
                <LogoParticles />
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-semibold tracking-wide">
                  HD
                </span>
                <span className="text-base font-semibold tracking-tight">
                  GOOD
                </span>
              </div>
              <p className="text-[12px] leading-relaxed text-zinc-400/80">
                Онлайн-кинотеатр для просмотра фильмов и сериалов в хорошем
                качестве. Каталог с 4K‑разделом и регулярными обновлениями.
              </p>
              <p className="text-[11px] leading-relaxed text-zinc-500">
                Видео и постеры загружаются с внешних сервисов, сайт не хранит
                файлы у себя.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-300/90">
                Разделы
              </div>
              <div className="flex flex-col gap-1.5 text-sm">
                <Link
                  href="/movies"
                  className="text-zinc-300/90 hover:text-white hover:underline underline-offset-4 transition-colors"
                >
                  Фильмы
                </Link>
                <Link
                  href="/serials"
                  className="text-zinc-300/90 hover:text-white hover:underline underline-offset-4 transition-colors"
                >
                  Сериалы
                </Link>
                <Link
                  href="/uhd"
                  className="text-zinc-300/90 hover:text-white hover:underline underline-offset-4 transition-colors"
                >
                  4K UHD
                </Link>
                <Link
                  href="/updates"
                  className="text-zinc-300/90 hover:text-white hover:underline underline-offset-4 transition-colors"
                >
                  Обновления
                </Link>
                <Link
                  href="/search"
                  className="text-zinc-300/90 hover:text-white hover:underline underline-offset-4 transition-colors"
                >
                  Поиск
                </Link>
              </div>
            </div>

            <div className="space-y-1 text-[12px]">
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-300/90">
                Контакты
              </div>
              <p className="text-zinc-400/80">
                По вопросам блокировки материалов и авторских прав:
              </p>
              <p className="text-zinc-300/90">
                Email:{" "}
                <a
                  href="mailto:admin@hdgood.ru"
                  className="text-zinc-100 hover:text-white underline-offset-4 hover:underline"
                >
                  admin@hdgood.ru
                </a>
              </p>
            </div>
          </div>

        {/* Компактный футер для мобильных */}
        <div className="md:hidden flex flex-col gap-2 text-[11px] text-zinc-500 pt-2 border-t border-zinc-800/60 mt-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-zinc-300">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-blue-600 text-[10px] font-semibold">
                HD
              </span>
              <span className="text-xs font-medium tracking-tight">
                GOOD
              </span>
            </span>
            <span className="text-[10px] text-zinc-500">
              © {year} HDGood
            </span>
          </div>
          <p className="leading-relaxed">
            Сайт не хранит видеофайлы, а только предоставляет ссылки на
            сторонние источники.
          </p>
        </div>

        <div className="mt-4 md:mt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 border-t border-zinc-800/80 pt-2">
          <p className="text-[11px] text-zinc-500">
            © {year} HDGood. Все права на видеоматериалы принадлежат их
            правообладателям.
          </p>
          <p className="text-[11px] text-zinc-600">
            Используя сайт, вы подтверждаете, что ознакомились с условиями
            использования и политикой авторских прав.
          </p>
        </div>
        </div>
      </div>
    </footer>
  )
}


