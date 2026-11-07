/**
 * Finish 2.0 Phase 30 — 2.0.0 freeze & DoD ship catalog
 * (mirrors shared/ship/freeze-2.0.0.json).
 */
import catalogJson from "../../../shared/ship/freeze-2.0.0.json";

export interface Freeze20ContentFloors {
  harbors: number;
  species: number;
  machines: number;
  quests: number;
  seasonalEvents: number;
  baits: number;
  cosmetics: number;
}

export interface Freeze20ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  versionName: string;
  versionCode: number;
  releaseTag: string;
  freeze2Marker: string;
  definitionOfDone: string;
  completeTagArchived: string;
  contentFloors: Freeze20ContentFloors;
  loc: {
    catalog: string;
    enforceMode: string;
    planTargetsRetained: boolean;
  };
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  manualCommands: string[];
  preflightGates: string[];
}

export const FREEZE_20 = catalogJson as unknown as Freeze20ShipCatalog;
export const FREEZE_20_PHASE = FREEZE_20.phase;
export const FREEZE_20_SCHEMA = FREEZE_20.schema;
export const FREEZE_20_MARKER = FREEZE_20.freeze2Marker;
export const FREEZE_20_CONTENT_VERSION = FREEZE_20.contentVersion;
export const FREEZE_20_RELEASE_TAG = FREEZE_20.releaseTag;
export const FREEZE_20_VERSION_CODE = FREEZE_20.versionCode;
export const FREEZE_20_CONTENT_FLOORS = FREEZE_20.contentFloors;
