/**
 * Phase 29 (post-1.0) — 1.0.x hotfix lane catalog + versioning helpers
 * (mirrors shared/ship/hotfix-lane.json).
 */
import hotfixJson from "../../../shared/ship/hotfix-lane.json";

export interface HotfixRolloutStep {
  percent: number;
  minSoakHours: number;
  label: string;
}

export interface HotfixLaneCatalog {
  phase: number;
  schema: string;
  contentVersionLine: string;
  schemaVersion: number;
  versioning: {
    scheme: string;
    versionNameMatchesContentVersion: boolean;
    versionCodeStrictlyIncreases: boolean;
    allowedMajor: number;
    allowedMinor: number;
    minPatch: number;
    schemaMustStay: number;
    forbidSchemaBump: boolean;
    forbidMajorMinorBump: boolean;
    tagPattern: string;
  };
  stagedRollout: {
    track: string;
    steps: HotfixRolloutStep[];
    haltCriteria: string[];
    consolePath: string;
  };
  ci: {
    workflow: string;
    job: string;
    trigger: string;
    artifactName: string;
    gradleTask: string;
  };
  checklist: string[];
}

export const HOTFIX_LANE = hotfixJson as unknown as HotfixLaneCatalog;
export const HOTFIX_LANE_PHASE = HOTFIX_LANE.phase;
export const HOTFIX_LANE_SCHEMA = HOTFIX_LANE.schema;

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

export function parseSemVer(version: string): SemVer | null {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

export function formatSemVer(v: SemVer): string {
  return `${v.major}.${v.minor}.${v.patch}`;
}

export function isHotfixVersionName(version: string): boolean {
  const v = parseSemVer(version);
  if (!v) return false;
  const pol = HOTFIX_LANE.versioning;
  return (
    v.major === pol.allowedMajor &&
    v.minor === pol.allowedMinor &&
    v.patch >= pol.minPatch
  );
}

/** True when next is a valid patch bump from previous on the 1.0.x line. */
export function isValidHotfixBump(previous: string, next: string): boolean {
  const a = parseSemVer(previous);
  const b = parseSemVer(next);
  if (!a || !b) return false;
  if (!isHotfixVersionName(previous) || !isHotfixVersionName(next)) return false;
  return b.major === a.major && b.minor === a.minor && b.patch === a.patch + 1;
}

export function hotfixTagFor(versionName: string): string | null {
  if (!isHotfixVersionName(versionName)) return null;
  return `v${versionName}`;
}

export function initialHotfixRolloutPercent(): number {
  return HOTFIX_LANE.stagedRollout.steps[0]?.percent ?? 10;
}

export function validateHotfixPin(pin: {
  versionName: string;
  contentVersion: string;
  versionCode: number;
  schemaVersion: number;
  storeRelease?: { versionName?: string; versionCode?: number };
}): string[] {
  const errors: string[] = [];
  const pol = HOTFIX_LANE.versioning;
  if (pin.versionName !== pin.contentVersion) {
    errors.push("versionName must match contentVersion");
  }
  if (!isHotfixVersionName(pin.versionName)) {
    errors.push(`versionName ${pin.versionName} is not on the 1.0.x hotfix line`);
  }
  if (pin.schemaVersion !== pol.schemaMustStay) {
    errors.push(`schemaVersion must stay ${pol.schemaMustStay}`);
  }
  if (pin.versionCode < 1) errors.push("versionCode must be ≥1");
  const store = pin.storeRelease;
  if (store?.versionCode != null && pin.versionCode <= store.versionCode) {
    errors.push("hotfix versionCode must exceed storeRelease.versionCode");
  }
  if (store?.versionName && parseSemVer(store.versionName) && parseSemVer(pin.versionName)) {
    const storeV = parseSemVer(store.versionName)!;
    const pinV = parseSemVer(pin.versionName)!;
    if (pinV.major !== storeV.major || pinV.minor !== storeV.minor) {
      errors.push("hotfix must stay on the same major.minor as storeRelease");
    }
    if (pinV.patch < storeV.patch) {
      errors.push("hotfix patch must be ≥ storeRelease patch");
    }
  }
  return errors;
}
