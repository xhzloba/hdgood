import { NextRequest, NextResponse } from "next/server";

// Возвращает нормализованный список фильмов франшизы (сиквелы/приквелы)
// по внутреннему идентификатору (ident) из Vokino API.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ident = searchParams.get("ident");

  if (!ident) {
    return NextResponse.json(
      { error: "ident parameter is required" },
      { status: 400 }
    );
  }

  try {
    const viewUrl = `https://api.vokino.pro/v2/view/${ident}`;
    const resp = await fetch(viewUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; HDGood/1.0)",
      },
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: `View API error: ${resp.status}` },
        { status: resp.status }
      );
    }

    const data = await resp.json();

    const details = data?.details ?? data;
    const rawList = Array.isArray(details?.sequelsAndPrequels)
      ? details.sequelsAndPrequels
      : Array.isArray(data?.sequelsAndPrequels)
      ? data.sequelsAndPrequels
      : [];

    // Нормализуем элементы под ожидания MovieGrid
    const normalized = (rawList as any[])
      .map((item) => {
        const id =
          item?.id ?? item?.details?.id ?? item?.movieId ?? item?.ident ?? null;
        const title =
          item?.title ?? item?.name ?? item?.details?.name ?? "Без названия";
        const poster =
          item?.poster ??
          item?.details?.poster ??
          item?.cover ??
          item?.image ??
          null;
        const year =
          item?.year ?? item?.released ?? item?.details?.released ?? null;
        const rating =
          item?.rating_kp ??
          item?.rating ??
          item?.details?.rating_kp ??
          item?.rating_imdb ??
          null;
        const country = item?.country ?? item?.details?.country ?? null;

        if (id == null) return null;
        return {
          id: String(id),
          title,
          poster,
          year: year ? String(year) : undefined,
          rating: rating != null ? String(rating) : undefined,
          country,
        };
      })
      .filter(Boolean);

    return NextResponse.json(normalized, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("⚠️ Franchise-by-id API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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