interface StatusBarProps {
  lng: number | null;
  lat: number | null;
}

export function StatusBar({ lng, lat }: StatusBarProps) {
  const coord =
    lng != null && lat != null
      ? `${lng.toFixed(5)}, ${lat.toFixed(5)}`
      : "—";

  return (
    <footer className="dashboard-status grid h-8 w-full shrink-0 grid-cols-1 items-center gap-1 border-t border-[var(--treelyon-border)] bg-[var(--treelyon-dark)] px-4 text-[11px] text-[var(--treelyon-muted)] min-[1280px]:grid-cols-3 min-[1280px]:gap-3">
      <span className="min-w-0 truncate font-sans min-[1280px]:justify-self-start">
        Treelyon ROW Intelligence v0.1 — Demo build
      </span>
      <span className="hidden min-w-0 justify-self-center font-mono text-[11px] min-[1280px]:block min-[1280px]:text-center">
        {coord}
      </span>
      <span className="hidden min-w-0 justify-self-end font-sans min-[1280px]:block min-[1280px]:text-right">
        Data: HIFLD · Sentinel-2 · GLAD/GEDI · GRIDMET
      </span>
      <span className="font-mono text-[11px] min-[1280px]:hidden">
        {coord}
      </span>
    </footer>
  );
}
