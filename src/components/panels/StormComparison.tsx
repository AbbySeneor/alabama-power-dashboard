"use client";

import { Badge } from "@/components/ui/Badge";

interface StormComparisonProps {
  thumbPreUrl: string | null;
  thumbPostUrl: string | null;
  disturbedKm2?: number;
  loading: boolean;
}

export function StormComparison({
  thumbPreUrl,
  thumbPostUrl,
  disturbedKm2,
  loading,
}: StormComparisonProps) {
  const hasThumbs = thumbPreUrl && thumbPostUrl;

  return (
    <div className="border-b border-[var(--treelyon-border)] p-4">
      <div className="mb-3 font-sans text-[11px] font-medium uppercase tracking-wide text-[var(--treelyon-muted)]">
        Post-storm assessment — Jan 2023
      </div>
      <div className="flex flex-wrap gap-4">
        <div>
          <div className="mb-1 font-sans text-[10px] uppercase tracking-wide text-[var(--treelyon-muted)]">
            Pre-storm
          </div>
          {hasThumbs ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbPreUrl}
              alt="Pre-storm Sentinel-2 composite"
              className="h-[80px] w-[140px] rounded-input border border-[var(--treelyon-border)] object-cover"
            />
          ) : (
            <div className="flex h-[80px] w-[140px] items-center justify-center rounded-input border border-[var(--treelyon-border)] bg-[var(--treelyon-dark)] font-sans text-[10px] text-[var(--treelyon-muted)]">
              {loading ? "…" : "No image"}
            </div>
          )}
          <div className="mt-1 text-center font-sans text-[10px] text-[var(--treelyon-muted)]">
            Nov–Dec 2022
          </div>
        </div>
        <div>
          <div className="mb-1 font-sans text-[10px] uppercase tracking-wide text-[var(--treelyon-muted)]">
            Post-storm
          </div>
          {hasThumbs ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbPostUrl}
              alt="Post-storm Sentinel-2 composite"
              className="h-[80px] w-[140px] rounded-input border border-[var(--treelyon-border)] object-cover"
            />
          ) : (
            <div className="flex h-[80px] w-[140px] items-center justify-center rounded-input border border-[var(--treelyon-border)] bg-[var(--treelyon-dark)] font-sans text-[10px] text-[var(--treelyon-muted)]">
              {loading ? "…" : "No image"}
            </div>
          )}
          <div className="mt-1 text-center font-sans text-[10px] text-[var(--treelyon-muted)]">
            Feb–Mar 2023
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 font-sans text-[12px] text-[var(--treelyon-text)]">
        <span>Canopy disturbance (corridor AOI):</span>
        <Badge variant="danger" className="!normal-case">
          {loading && disturbedKm2 == null
            ? "…"
            : disturbedKm2 != null
              ? `${disturbedKm2} km²`
              : "—"}
        </Badge>
      </div>
    </div>
  );
}
