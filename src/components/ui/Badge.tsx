import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "ap" | "danger" | "muted";
}

export function Badge({
  children,
  className = "",
  variant = "default",
}: BadgeProps) {
  const styles: Record<string, string> = {
    default:
      "bg-[var(--treelyon-primary-soft)] text-[var(--treelyon-primary-muted)] border-[var(--treelyon-border)]",
    ap: "bg-[var(--ap-navy)] text-white border-[var(--ap-navy)]",
    danger:
      "bg-[rgba(239,68,68,0.15)] text-[var(--risk-high)] border-[var(--risk-high)]",
    muted: "bg-transparent text-[var(--treelyon-muted)] border-[var(--treelyon-border)]",
  };

  return (
    <span
      className={`inline-flex items-center rounded-input border px-2 py-0.5 font-sans text-[10px] font-medium uppercase tracking-wide ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
