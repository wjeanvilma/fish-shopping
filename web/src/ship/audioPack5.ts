/**
 * Finish 5.0 Phase 12 — audio pack 5 (mirrors shared/ship/audio-pack-5.json).
 */
import catalogJson from "../../../shared/ship/audio-pack-5.json";

export interface AudioPack5Catalog {
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
  gapClosed: string;
  gapClosedValue: boolean;
  parityFixture: string;
  validateScript: string;
  kickoffCatalog: string;
  preflightGates: string[];
}

export const AUDIO_PACK_5 = catalogJson as unknown as AudioPack5Catalog;
export const AUDIO_PACK_5_PHASE = AUDIO_PACK_5.phase;
export const AUDIO_PACK_5_SCHEMA = AUDIO_PACK_5.schema;
export const AUDIO_PACK_5_MARKER = AUDIO_PACK_5.audioPackMarker;
export const NEW_STINGER_FLOOR_5 = AUDIO_PACK_5.newStingerMin;
export const NEW_BED_FLOOR_5 = AUDIO_PACK_5.newBedMin;
