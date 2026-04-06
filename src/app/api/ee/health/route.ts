import { NextResponse } from "next/server";
import { getEarthEngine, stripEnvValue } from "@/lib/earthEngine";

export const dynamic = "force-dynamic";

/**
 * Lightweight EE auth check — open in browser: /api/ee/health
 * (no secrets returned; only which env *names* are present).
 */
export async function GET() {
  const geePk = stripEnvValue(process.env.GEE_PRIVATE_KEY);
  const geeEmail = stripEnvValue(process.env.GEE_SERVICE_ACCOUNT_EMAIL);
  const hints = {
    hasGoogleApplicationCredentials: Boolean(
      process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim(),
    ),
    hasGoogleApplicationCredentialsJson: Boolean(
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim(),
    ),
    /** Full service account JSON in GEE_PRIVATE_KEY (no email var needed). */
    hasGeePrivateKeyJson: Boolean(geePk.startsWith("{")),
    /** PEM in GEE_PRIVATE_KEY; email must be the service account `client_email`, not a Gmail. */
    hasGeePemPair: Boolean(geeEmail && geePk && !geePk.startsWith("{")),
    hasEarthEngineProject: Boolean(
      process.env.EARTH_ENGINE_PROJECT?.trim() ||
        process.env.GEE_PROJECT_ID?.trim(),
    ),
  };

  const anyCred =
    hints.hasGoogleApplicationCredentials ||
    hints.hasGoogleApplicationCredentialsJson ||
    hints.hasGeePrivateKeyJson ||
    hints.hasGeePemPair;

  if (!anyCred) {
    return NextResponse.json(
      {
        ok: false,
        earthEngine: "no_credentials",
        message:
          "No Earth Engine credential environment variables detected. Set GEE_PRIVATE_KEY (full JSON one line), GOOGLE_APPLICATION_CREDENTIALS_JSON, or a key file path on the server.",
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
