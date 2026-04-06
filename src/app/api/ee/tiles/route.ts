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
  const t0 = Date.now();
  const raw = req.nextUrl.searchParams.get("corridorId") ?? defaultCorridorId;
  const corridorId = raw as CorridorId;
  const lineObjectKey =
    req.nextUrl.searchParams.get("lineObjectId")?.trim() || null;

  try {
    const t1 = Date.now();
    const ee = await getEarthEngine();
    console.log("[ee/tiles] getEarthEngine ms=", Date.now() - t1, {
      corridorId,
      lineObjectKey: lineObjectKey ? "set" : null,
    });
    let rowClip: EeClipGeometry | null = null;
    if (lineObjectKey) {
      const th = Date.now();
      try {
        const row = await fetchBufferedLineGeometryForEe(
          ee,
          corridorId,
          lineObjectKey,
        );
        if (row) rowClip = row.geometry;
        console.log("[ee/tiles] line clip / HIFLD ms=", Date.now() - th);
      } catch (e) {
        console.error("[ee] tiles line clip failed; using corridor tiles", e);
      }
    }
    const t2 = Date.now();
    const tiles = await buildMapTiles(ee, { rowClip });
    console.log("[ee/tiles] buildMapTiles ms=", Date.now() - t2, {
      totalMs: Date.now() - t0,
    });
    return NextResponse.json(
      { ok: true, ...tiles },
      {
        headers: { "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[ee/tiles] error after ms=", Date.now() - t0, msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 503 });
  }
}
