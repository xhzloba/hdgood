import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = (params.get("q") || "").trim();
  const pageRaw = params.get("page") || "1";
  const year = params.get("year") || "";
  const page = Math.max(1, parseInt(pageRaw, 10) || 1);

  if (!q) {
    return NextResponse.json({ error: "q parameter is required" }, { status: 400 });
  }

  const token = process.env.VOKINO_TOKEN || "";
  // If year is provided, append it to the upstream URL just in case the API supports it
  let base = `https://api.vokino.pro/v2/search?name=${encodeURIComponent(q)}&page=${page}`;
  if (year && year.length === 4) {
    base += `&year=${year}`;
  }
  const url = token ? `${base}&token=${token}` : base;

  try {
    // If year is set, we might want to try to fetch multiple pages if the API doesn't support filtering
    // But first, let's try the direct approach.
    // If the user wants "immediate sorting from the entire list", and the API doesn't support it,
    // we would need to fetch multiple pages.
    // Let's implement a small "lookahead" if year is present and page is 1.
    
    if (year && page === 1) {
       // Parallel fetch for first 3 pages to increase chance of finding the year
       // if the API ignores the year parameter.
       const fetchPage = async (p: number) => {
          const u = token 
            ? `https://api.vokino.pro/v2/search?name=${encodeURIComponent(q)}&page=${p}&token=${token}&year=${year}`
            : `https://api.vokino.pro/v2/search?name=${encodeURIComponent(q)}&page=${p}&year=${year}`;
          
          const r = await fetch(u, {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              "User-Agent": "Mozilla/5.0 (compatible; HDGood/1.0)",
            },
            cache: "no-store",
          });
          if (!r.ok) return null;
          return r.json();
       };

       const [d1, d2, d3] = await Promise.all([fetchPage(1), fetchPage(2), fetchPage(3)]);
       
       const extract = (src: any) => {
          if (src?.type === "list" && Array.isArray(src?.channels)) return src.channels;
          if (Array.isArray(src?.channels)) return src.channels;
          if (Array.isArray(src)) return src;
          return [];
       };

       const items1 = extract(d1);
       const items2 = extract(d2);
       const items3 = extract(d3);
       
       // Combine unique items
       const all = [...items1, ...items2, ...items3];
       const seen = new Set();
       const unique = all.filter(it => {
          const id = it?.id ?? it?.details?.id;
          if (!id || seen.has(String(id))) return false;
          seen.add(String(id));
          return true;
       });

       // If we found items matching the year, prioritize them
       // We return the combined list (or at least the first page worth of relevant items)
       // Since the client handles sorting if year is present, we just need to make sure
       // the items with the correct year are in the returned list.
       
       // If the API supported year filtering, d1 should have contained only relevant items.
       // If it ignored it, d1, d2, d3 contain mixed.
       // We return the combined list so the client can sort/filter.
       // Note: This changes pagination behavior (page 1 returns 3 pages of data),
       // but for infinite scroll it is fine, just more data initially.
       
       if (unique.length > 0) {
         return NextResponse.json({ channels: unique }, { headers: { "Cache-Control": "no-store" } });
       }
    }

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

