"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PrecipDay } from "@/types";
import { Mounted } from "@/components/ui/Mounted";

interface WeatherContextProps {
  precip?: PrecipDay[];
  loading: boolean;
}

export function WeatherContext({ precip, loading }: WeatherContextProps) {
  const data = useMemo(() => precip ?? [], [precip]);

  const peakLabel = useMemo(() => {
    if (!data.length) return null;
    const peak = data.reduce((a, b) => (b.mm > a.mm ? b : a));
    return `Heaviest window: ${peak.date} (${peak.mm} mm)`;
  }, [data]);

  const empty = !loading && data.length === 0;

  return (
    <div className="p-4 pb-6">
      <div className="mb-2 font-sans text-[11px] font-medium uppercase tracking-wide text-[var(--treelyon-muted)]">
        Recent precip windows (GRIDMET)
      </div>
      <div className="h-[140px] w-full min-w-0">
        {empty ? (
          <div className="flex h-full items-center justify-center rounded-card bg-[var(--treelyon-dark)] font-sans text-[11px] text-[var(--treelyon-muted)]">
            No precip series
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
                margin={{ top: 8, right: 4, left: -12, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 6"
                  stroke="var(--treelyon-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--treelyon-muted)", fontSize: 9 }}
                  axisLine={{ stroke: "var(--treelyon-border)" }}
                  tickLine={false}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={44}
                />
                <YAxis
                  tick={{ fill: "var(--treelyon-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                  label={{
                    value: "mm",
                    angle: -90,
                    position: "insideLeft",
                    fill: "var(--treelyon-muted)",
                    fontSize: 10,
                  }}
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
                <Bar dataKey="mm" radius={[3, 3, 0, 0]}>
                  {data.map((entry) => (
                    <Cell
                      key={entry.date}
                      fill={
                      entry.storm
                        ? "var(--risk-high)"
                        : "var(--treelyon-primary)"
                    }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Mounted>
        )}
      </div>
      <p className="mt-1 text-center font-sans text-[10px] text-[var(--treelyon-muted)]">
        {peakLabel ?? "—"}
      </p>
    </div>
  );
}
