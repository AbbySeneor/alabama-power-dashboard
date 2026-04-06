import { NextResponse } from "next/server";
import { getEarthEngine } from "@/lib/earthEngine";

export const dynamic = "force-dynamic";

/**
 * Lightweight EE auth check — open in browser: /api/ee/health
 * (no secrets returned; only which env *names* are present).
 */
export async function GET() {
  const hints = {
    hasGoogleApplicationCredentials: Boolean(
      process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim(),
    ),
    hasGoogleApplicationCredentialsJson: Boolean(
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim(),
    ),
    hasGeeEmailAndKey: Boolean(
      process.env.GEE_SERVICE_ACCOUNT_EMAIL?.trim() &&
        process.env.GEE_PRIVATE_KEY?.trim(),
    ),
    hasEarthEngineProject: Boolean(
      process.env.EARTH_ENGINE_PROJECT?.trim() ||
        process.env.GEE_PROJECT_ID?.trim(),
    ),
  };

  const anyCred =
    hints.hasGoogleApplicationCredentials ||
    hints.hasGoogleApplicationCredentialsJson ||
    hints.hasGeeEmailAndKey;

  if (!anyCred) {
    return NextResponse.json(
      {
        ok: false,
        earthEngine: "no_credentials",
        message:
          "No Earth Engine credential environment variables detected. Set GOOGLE_APPLICATION_CREDENTIALS_JSON (or file path / PEM pair) on the server.",
        hints,
      },
      { status: 503 },
    );
  }

  try {
    await getEarthEngine();
    return NextResponse.json({
      ok: true,
      earthEngine: "ready",
      hints,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        ok: false,
        earthEngine: "init_failed",
        message: msg,
        hints,
      },
      { status: 503 },
    );
  }
}
