/**
 * Phase 8 (post-1.0) — Play Data safety form answers from `shared/store/data-safety.json`.
 */
import dataSafetyJson from "../../../shared/store/data-safety.json";
import { ANALYTICS_EVENT_NAMES, ANALYTICS_FORBIDDEN_KEYS } from "../engine/analytics";

export interface DataSafetyCollectedRow {
  category: string;
  type: string;
  playTypeId: string;
  collected: boolean;
  shared: boolean;
  ephemeral: boolean;
  required: boolean;
  purposes: string[];
  notes: string;
}

export interface DataSafetyCatalog {
  phase: number;
  schema: string;
  packageName: string;
  privacyPolicyUrl: string;
  overview: {
    collectsOrSharesUserData: boolean;
    encryptedInTransit: boolean;
    usersCanRequestDeletion: boolean;
    independentSecurityReview: boolean;
  };
  dataNotCollected: string[];
  dataCollected: DataSafetyCollectedRow[];
  analytics: {
    consentDefault: boolean;
    consentRequiredBeforeTrack: boolean;
    schema: string;
    eventNames: string[];
    forbiddenKeysInclude: string[];
    noPiiClaim: boolean;
  };
  cloudSync: {
    optional: boolean;
    defaultOff: boolean;
    authMode: string;
    storesEmailOrDisplayName: boolean;
    storesPaymentCard: boolean;
  };
  purchases: {
    developerReceivesCardDetails: boolean;
    playFormDeclaresUserPaymentInfo: boolean;
  };
  androidBackup: {
    autobackupEnabled: boolean;
    excludesSaves: boolean;
    excludesEntitlementPrefs: boolean;
    excludedSharedPreferences: string[];
    excludedFiles: string[];
  };
  playConsoleChecklist: string[];
}

export const dataSafety = dataSafetyJson as unknown as DataSafetyCatalog;

export const DATA_SAFETY_PHASE = dataSafety.phase;
export const DATA_SAFETY_SCHEMA = dataSafety.schema;

export function collectedPlayTypeIds(): string[] {
  return dataSafety.dataCollected.filter((r) => r.collected).map((r) => r.playTypeId);
}

export function analyticsEventsMatchEngine(): boolean {
  const catalog = new Set(dataSafety.analytics.eventNames);
  const engine = new Set(ANALYTICS_EVENT_NAMES as readonly string[]);
  if (catalog.size !== engine.size) return false;
  for (const n of catalog) if (!engine.has(n)) return false;
  return true;
}

export function forbiddenKeysCovered(): boolean {
  return dataSafety.analytics.forbiddenKeysInclude.every((k) => ANALYTICS_FORBIDDEN_KEYS.has(k));
}
