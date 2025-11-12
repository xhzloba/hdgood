import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const UPDATES_FILE_PATH = path.join(process.cwd(), "data", "overrides", "updates.json");
const MOVIES_OVERRIDES_FILE_PATH = path.join(process.cwd(), "data", "overrides", "movies.json");

type UpdateEntry = {
  id: string;
  timestamp: string; // ISO
  poster?: string | null;
  title?: string | null;
  changedPaths?: string[];
  addedPaths?: string[];
};

type DateGroup = {
  date: string; // YYYY-MM-DD
  items: UpdateEntry[];
};

async function readUpdates(): Promise<UpdateEntry[]> {
  try {
    const buf = await fs.readFile(UPDATES_FILE_PATH, "utf-8");
    const json = JSON.parse(buf || "[]");
    return Array.isArray(json) ? (json as UpdateEntry[]) : [];
  } catch (err: any) {
    if (err?.code === "ENOENT") return [];
    console.warn("Updates read error:", err);
    return [];
  }
}

async function readMovieOverrides(): Promise<Record<string, any>> {
  try {
    const buf = await fs.readFile(MOVIES_OVERRIDES_FILE_PATH, "utf-8");
    const json = JSON.parse(buf || "{}");
    return json && typeof json === "object" ? (json as Record<string, any>) : {};
  } catch (err: any) {
    if (err?.code === "ENOENT") return {};
    console.warn("Movie overrides read error:", err);
    return {};
  }
}

function toLocalDateString(ts: string): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(request: NextRequest) {
  try {
    const updates = await readUpdates();
    const overrides = await readMovieOverrides();

    // Group by local date
    const groupsMap = new Map<string, UpdateEntry[]>();
    for (const u of updates) {
      const key = toLocalDateString(u.timestamp);
      const arr = groupsMap.get(key) || [];
      arr.push(u);
      groupsMap.set(key, arr);
    }

    // Sort items inside groups by timestamp desc (без обогащения, чтобы не делать лишние запросы)
    const groups: DateGroup[] = Array.from(groupsMap.entries())
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)),
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "15", 10));

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageGroups = groups.slice(start, end);
    const hasMore = end < groups.length;

    // Вспомогательная функция: получить название/постер из overrides и при необходимости из внешнего view‑API
    const viewCache = new Map<string, { title: string | null; poster: string | null }>();
    async function fetchViewDetails(id: string): Promise<{ title: string | null; poster: string | null }> {
      if (viewCache.has(id)) return viewCache.get(id)!;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const resp = await fetch(`https://api.vokino.pro/v2/view/${id}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; HDGood/1.0)",
          },
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (!resp.ok) {
          viewCache.set(id, { title: null, poster: null });
          return { title: null, poster: null };
        }
        const data = await resp.json();
        const d = (data?.details ?? data) || {};
        const title = (d.name as any) ?? (data?.name as any) ?? (data?.title as any) ?? null;
        const poster = (d.poster as any) ?? (data?.poster as any) ?? (data?.cover as any) ?? (data?.image as any) ?? null;
        const res = { title: title ?? null, poster: poster ?? null };
        viewCache.set(id, res);
        return res;
      } catch {
        viewCache.set(id, { title: null, poster: null });
        return { title: null, poster: null };
      }
    }

    async function enrichItem(it: UpdateEntry): Promise<UpdateEntry> {
      const dyn = overrides[it.id] || {};
      let title = (dyn?.title as any) ?? (dyn?.name as any) ?? it.title ?? null;
      let poster: string | null = ((dyn?.poster as any) ?? it.poster ?? null);
      if (!title || !poster) {
        const fallback = await fetchViewDetails(it.id);
        title = title ?? fallback.title;
        poster = poster ?? fallback.poster;
      }
      return { ...it, title, poster };
    }

    const enrichedPageGroups: DateGroup[] = await Promise.all(
      pageGroups.map(async (g) => ({
        date: g.date,
        items: await Promise.all(g.items.map(enrichItem)),
      }))
    );

    return NextResponse.json(
      {
        groups: enrichedPageGroups,
        page,
        pageSize,
        totalDates: groups.length,
        hasMore,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("GET /api/overrides/updates error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
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
