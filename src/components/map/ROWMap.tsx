"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  MapRef,
  NavigationControl,
  ScaleControl,
  Source,
} from "react-map-gl/mapbox";
import type { MapMouseEvent } from "react-map-gl/mapbox";
import buffer from "@turf/buffer";
import length from "@turf/length";
import { bbox } from "@turf/turf";
import { Minus, Plus } from "lucide-react";
import { INITIAL_VIEW, LAYERS, MAP_STYLE, SOURCES } from "@/lib/mapConfig";
import { inferCorridorId, isAlabamaPowerOwner } from "@/lib/corridor";
import { powerLineStableKey } from "@/lib/powerLineKeys";
import { toLineFeature } from "@/lib/powerLineGeometry";
import type {
  CorridorId,
  EETileUrls,
  LayerVisibility,
  LineTooltipPayload,
  MapTooltipState,
  PowerLineFeature,
} from "@/types";
import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  Polygon,
} from "geojson";
import { MapTooltip } from "@/components/map/MapTooltip";
import { Spinner } from "@/components/ui/Spinner";

const EMPTY_FC: FeatureCollection<LineString | MultiLineString> = {
  type: "FeatureCollection",
  features: [],
};

function queryableLayerIds(
  map: MapMouseEvent["target"],
  ids: readonly string[],
): string[] {
  return ids.filter((id) => map.getLayer(id) != null);
}

/** Match server `eeRowLineGeometry` buffer (95 m). */
const ROW_BUFFER_KM = 0.095;

function lineTooltipFromFeature(f: PowerLineFeature): LineTooltipPayload {
  const p = f.properties ?? {};
  const lf = toLineFeature(f);
  let km = "—";
  if (lf) {
    try {
      km = length(lf, { units: "kilometers" }).toFixed(1);
    } catch {
      const lenM = p.SHAPE_Length ?? p.Shape__Length ?? p.Shape__Len;
      km = lenM != null ? (Number(lenM) / 1000).toFixed(1) : "—";
    }
  }
  const v = p.VOLTAGE;
  const voltage =
    v === undefined || v === null ? "—" : `${String(v).replace(/\D/g, "") || v} kV`;
  const id = p.ID ?? p.OBJECTID ?? "—";
  return {
    owner: String(p.OWNER ?? "Unknown"),
    voltage,
    lengthKm: km,
    lineId: String(id),
  };
}

interface ROWMapProps {
  selectedCorridorId: CorridorId;
  onCorridorSelect: (id: CorridorId) => void;
  /** HIFLD span id (`oid:…` / `id:…`); scopes EE + map buffer to that conductor. */
  selectedLineObjectKey: string | null;
  onLineObjectKeyChange: (key: string | null) => void;
  visibility: LayerVisibility;
  onCursorMove: (lng: number, lat: number) => void;
  eeTiles: EETileUrls | null;
  onPowerLinesLoaded?: (features: PowerLineFeature[]) => void;
}

export function ROWMap({
  selectedCorridorId,
  onCorridorSelect,
  selectedLineObjectKey,
  onLineObjectKeyChange,
  visibility,
  onCursorMove,
  eeTiles,
  onPowerLinesLoaded,
}: ROWMapProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapRef = useRef<MapRef>(null);
  const onLinesLoadedRef = useRef(onPowerLinesLoaded);
  onLinesLoadedRef.current = onPowerLinesLoaded;
  const [allLines, setAllLines] =
    useState<FeatureCollection<LineString | MultiLineString> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<MapTooltipState>({
    x: 0,
    y: 0,
    kind: null,
    payload: null,
  });

  /** Spec: client filter OWNER includes ALABAMA POWER or Alabama Power */
  const apLines = useMemo(() => {
    if (!allLines?.features?.length) return EMPTY_FC;
    return {
      type: "FeatureCollection" as const,
      features: allLines.features.filter((f) =>
        isAlabamaPowerOwner(
          (f.properties as { OWNER?: string } | null)?.OWNER,
        ),
      ),
    };
  }, [allLines]);

  const selectedBuffer = useMemo((): FeatureCollection<Polygon> => {
    const empty: FeatureCollection<Polygon> = {
      type: "FeatureCollection",
      features: [],
    };
    if (!apLines.features.length) return empty;

    let match: PowerLineFeature | undefined;
    if (selectedLineObjectKey) {
      match = apLines.features.find((f) => {
        const pf = f as PowerLineFeature;
        return (
          inferCorridorId(pf) === selectedCorridorId &&
          powerLineStableKey(pf.properties) === selectedLineObjectKey
        );
      }) as PowerLineFeature | undefined;
    }
    if (!match) {
      match = apLines.features.find((f) => {
        const id = inferCorridorId(f as PowerLineFeature);
        return id === selectedCorridorId;
      }) as PowerLineFeature | undefined;
    }
    if (!match) return empty;
    const line = toLineFeature(match);
    if (!line) return empty;
    try {
      const poly = buffer(line, ROW_BUFFER_KM, {
        units: "kilometers",
      }) as Feature<Polygon>;
      if (!poly || poly.geometry.type !== "Polygon") return empty;
      return {
        type: "FeatureCollection",
        features: [poly],
      };
    } catch {
      return empty;
    }
  }, [apLines, selectedCorridorId, selectedLineObjectKey]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !selectedBuffer.features.length) return;

    let cancelled = false;
    const doFit = () => {
      if (cancelled) return;
      try {
        const b = bbox(selectedBuffer);
        const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
        const rightPad = vw < 1280 ? 48 : 420;
        map.fitBounds(
          [
            [b[0], b[1]],
            [b[2], b[3]],
          ],
          {
            padding: { top: 72, bottom: 100, left: 72, right: rightPad },
            duration: 750,
            maxZoom: selectedLineObjectKey ? 14 : 12,
          },
        );
      } catch {
        /* ignore */
      }
    };

    if (map.isStyleLoaded()) doFit();
    else map.once("idle", doFit);

    return () => {
      cancelled = true;
      map.off("idle", doFit);
    };
  }, [selectedCorridorId, selectedLineObjectKey, selectedBuffer]);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    const t = window.setTimeout(() => ac.abort(), 90_000);
    (async () => {
      try {
        const res = await fetch("/api/power-lines?owner=all", {
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as FeatureCollection<
          LineString | MultiLineString
        >;
        if (!cancelled) {
          setAllLines(data);
          setLoadError(null);
          onLinesLoadedRef.current?.(data.features as PowerLineFeature[]);
        }
      } catch (e) {
        if (!cancelled) {
          const msg =
            e instanceof Error
              ? e.name === "AbortError"
                ? "Request timed out"
                : e.message
              : "Load failed";
          setLoadError(msg);
          setAllLines(EMPTY_FC);
          onLinesLoadedRef.current?.([]);
        }
      } finally {
        window.clearTimeout(t);
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
      window.clearTimeout(t);
    };
  }, []);

  const interactiveLayerIds = useMemo(() => {
    const ids: string[] = [];
    if (visibility.apLines && apLines.features.length > 0) ids.push(LAYERS.apLines);
    if (visibility.allLines && allLines) ids.push(LAYERS.allLines);
    return ids;
  }, [
    visibility.apLines,
    visibility.allLines,
    apLines.features.length,
    allLines,
  ]);

  const onMapMouseMove = useCallback(
    (e: MapMouseEvent) => {
      onCursorMove(e.lngLat.lng, e.lngLat.lat);
      const { clientX, clientY } = e.originalEvent;
      const map = e.target;
      const layers = queryableLayerIds(map, interactiveLayerIds);
      if (layers.length === 0) {
        setTooltip((t) => ({ ...t, kind: null, payload: null }));
        return;
      }
      let feats;
      try {
        feats = map.queryRenderedFeatures(e.point, { layers });
      } catch {
        return;
      }
      const fx = feats[0];
      if (!fx) {
        setTooltip((t) => ({ ...t, kind: null, payload: null }));
        return;
      }
      const layerId = fx.layer?.id;
      if (layerId === LAYERS.apLines || layerId === LAYERS.allLines) {
        const f = fx as unknown as PowerLineFeature;
        setTooltip({
          x: clientX,
          y: clientY,
          kind: "line",
          payload: lineTooltipFromFeature(f),
        });
      }
    },
    [onCursorMove, interactiveLayerIds],
  );

  const onMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (!visibility.apLines || apLines.features.length === 0) return;
      const map = e.target;
      const layers = queryableLayerIds(map, [LAYERS.apLines]);
      if (layers.length === 0) return;
      let feats;
      try {
        feats = map.queryRenderedFeatures(e.point, { layers });
      } catch {
        return;
      }
      const f = feats[0] as unknown as PowerLineFeature | undefined;
      if (!f) return;
      const id = inferCorridorId(f);
      if (id) onCorridorSelect(id);
      onLineObjectKeyChange(powerLineStableKey(f.properties));
    },
    [
      onCorridorSelect,
      onLineObjectKeyChange,
      visibility.apLines,
      apLines.features.length,
    ],
  );

  const zoomBy = (delta: number) => {
    const m = mapRef.current?.getMap();
    if (!m) return;
    m.zoomTo(m.getZoom() + delta, { duration: 200 });
  };

  const rasterPaint = {
    "raster-opacity": 0.72,
    "raster-fade-duration": 0,
  } as const;

  if (!token || token.includes("your_mapbox")) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--treelyon-dark)] p-6 text-center font-sans text-sm text-[var(--treelyon-muted)]">
        <p>
          Mapbox token missing: set{" "}
          <code className="mx-1 font-mono text-[var(--treelyon-primary-muted)]">
            NEXT_PUBLIC_MAPBOX_TOKEN
          </code>{" "}
          in <code className="mx-1 font-mono">.env.local</code> for local dev.
        </p>
        <p className="max-w-md text-[11px] leading-snug text-[var(--treelyon-muted)]">
          On DigitalOcean App Platform, add the same variable and enable{" "}
          <strong className="font-medium text-[var(--treelyon-text)]">
            Available at build time
          </strong>
          , then redeploy so the image rebuilds with your <code className="font-mono">pk.…</code> token.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full min-h-0">
      {!allLines && (
        <div className="pointer-events-none absolute left-1/2 top-14 z-20 -translate-x-1/2 rounded-card border border-[var(--treelyon-border)] bg-[rgba(19,17,31,0.92)] px-3 py-1.5 font-sans text-[11px] text-[var(--treelyon-muted)]">
          <span className="inline-flex items-center gap-2">
            <Spinner className="!h-3.5 !w-3.5" />
            Loading transmission lines…
          </span>
        </div>
      )}
      {loadError && allLines && (
        <div className="absolute left-1/2 top-14 z-20 -translate-x-1/2 rounded-card border border-[var(--treelyon-border)] bg-[var(--treelyon-surface)] px-3 py-1.5 font-sans text-[11px] text-[var(--treelyon-muted)]">
          Using fallback lines ({loadError})
        </div>
      )}
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        initialViewState={INITIAL_VIEW}
        style={{ width: "100%", height: "100%" }}
        mapStyle={MAP_STYLE}
        interactiveLayerIds={interactiveLayerIds}
        onMouseMove={onMapMouseMove}
        onMouseLeave={() =>
          setTooltip((t) => ({ ...t, kind: null, payload: null }))
        }
        onClick={onMapClick}
        cursor={tooltip.kind ? "pointer" : "grab"}
      >
        <NavigationControl position="top-right" showZoom={false} />
        <ScaleControl position="bottom-left" unit="imperial" />

        {eeTiles?.canopy ? (
          <Source
            id={SOURCES.canopy}
            type="raster"
            tiles={[eeTiles.canopy]}
            tileSize={256}
          >
            <Layer
              id={LAYERS.canopy}
              type="raster"
              layout={{
                visibility: visibility.canopy ? "visible" : "none",
              }}
              paint={rasterPaint}
            />
          </Source>
        ) : null}

        {eeTiles?.ndvi ? (
          <Source
            id={SOURCES.ndvi}
            type="raster"
            tiles={[eeTiles.ndvi]}
            tileSize={256}
          >
            <Layer
              id={LAYERS.ndvi}
              type="raster"
              layout={{
                visibility: visibility.ndvi ? "visible" : "none",
              }}
              paint={rasterPaint}
            />
          </Source>
        ) : null}

        {eeTiles?.encroachment ? (
          <Source
            id={SOURCES.risk}
            type="raster"
            tiles={[eeTiles.encroachment]}
            tileSize={256}
          >
            <Layer
              id={LAYERS.risk}
              type="raster"
              layout={{
                visibility: visibility.risk ? "visible" : "none",
              }}
              paint={{ ...rasterPaint, "raster-opacity": 0.78 }}
            />
          </Source>
        ) : null}

        {eeTiles?.storm ? (
          <Source
            id={SOURCES.storm}
            type="raster"
            tiles={[eeTiles.storm]}
            tileSize={256}
          >
            <Layer
              id={LAYERS.storm}
              type="raster"
              layout={{
                visibility: visibility.storm ? "visible" : "none",
              }}
              paint={{ ...rasterPaint, "raster-opacity": 0.68 }}
            />
          </Source>
        ) : null}

        {allLines && (
          <Source id={SOURCES.allLines} type="geojson" data={allLines}>
            <Layer
              id={LAYERS.allLines}
              type="line"
              layout={{
                visibility: visibility.allLines ? "visible" : "none",
              }}
              paint={{
                "line-color": "#374151",
                "line-width": 1,
                "line-opacity": 0.6,
              }}
            />
          </Source>
        )}

        {apLines.features.length > 0 && (
          <Source id={SOURCES.apLines} type="geojson" data={apLines}>
            <Layer
              id={LAYERS.apGlow}
              type="line"
              layout={{
                visibility: visibility.apLines ? "visible" : "none",
              }}
              paint={{
                "line-color": "#fbbf24",
                "line-width": 6,
                "line-opacity": 0.18,
                "line-blur": 4,
              }}
            />
            <Layer
              id={LAYERS.apLines}
              type="line"
              layout={{
                visibility: visibility.apLines ? "visible" : "none",
              }}
              paint={{
                "line-color": "#fbbf24",
                "line-width": 2,
                "line-opacity": 0.92,
              }}
            />
          </Source>
        )}

        <Source id={SOURCES.selectedBuffer} type="geojson" data={selectedBuffer}>
          <Layer
            id={LAYERS.bufferFill}
            type="fill"
            paint={{
              "fill-color": "#FBBF24",
              "fill-opacity": 0.06,
            }}
          />
          <Layer
            id={LAYERS.bufferLine}
            type="line"
            paint={{
              "line-color": "#FBBF24",
              "line-width": 2,
              "line-dasharray": [4, 2],
            }}
          />
        </Source>
      </Map>

      <div className="pointer-events-auto absolute bottom-8 right-3 z-10 flex flex-col overflow-hidden rounded-card border border-[var(--treelyon-border)] bg-[rgba(19,17,31,0.94)]">
        <button
          type="button"
          aria-label="Zoom in"
          className="flex h-9 w-9 items-center justify-center text-[var(--treelyon-text)] transition-colors duration-hover hover:bg-[var(--treelyon-surface)]"
          onClick={() => zoomBy(0.6)}
        >
          <Plus size={18} strokeWidth={2} />
        </button>
        <div className="h-px w-full bg-[var(--treelyon-border)]" />
        <button
          type="button"
          aria-label="Zoom out"
          className="flex h-9 w-9 items-center justify-center text-[var(--treelyon-text)] transition-colors duration-hover hover:bg-[var(--treelyon-surface)]"
          onClick={() => zoomBy(-0.6)}
        >
          <Minus size={18} strokeWidth={2} />
        </button>
      </div>

      <MapTooltip state={tooltip} />
    </div>
  );
}
