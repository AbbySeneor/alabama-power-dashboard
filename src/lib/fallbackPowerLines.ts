import type { FeatureCollection, LineString } from "geojson";
import type { PowerLineProperties } from "@/types";

/** Used when HIFLD is unreachable — keeps the map populated for demos. */
export const FALLBACK_POWER_LINES: FeatureCollection<
  LineString,
  PowerLineProperties
> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        ID: "FB-BALDWIN-12A",
        OWNER: "ALABAMA POWER CO",
        VOLTAGE: 115,
        SHAPE_Length: 14300,
        TYPE: "AC; OVERHEAD",
        STATUS: "IN SERVICE",
        corridorId: "baldwin-feeder-12a",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [-87.77, 30.7],
          [-87.82, 30.65],
          [-87.88, 30.61],
          [-87.93, 30.57],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        ID: "FB-ESCAMBIA-7B",
        OWNER: "ALABAMA POWER CO",
        VOLTAGE: 69,
        SHAPE_Length: 22100,
        TYPE: "AC; OVERHEAD",
        STATUS: "IN SERVICE",
        corridorId: "escambia-feeder-7b",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [-87.077, 31.115],
          [-87.094, 31.098],
          [-87.112, 31.079],
          [-87.131, 31.063],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        ID: "FB-MOBILE-3C",
        OWNER: "ALABAMA POWER CO",
        VOLTAGE: 115,
        SHAPE_Length: 9800,
        TYPE: "AC; OVERHEAD",
        STATUS: "IN SERVICE",
        corridorId: "mobile-feeder-3c",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [-88.12, 30.83],
          [-88.08, 30.78],
          [-88.03, 30.73],
          [-87.98, 30.68],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        ID: "FB-TV-001",
        OWNER: "TENNESSEE VALLEY AUTHORITY",
        VOLTAGE: 161,
        SHAPE_Length: 52000,
        TYPE: "AC; OVERHEAD",
        STATUS: "IN SERVICE",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [-87.4, 33.2],
          [-87.35, 33.05],
          [-87.3, 32.9],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        ID: "FB-SOCO-002",
        OWNER: "SOUTHERN COMPANY",
        VOLTAGE: 500,
        SHAPE_Length: 88000,
        TYPE: "AC; OVERHEAD",
        STATUS: "IN SERVICE",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [-86.95, 32.45],
          [-87.2, 32.25],
          [-87.45, 32.05],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        ID: "FB-POWER-003",
        OWNER: "POWER SOUTH COOPERATIVE",
        VOLTAGE: 69,
        SHAPE_Length: 12000,
        TYPE: "AC; OVERHEAD",
        STATUS: "IN SERVICE",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [-87.55, 31.45],
          [-87.62, 31.38],
          [-87.7, 31.32],
        ],
      },
    },
  ],
};
