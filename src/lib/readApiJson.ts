/**
 * Parse a fetch Response as JSON; give a clear error if the body is HTML (gateway
 * errors, wrong URL, or crashed route) instead of `res.json()`’s opaque SyntaxError.
 */
export async function readApiJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trimStart();
  if (trimmed.startsWith("<")) {
    throw new Error(
      `Server returned HTML instead of JSON (HTTP ${res.status}). Often a timeout or crash on the host — check App Platform runtime logs, or wrong credentials env (see deploy docs).`,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid JSON from API (HTTP ${res.status}): ${msg}`);
  }
}
