import length from "@turf/length";
import type { Position } from "geojson";
import { inferCorridorId } from "@/lib/corridor";
import type { CorridorId, PowerLineFeature } from "@/types";

export function toLineFeature(f: PowerLineFeature): PowerLineFeature | null {
  if (f.geometry.type === "LineString") return f;
  if (f.geometry.type === "MultiLineString") {
    const rings: Position[][] = f.geometry.coordinates;
    if (!rings.length) return null;
    const coords = rings.reduce((a, b) => (a.length >= b.length ? a : b));
    if (!coords.length) return null;
    return {
      ...f,
      geometry: { type: "LineString", coordinates: coords },
    };
  }
  return null;
}

export function lineLengthKm(f: PowerLineFeature): number | null {
  const line = toLineFeature(f);
  if (!line) return null;
  try {
    return length(line, { units: "kilometers" });
  } catch {
    return null;
  }
}

export function findCorridorLineLengthKm(
  features: PowerLineFeature[],
  corridorId: CorridorId,
): number | null {
  for (const f of features) {
    const id = inferCorridorId(f);
    if (id === corridorId) {
      return lineLengthKm(f);
    }
  }
  return null;
}
