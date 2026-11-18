/**
 * Finish 4.0 Phase 23 — VFX juice 4 (mirrors shared/ship/vfx-juice-4.json).
 */
import catalogJson from "../../../shared/ship/vfx-juice-4.json";

export interface VfxJuice4Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  vfxJuice4Marker: string;
  eventBurstMin: number;
  eventShakeMin: number;
  endgameAmbientMin: number;
  eventBursts: { kinds: string[] };
  eventShake: { kinds: string[] };
  ambientEndgame: { modes: string[] };
  parityFixture: string;
  validateScript: string;
  kickoffCatalog: string;
  preflightGates: string[];
}

export const VFX_JUICE_4 = catalogJson as unknown as VfxJuice4Catalog;
export const VFX_JUICE_4_PHASE = VFX_JUICE_4.phase;
export const VFX_JUICE_4_SCHEMA = VFX_JUICE_4.schema;
export const VFX_JUICE_4_MARKER = VFX_JUICE_4.vfxJuice4Marker;
export const VFX4_BURST_FLOOR = VFX_JUICE_4.eventBurstMin;
export const VFX4_SHAKE_FLOOR = VFX_JUICE_4.eventShakeMin;
export const VFX4_ENDGAME_AMBIENT_FLOOR = VFX_JUICE_4.endgameAmbientMin;
