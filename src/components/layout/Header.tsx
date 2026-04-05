import Image from "next/image";

export function Header() {
  return (
    <header className="dashboard-header relative flex h-14 w-full shrink-0 items-center border-b border-[var(--treelyon-border)] bg-[var(--treelyon-dark)] px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Image
          src="https://treelyon.com/wp-content/uploads/2024/11/treelyon_logo.png"
          alt="Treelyon"
          width={140}
          height={28}
          className="h-7 w-auto max-w-[160px] object-contain"
          style={{
            filter: "drop-shadow(0 0 10px rgba(116, 88, 232, 0.35))",
          }}
          unoptimized
          priority
        />
        <div
          className="h-6 w-px shrink-0 bg-[var(--treelyon-border)]"
          aria-hidden
        />
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="font-heading text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--treelyon-primary-muted)]">
          ROW intelligence
        </span>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
        <div className="h-6 w-px shrink-0 bg-[var(--treelyon-border)]" aria-hidden />
        <div className="flex shrink-0 items-center rounded-md bg-black px-2.5 py-1">
          <Image
            src="/alabama-power-logo.png"
            alt="Alabama Power"
            width={200}
            height={40}
            className="h-8 w-auto max-h-8 max-w-[min(200px,42vw)] object-contain object-left"
            priority
          />
        </div>

        <div className="ml-1 flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full bg-[var(--treelyon-primary)] animate-live-pulse"
            aria-hidden
          />
          <span className="whitespace-nowrap font-sans text-[11px] text-[var(--treelyon-muted)]">
            Live analysis
          </span>
        </div>
      </div>
    </header>
  );
}
