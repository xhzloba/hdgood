import { NextRequest, NextResponse } from "next/server";

function isSafeUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("url") || "";
  const u = isSafeUrl(src);
  if (!u) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  try {
    const resp = await fetch(u.toString(), {
      method: "GET",
      headers: {
        Accept: "image/*",
        "User-Agent": "Mozilla/5.0 (compatible; HDGood/1.0)",
      },
      cache: "no-store",
    });

    let ct = resp.headers.get("content-type") || "";
    if (!resp.ok) {
      return NextResponse.json({ error: `Upstream error: ${resp.status}` }, { status: 400 });
    }

    function inferContentType(pathname: string): string {
      const p = pathname.toLowerCase();
      if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
      if (p.endsWith(".png")) return "image/png";
      if (p.endsWith(".webp")) return "image/webp";
      if (p.endsWith(".gif")) return "image/gif";
      if (p.endsWith(".bmp")) return "image/bmp";
      return "application/octet-stream";
    }

    if (!ct || ct === "application/octet-stream") {
      ct = inferContentType(u.pathname);
    }
    const isImage = ct.startsWith("image/");
    if (!isImage) {
      // Если тип не распознан как image, но расширение похоже — форсим как image/jpeg
      const inferred = inferContentType(u.pathname);
      if (inferred.startsWith("image/")) {
        ct = inferred;
      } else {
        return NextResponse.json({ error: `Non-image content-type: ${ct}` }, { status: 400 });
      }
    }

    const buf = await resp.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": ct,
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
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
