/**
 * Finish 2.0 Phase 9 — species 37–50 + baits catalog
 * (mirrors shared/ship/species-37-50.json).
 */
import speciesJson from "../../../shared/ship/species-37-50.json";

export interface Species3750BaseEntry {
  id: string;
  name: string;
  rareUpgrade: string;
  harbors: string[];
  gallery: string;
}

export interface Species3750BaitEntry {
  id: string;
  cost: number;
  requires: string[];
}

export interface Species3750Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  speciesCount: number;
  baitCount: number;
  newBaseSpecies: Species3750BaseEntry[];
  newRareSpecies: string[];
  newBaits: Species3750BaitEntry[];
  legacyBaits: string[];
  rareGallery: string;
  baitFixture: string;
  definitionOfDoneSpeciesMin: number;
  checklist: string[];
  preflightGates: string[];
}

export const SPECIES_3750 = speciesJson as unknown as Species3750Catalog;
export const SPECIES_3750_PHASE = SPECIES_3750.phase;
export const SPECIES_3750_SCHEMA = SPECIES_3750.schema;
export const SPECIES_COUNT_FLOOR = SPECIES_3750.speciesCount;
export const BAIT_COUNT_FLOOR = SPECIES_3750.baitCount;
