import { NextResponse } from "next/server";
import { earthEngineRuntimeProfile } from "@/lib/eeRuntimeProfile";
import { eeGetInfo, getEarthEngine } from "@/lib/earthEngine";

export const dynamic = "force-dynamic";

/**
 * Quick EE smoke test (auth + one tiny `getInfo`). Stays well under proxy timeouts.
 * Open: `/api/ee/diagnose` — compare with slow `/api/ee/dashboard` in runtime logs.
 */
export async function GET() {
  const t0 = Date.now();
  const profile = earthEngineRuntimeProfile();

  try {
    const tInit = Date.now();
    const ee = await getEarthEngine();
    const initMs = Date.now() - tInit;

    const tProbe = Date.now();
    const n = await eeGetInfo<{ type?: string; value?: number }>(ee.Number(42));
    const probeMs = Date.now() - tProbe;

    return NextResponse.json({
      ok: true,
      ...profile,
      probe: n,
      timingsMs: {
        initMs,
        probeMs,
        totalMs: Date.now() - t0,
      },
      whyLocalWorks:
        "next dev has no ~60s platform gateway; production (Docker/App Platform) does. Dashboard/tiles run many EE calls — see server logs for [ee/dashboard] / [ee/tiles] timings.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        ok: false,
        ...profile,
        error: msg,
        timingsMs: { totalMs: Date.now() - t0 },
      },
      { status: 503 },
    );
  }
}
