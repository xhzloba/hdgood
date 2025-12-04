import type { Metadata } from "next"
import HomeClient from "@/components/home-client"
import { cookies } from "next/headers"

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

export default async function Home() {
  const cookieStore = await cookies()
  const cardDisplayMode = cookieStore.get("desktop_home_card_display_mode")?.value as "backdrop" | "poster" | undefined
  const showPosterMetadataCookie = cookieStore.get("desktop_show_poster_metadata")?.value
  const showPosterMetadata = showPosterMetadataCookie === "false" ? false : true

  return <HomeClient 
    initialCardDisplayMode={cardDisplayMode || "backdrop"} 
    initialShowPosterMetadata={showPosterMetadata}
  />
}
