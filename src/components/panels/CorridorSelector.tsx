"use client";

import type { CorridorId } from "@/types";
import { corridorList } from "@/lib/corridorsConfig";
import { Badge } from "@/components/ui/Badge";

interface CorridorSelectorProps {
  value: CorridorId;
  onChange: (id: CorridorId) => void;
}

const OPTIONS = Object.entries(corridorList) as [CorridorId, (typeof corridorList)[CorridorId]][];

export function CorridorSelector({ value, onChange }: CorridorSelectorProps) {
  const meta = corridorList[value];

  return (
    <div className="flex h-16 flex-col justify-center overflow-hidden border-b border-[var(--treelyon-border)] px-4">
      <div className="font-sans text-[10px] font-medium uppercase tracking-wider text-[var(--treelyon-muted)]">
        Selected corridor
      </div>
      <div className="mt-1 flex min-h-0 items-center gap-2">
        <select
          value={value}
          title="Transmission lines (HIFLD), 69 kV and above"
          onChange={(e) => onChange(e.target.value as CorridorId)}
          className="min-w-0 flex-1 cursor-pointer rounded-input border border-[var(--treelyon-border)] bg-[var(--treelyon-dark)] px-2 py-1 font-sans text-[12px] text-[var(--treelyon-text)] outline-none transition-colors duration-hover focus:border-[var(--treelyon-primary)]"
        >
          {OPTIONS.map(([id, s]) => (
            <option key={id} value={id}>
              {s.name}
            </option>
          ))}
        </select>
        <Badge variant="ap" className="shrink-0 !normal-case">
          <span className="border-b-2 border-[var(--ap-gold)] pb-0.5">
            {meta.voltage} kV
          </span>
        </Badge>
      </div>
    </div>
  );
}
