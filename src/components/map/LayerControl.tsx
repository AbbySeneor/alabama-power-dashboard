"use client";

import type { LayerId, LayerVisibility } from "@/types";
import { Toggle } from "@/components/ui/Toggle";

interface LayerControlProps {
  visibility: LayerVisibility;
  onChange: (id: LayerId, visible: boolean) => void;
}

const ROWS: {
  id: LayerId;
  label: string;
  swatch: "orange" | "gray" | "canopy" | "ndvi" | "risk" | "storm";
}[] = [
  { id: "apLines", label: "Alabama Power lines", swatch: "orange" },
  { id: "allLines", label: "All transmission lines", swatch: "gray" },
  { id: "canopy", label: "Canopy height", swatch: "canopy" },
  { id: "ndvi", label: "Current NDVI", swatch: "ndvi" },
  { id: "risk", label: "High NDVI / encroachment", swatch: "risk" },
  { id: "storm", label: "Storm NDVI loss (2023)", swatch: "storm" },
];

function Swatch({ kind }: { kind: (typeof ROWS)[number]["swatch"] }) {
  if (kind === "orange") {
    return (
      <span
        className="mt-0.5 h-3 w-6 shrink-0 rounded-input bg-[#fbbf24]"
        aria-hidden
      />
    );
  }
  if (kind === "gray") {
    return (
      <span
        className="mt-0.5 h-0.5 w-6 shrink-0 bg-[#374151]"
        aria-hidden
      />
    );
  }
  if (kind === "canopy") {
    return (
      <span
        className="mt-0.5 h-3 w-6 shrink-0 rounded-input"
        style={{
          background:
            "linear-gradient(90deg, #134e4a 0%, #2dd4bf 45%, #7458e8 100%)",
        }}
        aria-hidden
      />
    );
  }
  if (kind === "ndvi") {
    return (
      <span
        className="mt-0.5 h-3 w-6 shrink-0 rounded-input"
        style={{
          background:
            "linear-gradient(90deg, #4c1d95 0%, #fbbf24 50%, #2dd4bf 100%)",
        }}
        aria-hidden
      />
    );
  }
  if (kind === "risk") {
    return (
      <span className="mt-0.5 flex shrink-0 gap-0.5" aria-hidden>
        <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
        <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
        <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
      </span>
    );
  }
  return (
    <span
      className="mt-0.5 h-3 w-6 shrink-0 rounded-input bg-[#EF4444] opacity-40"
      aria-hidden
    />
  );
}

function SourceRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--treelyon-primary)]"
        aria-hidden
      />
      <span className="font-sans text-[11px] text-[var(--treelyon-text)]">
        {label}
      </span>
    </div>
  );
}

export function LayerControl({ visibility, onChange }: LayerControlProps) {
  return (
    <div
      className="pointer-events-auto absolute left-3 top-3 z-10 w-[200px] rounded-card border border-[var(--treelyon-border)] p-3"
      style={{
        background: "rgba(19, 17, 31, 0.94)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="mb-3 font-sans text-[10px] font-medium uppercase tracking-wider text-[var(--treelyon-muted)]">
        Layers
      </div>
      <ul className="space-y-2.5">
        {ROWS.map((row) => (
          <li key={row.id} className="flex items-start gap-2">
            <Toggle
              checked={visibility[row.id]}
              onChange={(v) => onChange(row.id, v)}
              aria-label={`Toggle ${row.label}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <span className="font-sans text-[12px] leading-snug text-[var(--treelyon-text)]">
                  {row.label}
                </span>
                <Swatch kind={row.swatch} />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-[var(--treelyon-border)] pt-3">
        <div className="mb-2 font-sans text-[10px] font-medium uppercase tracking-wider text-[var(--treelyon-muted)]">
          Data source
        </div>
        <div className="space-y-1.5">
          <SourceRow label="HIFLD 2024" />
          <SourceRow label="Sentinel-2 / MODIS" />
          <SourceRow label="GEDI L2A" />
          <SourceRow label="GRIDMET" />
        </div>
      </div>
    </div>
  );
}
