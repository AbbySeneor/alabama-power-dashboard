"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { StatusBar } from "@/components/layout/StatusBar";
import { ROWMap } from "@/components/map/ROWMap";
import { LayerControl } from "@/components/map/LayerControl";
import { MapLegend } from "@/components/map/MapLegend";
import { CorridorSelector } from "@/components/panels/CorridorSelector";
import { CorridorStats } from "@/components/panels/CorridorStats";
import { CanopyChart } from "@/components/panels/CanopyChart";
import { NDVIChart } from "@/components/panels/NDVIChart";
import { PhenoChart } from "@/components/panels/PhenoChart";
import { RiskBreakdown } from "@/components/panels/RiskBreakdown";
import { StormComparison } from "@/components/panels/StormComparison";
import { WeatherContext } from "@/components/panels/WeatherContext";
import { AnalysisInsights } from "@/components/panels/AnalysisInsights";
import { defaultCorridorId } from "@/lib/corridorsConfig";
import { powerLineStableKey } from "@/lib/powerLineKeys";
import { readApiJson } from "@/lib/readApiJson";
import { findCorridorLineLengthKm, lineLengthKm } from "@/lib/powerLineGeometry";
import type {
  CorridorId,
  EarthEngineDashboard,
  EarthEngineDashboardError,
  EETileUrls,
  LayerId,
  LayerVisibility,
  PowerLineFeature,
} from "@/types";

const defaultVisibility: LayerVisibility = {
  apLines: true,
  allLines: true,
  canopy: true,
  ndvi: false,
  risk: true,
  storm: false,
};

function isDashboard(
  j: EarthEngineDashboard | EarthEngineDashboardError,
): j is EarthEngineDashboard {
  if (typeof j !== "object" || j === null) return false;
  if ("ok" in j && j.ok === false) return false;
  return Array.isArray((j as EarthEngineDashboard).ndviYearlySouth);
}

export default function Home() {
  const [corridorId, setCorridorId] = useState<CorridorId>(defaultCorridorId);
  const [layers, setLayers] = useState<LayerVisibility>(defaultVisibility);
  const [cursor, setCursor] = useState<{ lng: number | null; lat: number | null }>(
    { lng: null, lat: null },
  );

  const [eeTiles, setEeTiles] = useState<EETileUrls | null>(null);
  const [tilesErr, setTilesErr] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<EarthEngineDashboard | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashErr, setDashErr] = useState<string | null>(null);

  const [lineFeatures, setLineFeatures] = useState<PowerLineFeature[]>([]);
  const [selectedLineObjectKey, setSelectedLineObjectKey] = useState<string | null>(
    null,
  );

  const selectedLineLengthKm = useMemo(() => {
    if (!selectedLineObjectKey) return null;
    for (const f of lineFeatures) {
      if (powerLineStableKey(f.properties) === selectedLineObjectKey) {
        return lineLengthKm(f);
      }
    }
    return null;
  }, [lineFeatures, selectedLineObjectKey]);

  const corridorLengthKm = useMemo(
    () =>
      selectedLineLengthKm ?? findCorridorLineLengthKm(lineFeatures, corridorId),
    [selectedLineLengthKm, lineFeatures, corridorId],
  );

  const selectedLineLabel = useMemo(() => {
    if (!selectedLineObjectKey) return null;
    const f = lineFeatures.find(
      (x) => powerLineStableKey(x.properties) === selectedLineObjectKey,
    );
    if (!f?.properties) return "Selected span";
    const p = f.properties;
    if (p.OBJECTID != null) return `OBJECTID ${p.OBJECTID}`;
    if (p.ID != null) return `Line ${p.ID}`;
    return "Selected span";
  }, [lineFeatures, selectedLineObjectKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = new URLSearchParams({ corridorId });
        if (selectedLineObjectKey) {
          qs.set("lineObjectId", selectedLineObjectKey);
        }
        const res = await fetch(`/api/ee/tiles?${qs.toString()}`, {
          cache: "no-store",
        });
        const j = await readApiJson<
          ({ ok: true } & EETileUrls) | { ok: false; error?: string }
        >(res);
        if (cancelled) return;
        if (j.ok && j.ndvi && j.canopy && j.storm && j.encroachment) {
          setEeTiles({
            ndvi: j.ndvi,
            canopy: j.canopy,
            storm: j.storm,
            encroachment: j.encroachment,
          });
          setTilesErr(null);
        } else {
          setEeTiles(null);
          setTilesErr(
            !j.ok ? (j.error ?? "Earth Engine tiles unavailable") : "Incomplete tile response",
          );
        }
      } catch (e) {
        if (!cancelled) {
          setEeTiles(null);
          setTilesErr(e instanceof Error ? e.message : "Tiles request failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [corridorId, selectedLineObjectKey]);

  useEffect(() => {
    let cancelled = false;
    setDashLoading(true);
    setDashErr(null);
    setDashboard(null);
    (async () => {
      const ac = new AbortController();
      const timeoutMs = 120_000;
      const timer = window.setTimeout(() => ac.abort(), timeoutMs);
      try {
        const qs = new URLSearchParams({ corridorId });
        if (selectedLineObjectKey) {
          qs.set("lineObjectId", selectedLineObjectKey);
        }
        const res = await fetch(`/api/ee/dashboard?${qs.toString()}`, {
          cache: "no-store",
          signal: ac.signal,
        });
        const j = await readApiJson<
          EarthEngineDashboard | EarthEngineDashboardError
        >(res);
        if (cancelled) return;
        if (isDashboard(j)) {
          setDashboard(j);
          setDashErr(null);
        } else {
          setDashboard(null);
          setDashErr(
            !res.ok
              ? ((j as EarthEngineDashboardError).error ?? `HTTP ${res.status}`)
              : ((j as EarthEngineDashboardError).error ?? "Earth Engine unavailable"),
          );
        }
      } catch (e) {
        if (!cancelled) {
          setDashboard(null);
          if (e instanceof Error && e.name === "AbortError") {
            setDashErr(
              `Charts request timed out after ${timeoutMs / 1000}s — check Earth Engine credentials and network.`,
            );
          } else {
            setDashErr(e instanceof Error ? e.message : "Dashboard request failed");
          }
        }
      } finally {
        window.clearTimeout(timer);
        if (!cancelled) setDashLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [corridorId, selectedLineObjectKey]);

  const setLayer = useCallback((id: LayerId, visible: boolean) => {
    setLayers((prev) => ({ ...prev, [id]: visible }));
  }, []);

  const onCursorMove = useCallback((lng: number, lat: number) => {
    setCursor({ lng, lat });
  }, []);

  const onPowerLinesLoaded = useCallback((features: PowerLineFeature[]) => {
    setLineFeatures(features);
  }, []);

  return (
    <div className="dashboard-grid">
      <Header />
      <main className="dashboard-main">
        <div className="pointer-events-none absolute inset-0">
          <div className="pointer-events-auto h-full w-full">
            <ROWMap
              selectedCorridorId={corridorId}
              onCorridorSelect={setCorridorId}
              selectedLineObjectKey={selectedLineObjectKey}
              onLineObjectKeyChange={setSelectedLineObjectKey}
              visibility={layers}
              onCursorMove={onCursorMove}
              eeTiles={eeTiles}
              onPowerLinesLoaded={onPowerLinesLoaded}
            />
          </div>
        </div>
        <LayerControl visibility={layers} onChange={setLayer} />
        <MapLegend visibility={layers} />
        {(tilesErr || dashErr) && (
          <div className="pointer-events-none absolute bottom-24 left-1/2 z-10 max-w-[min(520px,calc(100%-2rem))] -translate-x-1/2 rounded-card border border-[var(--treelyon-border)] bg-[rgba(19,17,31,0.96)] px-3 py-2 font-sans text-[11px] text-[var(--treelyon-muted)]">
            {tilesErr && <div>Map layers: {tilesErr}</div>}
            {dashErr && <div>Charts: {dashErr}</div>}
          </div>
        )}
      </main>
      <aside className="dashboard-sidebar border-l border-[var(--treelyon-border)] bg-[var(--treelyon-surface)]">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <CorridorSelector
            value={corridorId}
            onChange={(id) => {
              setCorridorId(id);
              setSelectedLineObjectKey(null);
            }}
          />
          {dashLoading && (
            <div className="border-b border-[var(--treelyon-border)] px-4 py-2 font-sans text-[10px] leading-snug text-[var(--treelyon-muted)]">
              Loading satellite charts (MODIS NDVI, GEDI canopy, GRIDMET) from Google
              Earth Engine…
            </div>
          )}
          <CorridorStats
            corridorLengthKm={corridorLengthKm}
            dashboard={dashboard}
            loading={dashLoading}
          />
          <NDVIChart
            south={dashboard?.ndviYearlySouth}
            north={dashboard?.ndviYearlyNorth}
            loading={dashLoading}
          />
          <CanopyChart
            bins={dashboard?.canopyBins}
            loading={dashLoading}
          />
          <PhenoChart
            south={dashboard?.phenologySouth}
            north={dashboard?.phenologyNorth}
            loading={dashLoading}
          />
          <RiskBreakdown
            corridorId={corridorId}
            segments={dashboard?.riskSegments}
            atRiskPct={dashboard?.riskAtRiskPct}
            loading={dashLoading}
          />
          <StormComparison
            thumbPreUrl={dashboard?.thumbPreUrl ?? null}
            thumbPostUrl={dashboard?.thumbPostUrl ?? null}
            disturbedKm2={dashboard?.stormDisturbedAreaKm2}
            loading={dashLoading}
          />
          <WeatherContext
            precip={dashboard?.precip}
            loading={dashLoading}
          />
        </div>
      </aside>
      <AnalysisInsights
        corridorId={corridorId}
        dashboard={dashboard}
        loading={dashLoading}
        dashErr={dashErr}
        selectedLineLabel={selectedLineLabel}
      />
      <StatusBar lng={cursor.lng} lat={cursor.lat} />
    </div>
  );
}
