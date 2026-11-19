/**
 * Finish 5.0 Phase 29 — Parity lock 5.0 ship catalog
 * (mirrors shared/ship/parity-lock-5.0.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/parity-lock-5.0.json";
import {
  PARITY_LOCK_FINISH5_SUITE_IDS,
  PARITY_LOCK_SUITE_IDS,
} from "../engine/parityLock";

export interface ParityLock5ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  parityLock5Marker: string;
  closesGap: string;
  parityLockCatalog: string;
  extendsParityLock4: string;
  extendsParityLock3: string;
  extendsParityLock2: string;
  suiteFloor: number;
  finish2SuiteFloor: number;
  finish3SuiteFloor: number;
  finish4SuiteFloor: number;
  finish5SuiteFloor: number;
  requiredFinish5SuiteIds: string[];
  requiredFinish4SuiteIds: string[];
  requiredFinish3SuiteIds: string[];
  requiredFinish2SuiteIds: string[];
  requiredBaselineSuiteIds: string[];
  parityFixture: string;
  validateScript: string;
  softParity4Validate: string;
  simHzInvariant: number;
  kickoffCatalog: string;
  softFloors: Record<string, number | string>;
  checklist: string[];
  preflightGates: string[];
}

export const PARITY_LOCK_5 = catalogJson as unknown as ParityLock5ShipCatalog;
export const PARITY_LOCK_5_PHASE = PARITY_LOCK_5.phase;
export const PARITY_LOCK_5_SCHEMA = PARITY_LOCK_5.schema;
export const PARITY_LOCK_5_MARKER = PARITY_LOCK_5.parityLock5Marker;
export const PARITY_LOCK_5_CLOSES_GAP = PARITY_LOCK_5.closesGap;
export const PARITY5_SUITE_FLOOR = PARITY_LOCK_5.suiteFloor;
export const PARITY5_FINISH5_SUITE_FLOOR = PARITY_LOCK_5.finish5SuiteFloor;
export const REQUIRED_FINISH5_SUITE_IDS = PARITY_LOCK_5.requiredFinish5SuiteIds;
export const REQUIRED_FINISH5_BASELINE_SUITE_IDS = PARITY_LOCK_5.requiredBaselineSuiteIds;
export const REQUIRED_FINISH5_FINISH2_SUITE_IDS = PARITY_LOCK_5.requiredFinish2SuiteIds;
export const REQUIRED_FINISH5_FINISH3_SUITE_IDS = PARITY_LOCK_5.requiredFinish3SuiteIds;
export const REQUIRED_FINISH5_FINISH4_SUITE_IDS = PARITY_LOCK_5.requiredFinish4SuiteIds;

export interface ParityLock5Measure {
  suiteCount: number;
  finish5Count: number;
  gapClosed: boolean;
  kickoffWired: boolean;
  floorsMet: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureParityLock5(repoRoot: string): ParityLock5Measure {
  const kickoff = readJson(resolve(repoRoot, PARITY_LOCK_5.kickoffCatalog));
  const missingGates = (PARITY_LOCK_5.preflightGates ?? []).filter(
    (g) => !existsSync(resolve(repoRoot, g)),
  );
  const suiteCount = PARITY_LOCK_SUITE_IDS.length;
  const finish5Count = PARITY_LOCK_FINISH5_SUITE_IDS.length;
  const gapClosed = kickoff.gaps?.parityLock5Missing === false;
  const phase29 = (kickoff.phases as any[] | undefined)?.find((p) => p.phase === 29);
  const kickoffWired =
    phase29?.id === "parity-lock-5" && phase29?.validate === "parity5:validate";
  const floorsMet =
    suiteCount >= PARITY5_SUITE_FLOOR &&
    finish5Count >= PARITY5_FINISH5_SUITE_FLOOR &&
    gapClosed &&
    kickoffWired &&
    missingGates.length === 0;
  return { suiteCount, finish5Count, gapClosed, kickoffWired, floorsMet, missingGates };
}
