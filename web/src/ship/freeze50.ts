/**
 * Finish 5.0 Phase 30 — 5.0.0 freeze & DoD ship catalog
 * (mirrors shared/ship/freeze-5.0.0.json).
 */
import catalogJson from "../../../shared/ship/freeze-5.0.0.json";

export interface Freeze50ContentFloors {
  harbors: number;
  species: number;
  machines: number;
  quests: number;
  seasonalEvents: number;
  baits: number;
  cosmetics: number;
  deliveryChains: number;
  rivalMarkets: number;
  paritySuites: number;
}

export interface Freeze50ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  versionName: string;
  versionCode: number;
  releaseTag: string;
  freeze5Marker: string;
  definitionOfDone: string;
  priorFreeze: string;
  completeTagArchived: string;
  finish2ReleaseTagArchived: string;
  finish3ReleaseTagArchived: string;
  finish4ReleaseTagArchived: string;
  contentFloors: Freeze50ContentFloors;
  loc: {
    catalog: string;
    enforceMode: string;
    planTargetsRetained: boolean;
  };
  parityFixture: string;
  validateScript: string;
  softFreeze4Validate: string;
  simHzInvariant: number;
  softFloors?: Record<string, number | string>;
  checklist: string[];
  manualCommands: string[];
  preflightGates: string[];
}

export const FREEZE_50 = catalogJson as unknown as Freeze50ShipCatalog;
export const FREEZE_50_PHASE = FREEZE_50.phase;
export const FREEZE_50_SCHEMA = FREEZE_50.schema;
export const FREEZE_50_MARKER = FREEZE_50.freeze5Marker;
export const FREEZE_50_CONTENT_VERSION = FREEZE_50.contentVersion;
export const FREEZE_50_RELEASE_TAG = FREEZE_50.releaseTag;
export const FREEZE_50_VERSION_CODE = FREEZE_50.versionCode;
export const FREEZE_50_CONTENT_FLOORS = FREEZE_50.contentFloors;
