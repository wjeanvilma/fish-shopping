/**
 * Finish 4.0 Phase 30 — 4.0.0 freeze & DoD ship catalog
 * (mirrors shared/ship/freeze-4.0.0.json).
 */
import catalogJson from "../../../shared/ship/freeze-4.0.0.json";

export interface Freeze40ContentFloors {
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

export interface Freeze40ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  versionName: string;
  versionCode: number;
  releaseTag: string;
  freeze4Marker: string;
  definitionOfDone: string;
  priorFreeze: string;
  completeTagArchived: string;
  finish2ReleaseTagArchived: string;
  finish3ReleaseTagArchived: string;
  contentFloors: Freeze40ContentFloors;
  loc: {
    catalog: string;
    enforceMode: string;
    planTargetsRetained: boolean;
  };
  parityFixture: string;
  validateScript: string;
  simHzInvariant: number;
  softFloors?: Record<string, number | string>;
  checklist: string[];
  manualCommands: string[];
  preflightGates: string[];
}

export const FREEZE_40 = catalogJson as unknown as Freeze40ShipCatalog;
export const FREEZE_40_PHASE = FREEZE_40.phase;
export const FREEZE_40_SCHEMA = FREEZE_40.schema;
export const FREEZE_40_MARKER = FREEZE_40.freeze4Marker;
export const FREEZE_40_CONTENT_VERSION = FREEZE_40.contentVersion;
export const FREEZE_40_RELEASE_TAG = FREEZE_40.releaseTag;
export const FREEZE_40_VERSION_CODE = FREEZE_40.versionCode;
export const FREEZE_40_CONTENT_FLOORS = FREEZE_40.contentFloors;
