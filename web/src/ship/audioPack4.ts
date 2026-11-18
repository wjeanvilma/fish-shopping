/**
 * Finish 4.0 Phase 23 — audio pack 4 (mirrors shared/ship/audio-pack-4.json).
 */
import catalogJson from "../../../shared/ship/audio-pack-4.json";

export interface AudioPack4Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  audioPackMarker: string;
  newStingerMin: number;
  newBedMin: number;
  newStingers: string[];
  newBeds: string[];
  parityFixture: string;
  validateScript: string;
  kickoffCatalog: string;
  preflightGates: string[];
}

export const AUDIO_PACK_4 = catalogJson as unknown as AudioPack4Catalog;
export const AUDIO_PACK_4_PHASE = AUDIO_PACK_4.phase;
export const AUDIO_PACK_4_SCHEMA = AUDIO_PACK_4.schema;
export const AUDIO_PACK_4_MARKER = AUDIO_PACK_4.audioPackMarker;
export const NEW_STINGER_FLOOR_4 = AUDIO_PACK_4.newStingerMin;
export const NEW_BED_FLOOR_4 = AUDIO_PACK_4.newBedMin;
