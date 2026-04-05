import type { FeatureCollection, LineString, MultiLineString } from "geojson";
import { EE_ALABAMA_BOUNDS } from "@/lib/corridorsConfig";
import type { PowerLineProperties } from "@/types";

export const HIFLD_QUERY_URL =
  "https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/Electric_Power_Transmission_Lines/FeatureServer/0/query";

/** ArcGIS Online page size; Alabama currently ~3.6k segments (2+ requests). */
const PAGE_SIZE = 2000;

/** Safety cap (50 × 2000 = 100k features). */
const MAX_PAGES = 50;

function alabamaEnvelopeGeometry(): string {
  const [west, south, east, north] = EE_ALABAMA_BOUNDS;
  return JSON.stringify({
    xmin: west,
    ymin: south,
    xmax: east,
    ymax: north,
  });
}

/**
 * Query params for one page. Uses spatial intersection with the Alabama study
 * envelope (HIFLD layer no longer exposes a STATE attribute).
 */
export function buildHifldPageParams(resultOffset: number): URLSearchParams {
  return new URLSearchParams({
    where: "1=1",
    geometry: alabamaEnvelopeGeometry(),
    geometryType: "esriGeometryEnvelope",
    spatialRel: "esriSpatialRelIntersects",
    inSR: "4326",
    outFields:
      "ID,TYPE,STATUS,OWNER,VOLTAGE,NAICS_DESC,Shape__Length,OBJECTID",
    outSR: "4326",
    f: "geojson",
    resultRecordCount: String(PAGE_SIZE),
    resultOffset: String(resultOffset),
    returnGeometry: "true",
    orderByFields: "OBJECTID",
  });
}

/**
 * Fetches all transmission line features intersecting the Alabama envelope,
 * paging until the service returns a short page.
 */
export async function fetchHifldAlabamaTransmissionLines(): Promise<
  FeatureCollection<LineString | MultiLineString, PowerLineProperties>
> {
  type FC = FeatureCollection<LineString | MultiLineString, PowerLineProperties>;

  const features: FC["features"] = [];

  for (let page = 0, offset = 0; page < MAX_PAGES; page++) {
    const params = buildHifldPageParams(offset);
    const url = `${HIFLD_QUERY_URL}?${params.toString()}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      throw new Error(`HIFLD ${res.status}`);
    }

    const data = (await res.json()) as FC & { error?: { message?: string } };

    if (data.error) {
      throw new Error(data.error.message ?? "HIFLD query error");
    }

    const batch = data.features ?? [];
    features.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }
    offset += PAGE_SIZE;
  }

  if (!features.length) {
    throw new Error("Empty HIFLD response");
  }

  return { type: "FeatureCollection", features };
}
