/**
 * OSM Overpass client — reserved for future distribution-line enrichment.
 * Transmission demo uses HIFLD exclusively.
 */
export const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

export async function queryOverpass(ql: string): Promise<unknown> {
  void ql;
  throw new Error("Overpass integration not used in this demo build.");
}
