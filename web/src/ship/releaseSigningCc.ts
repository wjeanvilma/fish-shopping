/**
 * Finish 2.0 Phase 5 — release-signing configuration-cache catalog
 * (mirrors shared/ship/release-signing-cc.json).
 */
import ccJson from "../../../shared/ship/release-signing-cc.json";

export interface ReleaseSigningCcCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  releaseSigningCatalog: string;
  gradleFile: string;
  configurationCache: {
    enabledInGradleProperties: boolean;
    gradlePropertiesKey: string;
    forbiddenPatterns: string[];
    requiredPatterns: string[];
    guardTasks: string[];
    failTask: string;
    failMessageNeedle: string;
  };
  gates: {
    unsignedFail: { expectExitNonZero: boolean; expectLog: string };
    signedRelease: { gradleTask: string; expectExitZero: boolean };
  };
  checklist: string[];
  preflightGates: string[];
}

export const RELEASE_SIGNING_CC = ccJson as unknown as ReleaseSigningCcCatalog;
export const RELEASE_SIGNING_CC_PHASE = RELEASE_SIGNING_CC.phase;
export const RELEASE_SIGNING_CC_SCHEMA = RELEASE_SIGNING_CC.schema;
export const CHECK_RELEASE_UPLOAD_SIGNING = RELEASE_SIGNING_CC.configurationCache.failTask;
