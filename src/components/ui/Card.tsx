import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-card border border-[var(--treelyon-border)] bg-[var(--treelyon-surface)] ${className}`}
    >
      {children}
    </div>
  );
}
