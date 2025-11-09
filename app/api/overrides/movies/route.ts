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

export async function GET() {
  const overrides = await readOverrides();
  return NextResponse.json(overrides, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

// Optional bulk upsert: { id: string, override: Record<string, any> }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, override } = body || {};
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    if (!override || typeof override !== "object") {
      return NextResponse.json({ error: "override object is required" }, { status: 400 });
    }
    const current = await readOverrides();
    current[id] = override;
    await writeOverrides(current);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /overrides/movies error", err);
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