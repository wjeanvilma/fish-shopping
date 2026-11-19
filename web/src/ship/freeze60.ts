/**
 * Finish 6.0 Phase 30 — 6.0.0 freeze & DoD ship catalog
 * (mirrors shared/ship/freeze-6.0.0.json).
 */
import catalogJson from "../../../shared/ship/freeze-6.0.0.json";

export interface Freeze60ContentFloors {
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

export interface Freeze60ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  versionName: string;
  versionCode: number;
  releaseTag: string;
  freeze6Marker: string;
  definitionOfDone: string;
  priorFreeze: string;
  completeTagArchived: string;
  finish2ReleaseTagArchived: string;
  finish3ReleaseTagArchived: string;
  finish4ReleaseTagArchived: string;
  finish5ReleaseTagArchived: string;
  contentFloors: Freeze60ContentFloors;
  loc: {
    catalog: string;
    enforceMode: string;
    planTargetsRetained: boolean;
  };
  parityFixture: string;
  validateScript: string;
  softFreeze5Validate: string;
  simHzInvariant: number;
  softFloors?: Record<string, number | string>;
  checklist: string[];
  manualCommands: string[];
  preflightGates: string[];
}

export const FREEZE_60 = catalogJson as unknown as Freeze60ShipCatalog;
export const FREEZE_60_PHASE = FREEZE_60.phase;
export const FREEZE_60_SCHEMA = FREEZE_60.schema;
export const FREEZE_60_MARKER = FREEZE_60.freeze6Marker;
export const FREEZE_60_CONTENT_VERSION = FREEZE_60.contentVersion;
export const FREEZE_60_RELEASE_TAG = FREEZE_60.releaseTag;
export const FREEZE_60_VERSION_CODE = FREEZE_60.versionCode;
export const FREEZE_60_CONTENT_FLOORS = FREEZE_60.contentFloors;
