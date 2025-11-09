import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// Dynamic overrides stored in JSON (admin writes here)
const FILE_PATH = path.join(process.cwd(), "data", "overrides", "movies.json");

// Static overrides shipped with repo (fallbacks)
import { moviesOverrides } from "../../../../data/overrides/movies";
import { seriesOverrides } from "../../../../data/overrides/series";

async function readDynamicOverrides(): Promise<Record<string, any>> {
  try {
    const buf = await fs.readFile(FILE_PATH, "utf-8");
    const json = JSON.parse(buf || "{}");
    if (json && typeof json === "object") return json as Record<string, any>;
    return {};
  } catch (err: any) {
    if (err?.code === "ENOENT") return {};
    console.warn("Overrides read error:", err);
    return {};
  }
}

function deepMergePreferPrimary(primary: any, secondary: any): any {
  if (primary == null && secondary == null) return null;
  if (primary == null) return secondary;
  if (secondary == null) return primary;
  if (typeof primary !== "object" || Array.isArray(primary)) return primary;
  if (typeof secondary !== "object" || Array.isArray(secondary)) return primary;
  const result: Record<string, any> = { ...secondary };
  for (const k of Object.keys(primary)) {
    const p = primary[k];
    const s = secondary[k];
    if (p && typeof p === "object" && !Array.isArray(p)) {
      result[k] = deepMergePreferPrimary(p, s);
    } else {
      result[k] = p; // primary (dynamic) wins
    }
  }
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawIds = searchParams.get("ids") || "";
    const ids = rawIds
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const dynamic = await readDynamicOverrides();
    const staticMovies = moviesOverrides as Record<string, any>;
    const staticSeries = seriesOverrides as Record<string, any>;

    const result: Record<string, any> = {};

    const sourceKeys = ids.length > 0
      ? ids
      : Array.from(
          new Set([
            ...Object.keys(dynamic),
            ...Object.keys(staticMovies),
            ...Object.keys(staticSeries),
          ])
        );

    for (const id of sourceKeys) {
      const dyn = dynamic[id] ?? null;
      const mov = staticMovies[id] ?? null;
      const ser = staticSeries[id] ?? null;
      // Merge dynamic with static, dynamic has priority; if both movie and series exist, merge both
      const merged = deepMergePreferPrimary(dyn, deepMergePreferPrimary(mov, ser));
      if (merged) {
        result[id] = merged;
      }
    }

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("GET /api/overrides/movies error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}