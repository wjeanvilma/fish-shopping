/**
 * Finish 2.0 Phase 21 — SFX/music pack 2 ship catalog
 * (mirrors shared/ship/audio-pack-2.json).
 */
import catalogJson from "../../../shared/ship/audio-pack-2.json";

export interface AudioPack2ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  audioPackMarker: string;
  newStingerMin: number;
  newBedMin: number;
  duckingPolicyFrozen: boolean;
  frozenDucking: Record<string, number | boolean>;
  newStingers: string[];
  newBeds: string[];
  parityFixture: string;
  validateScript: string;
}

export const AUDIO_PACK_2 = catalogJson as unknown as AudioPack2ShipCatalog;
export const AUDIO_PACK_2_PHASE = AUDIO_PACK_2.phase;
export const AUDIO_PACK_2_SCHEMA = AUDIO_PACK_2.schema;
export const AUDIO_PACK_2_MARKER = AUDIO_PACK_2.audioPackMarker;
export const NEW_STINGER_FLOOR = AUDIO_PACK_2.newStingerMin;
export const NEW_BED_FLOOR = AUDIO_PACK_2.newBedMin;
