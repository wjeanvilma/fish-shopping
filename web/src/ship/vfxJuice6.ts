/**
 * Finish 6.0 Phase 12 — VFX juice 6 (mirrors shared/ship/vfx-juice-6.json).
 */
import catalogJson from "../../../shared/ship/vfx-juice-6.json";

export interface VfxJuice6Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  vfxJuice6Marker: string;
  eventBurstMin: number;
  eventShakeMin: number;
  nestAmbientMin: number;
  eventBursts: { kinds: string[] };
  eventShake: { kinds: string[] };
  ambientNest: {
    modes: string[];
    roostingMinPlacements: number;
    settledMinPlacements: number;
  };
  gapClosed: string;
  gapClosedValue: boolean;
  parityFixture: string;
  validateScript: string;
  kickoffCatalog: string;
  preflightGates: string[];
}

export const VFX_JUICE_6 = catalogJson as unknown as VfxJuice6Catalog;
export const VFX_JUICE_6_PHASE = VFX_JUICE_6.phase;
export const VFX_JUICE_6_SCHEMA = VFX_JUICE_6.schema;
export const VFX_JUICE_6_MARKER = VFX_JUICE_6.vfxJuice6Marker;
export const VFX6_BURST_FLOOR = VFX_JUICE_6.eventBurstMin;
export const VFX6_SHAKE_FLOOR = VFX_JUICE_6.eventShakeMin;
export const VFX6_NEST_AMBIENT_FLOOR = VFX_JUICE_6.nestAmbientMin;
