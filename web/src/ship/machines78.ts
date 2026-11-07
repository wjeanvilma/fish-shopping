/**
 * Finish 2.0 Phase 10 — machines 7–8 catalog
 * (mirrors shared/ship/machines-7-8.json).
 */
import machinesJson from "../../../shared/ship/machines-7-8.json";

export interface Machines78Entry {
  id: string;
  name: string;
  unlockUpgrade: string;
  recipeCount: number;
  sampleRecipe: string;
  products: string[];
}

export interface Machines78Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  machineCount: number;
  newMachines: Machines78Entry[];
  recipeFixture: string;
  definitionOfDoneMachineClasses: number;
  checklist: string[];
  preflightGates: string[];
}

export const MACHINES_78 = machinesJson as unknown as Machines78Catalog;
export const MACHINES_78_PHASE = MACHINES_78.phase;
export const MACHINES_78_SCHEMA = MACHINES_78.schema;
export const MACHINE_COUNT_FLOOR = MACHINES_78.machineCount;
