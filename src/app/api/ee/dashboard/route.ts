import { NextRequest, NextResponse } from "next/server";
import { computeEarthEngineDashboard } from "@/lib/eeCompute";
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
    const data = await computeEarthEngineDashboard(ee, corridorId, {
      lineObjectKey,
    });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 503 });
  }
}
