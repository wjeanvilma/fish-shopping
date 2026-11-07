/**
 * Finish 2.0 Phase 22 — VFX/juice 2 ship catalog
 * (mirrors shared/ship/vfx-juice-2.json).
 */
import catalogJson from "../../../shared/ship/vfx-juice-2.json";

export interface VfxJuice2ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  extendsCatalog: string;
  budgetGateCatalog: string;
  simHzInvariant: number;
  vfxJuice2Marker: string;
  eventBurstMin: number;
  eventShakeMin: number;
  weatherAmbientMin: number;
  eventBursts: { kinds: string[]; sharesBurstPool: boolean };
  eventShake: { kinds: string[]; maxAmplitudeM: number };
  ambientWeather: { patterns: string[]; consumesBurstPool: boolean };
  parityFixture: string;
  validateScript: string;
}

export const VFX_JUICE_2 = catalogJson as unknown as VfxJuice2ShipCatalog;
export const VFX_JUICE_2_PHASE = VFX_JUICE_2.phase;
export const VFX_JUICE_2_SCHEMA = VFX_JUICE_2.schema;
export const VFX_JUICE_2_MARKER = VFX_JUICE_2.vfxJuice2Marker;
export const EVENT_BURST_FLOOR = VFX_JUICE_2.eventBurstMin;
export const EVENT_SHAKE_FLOOR = VFX_JUICE_2.eventShakeMin;
export const WEATHER_AMBIENT_FLOOR = VFX_JUICE_2.weatherAmbientMin;
