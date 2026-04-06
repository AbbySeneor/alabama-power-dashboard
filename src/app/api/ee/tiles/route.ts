import { NextRequest, NextResponse } from "next/server";
import { buildMapTiles } from "@/lib/eeCompute";
import type { EeClipGeometry } from "@/lib/eeGeometryTypes";
import { fetchBufferedLineGeometryForEe } from "@/lib/eeRowLineGeometry";
import { defaultCorridorId } from "@/lib/corridorsConfig";
import { getEarthEngine } from "@/lib/earthEngine";
import type { CorridorId } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("corridorId") ?? defaultCorridorId;
  const corridorId = raw as CorridorId;
  const lineObjectKey =
    req.nextUrl.searchParams.get("lineObjectId")?.trim() || null;

  try {
    const ee = await getEarthEngine();
    let rowClip: EeClipGeometry | null = null;
    if (lineObjectKey) {
      try {
        const row = await fetchBufferedLineGeometryForEe(
          ee,
          corridorId,
          lineObjectKey,
        );
        if (row) rowClip = row.geometry;
      } catch (e) {
        console.error("[ee] tiles line clip failed; using corridor tiles", e);
      }
    }
    const tiles = await buildMapTiles(ee, { rowClip });
    return NextResponse.json(
      { ok: true, ...tiles },
      {
        headers: { "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 503 });
  }
}
