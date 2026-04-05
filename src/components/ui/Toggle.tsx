"use client";

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  id?: string;
  "aria-label"?: string;
}

export function Toggle({
  checked,
  onChange,
  id,
  "aria-label": ariaLabel,
}: ToggleProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className="relative h-5 w-9 shrink-0 rounded-input border border-[var(--treelyon-border)] transition-colors duration-hover ease-out focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--treelyon-primary)]"
      style={{
        backgroundColor: checked
          ? "var(--treelyon-primary)"
          : "var(--treelyon-dark)",
      }}
    >
      <span
        className="absolute top-0.5 h-4 w-4 rounded-input bg-[var(--treelyon-text)] transition-transform duration-hover ease-out"
        style={{
          left: checked ? "18px" : "2px",
        }}
      />
    </button>
  );
}
