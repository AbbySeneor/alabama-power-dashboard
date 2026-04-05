"use client";

import { useMemo } from "react";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Mounted } from "@/components/ui/Mounted";
import { ndviTrendYDomain } from "@/lib/chartDomains";

function regress(
  pts: { year: number; ndvi: number }[],
): { m: number; b: number } {
  const n = pts.length;
  if (n < 2) return { m: 0, b: n === 1 ? pts[0].ndvi : 0 };
  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sxx = 0;
  for (const p of pts) {
    sx += p.year;
    sy += p.ndvi;
    sxy += p.year * p.ndvi;
    sxx += p.year * p.year;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return { m: 0, b: sy / n };
  const m = (n * sxy - sx * sy) / denom;
  const b = (sy - m * sx) / n;
  return { m, b };
}

interface NDVIChartProps {
  south?: { year: number; ndvi: number }[];
  north?: { year: number; ndvi: number }[];
  loading: boolean;
}

export function NDVIChart({ south, north, loading }: NDVIChartProps) {
  const data = useMemo(() => {
    if (!south?.length) return [];
    const { m, b } = regress(south);
    return south.map((row, i) => ({
      year: row.year,
      south: row.ndvi,
      north: north?.[i]?.ndvi ?? row.ndvi,
      trend: m * row.year + b,
    }));
  }, [south, north]);

  const empty = !loading && (!south || south.length === 0);

  const yDomain = useMemo(
    () => ndviTrendYDomain(south, north),
    [south, north],
  );

  return (
    <div className="border-b border-[var(--treelyon-border)] p-4">
      <div className="mb-1 font-sans text-[11px] font-medium uppercase tracking-wide text-[var(--treelyon-muted)]">
        NDVI trend — 2013–2024
      </div>
      <div className="mb-2 font-sans text-[10px] text-[var(--treelyon-muted)]">
        MODIS MOD13Q1 (250 m)
      </div>
      <div className="h-[260px] w-full min-w-0">
        {empty ? (
          <div className="flex h-full items-center justify-center rounded-card bg-[var(--treelyon-dark)] font-sans text-[11px] text-[var(--treelyon-muted)]">
            No NDVI series (check Earth Engine)
          </div>
        ) : (
          <Mounted
            fallback={
              <div className="h-full w-full rounded-card bg-[var(--treelyon-dark)]" />
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
              >
                <ReferenceLine
                  y={0.4}
                  stroke="var(--treelyon-border)"
                  strokeOpacity={0.45}
                  strokeDasharray="4 4"
                />
                <ReferenceLine
                  y={0.7}
                  stroke="var(--treelyon-border)"
                  strokeOpacity={0.45}
                  strokeDasharray="4 4"
                />
                <XAxis
                  dataKey="year"
                  tick={{ fill: "var(--treelyon-muted)", fontSize: 10 }}
                  axisLine={{ stroke: "var(--treelyon-border)" }}
                  tickLine={false}
                />
                <YAxis
                  domain={yDomain}
                  tick={{ fill: "var(--treelyon-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  tickFormatter={(v) => Number(v).toFixed(2)}
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
                <Line
                  type="monotone"
                  dataKey="south"
                  name="Corridor AOI"
                  stroke="var(--treelyon-chart-south)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="north"
                  name="North AL ref."
                  stroke="var(--treelyon-chart-north)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="trend"
                  name="Corridor trend"
                  stroke="var(--treelyon-chart-trend)"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 3"
                />
              </LineChart>
            </ResponsiveContainer>
          </Mounted>
        )}
      </div>
    </div>
  );
}
