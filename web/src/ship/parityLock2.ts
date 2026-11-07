/**
 * Finish 2.0 Phase 29 — Parity lock 2.0 ship catalog
 * (mirrors shared/ship/parity-lock-2.0.json).
 */
import catalogJson from "../../../shared/ship/parity-lock-2.0.json";

export interface ParityLock2ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  parityLock2Marker: string;
  parityLockCatalog: string;
  suiteFloor: number;
  finish2SuiteFloor: number;
  requiredFinish2SuiteIds: string[];
  requiredBaselineSuiteIds: string[];
  parityFixture: string;
  validateScript: string;
}

export const PARITY_LOCK_2 = catalogJson as unknown as ParityLock2ShipCatalog;
export const PARITY_LOCK_2_PHASE = PARITY_LOCK_2.phase;
export const PARITY_LOCK_2_SCHEMA = PARITY_LOCK_2.schema;
export const PARITY_LOCK_2_MARKER = PARITY_LOCK_2.parityLock2Marker;
export const PARITY_SUITE_FLOOR = PARITY_LOCK_2.suiteFloor;
export const PARITY_FINISH2_SUITE_FLOOR = PARITY_LOCK_2.finish2SuiteFloor;
export const REQUIRED_FINISH2_SUITE_IDS = PARITY_LOCK_2.requiredFinish2SuiteIds;
export const REQUIRED_BASELINE_SUITE_IDS = PARITY_LOCK_2.requiredBaselineSuiteIds;
