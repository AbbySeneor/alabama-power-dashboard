/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  EE_ALABAMA_BOUNDS,
  EE_CORRIDOR_BOUNDS,
  EE_NORTH_REF_BOUNDS,
} from "@/lib/corridorsConfig";
import type { EeClipGeometry } from "@/lib/eeGeometryTypes";
import { fetchBufferedLineGeometryForEe } from "@/lib/eeRowLineGeometry";
import {
  corridorCenter,
  eeGetInfo,
  promisifyGetMapId,
  promisifyThumbUrl,
} from "@/lib/earthEngine";
import type {
  CorridorId,
  EarthEngineDashboard,
  PrecipDay,
  RiskSegment,
} from "@/types";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** WGS84 west, south, east, north — use 4-arg form (avoids ambiguous list parsing). */
function rect(ee: any, b: [number, number, number, number]) {
  return ee.Geometry.Rectangle(b[0], b[1], b[2], b[3]);
}

function alabamaGeometry(ee: any) {
  return rect(ee, EE_ALABAMA_BOUNDS);
}

/**
 * MODIS/GEDI point statistics: buffered centroid — small corridor rectangles often
 * return empty reduceRegion; a ~4 km disk matches MODIS grid reliably.
 */
function bufferedCenterDisk(
  ee: any,
  bounds: [number, number, number, number],
  radiusM = 4000,
) {
  const [w, s, e, n] = bounds;
  const cx = (w + e) / 2;
  const cy = (s + n) / 2;
  return ee.Geometry.Point([cx, cy]).buffer(radiusM);
}

/** Keep options minimal for Node client compatibility; tileScale only where 30 m sums need it. */
const REDUCE_REGION = { maxPixels: 1e9, tileScale: 2 } as const;
const REDUCE_REGION_HEAVY = { maxPixels: 1e9, tileScale: 2 } as const;

/** Single scale for MODIS NDVI means (faster, stable vs 250 m on tiny AOIs). */
const MODIS_STATS_SCALE = 500;

const MODIS_VEG = "MODIS/061/MOD13Q1";

/**
 * App Platform / many hosts return HTTP 504 if Earth Engine work exceeds ~60–100s.
 * Production defaults to a lighter compute path; set EE_FULL_COMPUTE=1 for full fidelity.
 */
function eeFullCompute(): boolean {
  const v = process.env.EE_FULL_COMPUTE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function eeFastMode(): boolean {
  if (eeFullCompute()) return false;
  const off = process.env.EE_FAST_MODE?.trim().toLowerCase();
  if (off === "0" || off === "false" || off === "no") return false;
  return process.env.NODE_ENV === "production";
}

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const part = await Promise.all(chunk.map(fn));
    out.push(...part);
  }
  return out;
}

function modisNdviImage(ee: any, img: any) {
  const nd = img.select("NDVI").multiply(0.0001).rename("ndvi");
  return nd.updateMask(img.select("NDVI").gt(-3000));
}

/** Concatenate single-band images into one multi-band image (one `reduceRegion` per AOI). */
function catBandImages(ee: any, images: any[]) {
  if (images.length === 0) return ee.Image.constant(0);
  return (ee.Image.cat as (...args: any[]) => any)(...images);
}

function yearlyNdviStack(ee: any, collectionBounds: any, years: number[]) {
  const bands = years.map((y) => {
    const start = ee.Date.fromYMD(y, 1, 1);
    const end = start.advance(1, "year");
    return ee
      .ImageCollection(MODIS_VEG)
      .filterDate(start, end)
      .filterBounds(collectionBounds)
      .map((i: any) => modisNdviImage(ee, i))
      .mean()
      .rename(`y${y}`);
  });
  return catBandImages(ee, bands);
}

function phenologyNdviStack(
  ee: any,
  collectionBounds: any,
  startDate = "2019-01-01",
) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const bands = months.map((m) =>
    ee
      .ImageCollection(MODIS_VEG)
      .filter(ee.Filter.calendarRange(m, m, "month"))
      .filterDate(startDate, "2025-01-01")
      .filterBounds(collectionBounds)
      .map((i: any) => modisNdviImage(ee, i))
      .mean()
      .rename(`m${m}`),
  );
  return catBandImages(ee, bands);
}

function dictToYearlySeries(
  dict: Record<string, number> | null | undefined,
  years: number[],
) {
  return years.map((year) => {
    const v = dict?.[`y${year}`];
    return {
      year,
      ndvi: typeof v === "number" && Number.isFinite(v) ? v : 0,
    };
  });
}

function dictToPhenologySeries(
  dict: Record<string, number> | null | undefined,
  monthNames: string[],
) {
  return monthNames.map((month, i) => {
    const v = dict?.[`m${i + 1}`];
    return {
      month,
      ndvi: typeof v === "number" && Number.isFinite(v) ? v : 0,
    };
  });
}

const EMPTY_RISK: RiskSegment[] = [
  { name: "High NDVI", value: 0, color: "#EF4444" },
  { name: "Medium", value: 0, color: "#F59E0B" },
  { name: "Low", value: 0, color: "#22C55E" },
  { name: "Sparse", value: 0, color: "#374151" },
];

async function riskFromNdvi(ee: any, geometry: any, collectionBounds: any) {
  const fast = eeFastMode();
  const scale = fast ? 1000 : MODIS_STATS_SCALE;
  const heavy = fast
    ? { maxPixels: 1e9, tileScale: 4 }
    : REDUCE_REGION_HEAVY;
  const img = ee
    .ImageCollection(MODIS_VEG)
    .filterDate("2023-01-01", "2025-01-01")
    .filterBounds(collectionBounds)
    .map((i: any) => modisNdviImage(ee, i))
    .mean();
  const nd = img.select("ndvi");
  const pix = ee.Image.pixelArea();
  const sumMasked = async (mask: any) => {
    const im = mask.rename("s").multiply(pix);
    const d = await eeGetInfo<Record<string, number>>(
      im.reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry,
        scale,
        ...heavy,
      }),
    );
    return d?.s ?? 0;
  };
  const [hi, med, lo, sp] = await Promise.all([
    sumMasked(nd.gt(0.65)),
    sumMasked(nd.gt(0.45).and(nd.lte(0.65))),
    sumMasked(nd.gt(0.25).and(nd.lte(0.45))),
    sumMasked(nd.lte(0.25)),
  ]);
  const total = hi + med + lo + sp;
  if (total <= 0) return { segments: EMPTY_RISK, atRiskPct: 0 };
  const pct = (n: number) => Math.round((100 * n) / total);
  return {
    segments: [
      { name: "High NDVI", value: pct(hi), color: "#EF4444" },
      { name: "Medium", value: pct(med), color: "#F59E0B" },
      { name: "Low", value: pct(lo), color: "#22C55E" },
      { name: "Sparse", value: pct(sp), color: "#374151" },
    ],
    atRiskPct: pct(hi + med),
  };
}

function histogramToSixBins(hist: unknown): number[] {
  const out = [0, 0, 0, 0, 0, 0];
  if (!Array.isArray(hist)) return out;
  for (let i = 0; i < hist.length && i < 6; i++) {
    const row = hist[i];
    if (!Array.isArray(row)) continue;
    const last = row[row.length - 1];
    if (typeof last === "number" && Number.isFinite(last)) {
      out[i] = Math.round(last);
    }
  }
  return out;
}

async function gediBinsByHistogram(
  ee: any,
  gediMean: any,
  statGeom: any,
  labels: string[],
  scale = 500,
) {
  const dict = await eeGetInfo<Record<string, unknown>>(
    gediMean.select("rh98").reduceRegion({
      reducer: ee.Reducer.fixedHistogram(0, 30, 6),
      geometry: statGeom,
      scale,
      ...REDUCE_REGION,
    }),
  );
  const hist =
    dict?.rh98 ??
    dict?.histogram ??
    (dict &&
    typeof dict === "object" &&
    (Object.values(dict).find((v) => Array.isArray(v)) as unknown));
  const counts = histogramToSixBins(hist);
  return labels.map((range, i) => ({ range, count: counts[i] ?? 0 }));
}

async function gediBinsByMaskCounts(
  ee: any,
  gediMean: any,
  statGeom: any,
  labels: string[],
) {
  const tasks = labels.map((_, i) => {
    const lo = i * 5;
    const hi = i === 5 ? 100 : (i + 1) * 5;
    const mask =
      i === 5
        ? gediMean.gte(lo)
        : gediMean.gte(lo).and(gediMean.lt(hi));
    return eeGetInfo<Record<string, number>>(
      mask.selfMask().rename("rh98").reduceRegion({
        reducer: ee.Reducer.count(),
        geometry: statGeom,
        scale: 500,
        ...REDUCE_REGION,
      }),
    );
  });
  const results = await Promise.all(tasks);
  return labels.map((range, i) => ({
    range,
    count: Math.round(results[i]?.rh98 ?? 0),
  }));
}

async function canopyBinsFromGedi(
  ee: any,
  geometry: any,
  collectionBounds: any,
) {
  const fast = eeFastMode();
  const labels = [
    "0–5 m",
    "5–10 m",
    "10–15 m",
    "15–20 m",
    "20–25 m",
    "25–30 m",
  ];
  const statGeom = geometry.buffer(fast ? 5000 : 8000);
  try {
    const gediMean = ee
      .ImageCollection("LARSE/GEDI/GEDI02_A_002_MONTHLY")
      .filterDate(fast ? "2021-01-01" : "2019-01-01", "2024-12-31")
      .filterBounds(collectionBounds)
      .select("rh98")
      .mean();
    try {
      const fromHist = await gediBinsByHistogram(
        ee,
        gediMean,
        statGeom,
        labels,
        fast ? 1000 : 500,
      );
      if (fromHist.some((b) => b.count > 0)) return fromHist;
    } catch (e) {
      console.error("[ee] GEDI fixedHistogram failed, using mask counts", e);
    }
    if (fast) {
      return labels.map((range) => ({ range, count: 0 }));
    }
    return await gediBinsByMaskCounts(ee, gediMean, statGeom, labels);
  } catch (e) {
    console.error("[ee] canopyBinsFromGedi failed", e);
    return labels.map((range) => ({ range, count: 0 }));
  }
}

type PrecipSampleLocation = CorridorId | { lng: number; lat: number };

async function precipSeries(ee: any, at: PrecipSampleLocation): Promise<PrecipDay[]> {
  const [cx, cy] =
    typeof at === "string" ? corridorCenter(at) : [at.lng, at.lat];
  /** Point-only reduce on GRIDMET (~4 km) often returns null; buffer samples a pixel reliably. */
  const sampleGeom = ee.Geometry.Point([cx, cy]).buffer(3000);
  const start = new Date(Date.UTC(2022, 11, 1));
  const slotCount = eeFastMode() ? 8 : 12;
  const slots = Array.from({ length: slotCount }, (_, i) => {
    const d0 = new Date(start);
    d0.setUTCDate(start.getUTCDate() + i * 5);
    const d1 = new Date(d0);
    d1.setUTCDate(d0.getUTCDate() + 5);
    return { d0, d1, t0: d0.getTime(), t1: d1.getTime() };
  });
  const batchSize = eeFastMode() ? 8 : 6;
  return mapInBatches(slots, batchSize, async ({ d0, t0, t1 }) => {
    const label = `${MONTHS[d0.getUTCMonth()]} ${String(d0.getUTCDate()).padStart(2, "0")}`;
    try {
      const img = ee
        .ImageCollection("GRIDMET/DAILY")
        .filterDate(ee.Date(t0), ee.Date(t1))
        .select("pr")
        .sum();
      const dict = await eeGetInfo<Record<string, number>>(
        img.reduceRegion({
          reducer: ee.Reducer.mean(),
          geometry: sampleGeom,
          scale: 4000,
          maxPixels: 1e9,
          tileScale: 2,
        }),
      );
      const raw = dict?.pr;
      const mm =
        typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
      const rounded = Math.round(mm * 10) / 10;
      return { date: label, mm: rounded, storm: rounded >= 45 };
    } catch (e) {
      console.error("[ee] GRIDMET precip window failed", label, e);
      return { date: label, mm: 0, storm: false };
    }
  });
}

async function stormLossKm2(ee: any, geometry: any): Promise<number> {
  const region = rect(ee, EE_ALABAMA_BOUNDS);
  const s2ndvi = (start: string, end: string) =>
    ee
      .ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
      .filterDate(start, end)
      .filterBounds(region)
      .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 75))
      .map((img: any) =>
        img.normalizedDifference(["B8", "B4"]).rename("ndvi"),
      )
      .median();
  const pre = s2ndvi("2022-10-01", "2022-12-15");
  const post = s2ndvi("2023-02-01", "2023-04-30");
  const loss = pre.subtract(post).clip(geometry);
  const disturbed = loss
    .gt(0.12)
    .rename("s")
    .multiply(ee.Image.pixelArea());
  const lossScale = eeFastMode() ? 100 : 30;
  const dict = await eeGetInfo<Record<string, number>>(
    disturbed.reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry,
      scale: lossScale,
      ...REDUCE_REGION_HEAVY,
    }),
  );
  const m2 = dict?.s ?? 0;
  return Math.round((m2 / 1e6) * 100) / 100;
}

async function highNdviFraction(
  ee: any,
  geometry: any,
  collectionBounds: any,
): Promise<number> {
  const img = ee
    .ImageCollection(MODIS_VEG)
    .filterDate("2023-06-01", "2024-06-01")
    .filterBounds(collectionBounds)
    .map((i: any) => modisNdviImage(ee, i))
    .mean();
  const nd = img.select("ndvi");
  const pix = ee.Image.pixelArea();
  const vegArea = nd.gt(0.62).rename("s").multiply(pix);
  const allArea = nd.mask().rename("s").multiply(pix);
  const hiScale = eeFastMode() ? 1000 : MODIS_STATS_SCALE;
  const [vDict, aDict] = await Promise.all([
    eeGetInfo<Record<string, number>>(
      vegArea.reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry,
        scale: hiScale,
        ...REDUCE_REGION_HEAVY,
      }),
    ),
    eeGetInfo<Record<string, number>>(
      allArea.reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry,
        scale: hiScale,
        ...REDUCE_REGION_HEAVY,
      }),
    ),
  ]);
  const va = vDict?.s ?? 0;
  const aa = aDict?.s ?? 0;
  if (!aa) return 0;
  return Math.round((100 * va) / aa);
}

async function stormThumbs(ee: any, geometry: any) {
  if (eeFastMode()) {
    return { thumbPreUrl: null, thumbPostUrl: null };
  }
  /**
   * Match stormLossKm2: build Sentinel-2 medians over Alabama so collections are not empty,
   * then clip to a buffered corridor for thumbnails (narrow filterBounds alone often yields no scenes).
   */
  const alabama = rect(ee, EE_ALABAMA_BOUNDS);
  const thumbRegion = geometry.buffer(15000);
  const rgb = (start: string, end: string) =>
    ee
      .ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
      .filterDate(start, end)
      .filterBounds(alabama)
      .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 92))
      .median()
      .select(["B4", "B3", "B2"])
      .divide(2800)
      .clamp(0, 1)
      .clip(thumbRegion);
  try {
    const pre = rgb("2022-11-01", "2022-12-20");
    const post = rgb("2023-02-01", "2023-03-20");
    const [thumbPreUrl, thumbPostUrl] = await Promise.all([
      promisifyThumbUrl(pre, {
        dimensions: 280,
        region: thumbRegion,
        format: "png",
      }),
      promisifyThumbUrl(post, {
        dimensions: 280,
        region: thumbRegion,
        format: "png",
      }),
    ]);
    return { thumbPreUrl, thumbPostUrl };
  } catch (e) {
    console.error("[ee] stormThumbs failed", e);
    return { thumbPreUrl: null, thumbPostUrl: null };
  }
}

function emptyCanopyBins() {
  return [
    "0–5 m",
    "5–10 m",
    "10–15 m",
    "15–20 m",
    "20–25 m",
    "25–30 m",
  ].map((range) => ({ range, count: 0 }));
}

export async function computeEarthEngineDashboard(
  ee: any,
  corridorId: CorridorId,
  options?: { lineObjectKey?: string | null },
): Promise<EarthEngineDashboard> {
  const bounds = EE_CORRIDOR_BOUNDS[corridorId];
  let geometry = rect(ee, bounds);
  let southDisk = bufferedCenterDisk(ee, bounds);
  let precipAt: PrecipSampleLocation = corridorId;

  const key = options?.lineObjectKey?.trim();
  if (key) {
    try {
      const row = await fetchBufferedLineGeometryForEe(ee, corridorId, key);
      if (row) {
        geometry = row.geometry;
        southDisk = ee.Geometry.Point(row.centroidLngLat).buffer(4000);
        precipAt = { lng: row.centroidLngLat[0], lat: row.centroidLngLat[1] };
      }
    } catch (e) {
      console.error("[ee] line-scoped AOI failed; using corridor bounds", e);
    }
  }

  const collectionBounds = alabamaGeometry(ee);
  const northDisk = bufferedCenterDisk(ee, EE_NORTH_REF_BOUNDS);

  const yearStart = eeFastMode() ? 2019 : 2013;
  const years: number[] = [];
  for (let y = yearStart; y <= 2024; y++) years.push(y);

  let ndviYearlySouth = years.map((year) => ({ year, ndvi: 0 }));
  let ndviYearlyNorth = years.map((year) => ({ year, ndvi: 0 }));
  let phenologySouth = MONTHS.map((month) => ({ month, ndvi: 0 }));
  let phenologyNorth = MONTHS.map((month) => ({ month, ndvi: 0 }));
  try {
    const yearlyStack = yearlyNdviStack(ee, collectionBounds, years);
    const phenoStart = eeFastMode() ? "2021-01-01" : "2019-01-01";
    const phenoStack = phenologyNdviStack(ee, collectionBounds, phenoStart);
    const reduceOpts = {
      reducer: ee.Reducer.mean(),
      scale: eeFastMode() ? 1000 : MODIS_STATS_SCALE,
      ...REDUCE_REGION,
    };
    const [dSouthY, dNorthY, dSouthP, dNorthP] = await Promise.all([
      eeGetInfo<Record<string, number>>(
        yearlyStack.reduceRegion({ ...reduceOpts, geometry: southDisk }),
      ),
      eeGetInfo<Record<string, number>>(
        yearlyStack.reduceRegion({ ...reduceOpts, geometry: northDisk }),
      ),
      eeGetInfo<Record<string, number>>(
        phenoStack.reduceRegion({ ...reduceOpts, geometry: southDisk }),
      ),
      eeGetInfo<Record<string, number>>(
        phenoStack.reduceRegion({ ...reduceOpts, geometry: northDisk }),
      ),
    ]);
    ndviYearlySouth = dictToYearlySeries(dSouthY, years);
    ndviYearlyNorth = dictToYearlySeries(dNorthY, years);
    phenologySouth = dictToPhenologySeries(dSouthP, MONTHS);
    phenologyNorth = dictToPhenologySeries(dNorthP, MONTHS);
  } catch (e) {
    console.error("[ee] MODIS stacked NDVI / phenology failed", e);
  }

  const settled = await Promise.allSettled([
    riskFromNdvi(ee, geometry, collectionBounds),
    canopyBinsFromGedi(ee, geometry, collectionBounds),
    precipSeries(ee, precipAt),
    stormLossKm2(ee, geometry),
    highNdviFraction(ee, geometry, collectionBounds),
    stormThumbs(ee, geometry),
  ]);

  const taskNames = [
    "riskFromNdvi",
    "canopyBinsFromGedi",
    "precipSeries",
    "stormLossKm2",
    "highNdviFraction",
    "stormThumbs",
  ] as const;
  settled.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`[ee] ${taskNames[i]} failed`, r.reason);
    }
  });

  const risk =
    settled[0].status === "fulfilled"
      ? settled[0].value
      : { segments: EMPTY_RISK, atRiskPct: 0 };
  const canopyBins =
    settled[1].status === "fulfilled" ? settled[1].value : emptyCanopyBins();
  const precip = settled[2].status === "fulfilled" ? settled[2].value : [];
  const disturbedKm2 =
    settled[3].status === "fulfilled" ? settled[3].value : 0;
  const hiFrac = settled[4].status === "fulfilled" ? settled[4].value : 0;
  const thumbs =
    settled[5].status === "fulfilled"
      ? settled[5].value
      : { thumbPreUrl: null, thumbPostUrl: null };

  return {
    ok: true,
    ndviYearlySouth,
    ndviYearlyNorth,
    phenologySouth,
    phenologyNorth,
    canopyBins,
    riskSegments: risk.segments,
    riskAtRiskPct: risk.atRiskPct,
    precip,
    stormDisturbedAreaKm2: disturbedKm2,
    highNdviFractionPct: hiFrac,
    thumbPreUrl: thumbs.thumbPreUrl,
    thumbPostUrl: thumbs.thumbPostUrl,
  };
}

export async function buildMapTiles(
  ee: any,
  opts?: { rowClip?: EeClipGeometry | null },
) {
  const region = rect(ee, EE_ALABAMA_BOUNDS);
  const rowClip = opts?.rowClip ?? null;
  const fast = eeFastMode();
  const cloudRecent = fast ? 85 : 60;
  const cloudStorm = fast ? 90 : 75;

  const s2ndviRecent = ee
    .ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterDate("2024-03-01", "2024-10-01")
    .filterBounds(region)
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloudRecent))
    .map((img: any) =>
      img.normalizedDifference(["B8", "B4"]).rename("ndvi"),
    )
    .median()
    .clip(region);

  const gediCanopy = ee
    .ImageCollection("LARSE/GEDI/GEDI02_A_002_MONTHLY")
    .filterDate(fast ? "2023-06-01" : "2023-01-01", "2024-06-01")
    .filterBounds(region)
    .select("rh98")
    .mean()
    .clip(region);

  const s2pre = ee
    .ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterDate("2022-10-01", "2022-12-20")
    .filterBounds(region)
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloudStorm))
    .map((img: any) =>
      img.normalizedDifference(["B8", "B4"]).rename("ndvi"),
    )
    .median()
    .clip(region);
  const s2post = ee
    .ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterDate("2023-02-01", "2023-05-01")
    .filterBounds(region)
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloudStorm))
    .map((img: any) =>
      img.normalizedDifference(["B8", "B4"]).rename("ndvi"),
    )
    .median()
    .clip(region);
  const storm = s2pre.subtract(s2post).clip(region);

  const encroach = s2ndviRecent.gt(0.62).float().rename("ndvi");

  const ndviMap = rowClip ? s2ndviRecent.clip(rowClip) : s2ndviRecent;
  const canopyMap = rowClip ? gediCanopy.clip(rowClip) : gediCanopy;
  const stormMap = rowClip ? storm.clip(rowClip) : storm;
  const encroachMap = rowClip ? encroach.clip(rowClip) : encroach;

  const [ndvi, canopy, stormLayer, encroachLayer] = await Promise.all([
    promisifyGetMapId(ndviMap, {
      bands: ["ndvi"],
      min: 0.15,
      max: 0.85,
      palette: ["#7f1d1d", "#fbbf24", "#166534"],
    }),
    promisifyGetMapId(canopyMap, {
      bands: ["rh98"],
      min: 2,
      max: 28,
      palette: ["#166534", "#fbbf24", "#b91c1c"],
    }),
    promisifyGetMapId(stormMap, {
      bands: ["ndvi"],
      min: 0.1,
      max: 0.45,
      palette: ["#1a1a1a", "#ef4444"],
    }),
    promisifyGetMapId(encroachMap, {
      bands: ["ndvi"],
      min: 0,
      max: 1,
      palette: ["#00000000", "#ef4444"],
    }),
  ]);

  return {
    ndvi: ndvi.urlFormat,
    canopy: canopy.urlFormat,
    storm: stormLayer.urlFormat,
    encroachment: encroachLayer.urlFormat,
  };
}
