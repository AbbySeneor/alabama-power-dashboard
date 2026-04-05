"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Mounted } from "@/components/ui/Mounted";
import { riskPanelTitleByCorridor } from "@/lib/corridorsConfig";
import type { CorridorId, RiskSegment } from "@/types";

interface RiskBreakdownProps {
  corridorId: CorridorId;
  segments?: RiskSegment[];
  atRiskPct?: number;
  loading: boolean;
}

const FALLBACK: RiskSegment[] = [
  { name: "High NDVI", value: 0, color: "#EF4444" },
  { name: "Medium", value: 0, color: "#F59E0B" },
  { name: "Low", value: 0, color: "#22C55E" },
  { name: "Sparse", value: 0, color: "#374151" },
];

export function RiskBreakdown({
  corridorId,
  segments,
  atRiskPct,
  loading,
}: RiskBreakdownProps) {
  const DATA = segments?.length ? segments : FALLBACK;
  const title = riskPanelTitleByCorridor[corridorId];
  const center = atRiskPct ?? 0;
  const empty = !loading && !segments?.length;

  return (
    <div className="border-b border-[var(--treelyon-border)] p-4">
      <div className="mb-2 font-sans text-[11px] font-medium uppercase tracking-wide text-[var(--treelyon-muted)]">
        {title}
      </div>
      <div className="flex h-[180px] items-center gap-2">
        <div className="relative h-full w-[52%] min-w-0">
          {loading && !segments?.length ? (
            <div className="h-full w-full rounded-card bg-[var(--treelyon-dark)]" />
          ) : empty ? (
            <div className="flex h-full items-center justify-center rounded-card bg-[var(--treelyon-dark)] font-sans text-[10px] text-[var(--treelyon-muted)]">
              No risk breakdown
            </div>
          ) : (
            <>
              <Mounted
                fallback={
                  <div className="h-full w-full rounded-card bg-[var(--treelyon-dark)]" />
                }
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={DATA}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="82%"
                      paddingAngle={1}
                      stroke="none"
                    >
                      {DATA.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--treelyon-surface)",
                        border: "1px solid var(--treelyon-border)",
                        borderRadius: 8,
                        fontSize: 12,
                        color: "var(--treelyon-primary-muted)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Mounted>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <div
                  className="font-mono text-[22px] font-semibold"
                  style={{ color: "var(--treelyon-primary)" }}
                >
                  {`${center}%`}
                </div>
                <div className="font-sans text-[11px] text-[var(--treelyon-muted)]">
                  elevated NDVI
                </div>
              </div>
            </>
          )}
        </div>
        <ul className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 pl-1">
          {DATA.map((d) => (
            <li
              key={d.name}
              className="flex items-center gap-2 font-sans text-[11px] text-[var(--treelyon-text)]"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-input"
                style={{ backgroundColor: d.color }}
              />
              <span className="min-w-0 flex-1 truncate">{d.name}</span>
              <span className="font-mono text-[var(--treelyon-muted)]">
                {d.value}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
