import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: { path?: string[] } }) {
  // Await params if necessary (Next.js 15+ requires it, but 14 is sync usually. 
  // To be safe in newer Next.js versions, we can treat it as potential promise if types say so, 
  // but for now standard access is fine).
  const path = params.path;

  if (!path || path.length < 1) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const [encodedBase, ...rest] = path;
  
  try {
    // Decode Base64URL
    const base64 = encodedBase.replace(/-/g, '+').replace(/_/g, '/');
    const baseUrl = Buffer.from(base64, 'base64').toString('utf-8');
    
    // Construct target URL
    // We join the rest of the path parts. 
    // If baseUrl ends in / and segmentPath doesn't start with /, it joins nicely.
    // URL constructor handles slash deduplication usually.
    const segmentPath = rest.join('/');
    const targetUrl = new URL(segmentPath, baseUrl).href;

    const response = await fetch(targetUrl, {
        headers: {
             "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
             "Referer": new URL(baseUrl).origin,
        }
    });

    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    const contentType = response.headers.get("Content-Type");
    if (contentType) headers.set("Content-Type", contentType);

    return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
    });

  } catch (e) {
      console.error("Dash Proxy Error:", e);
      return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
