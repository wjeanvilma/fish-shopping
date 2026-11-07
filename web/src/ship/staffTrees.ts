/**
 * Finish 2.0 Phase 15 — staff specialization trees catalog
 * (mirrors shared/ship/staff-trees.json).
 */
import treesJson from "../../../shared/ship/staff-trees.json";

export interface StaffTreesShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  branchCount: number;
  scheduleCount: number;
  rootBranchCount: number;
  branches: string[];
  schedules: string[];
  parityFixture: string;
  validateScript: string;
}

export const STAFF_TREES = treesJson as unknown as StaffTreesShipCatalog;
export const STAFF_TREES_PHASE = STAFF_TREES.phase;
export const STAFF_TREES_SCHEMA = STAFF_TREES.schema;
export const STAFF_BRANCH_FLOOR = STAFF_TREES.branchCount;
export const STAFF_SCHEDULE_FLOOR = STAFF_TREES.scheduleCount;
