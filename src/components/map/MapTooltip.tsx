"use client";

import type { LineTooltipPayload, MapTooltipState } from "@/types";

function LineContent({ p }: { p: LineTooltipPayload }) {
  return (
    <div className="min-w-[200px] space-y-1.5 p-3 font-sans text-[12px] text-[var(--treelyon-text)]">
      <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--treelyon-muted)]">
        Transmission line (HIFLD)
      </div>
      <div>
        <span className="text-[var(--treelyon-muted)]">Owner: </span>
        {p.owner}
      </div>
      <div className="font-mono text-[11px]">
        <div>
          Voltage:{" "}
          <span className="text-[var(--treelyon-primary-muted)]">{p.voltage}</span>
        </div>
        <div>
          Length:{" "}
          <span className="text-[var(--treelyon-primary-muted)]">{p.lengthKm} km</span>
        </div>
        <div>
          Line ID:{" "}
          <span className="text-[var(--treelyon-primary-muted)]">{p.lineId}</span>
        </div>
      </div>
    </div>
  );
}

export function MapTooltip({ state }: { state: MapTooltipState }) {
  if (!state.kind || !state.payload) return null;

  const pad = 14;
  const vw =
    typeof window !== "undefined" ? window.innerWidth : state.x + 260;
  const vh =
    typeof window !== "undefined" ? window.innerHeight : state.y + 220;
  const left = Math.min(state.x + pad, vw - 240);
  const top = Math.min(state.y + pad, vh - 180);

  return (
    <div
      className="pointer-events-none fixed z-[100] rounded-card border border-[var(--treelyon-border)] bg-[rgba(19,17,31,0.97)] shadow-none backdrop-blur-sm"
      style={{ left, top }}
    >
      <LineContent p={state.payload as LineTooltipPayload} />
    </div>
  );
}
