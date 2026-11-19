/**
 * Finish 5.0 Phase 12 — VFX juice 5 (mirrors shared/ship/vfx-juice-5.json).
 */
import catalogJson from "../../../shared/ship/vfx-juice-5.json";

export interface VfxJuice5Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  vfxJuice5Marker: string;
  eventBurstMin: number;
  eventShakeMin: number;
  pressureAmbientMin: number;
  eventBursts: { kinds: string[] };
  eventShake: { kinds: string[] };
  ambientPressure: {
    modes: string[];
    risingPermille: number;
    criticalPermille: number;
    contractDeadlineWarnTicks: number;
    questNearCompletePermille: number;
  };
  gapClosed: string;
  gapClosedValue: boolean;
  parityFixture: string;
  validateScript: string;
  kickoffCatalog: string;
  preflightGates: string[];
}

export const VFX_JUICE_5 = catalogJson as unknown as VfxJuice5Catalog;
export const VFX_JUICE_5_PHASE = VFX_JUICE_5.phase;
export const VFX_JUICE_5_SCHEMA = VFX_JUICE_5.schema;
export const VFX_JUICE_5_MARKER = VFX_JUICE_5.vfxJuice5Marker;
export const VFX5_BURST_FLOOR = VFX_JUICE_5.eventBurstMin;
export const VFX5_SHAKE_FLOOR = VFX_JUICE_5.eventShakeMin;
export const VFX5_PRESSURE_AMBIENT_FLOOR = VFX_JUICE_5.pressureAmbientMin;
