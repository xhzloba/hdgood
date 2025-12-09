import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import NextTopLoader from "nextjs-toploader";
import { ScrollToTop } from "@/components/scroll-to-top";
import { ShortcutNavigator } from "@/components/shortcut-navigator";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { Toaster } from "@/components/ui/toaster";
import { CursorPopcorn } from "@/components/cursor-popcorn";
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
  manifest: "/manifest.webmanifest",
  themeColor: "#0f172a",
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
    <html lang="ru" className="dark" suppressHydrationWarning>
      <head>
        {/* DNS prefetch для ускорения запросов к API */}
        <link rel="dns-prefetch" href="https://api.bhcesh.me" />
        <link rel="dns-prefetch" href="https://api.vokino.pro" />
        <link rel="dns-prefetch" href="https://api.vokino.tv" />
        
        {/* Preconnect для раннего установления соединения */}
        <link rel="preconnect" href="https://api.bhcesh.me" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.vokino.pro" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.vokino.tv" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var m=document.cookie.match(/(?:^|; )ui:accentTheme=([^;]+)/);var c=m?decodeURIComponent(m[1]):null;var t=localStorage.getItem('ui:accentTheme')||c||'blue';if(t!=='red'&&t!=='blue'){t='blue'}localStorage.setItem('ui:accentTheme', t);var v=(t==='red')?'244, 63, 94':'29, 78, 216';document.documentElement.style.setProperty('--ui-accent-rgb', v);}catch(e){}})();",
          }}
        />
      </head>
      <body className={`font-sans antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var ss=window.sessionStorage;if(ss&&ss.getItem('toploader:silentOnce')==='1'){ss.removeItem('toploader:silentOnce');var r=document.documentElement;r.setAttribute('data-toploader','silent');setTimeout(function(){try{r.removeAttribute('data-toploader');}catch(e){}},800);} }catch(e){}})();",
          }}
        />
        <NextTopLoader color="rgb(var(--ui-accent-rgb))" showSpinner={false} height={3} />
        <ScrollToTop />
        <CursorPopcorn />
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
