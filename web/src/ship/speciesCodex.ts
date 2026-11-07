/**
 * Finish 2.0 Phase 12 — species codex catalog
 * (mirrors shared/ship/species-codex.json).
 */
import codexJson from "../../../shared/ship/species-codex.json";

export interface SpeciesCodexShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  speciesCount: number;
  codexEntryCount: number;
  familyCount: number;
  families: string[];
  parityFixture: string;
  definitionOfDoneCodexEntries: number;
  checklist: string[];
  preflightGates: string[];
}

export const SPECIES_CODEX = codexJson as unknown as SpeciesCodexShipCatalog;
export const SPECIES_CODEX_PHASE = SPECIES_CODEX.phase;
export const SPECIES_CODEX_SCHEMA = SPECIES_CODEX.schema;
export const CODEX_ENTRY_FLOOR = SPECIES_CODEX.codexEntryCount;
