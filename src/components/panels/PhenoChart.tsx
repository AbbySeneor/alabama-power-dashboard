"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Mounted } from "@/components/ui/Mounted";
import { phenologyYDomain } from "@/lib/chartDomains";

interface PhenoChartProps {
  south?: { month: string; ndvi: number }[];
  north?: { month: string; ndvi: number }[];
  loading: boolean;
}

export function PhenoChart({ south, north, loading }: PhenoChartProps) {
  const data = useMemo(() => {
    if (!south?.length) return [];
    return south.map((row, i) => ({
      month: row.month,
      south: row.ndvi,
      north: north?.[i]?.ndvi ?? row.ndvi,
    }));
  }, [south, north]);

  const empty = !loading && (!south || south.length === 0);

  const yDomain = useMemo(
    () => phenologyYDomain(south, north),
    [south, north],
  );

  return (
    <div className="border-b border-[var(--treelyon-border)] p-4">
      <div className="mb-2 font-sans text-[11px] font-medium uppercase tracking-wide text-[var(--treelyon-muted)]">
        Growing season profile
      </div>
      <div className="h-[200px] w-full min-w-0">
        {empty ? (
          <div className="flex h-full items-center justify-center rounded-card bg-[var(--treelyon-dark)] font-sans text-[11px] text-[var(--treelyon-muted)]">
            No phenology series
          </div>
        ) : (
          <Mounted
            fallback={
              <div className="h-full w-full rounded-card bg-[var(--treelyon-dark)]" />
            }
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
              initialDimension={{ width: 340, height: 200 }}
            >
              <AreaChart
                data={data}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 6"
                  stroke="var(--treelyon-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "var(--treelyon-muted)", fontSize: 9 }}
                  axisLine={{ stroke: "var(--treelyon-border)" }}
                  tickLine={false}
                />
                <YAxis
                  domain={yDomain}
                  tick={{ fill: "var(--treelyon-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
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
                />
                <ReferenceLine
                  y={0.4}
                  stroke="var(--treelyon-muted)"
                  strokeDasharray="5 4"
                  label={{
                    value: "Active growth threshold",
                    position: "insideTopRight",
                    fill: "var(--treelyon-muted)",
                    fontSize: 9,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="south"
                  name="Corridor AOI"
                  stroke="var(--treelyon-chart-south)"
                  fill="var(--treelyon-chart-south)"
                  fillOpacity={0.22}
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="north"
                  name="North AL ref."
                  stroke="var(--treelyon-chart-north)"
                  fill="var(--treelyon-chart-north)"
                  fillOpacity={0.18}
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Mounted>
        )}
      </div>
    </div>
  );
}
