import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import NextTopLoader from "nextjs-toploader";
import { ScrollToTop } from "@/components/scroll-to-top";
import { ShortcutNavigator } from "@/components/shortcut-navigator";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://hdgood.vercel.app"),
  title: {
    default: "HDGood",
    template: "%s — HDGood",
  },
  applicationName: "HDGood",
  description: "Смотреть фильмы и сериалы онлайн в хорошем качестве",
  openGraph: {
    title: "HDGood",
    description: "Смотреть фильмы и сериалы онлайн в хорошем качестве",
    url: "/",
    siteName: "HDGood",
    locale: "ru_RU",
    type: "website",
    images: [{ url: "/placeholder-logo.png", alt: "HDGood" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HDGood",
    description: "Смотреть фильмы и сериалы онлайн в хорошем качестве",
    images: ["/placeholder-logo.png"],
  },
};

// Вынесенный viewport экспорт согласно Next.js App Router API
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <head>
        {/* DNS prefetch для ускорения запросов к API */}
        <link rel="dns-prefetch" href="https://api.bhcesh.me" />
        <link rel="dns-prefetch" href="https://api.vokino.pro" />
        <link rel="dns-prefetch" href="https://api.vokino.tv" />
        
        {/* Preconnect для раннего установления соединения */}
        <link rel="preconnect" href="https://api.bhcesh.me" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.vokino.pro" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.vokino.tv" crossOrigin="anonymous" />
      </head>
      <body className={`font-sans antialiased`}>
        <NextTopLoader color="#2563eb" showSpinner={false} height={3} />
        <ScrollToTop />
        {/* Глобальный хоткей: Space+K для открытия /admin */}
        <ShortcutNavigator />
        {children}
        <MobileBottomNav />
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
