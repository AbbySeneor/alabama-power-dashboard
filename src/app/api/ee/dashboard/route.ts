import { NextRequest, NextResponse } from "next/server";
import { computeEarthEngineDashboard } from "@/lib/eeCompute";
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
    console.log("[ee/dashboard] getEarthEngine ms=", Date.now() - t1, {
      corridorId,
      lineObjectKey: lineObjectKey ? "set" : null,
    });
    const t2 = Date.now();
    const data = await computeEarthEngineDashboard(ee, corridorId, {
      lineObjectKey,
    });
    console.log("[ee/dashboard] computeEarthEngineDashboard ms=", Date.now() - t2, {
      totalMs: Date.now() - t0,
    });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[ee/dashboard] error after ms=", Date.now() - t0, msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 503 });
  }
}
