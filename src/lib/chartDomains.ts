/** Recharts Y range for NDVI-like series (0–1), avoids clipping when values are low. */
export function ndviTrendYDomain(
  south: { ndvi: number }[] | undefined,
  north: { ndvi: number }[] | undefined,
): [number, number] {
  const vals = [
    ...(south ?? []).map((r) => r.ndvi),
    ...(north ?? []).map((r) => r.ndvi),
  ];
  if (!vals.length) return [0.35, 0.85];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0.35, 0.85];
  const span = max - min;
  const pad = Math.max(0.05, span * 0.15);
  if (span < 0.02) {
    const mid = (min + max) / 2;
    return [Math.max(0, mid - 0.2), Math.min(1, mid + 0.2)];
  }
  return [Math.max(0, min - pad), Math.min(1, max + pad)];
}

export function phenologyYDomain(
  south: { ndvi: number }[] | undefined,
  north: { ndvi: number }[] | undefined,
): [number, number] {
  const vals = [
    ...(south ?? []).map((r) => r.ndvi),
    ...(north ?? []).map((r) => r.ndvi),
  ];
  if (!vals.length) return [0.15, 0.95];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0.15, 0.95];
  const span = max - min;
  const pad = Math.max(0.04, span * 0.12);
  if (span < 0.02) {
    const mid = (min + max) / 2;
    return [Math.max(0, mid - 0.25), Math.min(1, mid + 0.25)];
  }
  return [Math.max(0, min - pad), Math.min(1, max + pad)];
}
