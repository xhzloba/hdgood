import { NextRequest, NextResponse } from "next/server";

// Агрегирующий список фильмов франшизы «Веном» по заданным ident.
// Возвращает массив, который MovieGrid умеет отображать напрямую.
export async function GET(_request: NextRequest) {
  const idents = [
    "6593f8788914c04deae99e63", // Веном (2018)
    "6593f8f88914c04deaea98d5", // Веном 2 (2021)
    "671ac361e53f3a2b5f41840d", // Веном: Последний танец (2024)
  ];

  try {
    const results = await Promise.all(
      idents.map(async (ident) => {
        try {
          const url = `https://api.vokino.pro/v2/view/${ident}`;
          const resp = await fetch(url, {
            method: "GET",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "User-Agent": "Mozilla/5.0 (compatible; HDGood/1.0)",
            },
          });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const data = await resp.json();
          const d = data?.details ?? data;
          const id = d?.id ?? ident;
          const title = d?.name ?? d?.title ?? "Без названия";
          const poster = d?.poster ?? null;
          const year = d?.released ?? null;
          const rating = d?.rating_kp ?? d?.rating ?? null;
          const country = d?.country ?? null;
          return {
            id: String(id),
            title,
            poster,
            year: year ? String(year) : undefined,
            rating: rating != null ? String(rating) : undefined,
            country,
          };
        } catch (_e) {
          // Фоллбек — вернём stub, чтобы карточка переходила на страницу фильма
          return {
            id: String(ident),
            title: "Веном",
            poster: null,
            year: undefined,
            rating: undefined,
            country: undefined,
          };
        }
      })
    );

    return NextResponse.json(results, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("⚠️ Franchise Venom API error:", error);
    const fallback = [
      {
        id: "6593f8788914c04deae99e63",
        title: "Веном",
        poster:
          "https://proxy.vokino.pro/image/t/p/w600_and_h900_bestv2/8Gyl0fknqiZeCLm9XitxCXQmEL9.jpg",
      },
      {
        id: "6593f8f88914c04deaea98d5",
        title: "Веном 2",
        poster:
          "https://proxy.vokino.pro/image/t/p/w600_and_h900_bestv2/pZe4xYwDkmxhf3oA8DNEihOW4pW.jpg",
      },
      {
        id: "671ac361e53f3a2b5f41840d",
        title: "Веном: Последний танец",
        poster:
          "https://proxy.vokino.pro/image/t/p/w600_and_h900_bestv2/YFcQ65dRrLpUpMiMFrrRV6rkEs.jpg",
      },
    ];

    return NextResponse.json(fallback, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
        "Cache-Control": "public, max-age=60",
      },
    });
  }
}