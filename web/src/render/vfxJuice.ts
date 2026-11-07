/**
 * Phase 21 (post-1.0) — VFX juice catalog (catch/cut/sale + shake caps).
 */
import vfxJuiceJson from "../../../shared/perf/vfx-juice.json";

export interface VfxJuiceCatalog {
  phase: number;
  schema: string;
  budgetGateCatalog: string;
  simHzInvariant: number;
  bursts: {
    kinds: string[];
    pool: number;
    poolByQuality: { low: number; medium: number; high: number };
  };
  fly: {
    pool: number;
    poolByQuality: { low: number; medium: number; high: number };
  };
  shake: {
    durationSec: number;
    maxAmplitudeM: number;
    amplitudeM: Record<string, number>;
    scaleByQuality: { low: number; medium: number; high: number };
    disabledWhenReducedMotion: boolean;
  };
  feedback: {
    catchBurstOnEveryCatch: boolean;
    cutBurstIsMachineDone: boolean;
    saleBurstIsPay: boolean;
  };
}

export const vfxJuice = vfxJuiceJson as unknown as VfxJuiceCatalog;
export const VFX_JUICE_PHASE = vfxJuice.phase;
export const VFX_JUICE_SCHEMA = vfxJuice.schema;
