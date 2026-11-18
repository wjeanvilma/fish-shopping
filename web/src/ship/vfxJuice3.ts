/**
 * Finish 3.0 Phase 24 — VFX/juice 3 ship catalog
 * (mirrors shared/ship/vfx-juice-3.json).
 */
import catalogJson from "../../../shared/ship/vfx-juice-3.json";

export interface VfxJuice3ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  extendsCatalog: string;
  extendsJuice2Catalog: string;
  budgetGateCatalog: string;
  simHzInvariant: number;
  vfxJuice3Marker: string;
  eventBurstMin: number;
  eventShakeMin: number;
  tideAmbientMin: number;
  eventBursts: { kinds: string[]; sharesBurstPool: boolean };
  eventShake: { kinds: string[]; maxAmplitudeM: number };
  ambientTide: { phases: string[]; consumesBurstPool: boolean };
  parityFixture: string;
  validateScript: string;
  kickoffCatalog: string;
}

export const VFX_JUICE_3 = catalogJson as unknown as VfxJuice3ShipCatalog;
export const VFX_JUICE_3_PHASE = VFX_JUICE_3.phase;
export const VFX_JUICE_3_SCHEMA = VFX_JUICE_3.schema;
export const VFX_JUICE_3_MARKER = VFX_JUICE_3.vfxJuice3Marker;
export const EVENT_BURST_FLOOR_3 = VFX_JUICE_3.eventBurstMin;
export const EVENT_SHAKE_FLOOR_3 = VFX_JUICE_3.eventShakeMin;
export const TIDE_AMBIENT_FLOOR = VFX_JUICE_3.tideAmbientMin;
