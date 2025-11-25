import { HeaderCategories } from "@/components/header-categories";
import Link from "next/link";

export default function DmcaPage() {
  return (
    <div className="min-h-[100dvh] min-h-screen">
      <main className="mx-auto max-w-7xl px-0 md:px-6 pt-6 pb-6">
        <div className="mb-4 hidden md:block">
          <HeaderCategories variant="horizontal" />
        </div>
        <section className="min-h-[70vh] flex items-center justify-center">
          <div className="w-full max-w-2xl px-6">
            <h1 className="text-xl md:text-2xl font-semibold text-zinc-200">DMCA</h1>
            <p className="mt-2 text-xs text-zinc-400">Политика удаления контента по запросам правообладателей</p>
            <div className="mt-5 space-y-4 text-sm text-zinc-300">
              <p>
                Мы уважаем права интеллектуальной собственности и оперативно реагируем на обоснованные уведомления о нарушении в соответствии с Digital Millennium Copyright Act (DMCA).
              </p>
              <p>
                Если вы являетесь правообладателем и считаете, что какой-либо материал нарушает ваши права, отправьте уведомление с указанием идентификатора материала, ссылки на страницу и подтверждением ваших прав.
              </p>
              <div className="flex items-center gap-2 text-zinc-400">
                <span>Обложки, постеры и информация берутся из</span>
                <Link
                  href="https://www.themoviedb.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                  style={{ color: "rgb(var(--ui-accent-rgb))" }}
                >
                  TMDB
                </Link>
                <img
                  src="https://pbs.twimg.com/profile_images/1243623122089041920/gVZIvphd_400x400.jpg"
                  alt="TMDB"
                  className="h-5 w-5 rounded"
                  style={{ boxShadow: "0 0 0 2px rgba(var(--ui-accent-rgb), 0.5)" }}
                />
              </div>
              <div className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs text-white"
                style={{ backgroundImage: "linear-gradient(90deg, rgba(var(--ui-accent-rgb), 0.92), rgba(var(--ui-accent-rgb), 0.78))" }}
              >
                <span>Email:</span>
                <Link href="mailto:zlobajs163@gmail.com" className="hover:underline">zlobajs163@gmail.com</Link>
              </div>
              <p
                className="text-sm"
                style={{ color: "rgb(var(--ui-accent-rgb))" }}
              >
                Мы не размещаем и не храним видеоконтент (фильмы и сериалы) на наших серверах; сайт предоставляет информацию и ссылки на сторонние источники.
              </p>
              <p className="text-zinc-400">
                После получения корректного уведомления мы можем временно ограничить доступ к материалу и предпримем необходимые действия в разумные сроки.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
