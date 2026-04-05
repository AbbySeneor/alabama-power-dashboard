import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
} from "geojson";

export type CorridorId =
  | "baldwin-feeder-12a"
  | "escambia-feeder-7b"
  | "mobile-feeder-3c";

/** Static corridor metadata (HIFLD / UI); lengths and vegetation metrics come from APIs */
export interface CorridorMeta {
  name: string;
  voltage: number;
  owner: string;
}

export interface PrecipDay {
  date: string;
  mm: number;
  storm?: boolean;
}

export interface RiskSegment {
  name: string;
  value: number;
  color: string;
}

/** Successful GET /api/ee/dashboard body */
export interface EarthEngineDashboard {
  ok: true;
  ndviYearlySouth: { year: number; ndvi: number }[];
  ndviYearlyNorth: { year: number; ndvi: number }[];
  phenologySouth: { month: string; ndvi: number }[];
  phenologyNorth: { month: string; ndvi: number }[];
  canopyBins: { range: string; count: number }[];
  riskSegments: RiskSegment[];
  riskAtRiskPct: number;
  precip: PrecipDay[];
  stormDisturbedAreaKm2: number;
  highNdviFractionPct: number;
  thumbPreUrl: string | null;
  thumbPostUrl: string | null;
}

export type EarthEngineDashboardError = {
  ok: false;
  error: string;
};

/** GET /api/ee/tiles */
export interface EETileUrls {
  ndvi: string;
  canopy: string;
  storm: string;
  encroachment: string;
}

export interface PowerLineProperties {
  ID?: string | number;
  OBJECTID?: number;
  TYPE?: string;
  STATUS?: string;
  OWNER?: string;
  VOLTAGE?: number | string;
  NAICS_DESC?: string;
  /** Legacy / fallback GeoJSON */
  SHAPE_Length?: number;
  /** HIFLD ArcGIS field name (meters) */
  Shape__Length?: number;
  Shape__Len?: number;
  corridorId?: CorridorId;
}

export type PowerLineFeature = Feature<
  LineString | MultiLineString,
  PowerLineProperties
>;

export type PowerLineCollection = FeatureCollection<
  LineString | MultiLineString,
  PowerLineProperties
>;

export type LayerId =
  | "apLines"
  | "allLines"
  | "canopy"
  | "ndvi"
  | "risk"
  | "storm";

export type LayerVisibility = Record<LayerId, boolean>;

export interface MapTooltipState {
  x: number;
  y: number;
  kind: "line" | null;
  payload: LineTooltipPayload | null;
}

export interface LineTooltipPayload {
  owner: string;
  voltage: string;
  lengthKm: string;
  lineId: string;
}
