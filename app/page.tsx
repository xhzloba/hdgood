import type { Metadata } from "next"
import HomeClient from "@/components/home-client"

export const metadata: Metadata = {
  title: "Смотреть фильмы онлайн в хорошем качестве",
  description: "HDGood — новинки кино и лучшие сериалы онлайн без регистрации",
  openGraph: {
    title: "Смотреть фильмы онлайн в хорошем качестве",
    description: "HDGood — новинки кино и лучшие сериалы онлайн без регистрации",
    url: "/",
    siteName: "HDGood",
    locale: "ru_RU",
    type: "website",
    images: [{ url: "/placeholder-logo.png", alt: "HDGood" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Смотреть фильмы онлайн в хорошем качестве",
    description: "HDGood — новинки кино и лучшие сериалы онлайн без регистрации",
    images: ["/placeholder-logo.png"],
  },
}

export default function Home() {
  return <HomeClient />
}
