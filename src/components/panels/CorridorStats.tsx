"use client";

import type { EarthEngineDashboard } from "@/types";
import { Card } from "@/components/ui/Card";

interface CorridorStatsProps {
  corridorLengthKm: number | null;
  dashboard: EarthEngineDashboard | null;
  loading: boolean;
}

function fmtKm(km: number | null): string {
  if (km == null || Number.isNaN(km)) return "—";
  return `${km.toFixed(1)} km`;
}

export function CorridorStats({
  corridorLengthKm,
  dashboard,
  loading,
}: CorridorStatsProps) {
  const highNdvi = dashboard?.highNdviFractionPct;
  const atRisk = dashboard?.riskAtRiskPct;
  const stormKm = dashboard?.stormDisturbedAreaKm2;

  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      <Card className="p-3">
        <div className="font-sans text-[10px] font-medium uppercase tracking-wider text-[var(--treelyon-muted)]">
          Corridor length
        </div>
        <div className="mt-1 font-mono text-xl font-medium text-[var(--treelyon-text)]">
          {loading && corridorLengthKm == null ? "…" : fmtKm(corridorLengthKm)}
        </div>
        <div className="font-mono text-[11px] text-[var(--treelyon-muted)]">
          HIFLD geometry
        </div>
      </Card>
      <Card className="p-3">
        <div className="font-sans text-[10px] font-medium uppercase tracking-wider text-[var(--treelyon-muted)]">
          High NDVI (AOI)
        </div>
        <div
          className="mt-1 font-mono text-xl font-medium"
          style={{ color: "var(--risk-medium)" }}
        >
          {loading && highNdvi == null ? "…" : highNdvi != null ? `${highNdvi}%` : "—"}
        </div>
        <div className="font-sans text-[11px] text-[var(--treelyon-muted)]">
          MODIS mean canopy signal
        </div>
      </Card>
      <Card className="p-3">
        <div className="font-sans text-[10px] font-medium uppercase tracking-wider text-[var(--treelyon-muted)]">
          Elevated NDVI share
        </div>
        <div
          className="mt-1 font-mono text-xl font-medium"
          style={{ color: "var(--risk-high)" }}
        >
          {loading && atRisk == null ? "…" : atRisk != null ? `${atRisk}%` : "—"}
        </div>
        <div className="font-sans text-[11px] text-[var(--treelyon-muted)]">
          high + medium buckets
        </div>
      </Card>
      <Card className="p-3">
        <div className="font-sans text-[10px] font-medium uppercase tracking-wider text-[var(--treelyon-muted)]">
          Storm disturbance
        </div>
        <div className="mt-1 font-mono text-xl font-medium text-[var(--treelyon-text)]">
          {loading && stormKm == null
            ? "…"
            : stormKm != null
              ? `${stormKm} km²`
              : "—"}
        </div>
        <div className="font-sans text-[11px] text-[var(--treelyon-muted)]">
          Sentinel-2 NDVI loss
        </div>
      </Card>
    </div>
  );
}
