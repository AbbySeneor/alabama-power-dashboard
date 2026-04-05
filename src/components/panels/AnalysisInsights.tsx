"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { GripHorizontal, LayoutDashboard, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Mounted } from "@/components/ui/Mounted";
import { corridorList } from "@/lib/corridorsConfig";
import type { CorridorId, EarthEngineDashboard, RiskSegment } from "@/types";

const TT = {
  contentStyle: {
    background: "var(--treelyon-surface)",
    border: "1px solid var(--treelyon-border)",
    borderRadius: 8,
    fontSize: 11,
    color: "var(--treelyon-text)",
  },
  labelStyle: { color: "var(--treelyon-muted)", fontSize: 10 },
} as const;

const RISK_FALLBACK: RiskSegment[] = [
  { name: "High", value: 0, color: "#EF4444" },
  { name: "Med", value: 0, color: "#F59E0B" },
  { name: "Low", value: 0, color: "#22C55E" },
  { name: "Sparse", value: 0, color: "#374151" },
];

const INSIGHTS_HEIGHT_STORAGE_KEY = "row-intelligence-insights-height-v1";
const INSIGHTS_MIN_PX = 140;
const INSIGHTS_DEFAULT_PX = 320;
/** Header + status + minimum map strip (px) reserved above the insights row. */
const INSIGHTS_VIEWPORT_RESERVE_PX = 56 + 32 + 120;

function clampInsightsHeight(n: number, maxPx: number): number {
  return Math.min(maxPx, Math.max(INSIGHTS_MIN_PX, Math.round(n)));
}

function maxInsightsHeightPx(): number {
  if (typeof window === "undefined") return 560;
  return Math.max(INSIGHTS_MIN_PX + 40, window.innerHeight - INSIGHTS_VIEWPORT_RESERVE_PX);
}

interface AnalysisInsightsProps {
  corridorId: CorridorId;
  dashboard: EarthEngineDashboard | null;
  loading: boolean;
  dashErr: string | null;
  /** HIFLD span label when a conductor was clicked on the map. */
  selectedLineLabel: string | null;
}

/** Operations-focused bullets for transmission ROW / conductor clearance. */
function buildRowTakeaways(
  corridorId: CorridorId,
  dashboard: EarthEngineDashboard,
  selectedLineLabel: string | null,
): string[] {
  const corridorName = corridorList[corridorId].name;
  const scope = selectedLineLabel
    ? `Span ${selectedLineLabel}`
    : `Corridor ${corridorName}`;
  const out: string[] = [];

  const hi = dashboard.highNdviFractionPct;
  if (hi != null && hi >= 50) {
    out.push(
      `${scope}: ~${hi}% of the ROW vegetation mask reads as very high NDVI — field-verify minimum vegetation clearance to energized conductors and schedule trim where phases are boxed in.`,
    );
  } else if (hi != null && hi >= 30) {
    out.push(
      `${scope}: ~${hi}% high-NDVI footprint — prioritize lidar / field measurement on spans with mid-span sag and guy encroachment.`,
    );
  }

  const risk = dashboard.riskAtRiskPct;
  if (risk != null && risk >= 45) {
    out.push(
      `~${risk}% of classified pixels sit in elevated NDVI risk tiers — open vegetation work orders or thermal patrols on worst segments before peak grow-in.`,
    );
  } else if (risk != null && risk >= 22) {
    out.push(
      `Elevated NDVI risk share ~${risk}% — pair the encroachment layer with structure IDs to rank contractor clearing.`,
    );
  }

  const storm = dashboard.stormDisturbedAreaKm2;
  if (storm != null && storm >= 2) {
    out.push(
      `Storm canopy loss signal ~${storm} km² in this AOI — walk downed conductors, broken poles, and access roads; document insurance / storm-response packages.`,
    );
  } else if (storm != null && storm > 0 && storm < 2) {
    out.push(
      `Localized storm NDVI loss (~${storm} km²) — spot-check adjacent spans for broken limbs leaning toward phases.`,
    );
  }

  const south = dashboard.ndviYearlySouth;
  if (south.length >= 2) {
    const a = south[0]!;
    const b = south[south.length - 1]!;
    const d = b.ndvi - a.ndvi;
    if (d > 0.03) {
      out.push(
        `Long-term greenness is rising (${a.year}→${b.year}) on this sample — tighten cycle trimming or widen side-trim where trees threaten conductors.`,
      );
    } else if (d < -0.03) {
      out.push(
        `Greenness declined ${a.year}→${b.year} — confirm whether clearing programs or canopy stress drive the change before reducing patrol frequency.`,
      );
    }
  }

  const bins = dashboard.canopyBins;
  if (bins.length) {
    const top = bins.reduce((best, cur) => (cur.count > best.count ? cur : best));
    if (top.count > 0 && /1[5-9]|2[0-9]|30/.test(top.range)) {
      out.push(
        `GEDI peaks in ${top.range} height — taller structure under or beside phases increases grow-in risk; verify wire-zone and border-zone clearances.`,
      );
    }
  }

  if (out.length === 0) {
    out.push(
      `${scope}: Vegetation metrics look moderate — maintain standard patrol / cycle trim; re-check after major storms or new land development beside the ROW.`,
    );
  }

  return out.slice(0, 5);
}

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <Card className="p-2.5">
      <div className="font-sans text-[9px] font-medium uppercase tracking-wider text-[var(--treelyon-muted)]">
        {label}
      </div>
      <div
        className="mt-1 font-mono text-lg font-semibold leading-tight tracking-tight"
        style={{ color: accent ?? "var(--treelyon-text)" }}
      >
        {value}
      </div>
      {sub ? (
        <div className="mt-0.5 font-sans text-[9px] text-[var(--treelyon-muted)]">{sub}</div>
      ) : null}
    </Card>
  );
}

export function AnalysisInsights({
  corridorId,
  dashboard,
  loading,
  dashErr,
  selectedLineLabel,
}: AnalysisInsightsProps) {
  const corridorName = corridorList[corridorId].name;

  const canopyData = useMemo(() => dashboard?.canopyBins ?? [], [dashboard?.canopyBins]);

  const riskData = useMemo(() => {
    const s = dashboard?.riskSegments;
    return s?.length ? s : RISK_FALLBACK;
  }, [dashboard?.riskSegments]);

  const takeaways = useMemo(() => {
    if (!dashboard) return [] as string[];
    return buildRowTakeaways(corridorId, dashboard, selectedLineLabel);
  }, [corridorId, dashboard, selectedLineLabel]);

  const stormDays = dashboard?.precip.filter((p) => p.storm).length ?? 0;

  const [insightsHeightPx, setInsightsHeightPx] = useState(INSIGHTS_DEFAULT_PX);
  const insightsHeightRef = useRef(insightsHeightPx);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  useEffect(() => {
    insightsHeightRef.current = insightsHeightPx;
  }, [insightsHeightPx]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(INSIGHTS_HEIGHT_STORAGE_KEY);
      if (raw == null) return;
      const n = parseInt(raw, 10);
      if (Number.isNaN(n)) return;
      setInsightsHeightPx(clampInsightsHeight(n, maxInsightsHeightPx()));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onResize = () => {
      setInsightsHeightPx((h) => clampInsightsHeight(h, maxInsightsHeightPx()));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const endDragStyles = useCallback(() => {
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
  }, []);

  const onResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startH: insightsHeightRef.current };
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  }, []);

  const onResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const maxH = maxInsightsHeightPx();
    const next = clampInsightsHeight(d.startH - (e.clientY - d.startY), maxH);
    insightsHeightRef.current = next;
    setInsightsHeightPx(next);
  }, []);

  const onResizePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      dragRef.current = null;
      endDragStyles();
      try {
        localStorage.setItem(
          INSIGHTS_HEIGHT_STORAGE_KEY,
          String(insightsHeightRef.current),
        );
      } catch {
        /* ignore */
      }
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    },
    [endDragStyles],
  );

  const onResizePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      dragRef.current = null;
      endDragStyles();
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    },
    [endDragStyles],
  );

  const onResizeDoubleClick = useCallback(() => {
    const maxH = maxInsightsHeightPx();
    const next = clampInsightsHeight(INSIGHTS_DEFAULT_PX, maxH);
    setInsightsHeightPx(next);
    try {
      localStorage.setItem(INSIGHTS_HEIGHT_STORAGE_KEY, String(next));
    } catch {
      /* ignore */
    }
  }, []);

  const onResizeKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const maxH = maxInsightsHeightPx();
    const step = e.shiftKey ? 48 : 16;
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const delta = e.key === "ArrowUp" ? step : -step;
      setInsightsHeightPx((h) => {
        const next = clampInsightsHeight(h + delta, maxH);
        try {
          localStorage.setItem(INSIGHTS_HEIGHT_STORAGE_KEY, String(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    } else if (e.key === "Home") {
      e.preventDefault();
      setInsightsHeightPx(() => {
        const next = clampInsightsHeight(INSIGHTS_MIN_PX, maxH);
        try {
          localStorage.setItem(INSIGHTS_HEIGHT_STORAGE_KEY, String(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    } else if (e.key === "End") {
      e.preventDefault();
      setInsightsHeightPx(() => {
        const next = clampInsightsHeight(maxH, maxH);
        try {
          localStorage.setItem(INSIGHTS_HEIGHT_STORAGE_KEY, String(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    }
  }, []);

  const showCharts = !dashErr && dashboard && !loading;
  const showLoading = !dashErr && loading && !dashboard;
  const canopyEmpty =
    showCharts && (canopyData.length === 0 || canopyData.every((b) => b.count === 0));

  const sectionClass =
    "dashboard-insights border-t border-[var(--treelyon-border)] bg-[linear-gradient(180deg,rgba(19,17,31,0.98)_0%,rgba(10,9,18,0.99)_100%)]";

  return (
    <section
      className={sectionClass}
      aria-label="ROW operations insights panel"
      style={{ height: insightsHeightPx }}
    >
      <div
        id="analysis-insights-resize"
        role="separator"
        aria-orientation="horizontal"
        aria-valuenow={insightsHeightPx}
        aria-valuemin={INSIGHTS_MIN_PX}
        aria-valuemax={maxInsightsHeightPx()}
        aria-controls="analysis-insights-panel"
        tabIndex={0}
        className="dashboard-insights__resize-handle group flex w-full shrink-0 flex-col items-center gap-1 border-b border-[var(--treelyon-border)] bg-[rgba(14,12,24,0.85)] py-2 outline-none transition-colors hover:bg-[rgba(19,17,31,0.98)] focus-visible:ring-2 focus-visible:ring-[var(--treelyon-primary-muted)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(14,12,24,1)]"
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={onResizePointerCancel}
        onDoubleClick={onResizeDoubleClick}
        onKeyDown={onResizeKeyDown}
      >
        <GripHorizontal
          className="h-4 w-4 text-[var(--treelyon-muted)] opacity-70 transition-opacity group-hover:opacity-100"
          strokeWidth={2}
          aria-hidden
        />
        <span className="font-sans text-[8px] font-medium uppercase tracking-[0.16em] text-[var(--treelyon-muted)]">
          Drag to resize · double-click to reset
        </span>
      </div>

      <div
        id="analysis-insights-panel"
        className="dashboard-insights__body"
        role="region"
        aria-labelledby="analysis-insights-heading"
      >
        <div className="mx-auto max-w-[1400px] space-y-3 px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--treelyon-primary-soft)] text-[var(--treelyon-primary-muted)]">
              <LayoutDashboard className="h-4 w-4" strokeWidth={2} aria-hidden />
            </div>
            <div>
              <h2
                id="analysis-insights-heading"
                className="font-heading text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--treelyon-text)]"
              >
                ROW operations insights
              </h2>
              <p className="font-sans text-[10px] text-[var(--treelyon-muted)]">
                {selectedLineLabel
                  ? `${corridorName} · ${selectedLineLabel}`
                  : `${corridorName} · click a yellow conductor to scope to that span`}
              </p>
            </div>
          </div>
          <span className="rounded-full border border-[var(--treelyon-border)] px-2 py-0.5 font-mono text-[9px] text-[var(--treelyon-muted)]">
            Clearance · encroachment · storm
          </span>
        </div>

        {dashErr ? (
          <Card className="border-[var(--risk-high)]/35 bg-[rgba(248,113,113,0.06)] p-3">
            <p className="font-sans text-[11px] leading-relaxed text-[var(--treelyon-muted)]">
              <span className="font-medium text-[var(--risk-high)]">Earth Engine unavailable.</span>{" "}
              {dashErr.length > 220 ? `${dashErr.slice(0, 220)}…` : dashErr}
            </p>
          </Card>
        ) : null}

        {showLoading ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[72px] animate-pulse rounded-card border border-[var(--treelyon-border)] bg-[var(--treelyon-dark)]"
              />
            ))}
          </div>
        ) : null}

        {showCharts ? (
          <>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <Kpi
                label="High NDVI (ROW strip)"
                value={
                  dashboard.highNdviFractionPct != null
                    ? `${dashboard.highNdviFractionPct}%`
                    : "—"
                }
                sub="Dense canopy near wire zone"
                accent="var(--risk-medium)"
              />
              <Kpi
                label="Elevated risk share"
                value={
                  dashboard.riskAtRiskPct != null ? `${dashboard.riskAtRiskPct}%` : "—"
                }
                sub="High + medium NDVI classes"
                accent="var(--risk-high)"
              />
              <Kpi
                label="Storm disturbance"
                value={
                  dashboard.stormDisturbedAreaKm2 != null
                    ? `${dashboard.stormDisturbedAreaKm2} km²`
                    : "—"
                }
                sub="Post-event canopy loss (S2)"
              />
              <Kpi
                label="Heavy rain windows"
                value={String(stormDays)}
                sub="GRIDMET ≥ ~45 mm (growth driver)"
                accent="var(--treelyon-chart-south)"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              <Card className="p-2.5">
                <div className="mb-1 font-sans text-[10px] font-medium uppercase tracking-wide text-[var(--treelyon-muted)]">
                  Canopy height — clearance workload
                </div>
                <div className="h-[120px] w-full min-w-0">
                  {canopyEmpty ? (
                    <div className="flex h-full items-center justify-center rounded bg-[var(--treelyon-dark)] text-[10px] text-[var(--treelyon-muted)]">
                      No GEDI samples in this AOI
                    </div>
                  ) : (
                    <Mounted
                      fallback={<div className="h-full rounded bg-[var(--treelyon-dark)]" />}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={canopyData}
                          margin={{ top: 2, right: 4, left: -28, bottom: 0 }}
                        >
                          <CartesianGrid
                            strokeDasharray="0"
                            stroke="var(--treelyon-border)"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="range"
                            tick={{ fill: "var(--treelyon-muted)", fontSize: 8 }}
                            axisLine={{ stroke: "var(--treelyon-border)" }}
                            tickLine={false}
                            interval={0}
                            angle={-30}
                            textAnchor="end"
                            height={44}
                          />
                          <YAxis hide />
                          <Tooltip contentStyle={TT.contentStyle} labelStyle={TT.labelStyle} />
                          <Bar
                            dataKey="count"
                            fill="var(--treelyon-primary)"
                            radius={[3, 3, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </Mounted>
                  )}
                </div>
              </Card>

              <Card className="p-2.5">
                <div className="mb-1 font-sans text-[10px] font-medium uppercase tracking-wide text-[var(--treelyon-muted)]">
                  Vegetation risk mix (NDVI)
                </div>
                <div className="flex h-[120px] items-center gap-2">
                  <div className="h-full min-h-0 w-[44%] min-w-0">
                    <Mounted
                      fallback={<div className="h-full rounded bg-[var(--treelyon-dark)]" />}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={riskData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={28}
                            outerRadius={48}
                            paddingAngle={2}
                          >
                            {riskData.map((e, i) => (
                              <Cell key={i} fill={e.color} stroke="transparent" />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={TT.contentStyle} labelStyle={TT.labelStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </Mounted>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                    {riskData.map((s) => (
                      <div key={s.name} className="flex items-center gap-1.5 text-[10px]">
                        <span
                          className="h-2 w-2 shrink-0 rounded-sm"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="truncate text-[var(--treelyon-muted)]">{s.name}</span>
                        <span className="ml-auto font-mono text-[var(--treelyon-text)]">
                          {s.value}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-2.5">
              <div className="mb-2 flex items-center gap-1.5 font-sans text-[10px] font-medium uppercase tracking-wide text-[var(--treelyon-muted)]">
                <Lightbulb className="h-3.5 w-3.5 text-[var(--treelyon-primary-muted)]" aria-hidden />
                Actionable next steps (transmission ROW)
              </div>
              <ul className="space-y-2 font-sans text-[10px] leading-snug text-[var(--treelyon-text)]">
                {takeaways.map((t, i) => (
                  <li
                    key={i}
                    className="flex gap-2 border-l-2 border-[var(--treelyon-primary)]/50 pl-2.5"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </Card>
          </>
        ) : null}

        {!dashErr && !loading && !dashboard ? (
          <Card className="p-4 text-center font-sans text-[11px] text-[var(--treelyon-muted)]">
            Select a corridor (and optionally a conductor on the map) to load ROW metrics.
          </Card>
        ) : null}
        </div>
      </div>
    </section>
  );
}
