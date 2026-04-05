import type { PowerLineProperties } from "@/types";

/** Stable id for matching client clicks ↔ server HIFLD rows. */
export function powerLineStableKey(
  properties: PowerLineProperties | null | undefined,
): string | null {
  if (!properties) return null;
  if (properties.OBJECTID != null && String(properties.OBJECTID) !== "") {
    return `oid:${String(properties.OBJECTID)}`;
  }
  if (properties.ID != null && String(properties.ID) !== "") {
    return `id:${String(properties.ID)}`;
  }
  return null;
}

export function matchPowerLineKey(
  props: PowerLineProperties | null | undefined,
  lineKey: string,
): boolean {
  if (!lineKey) return false;
  const k = powerLineStableKey(props ?? undefined);
  return k === lineKey;
}
