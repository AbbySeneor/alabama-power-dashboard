export const MAP_STYLE = "mapbox://styles/mapbox/dark-v11";

export const INITIAL_VIEW = {
  longitude: -87.5,
  latitude: 32.8,
  zoom: 8,
  pitch: 0,
  bearing: 0,
} as const;

export const SOURCES = {
  allLines: "all-lines",
  apLines: "ap-lines",
  canopy: "canopy-grid",
  ndvi: "ndvi-grid",
  risk: "risk-points",
  storm: "storm-damage",
  selectedBuffer: "selected-buffer",
} as const;

export const LAYERS = {
  allLines: "layer-all-lines",
  apGlow: "layer-ap-glow",
  apLines: "layer-ap-lines",
  canopy: "layer-canopy",
  ndvi: "layer-ndvi",
  risk: "layer-risk",
  storm: "layer-storm",
  bufferFill: "layer-buffer-fill",
  bufferLine: "layer-buffer-line",
} as const;

/** West, south, east, north — Baldwin / Gulf Coast study extent */
export const STUDY_BOUNDS: [number, number, number, number] = [
  -88.0, 30.52, -87.74, 30.72,
];
