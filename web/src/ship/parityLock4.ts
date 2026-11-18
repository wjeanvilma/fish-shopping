/**
 * Finish 4.0 Phase 29 — Parity lock 4.0 ship catalog
 * (mirrors shared/ship/parity-lock-4.0.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/parity-lock-4.0.json";
import {
  PARITY_LOCK_FINISH4_SUITE_IDS,
  PARITY_LOCK_SUITE_IDS,
} from "../engine/parityLock";

export interface ParityLock4ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  parityLock4Marker: string;
  closesGap: string;
  parityLockCatalog: string;
  extendsParityLock3: string;
  extendsParityLock2: string;
  suiteFloor: number;
  finish2SuiteFloor: number;
  finish3SuiteFloor: number;
  finish4SuiteFloor: number;
  requiredFinish4SuiteIds: string[];
  requiredFinish3SuiteIds: string[];
  requiredFinish2SuiteIds: string[];
  requiredBaselineSuiteIds: string[];
  parityFixture: string;
  validateScript: string;
  simHzInvariant: number;
  kickoffCatalog: string;
  softFloors: Record<string, number | string>;
  checklist: string[];
  preflightGates: string[];
}

export const PARITY_LOCK_4 = catalogJson as unknown as ParityLock4ShipCatalog;
export const PARITY_LOCK_4_PHASE = PARITY_LOCK_4.phase;
export const PARITY_LOCK_4_SCHEMA = PARITY_LOCK_4.schema;
export const PARITY_LOCK_4_MARKER = PARITY_LOCK_4.parityLock4Marker;
export const PARITY_LOCK_4_CLOSES_GAP = PARITY_LOCK_4.closesGap;
export const PARITY4_SUITE_FLOOR = PARITY_LOCK_4.suiteFloor;
export const PARITY4_FINISH4_SUITE_FLOOR = PARITY_LOCK_4.finish4SuiteFloor;
export const REQUIRED_FINISH4_SUITE_IDS = PARITY_LOCK_4.requiredFinish4SuiteIds;
export const REQUIRED_FINISH4_BASELINE_SUITE_IDS = PARITY_LOCK_4.requiredBaselineSuiteIds;
export const REQUIRED_FINISH4_FINISH2_SUITE_IDS = PARITY_LOCK_4.requiredFinish2SuiteIds;
export const REQUIRED_FINISH4_FINISH3_SUITE_IDS = PARITY_LOCK_4.requiredFinish3SuiteIds;

export interface ParityLock4Measure {
  suiteCount: number;
  finish4Count: number;
  gapClosed: boolean;
  floorsMet: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureParityLock4(repoRoot: string): ParityLock4Measure {
  const kickoff = readJson(resolve(repoRoot, PARITY_LOCK_4.kickoffCatalog));
  const missingGates = (PARITY_LOCK_4.preflightGates ?? []).filter(
    (g) => !existsSync(resolve(repoRoot, g)),
  );
  const suiteCount = PARITY_LOCK_SUITE_IDS.length;
  const finish4Count = PARITY_LOCK_FINISH4_SUITE_IDS.length;
  const gapClosed = kickoff.gaps?.parityLock4Missing === false;
  const floorsMet =
    suiteCount >= PARITY4_SUITE_FLOOR &&
    finish4Count >= PARITY4_FINISH4_SUITE_FLOOR &&
    gapClosed &&
    missingGates.length === 0;
  return { suiteCount, finish4Count, gapClosed, floorsMet, missingGates };
}
