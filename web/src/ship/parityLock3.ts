/**
 * Finish 3.0 Phase 29 — Parity lock 3.0 ship catalog
 * (mirrors shared/ship/parity-lock-3.0.json).
 */
import catalogJson from "../../../shared/ship/parity-lock-3.0.json";

export interface ParityLock3ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  parityLock3Marker: string;
  parityLockCatalog: string;
  extendsParityLock2: string;
  suiteFloor: number;
  finish2SuiteFloor: number;
  finish3SuiteFloor: number;
  requiredFinish3SuiteIds: string[];
  requiredFinish2SuiteIds: string[];
  requiredBaselineSuiteIds: string[];
  parityFixture: string;
  validateScript: string;
  simHzInvariant: number;
}

export const PARITY_LOCK_3 = catalogJson as unknown as ParityLock3ShipCatalog;
export const PARITY_LOCK_3_PHASE = PARITY_LOCK_3.phase;
export const PARITY_LOCK_3_SCHEMA = PARITY_LOCK_3.schema;
export const PARITY_LOCK_3_MARKER = PARITY_LOCK_3.parityLock3Marker;
export const PARITY3_SUITE_FLOOR = PARITY_LOCK_3.suiteFloor;
export const PARITY3_FINISH3_SUITE_FLOOR = PARITY_LOCK_3.finish3SuiteFloor;
export const REQUIRED_FINISH3_SUITE_IDS = PARITY_LOCK_3.requiredFinish3SuiteIds;
export const REQUIRED_FINISH3_BASELINE_SUITE_IDS = PARITY_LOCK_3.requiredBaselineSuiteIds;
export const REQUIRED_FINISH3_FINISH2_SUITE_IDS = PARITY_LOCK_3.requiredFinish2SuiteIds;
