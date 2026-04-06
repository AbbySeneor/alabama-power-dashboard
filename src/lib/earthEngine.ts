/* eslint-disable @typescript-eslint/no-explicit-any */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { EE_CORRIDOR_BOUNDS } from "@/lib/corridorsConfig";
import type { CorridorId } from "@/types";

let initPromise: Promise<any> | null = null;

/** Turn literal `\n` in .env into real newlines (PEM keys). */
function normalizePrivateKeyPem(raw: string): string {
  return raw.trim().replace(/\\n/g, "\n");
}

type ParsedCredentials = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

function parseServiceAccountJson(raw: string): ParsedCredentials {
  const trimmed = raw.trim();
  if (trimmed.startsWith("<")) {
    throw new Error(
      "Earth Engine credentials look like HTML, not JSON. For GOOGLE_APPLICATION_CREDENTIALS_JSON (e.g. on DigitalOcean), paste only the Google Cloud service account key JSON — one line, starting with {. Do not paste a console page or error HTML.",
    );
  }
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(raw) as Record<string, unknown>;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Invalid service account JSON (${msg}). Use the downloaded *.json key from Google Cloud IAM; in App Platform use a single-line value and no smart quotes.`,
    );
  }
  const client_email = o.client_email;
  const private_key = o.private_key;
  const project_id = o.project_id;
  if (typeof client_email !== "string" || typeof private_key !== "string") {
    throw new Error(
      "Service account JSON must include string fields client_email and private_key.",
    );
  }
  return {
    client_email,
    private_key: normalizePrivateKeyPem(private_key),
    project_id: typeof project_id === "string" ? project_id : undefined,
  };
}

/**
 * Credentials for ee.data.authenticateViaPrivateKey (client_email + private_key).
 *
 * Priority:
 * 1. GOOGLE_APPLICATION_CREDENTIALS — path to service account JSON file (recommended)
 * 2. GOOGLE_APPLICATION_CREDENTIALS_JSON — full JSON string
 * 3. GEE_PRIVATE_KEY — if it starts with `{`, full service account JSON
 * 4. GEE_SERVICE_ACCOUNT_EMAIL + GEE_PRIVATE_KEY — IAM email + PEM private key
 */
function loadFromCredentialsFile(): ParsedCredentials | null {
  const rel = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!rel) return null;
  const abs = resolve(process.cwd(), rel);
  if (!existsSync(abs)) {
    throw new Error(
      `Earth Engine: credentials file missing at ${abs}. Run: npm run gee:install-key -- /path/to/your-key.json`,
    );
  }
  const raw = readFileSync(abs, "utf8");
  return parseServiceAccountJson(raw);
}

function loadEarthEngineCredentials(): ParsedCredentials {
  const fromFile = loadFromCredentialsFile();
  if (fromFile) return fromFile;

  const legacyJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim();
  if (legacyJson) {
    return parseServiceAccountJson(legacyJson);
  }

  const geeKey = process.env.GEE_PRIVATE_KEY?.trim();
  const geeEmail = process.env.GEE_SERVICE_ACCOUNT_EMAIL?.trim();

  if (geeKey?.startsWith("{")) {
    return parseServiceAccountJson(geeKey);
  }

  if (geeEmail && geeKey) {
    return {
      client_email: geeEmail,
      private_key: normalizePrivateKeyPem(geeKey),
    };
  }

  throw new Error(
    "Earth Engine auth: set GOOGLE_APPLICATION_CREDENTIALS to a JSON key file path, " +
      "or GOOGLE_APPLICATION_CREDENTIALS_JSON, " +
      "or GEE_PRIVATE_KEY (full JSON or PEM with GEE_SERVICE_ACCOUNT_EMAIL).",
  );
}

function resolveEarthEngineProject(parsed: ParsedCredentials): string | undefined {
  const explicit =
    process.env.EARTH_ENGINE_PROJECT?.trim() ||
    process.env.GEE_PROJECT_ID?.trim();
  if (explicit) return explicit;
  return parsed.project_id;
}

/**
 * Server-only Earth Engine client.
 */
export async function getEarthEngine(): Promise<any> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const mod = await import("@google/earthengine");
    const ee = mod.default ?? mod;

    const parsed = loadEarthEngineCredentials();
    const { client_email, private_key } = parsed;

    await new Promise<void>((resolve, reject) => {
      ee.data.authenticateViaPrivateKey(
        { client_email, private_key },
        () => resolve(),
        (err: Error) => reject(err),
      );
    });

    const project = resolveEarthEngineProject(parsed);

    await new Promise<void>((resolve, reject) => {
      ee.initialize(
        undefined,
        undefined,
        () => resolve(),
        (e: Error) => reject(e),
        undefined,
        project || undefined,
      );
    });

    return ee;
  })().catch((err) => {
    initPromise = null;
    throw err;
  });

  return initPromise;
}

export function eeGetInfo<T = unknown>(computed: {
  getInfo: (cb: (val: T | null, err?: Error) => void) => void;
}): Promise<T | null> {
  return new Promise((resolve, reject) => {
    computed.getInfo((val, err) => {
      if (err) reject(err);
      else resolve(val ?? null);
    });
  });
}

export function corridorCenter(corridorId: CorridorId): [number, number] {
  const [w, s, e, n] = EE_CORRIDOR_BOUNDS[corridorId];
  return [(w + e) / 2, (s + n) / 2];
}

export function promisifyGetMapId(
  image: any,
  vis: Record<string, unknown>,
): Promise<{ urlFormat: string }> {
  return new Promise((resolve, reject) => {
    image.getMapId(vis, (data: { urlFormat?: string } | undefined, err?: Error) => {
      if (err) reject(err);
      else if (!data?.urlFormat) reject(new Error("Earth Engine getMapId: missing urlFormat"));
      else resolve(data as { urlFormat: string });
    });
  });
}

export function promisifyThumbUrl(
  image: any,
  params: Record<string, unknown>,
): Promise<string> {
  return new Promise((resolve, reject) => {
    image.getThumbURL(params, (url: string, err?: string) => {
      if (err) reject(new Error(err));
      else resolve(url);
    });
  });
}
