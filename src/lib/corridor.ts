import type { LineString, MultiLineString } from "geojson";
import type { CorridorId, PowerLineFeature } from "@/types";

const REGIONS: {
  id: CorridorId;
  west: number;
  south: number;
  east: number;
  north: number;
}[] = [
  { id: "baldwin-feeder-12a", west: -88.1, south: 30.48, east: -87.7, north: 30.75 },
  { id: "escambia-feeder-7b", west: -87.2, south: 31.02, east: -87.02, north: 31.18 },
  { id: "mobile-feeder-3c", west: -88.2, south: 30.62, east: -87.92, north: 30.88 },
];

function flattenCoords(
  geometry: LineString | MultiLineString,
): LineString["coordinates"] {
  if (geometry.type === "LineString") return geometry.coordinates;
  const rings = geometry.coordinates;
  if (!rings.length) return [];
  return rings.reduce((a, b) => (a.length >= b.length ? a : b));
}

function lineMidpoint(coords: LineString["coordinates"]): [number, number] {
  if (!coords.length) return [0, 0];
  const mid = Math.floor(coords.length / 2);
  const c = coords[mid];
  return [c[0], c[1]];
}

export function inferCorridorId(feature: PowerLineFeature): CorridorId | null {
  const props = feature.properties;
  if (props?.corridorId) return props.corridorId;

  const flat = flattenCoords(feature.geometry);
  if (!flat.length) return null;
  const [lng, lat] = lineMidpoint(flat);

  for (const r of REGIONS) {
    if (lng >= r.west && lng <= r.east && lat >= r.south && lat <= r.north) {
      return r.id;
    }
  }

  return "baldwin-feeder-12a";
}

/** Matches spec: OWNER includes ALABAMA POWER or Alabama Power (HIFLD variants). */
export function isAlabamaPowerOwner(owner: string | undefined): boolean {
  if (!owner) return false;
  return (
    owner.includes("ALABAMA POWER") ||
    owner.includes("Alabama Power") ||
    owner.toUpperCase().includes("ALABAMA POWER")
  );
}
