import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const id = params?.id ?? "";
  let name = "";
  let year: string | null = null;
  let description = "";
  let poster: string | undefined;

  try {
    const res = await fetch(`https://api.vokino.pro/v2/view/${id}`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      next: { revalidate: 600 },
    });
    if (res.ok) {
      const json = await res.json();
      const d = json?.details ?? json ?? {};
      const rawName = d?.name ?? json?.name ?? "";
      name = typeof rawName === "string" ? rawName : String(rawName || "").trim();
      const rawYear = d?.year ?? d?.released ?? d?.release_year ?? d?.releaseYear;
      if (rawYear != null) {
        const s = String(rawYear).trim();
        const m = s.match(/\d{4}/);
        year = m ? m[0] : s || null;
      }
      const descRaw = json?.about ?? json?.description ?? d?.about ?? d?.description;
      if (Array.isArray(descRaw)) {
        description = descRaw.filter(Boolean).join(" ").trim();
      } else {
        description = String(descRaw || "").trim();
      }
      poster = d?.poster ?? json?.poster;
    }
  } catch {}

  const title = ["Смотреть онлайн", name || id, year || null]
    .filter(Boolean)
    .join(" ");
  const desc = description || `Смотреть онлайн ${name || "фильм"}${year ? ` ${year}` : ""} на HDGood.`;

  const ogPoster = poster ? `/api/share-poster?url=${encodeURIComponent(poster)}` : undefined;

  return {
    title,
    description: desc,
    alternates: {
      canonical: `/movie/${id}`,
    },
    openGraph: {
      title,
      description: desc,
      url: `/movie/${id}`,
      siteName: "HDGood",
      locale: "ru_RU",
      type: "website",
      images: ogPoster
        ? [
            {
              url: ogPoster,
              alt: name || "Постер",
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: ogPoster ? [ogPoster] : undefined,
    },
    robots: {
      index: true,
      follow: true,
    },
    keywords: name
      ? [
          name,
          "смотреть онлайн",
          year ? `фильм ${year}` : "фильм",
          "HD",
          "HDGood",
        ]
      : ["смотреть онлайн", "фильм", "HD", "HDGood"],
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
