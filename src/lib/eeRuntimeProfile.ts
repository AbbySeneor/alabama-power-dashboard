/**
 * Earth Engine "fast" vs "full" profile from env (shared by compute + diagnose routes).
 */

export function eeFullCompute(): boolean {
  const v = process.env.EE_FULL_COMPUTE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function eeFastMode(): boolean {
  if (eeFullCompute()) return false;
  const off = process.env.EE_FAST_MODE?.trim().toLowerCase();
  if (off === "0" || off === "false" || off === "no") return false;
  return process.env.NODE_ENV === "production";
}

export function earthEngineRuntimeProfile() {
  return {
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    eeFullCompute: eeFullCompute(),
    eeFastMode: eeFastMode(),
  };
}
