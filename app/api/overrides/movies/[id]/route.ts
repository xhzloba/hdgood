import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const FILE_PATH = path.join(process.cwd(), "data", "overrides", "movies.json");

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
    current[_id] = body;
    await writeOverrides(current);
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