"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Mounted } from "@/components/ui/Mounted";

interface CanopyChartProps {
  bins?: { range: string; count: number }[];
  loading: boolean;
}

export function CanopyChart({ bins, loading }: CanopyChartProps) {
  const data = bins ?? [];
  const allZero = data.length > 0 && data.every((b) => b.count === 0);
  const empty = !loading && (data.length === 0 || allZero);

  return (
    <div className="border-b border-[var(--treelyon-border)] p-4">
      <div className="mb-2 font-sans text-[11px] font-medium uppercase tracking-wide text-[var(--treelyon-muted)]">
        Canopy height distribution
      </div>
      <div className="mb-1 font-sans text-[10px] text-[var(--treelyon-muted)]">
        GEDI L2A rh98 (monthly composite)
      </div>
      <div className="h-[160px] w-full min-w-0">
        {empty ? (
          <div className="flex h-full items-center justify-center rounded-card bg-[var(--treelyon-dark)] font-sans text-[11px] text-[var(--treelyon-muted)]">
            No GEDI rh98 samples in this AOI (try wider corridor or date range)
          </div>
        ) : (
          <Mounted
            fallback={
              <div className="h-full w-full rounded-card bg-[var(--treelyon-dark)]" />
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 4, right: 4, left: -18, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="0"
                  stroke="var(--treelyon-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="range"
                  tick={{ fill: "var(--treelyon-muted)", fontSize: 10 }}
                  axisLine={{ stroke: "var(--treelyon-border)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--treelyon-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--treelyon-surface)",
                    border: "1px solid var(--treelyon-border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--treelyon-primary-muted)",
                  }}
                  labelStyle={{ color: "var(--treelyon-muted)" }}
                />
                <Bar
                  dataKey="count"
                  fill="var(--treelyon-primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Mounted>
        )}
      </div>
    </div>
  );
}
