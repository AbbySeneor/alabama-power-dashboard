import type { CorridorId, CorridorMeta } from "@/types";

/** WGS84 [west, south, east, north] — Earth Engine AOI for charts & thumbnails */
export const EE_CORRIDOR_BOUNDS: Record<
  CorridorId,
  [number, number, number, number]
> = {
  "baldwin-feeder-12a": [-88.05, 30.52, -87.72, 30.78],
  "escambia-feeder-7b": [-87.22, 31.0, -86.98, 31.22],
  "mobile-feeder-3c": [-88.18, 30.62, -87.92, 30.88],
};

/** Reference north AL (Limestone) for comparison NDVI series */
export const EE_NORTH_REF_BOUNDS: [number, number, number, number] = [
  -87.4, 34.52, -86.78, 34.98,
];

/** Alabama clipping extent for map tiles */
export const EE_ALABAMA_BOUNDS: [number, number, number, number] = [
  -88.52, 30.12, -84.35, 35.1,
];

export const corridorList: Record<CorridorId, CorridorMeta> = {
  "baldwin-feeder-12a": {
    name: "Baldwin County — Transmission 12A",
    voltage: 115,
    owner: "ALABAMA POWER CO",
  },
  "escambia-feeder-7b": {
    name: "Escambia County — Transmission 7B",
    voltage: 69,
    owner: "ALABAMA POWER CO",
  },
  "mobile-feeder-3c": {
    name: "Mobile County — Transmission 3C",
    voltage: 115,
    owner: "ALABAMA POWER CO",
  },
};

export const riskPanelTitleByCorridor: Record<CorridorId, string> = {
  "baldwin-feeder-12a": "NDVI canopy risk — south corridor",
  "escambia-feeder-7b": "NDVI canopy risk — Escambia corridor",
  "mobile-feeder-3c": "NDVI canopy risk — Mobile corridor",
};

export const defaultCorridorId: CorridorId = "baldwin-feeder-12a";
