"use client";

import type { LayerVisibility } from "@/types";

interface MapLegendProps {
  visibility: LayerVisibility;
}

export function MapLegend({ visibility }: MapLegendProps) {
  let mode: "canopy" | "ndvi" | "risk" | null = null;
  if (visibility.canopy) mode = "canopy";
  else if (visibility.ndvi) mode = "ndvi";
  else if (visibility.risk) mode = "risk";

  if (!mode) return null;

  return (
    <div
      className="pointer-events-none absolute bottom-14 left-3 z-10 rounded-card border border-[var(--treelyon-border)] p-3"
      style={{
        background: "rgba(19, 17, 31, 0.94)",
        backdropFilter: "blur(8px)",
      }}
    >
      {mode === "canopy" && (
        <div>
          <div className="mb-1.5 font-sans text-[10px] uppercase tracking-wider text-[var(--treelyon-muted)]">
            Canopy height
          </div>
          <div
            className="h-2 w-[120px] rounded-input"
            style={{
              background:
                "linear-gradient(90deg, #134e4a 0%, #2dd4bf 45%, #7458e8 100%)",
            }}
          />
          <div className="mt-1 flex w-[120px] justify-between font-mono text-[10px] text-[var(--treelyon-muted)]">
            <span>0m</span>
            <span>15m</span>
            <span>30m+</span>
          </div>
        </div>
      )}
      {mode === "ndvi" && (
        <div>
          <div className="mb-1.5 font-sans text-[10px] uppercase tracking-wider text-[var(--treelyon-muted)]">
            NDVI
          </div>
          <div
            className="h-2 w-[120px] rounded-input"
            style={{
              background:
                "linear-gradient(90deg, #4c1d95 0%, #fbbf24 50%, #2dd4bf 100%)",
            }}
          />
          <div className="mt-1 flex w-[120px] justify-between font-mono text-[10px] text-[var(--treelyon-muted)]">
            <span>0.2</span>
            <span>0.5</span>
            <span>0.9</span>
          </div>
        </div>
      )}
      {mode === "risk" && (
        <div>
          <div className="mb-1.5 font-sans text-[10px] uppercase tracking-wider text-[var(--treelyon-muted)]">
            High NDVI mask
          </div>
          <p className="max-w-[200px] font-sans text-[11px] leading-snug text-[var(--treelyon-text)]">
            Red pixels: NDVI above threshold near the ROW (Sentinel-2 composite).
          </p>
        </div>
      )}
    </div>
  );
}
