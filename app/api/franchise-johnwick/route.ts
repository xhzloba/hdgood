import { NextRequest, NextResponse } from "next/server";

// Агрегирующий список фильмов и сериалов франшизы «Джон Уик» по заданным ident.
// Возвращает массив, который MovieGrid умеет отображать напрямую.
export async function GET(_request: NextRequest) {
  // Идентификаторы частей франшизы (без токенов). Если API требует токен,
  // попытка без него, а при ошибке вернём частичный статический список.
  const idents = [
    "6593f84c8914c04deae943d7", // Джон Уик
    "6593f8828914c04deae9b049", // Джон Уик 2
    "6593f85f8914c04deae96c87", // Джон Уик 3
    "6593f9118914c04deaead1fa", // Джон Уик 4
    "6837886500faa210057c5906", // Мир Джона Уика (The Continental)
    "6593fa083fcd0b9e50af0e61", // Джон Уик: Экстра
    "68421363032315e273e25691", // Балерина
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
        } catch (e) {
          // Фоллбек — вернём stub с id, чтобы карточка переходила на страницу фильма
          return {
            id: String(ident),
            title: "Джон Уик",
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
    console.error("⚠️ Franchise JohnWick API error:", error);
    // Жёсткий фоллбек на статические постеры — чтобы UI жил даже при сбоях API.
    const fallback = [
      {
        id: "6593f84c8914c04deae943d7",
        title: "Джон Уик",
        poster:
          "https://avatars.mds.yandex.net/get-ott/1652588/2a00000186cd3a149ef9d635ff51387c964d/720x360",
      },
      {
        id: "6593f8828914c04deae9b049",
        title: "Джон Уик 2",
        poster:
          "https://proxy.vokino.pro/image/t/p/w600_and_h900_bestv2/yc8j7dtUAsKeuWtgkIXiJqLE8qL.jpg",
      },
      {
        id: "6593f85f8914c04deae96c87",
        title: "Джон Уик 3",
        poster:
          "https://proxy.vokino.pro/image/t/p/w600_and_h900_bestv2/pAyNTf5Fz1f9j1WpZ5JYuK5esJH.jpg",
      },
      {
        id: "6593f9118914c04deaead1fa",
        title: "Джон Уик 4",
        poster:
          "https://proxy.vokino.pro/image/t/p/w600_and_h900_bestv2/8dITPv2U83ZG38Sk33a9x6c0tRl.jpg",
      },
      {
        id: "6837886500faa210057c5906",
        title: "Мир Джона Уика",
        poster: "https://api.vokino.pro/image/poster/7920047/small/image.jpg",
      },
      {
        id: "6593fa083fcd0b9e50af0e61",
        title: "Джон Уик: Экстра",
        poster: "https://api.vokino.pro/image/poster/5322395/small/image.jpg",
      },
      {
        id: "68421363032315e273e25691",
        title: "Балерина",
        poster:
          "https://proxy.vokino.pro/image/t/p/w600_and_h900_bestv2/oKD6ggXEN1WGPPDiVAuOfdDLBNv.jpg",
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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
    },
  });
}