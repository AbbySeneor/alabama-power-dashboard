/**
 * GET /api/power-lines?owner=alabama — Alabama Power lines (subset of statewide HIFLD fetch)
 * GET /api/power-lines?owner=all — all transmission lines intersecting Alabama envelope (paged HIFLD)
 */
import { NextRequest, NextResponse } from "next/server";
import { fetchHifldAlabamaTransmissionLines } from "@/lib/hifld";
import { FALLBACK_POWER_LINES } from "@/lib/fallbackPowerLines";
import { isAlabamaPowerOwner } from "@/lib/corridor";

export const revalidate = 3600;
export const maxDuration = 60;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner") ?? "alabama";

  try {
    const data = await fetchHifldAlabamaTransmissionLines();

    const body =
      owner === "all"
        ? data
        : {
            ...data,
            features: data.features.filter((f) =>
              isAlabamaPowerOwner(f.properties?.OWNER),
            ),
          };

    return NextResponse.json(body, { headers: corsHeaders() });
  } catch {
    const fb = FALLBACK_POWER_LINES;
    const body =
      owner === "all"
        ? fb
        : {
            ...fb,
            features: fb.features.filter((f) =>
              isAlabamaPowerOwner(f.properties?.OWNER),
            ),
          };

    return NextResponse.json(body, { headers: corsHeaders() });
  }
}
