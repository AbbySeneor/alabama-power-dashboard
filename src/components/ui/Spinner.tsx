export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-6 w-6 animate-spin rounded-full border-2 border-[var(--treelyon-border)] border-t-[var(--treelyon-primary)] ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
