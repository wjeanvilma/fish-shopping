/**
 * Finish 2.0 Phase 8 — harbors 6–8 catalog
 * (mirrors shared/ship/harbors-6-8.json).
 */
import harborsJson from "../../../shared/ship/harbors-6-8.json";

export interface Harbor68Entry {
  id: string;
  name: string;
  requires: string[];
  specialization: string;
  blockout: string;
  landingQuest: string;
  prestigeUnlock: string;
  gallery: string;
}

export interface Harbors68Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  harborCount: number;
  newHarbors: Harbor68Entry[];
  circuitPrestige: string[];
  travelFixture: string;
  definitionOfDoneQuota: number;
  checklist: string[];
  preflightGates: string[];
}

export const HARBORS_68 = harborsJson as unknown as Harbors68Catalog;
export const HARBORS_68_PHASE = HARBORS_68.phase;
export const HARBORS_68_SCHEMA = HARBORS_68.schema;
export const HARBOR_COUNT_FLOOR = HARBORS_68.harborCount;
