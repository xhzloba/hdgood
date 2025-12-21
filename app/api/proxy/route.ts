import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": new URL(url).origin,
      },
    });

    if (!response.ok) {
        return NextResponse.json(
            { error: `Failed to fetch: ${response.status} ${response.statusText}` },
            { status: response.status }
        );
    }

    let contentType = response.headers.get("Content-Type");
    
    // Detect playlist by content sniffing if content-type is generic or missing
    let isM3U8 = contentType?.includes("mpegurl") || contentType?.includes("application/x-mpegURL") || url.endsWith(".m3u8") || url.endsWith(".m3u");
    let isDash = contentType?.includes("dash+xml") || url.endsWith(".mpd");

    // If not detected yet, read first chunk to check for #EXTM3U or <MPD
    let bufferedBody: string | null = null;
    if (!isM3U8 && !isDash) {
         try {
             // Clone response to read text without consuming original body if we need to fallback
             const clone = response.clone();
             const text = await clone.text();
             const trimmed = text.trim();
             if (trimmed.startsWith("#EXTM3U")) {
                 isM3U8 = true;
                 bufferedBody = text;
                 contentType = "application/vnd.apple.mpegurl"; // Force correct content type
             } else if (trimmed.includes("<MPD")) {
                 isDash = true;
                 bufferedBody = text;
                 contentType = "application/dash+xml";
             }
         } catch (e) {
             // Ignore error, assume binary
         }
    }

    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    if (contentType) {
        headers.set("Content-Type", contentType);
    }

    if (isM3U8) {
        const text = bufferedBody || await response.text();
        const baseUrl = new URL(response.url || url);
        
        const rewritten = text.split('\n').map(line => {
            const trimmed = line.trim();
            if (!trimmed) return line;
            
            if (trimmed.startsWith('#')) {
                // Handle URI attributes in tags like #EXT-X-KEY:METHOD=AES-128,URI="key.php"
                // or #EXT-X-MAP:URI="main.mp4"
                return line.replace(/URI="([^"]+)"/g, (match, uri) => {
                     try {
                        const absolute = new URL(uri, baseUrl).href;
                        return `URI="/api/proxy?url=${encodeURIComponent(absolute)}"`;
                     } catch (e) {
                        return match;
                     }
                });
            }
            
            // It's a segment or playlist URL
            try {
                const absolute = new URL(trimmed, baseUrl).href;
                return `/api/proxy?url=${encodeURIComponent(absolute)}`;
            } catch (e) {
                return line;
            }
        }).join('\n');

        return new NextResponse(rewritten, {
            status: 200,
            headers,
        });
    }

    if (isDash) {
        const text = bufferedBody || await response.text();
        const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
        const proxyBase = `/api/proxy?url=${encodeURIComponent(baseUrl)}`;
        
        // Simple injection of BaseURL into the first Period
        // This handles relative URLs in the manifest by rebasing them to the proxy
        let rewritten = text;
        if (text.includes("<Period")) {
             rewritten = text.replace(/<Period([^>]*)>/, `<Period$1><BaseURL>${proxyBase}</BaseURL>`);
        } else {
             // Fallback: inject into MPD if no Period (unlikely for valid DASH)
             rewritten = text.replace(/<MPD([^>]*)>/, `<MPD$1><BaseURL>${proxyBase}</BaseURL>`);
        }

        return new NextResponse(rewritten, {
            status: 200,
            headers,
        });
    }

    // For binary data (segments), passing the stream directly is more efficient
    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
