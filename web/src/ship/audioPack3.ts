/**
 * Finish 3.0 Phase 23 — SFX/music pack 3 ship catalog
 * (mirrors shared/ship/audio-pack-3.json).
 */
import catalogJson from "../../../shared/ship/audio-pack-3.json";

export interface AudioPack3ShipCatalog {
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
  kickoffCatalog: string;
}

export const AUDIO_PACK_3 = catalogJson as unknown as AudioPack3ShipCatalog;
export const AUDIO_PACK_3_PHASE = AUDIO_PACK_3.phase;
export const AUDIO_PACK_3_SCHEMA = AUDIO_PACK_3.schema;
export const AUDIO_PACK_3_MARKER = AUDIO_PACK_3.audioPackMarker;
export const NEW_STINGER_FLOOR_3 = AUDIO_PACK_3.newStingerMin;
export const NEW_BED_FLOOR_3 = AUDIO_PACK_3.newBedMin;
