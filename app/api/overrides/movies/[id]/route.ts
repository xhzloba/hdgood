import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const FILE_PATH = path.join(process.cwd(), "data", "overrides", "movies.json");
const UPDATES_FILE_PATH = path.join(process.cwd(), "data", "overrides", "updates.json");

async function readOverrides(): Promise<Record<string, any>> {
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

async function writeOverrides(data: Record<string, any>) {
  const dir = path.dirname(FILE_PATH);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

type UpdateEntry = {
  id: string;
  timestamp: string; // ISO
  poster?: string | null;
  title?: string | null;
  changedPaths?: string[];
  addedPaths?: string[];
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

async function writeUpdates(entries: UpdateEntry[]) {
  const dir = path.dirname(UPDATES_FILE_PATH);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
  await fs.writeFile(UPDATES_FILE_PATH, JSON.stringify(entries, null, 2), "utf-8");
}

function flattenPaths(obj: any, base: string = ""): string[] {
  if (!obj || typeof obj !== "object") return base ? [base] : [];
  const res: string[] = [];
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const path = base ? `${base}.${key}` : key;
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const nested = flattenPaths(val, path);
      if (nested.length === 0) res.push(path);
      else res.push(...nested);
    } else {
      res.push(path);
    }
  }
  return res;
}

function diffPaths(prev: any, next: any, base: string = ""): string[] {
  const res: string[] = [];
  const keys = new Set([...(prev && typeof prev === "object" ? Object.keys(prev) : []), ...(next && typeof next === "object" ? Object.keys(next) : [])]);
  for (const key of keys) {
    const p = prev ? prev[key] : undefined;
    const n = next ? next[key] : undefined;
    const path = base ? `${base}.${key}` : key;
    const pIsObj = p && typeof p === "object" && !Array.isArray(p);
    const nIsObj = n && typeof n === "object" && !Array.isArray(n);
    if (pIsObj || nIsObj) {
      res.push(...diffPaths(p || {}, n || {}, path));
    } else {
      const eq = JSON.stringify(p) === JSON.stringify(n);
      if (!eq) res.push(path);
    }
  }
  return res;
}

function isBlank(val: any): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === "string") return val.trim().length === 0;
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === "object") return Object.keys(val).length === 0;
  return false;
}

function classifyDiff(
  prev: any,
  next: any,
  base: string = ""
): { added: string[]; changed: string[] } {
  const added: string[] = [];
  const changed: string[] = [];
  const keys = new Set([
    ...(prev && typeof prev === "object" ? Object.keys(prev) : []),
    ...(next && typeof next === "object" ? Object.keys(next) : []),
  ]);
  for (const key of keys) {
    const p = prev ? prev[key] : undefined;
    const n = next ? next[key] : undefined;
    const path = base ? `${base}.${key}` : key;
    const pIsObj = p && typeof p === "object" && !Array.isArray(p);
    const nIsObj = n && typeof n === "object" && !Array.isArray(n);
    if (pIsObj || nIsObj) {
      const nested = classifyDiff(p || {}, n || {}, path);
      added.push(...nested.added);
      changed.push(...nested.changed);
    } else {
      const eq = JSON.stringify(p) === JSON.stringify(n);
      if (!eq) {
        // Если раньше не было значения или оно было «пустым», считаем добавлением
        if (p === undefined || isBlank(p)) {
          // Добавление фиксируем только если новое значение непустое
          if (!isBlank(n)) {
            added.push(path);
          } else {
            // оба пустые/разные пустые — не имеет смысла логировать
          }
        } else {
          // Было значение и оно изменилось
          changed.push(path);
        }
      }
    }
  }
  return { added, changed };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const _id = String(id || "");
  if (!_id) {
    return NextResponse.json({ error: "id param is required" }, { status: 400 });
  }
  const overrides = await readOverrides();
  const item = overrides[_id] ?? null;
  return NextResponse.json(item, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const _id = String(id || "");
    if (!_id) {
      return NextResponse.json({ error: "id param is required" }, { status: 400 });
    }
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "override object is required" }, { status: 400 });
    }
    const current = await readOverrides();
    const prev = current[_id] ?? null;
    current[_id] = body;
    await writeOverrides(current);

    // Append update log entry
    try {
      const updates = await readUpdates();
      const poster = (body?.poster as any) || (body?.bg_poster?.backdrop as any) || null;
      const title = (body?.title as any) || (body?.name as any) || null;
      let addedPaths: string[] = [];
      let changedPaths: string[] = [];
      if (prev) {
        const classified = classifyDiff(prev, body);
        addedPaths = classified.added.slice(0, 100);
        changedPaths = classified.changed.slice(0, 100);
      } else {
        // Новый override: все поля считаются добавленными
        addedPaths = flattenPaths(body).slice(0, 100);
        changedPaths = [];
      }
      const entry: UpdateEntry = {
        id: _id,
        timestamp: new Date().toISOString(),
        poster: poster ?? null,
        title: title ?? null,
        changedPaths: changedPaths,
        addedPaths: addedPaths,
      };
      updates.push(entry);
      await writeUpdates(updates);
    } catch (logErr) {
      console.warn("Failed to write updates log:", logErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PUT /overrides/movies/[id] error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const _id = String(id || "");
    const current = await readOverrides();
    if (_id in current) {
      delete current[_id];
      await writeOverrides(current);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /overrides/movies/[id] error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
    },
  });
}