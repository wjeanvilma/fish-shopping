/**
 * Finish 6.0 Phase 29 — Parity lock 6.0 ship catalog
 * (mirrors shared/ship/parity-lock-6.0.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/parity-lock-6.0.json";
import {
  PARITY_LOCK_FINISH6_SUITE_IDS,
  PARITY_LOCK_SUITE_IDS,
} from "../engine/parityLock";

export interface ParityLock6ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  parityLock6Marker: string;
  closesGap: string;
  parityLockCatalog: string;
  extendsParityLock5: string;
  extendsParityLock4: string;
  extendsParityLock3: string;
  extendsParityLock2: string;
  suiteFloor: number;
  finish2SuiteFloor: number;
  finish3SuiteFloor: number;
  finish4SuiteFloor: number;
  finish5SuiteFloor: number;
  finish6SuiteFloor: number;
  requiredFinish6SuiteIds: string[];
  requiredFinish5SuiteIds: string[];
  requiredFinish4SuiteIds: string[];
  requiredFinish3SuiteIds: string[];
  requiredFinish2SuiteIds: string[];
  requiredBaselineSuiteIds: string[];
  parityFixture: string;
  validateScript: string;
  softParity5Validate: string;
  simHzInvariant: number;
  kickoffCatalog: string;
  softFloors: Record<string, number | string>;
  checklist: string[];
  preflightGates: string[];
}

export const PARITY_LOCK_6 = catalogJson as unknown as ParityLock6ShipCatalog;
export const PARITY_LOCK_6_PHASE = PARITY_LOCK_6.phase;
export const PARITY_LOCK_6_SCHEMA = PARITY_LOCK_6.schema;
export const PARITY_LOCK_6_MARKER = PARITY_LOCK_6.parityLock6Marker;
export const PARITY_LOCK_6_CLOSES_GAP = PARITY_LOCK_6.closesGap;
export const PARITY6_SUITE_FLOOR = PARITY_LOCK_6.suiteFloor;
export const PARITY6_FINISH6_SUITE_FLOOR = PARITY_LOCK_6.finish6SuiteFloor;
export const REQUIRED_FINISH6_SUITE_IDS = PARITY_LOCK_6.requiredFinish6SuiteIds;
export const REQUIRED_FINISH6_BASELINE_SUITE_IDS = PARITY_LOCK_6.requiredBaselineSuiteIds;
export const REQUIRED_FINISH6_FINISH2_SUITE_IDS = PARITY_LOCK_6.requiredFinish2SuiteIds;
export const REQUIRED_FINISH6_FINISH3_SUITE_IDS = PARITY_LOCK_6.requiredFinish3SuiteIds;
export const REQUIRED_FINISH6_FINISH4_SUITE_IDS = PARITY_LOCK_6.requiredFinish4SuiteIds;
export const REQUIRED_FINISH6_FINISH5_SUITE_IDS = PARITY_LOCK_6.requiredFinish5SuiteIds;

export interface ParityLock6Measure {
  suiteCount: number;
  finish6Count: number;
  gapClosed: boolean;
  kickoffWired: boolean;
  floorsMet: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureParityLock6(repoRoot: string): ParityLock6Measure {
  const kickoff = readJson(resolve(repoRoot, PARITY_LOCK_6.kickoffCatalog));
  const missingGates = (PARITY_LOCK_6.preflightGates ?? []).filter(
    (g) => !existsSync(resolve(repoRoot, g)),
  );
  const suiteCount = PARITY_LOCK_SUITE_IDS.length;
  const finish6Count = PARITY_LOCK_FINISH6_SUITE_IDS.length;
  const gapClosed = kickoff.gaps?.parityLock6Missing === false;
  const phase29 = (kickoff.phases as any[] | undefined)?.find((p) => p.phase === 29);
  const kickoffWired =
    phase29?.id === "parity-lock-6" && phase29?.validate === "parity6:validate";
  const floorsMet =
    suiteCount >= PARITY6_SUITE_FLOOR &&
    finish6Count >= PARITY6_FINISH6_SUITE_FLOOR &&
    gapClosed &&
    kickoffWired &&
    missingGates.length === 0;
  return { suiteCount, finish6Count, gapClosed, kickoffWired, floorsMet, missingGates };
}
