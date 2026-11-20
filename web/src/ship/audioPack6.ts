/**
 * Finish 6.0 Phase 12 — audio pack 6 (mirrors shared/ship/audio-pack-6.json).
 */
import catalogJson from "../../../shared/ship/audio-pack-6.json";

export interface AudioPack6Catalog {
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

export const AUDIO_PACK_6 = catalogJson as unknown as AudioPack6Catalog;
export const AUDIO_PACK_6_PHASE = AUDIO_PACK_6.phase;
export const AUDIO_PACK_6_SCHEMA = AUDIO_PACK_6.schema;
export const AUDIO_PACK_6_MARKER = AUDIO_PACK_6.audioPackMarker;
export const NEW_STINGER_FLOOR_6 = AUDIO_PACK_6.newStingerMin;
export const NEW_BED_FLOOR_6 = AUDIO_PACK_6.newBedMin;
