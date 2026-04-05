import buffer from "@turf/buffer";
import centroid from "@turf/centroid";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { inferCorridorId, isAlabamaPowerOwner } from "@/lib/corridor";
import type { EeClipGeometry } from "@/lib/eeGeometryTypes";
import { fetchHifldAlabamaTransmissionLines } from "@/lib/hifld";
import { matchPowerLineKey } from "@/lib/powerLineKeys";
import { toLineFeature } from "@/lib/powerLineGeometry";
import type { CorridorId, PowerLineFeature } from "@/types";

const DEFAULT_BUFFER_KM = 0.095;

/**
 * HIFLD line for `lineKey` in `corridorId`, buffered for Earth Engine AOI.
 */
type EeWithGeometry = {
  Geometry: (input: Polygon | MultiPolygon) => EeClipGeometry;
};

export async function fetchBufferedLineGeometryForEe(
  ee: EeWithGeometry,
  corridorId: CorridorId,
  lineKey: string,
  bufferKm = DEFAULT_BUFFER_KM,
): Promise<{
  geometry: EeClipGeometry;
  centroidLngLat: [number, number];
} | null> {
  const fc = await fetchHifldAlabamaTransmissionLines();
  const hit = fc.features.find((f) => {
    if (!isAlabamaPowerOwner(f.properties?.OWNER)) return false;
    if (inferCorridorId(f as PowerLineFeature) !== corridorId) return false;
    return matchPowerLineKey(
      f.properties as PowerLineFeature["properties"],
      lineKey,
    );
  });
  if (!hit) return null;
  const line = toLineFeature(hit as PowerLineFeature);
  if (!line) return null;
  let poly: Feature<Polygon | MultiPolygon> | undefined;
  try {
    poly = buffer(line, bufferKm, {
      units: "kilometers",
    }) as Feature<Polygon | MultiPolygon>;
  } catch {
    return null;
  }
  if (!poly?.geometry) return null;
  const c = centroid(poly);
  const [lng, lat] = c.geometry.coordinates;
  try {
    const geometry = ee.Geometry(poly.geometry);
    return { geometry, centroidLngLat: [lng, lat] };
  } catch {
    return null;
  }
}
