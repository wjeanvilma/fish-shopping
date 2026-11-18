/**
 * Finish 3.0 Phase 30 — 3.0.0 freeze & DoD ship catalog
 * (mirrors shared/ship/freeze-3.0.0.json).
 */
import catalogJson from "../../../shared/ship/freeze-3.0.0.json";

export interface Freeze30ContentFloors {
  harbors: number;
  species: number;
  machines: number;
  quests: number;
  seasonalEvents: number;
  baits: number;
  cosmetics: number;
  deliveryChains: number;
  paritySuites: number;
}

export interface Freeze30ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  versionName: string;
  versionCode: number;
  releaseTag: string;
  freeze3Marker: string;
  definitionOfDone: string;
  priorFreeze: string;
  completeTagArchived: string;
  finish2ReleaseTagArchived: string;
  contentFloors: Freeze30ContentFloors;
  loc: {
    catalog: string;
    enforceMode: string;
    planTargetsRetained: boolean;
  };
  parityFixture: string;
  validateScript: string;
  simHzInvariant: number;
  checklist: string[];
  manualCommands: string[];
  preflightGates: string[];
}

export const FREEZE_30 = catalogJson as unknown as Freeze30ShipCatalog;
export const FREEZE_30_PHASE = FREEZE_30.phase;
export const FREEZE_30_SCHEMA = FREEZE_30.schema;
export const FREEZE_30_MARKER = FREEZE_30.freeze3Marker;
export const FREEZE_30_CONTENT_VERSION = FREEZE_30.contentVersion;
export const FREEZE_30_RELEASE_TAG = FREEZE_30.releaseTag;
export const FREEZE_30_VERSION_CODE = FREEZE_30.versionCode;
export const FREEZE_30_CONTENT_FLOORS = FREEZE_30.contentFloors;
