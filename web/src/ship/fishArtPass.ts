/**
 * Finish 2.0 Phase 20 — fish art pass catalog
 * (mirrors shared/ship/fish-art-pass.json).
 */
import catalogJson from "../../../shared/ship/fish-art-pass.json";

export interface FishArtAuthoredEntry {
  speciesId: string;
  theme: string;
  asset: string;
}

export interface FishArtPassShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  authoredSpeciesMin: number;
  fishArtMarker: string;
  maxBytesPerFish: number;
  maxTotalAuthoredBytes: number;
  authoredSpecies: FishArtAuthoredEntry[];
  parityFixture: string;
  validateScript: string;
}

export const FISH_ART_PASS = catalogJson as unknown as FishArtPassShipCatalog;
export const FISH_ART_PHASE = FISH_ART_PASS.phase;
export const FISH_ART_SCHEMA = FISH_ART_PASS.schema;
export const FISH_ART_MARKER = FISH_ART_PASS.fishArtMarker;
export const AUTHORED_FISH_FLOOR = FISH_ART_PASS.authoredSpeciesMin;
