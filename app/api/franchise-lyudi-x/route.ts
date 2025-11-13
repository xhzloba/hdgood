import { NextRequest, NextResponse } from "next/server";

// Агрегирующий список фильмов франшизы «Люди Икс» по заданным ident.
// Возвращает массив, который MovieGrid умеет отображать напрямую.
export async function GET(_request: NextRequest) {
  const idents = [
    "6593f8528914c04deae950d4",
    "6593f89a8914c04deae9debc",
    "6593f8308914c04deae90641",
    "6593f84b8914c04deae941bc",
    "6593f88f8914c04deae9c9ab",
    "6593f89d8914c04deae9e465",
    "6593f8688914c04deae97e7e",
    "6593f8528914c04deae950d2",
    "6593f88f8914c04deae9c9a1",
    "6593f83d8914c04deae923ef",
    "6593f8778914c04deae99c7b",
    "6593f8718914c04deae990a4",
    "6593f8d68914c04deaea522d",
  ];

  try {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; HDGood/1.0)",
    };
    async function fetchView(ident: string) {
      const url = `https://api.vokino.pro/v2/view/${ident}`;
      const resp = await fetch(url, { method: "GET", headers });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    }
    async function fetchWithRetry(ident: string, attempts = 3, delayMs = 200) {
      let lastErr: any = null;
      for (let i = 0; i < attempts; i++) {
        try {
          return await fetchView(ident);
        } catch (e) {
          lastErr = e;
          if (i < attempts - 1) {
            await new Promise((r) => setTimeout(r, delayMs));
          }
        }
      }
      throw lastErr;
    }

    const results: any[] = [];
    for (const ident of idents) {
      try {
        const data = await fetchWithRetry(ident);
        const d = data?.details ?? data;
        const id = d?.id ?? ident;
        const titleRaw =
          (d?.name && String(d?.name).trim() !== "" ? d?.name : null) ??
          (d?.title && String(d?.title).trim() !== "" ? d?.title : null) ??
          (d?.originalname && String(d?.originalname).trim() !== "" ? d?.originalname : null) ??
          null;
        const title = titleRaw ?? "Без названия";
        const posterRaw =
          d?.poster ??
          (d as any)?.cover ??
          (d as any)?.image ??
          (d as any)?.details?.poster ??
          null;
        const poster = posterRaw && String(posterRaw).trim() !== "" ? posterRaw : null;
        const year = d?.released ?? null;
        const rating = d?.rating_kp ?? d?.rating ?? null;
        const country = d?.country ?? null;
        results.push({
          id: String(id),
          title,
          poster,
          year: year ? String(year) : undefined,
          rating: rating != null ? String(rating) : undefined,
          country,
        });
      } catch (_e) {
        results.push({
          id: String(ident),
          title: "Без названия",
          poster: null,
          year: undefined,
          rating: undefined,
          country: undefined,
        });
      }
    }

    return NextResponse.json(results, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("⚠️ Franchise X-Men API error:", error);
    // Простейший фоллбек — вернём только id, чтобы были переходы на страницы фильмов
    const fallback = idents.map((ident) => ({ id: String(ident), title: "Люди Икс", poster: null }));
    return NextResponse.json(fallback, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
        "Cache-Control": "public, max-age=120",
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
