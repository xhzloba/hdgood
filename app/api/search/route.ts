import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = (params.get("q") || "").trim();
  const pageRaw = params.get("page") || "1";
  const page = Math.max(1, parseInt(pageRaw, 10) || 1);

  if (!q) {
    return NextResponse.json({ error: "q parameter is required" }, { status: 400 });
  }

  const token = process.env.VOKINO_TOKEN || "";
  const base = `https://api.vokino.pro/v2/search?name=${encodeURIComponent(q)}&page=${page}`;
  const url = token ? `${base}&token=${token}` : base;

  try {
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; HDGood/1.0)",
      },
      cache: "no-store",
    });

    if (!resp.ok) {
      return NextResponse.json({ error: `Upstream error: ${resp.status}` }, { status: resp.status });
    }

    const data = await resp.json();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch search results" }, { status: 500 });
  }
}

