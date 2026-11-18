/**
 * Finish 3.0 Phase 10 — staff unlock
 * (mirrors shared/ship/staff-unlock.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/staff-unlock.json";
import { GameState, loadContent, Simulation, WorkerSystem } from "../engine";

export interface StaffUnlockCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  staffUnlockMarker: string;
  staffTreesCatalog: string;
  hireableRoleCount: number;
  staffBranchTarget: number;
  newBranchIds: string[];
  hireableRoles: string[];
  kickoffCatalog: string;
  gapFlagClosed: string;
  gapComingSoonReasons: number;
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const STAFF_UNLOCK = catalogJson as unknown as StaffUnlockCatalog;
export const STAFF_UNLOCK_PHASE = STAFF_UNLOCK.phase;
export const STAFF_UNLOCK_SCHEMA = STAFF_UNLOCK.schema;
export const STAFF_UNLOCK_MARKER = STAFF_UNLOCK.staffUnlockMarker;

export interface StaffUnlockMeasure {
  hireableRoleCount: number;
  branchCount: number;
  newBranchesPresent: boolean;
  rolesWithBranches: number;
  comingSoonReasons: number;
  gapClosed: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureStaffUnlock(repoRoot: string): StaffUnlockMeasure {
  const packPath = resolve(repoRoot, "shared/content/content-pack.json");
  const pack = readJson(packPath);
  const content = loadContent(pack);
  const harborId = content.raw.harbors[0]?.id ?? "harbor.sunrise_pier";
  const sim = new Simulation(content, GameState.newGame(content, harborId, 1));
  const comingSoonReasons = WorkerSystem.countComingSoonReasons(content, sim.state);

  const branches = content.staffTrees.branches;
  const branchRoles = new Set(branches.map((b) => b.role));
  const newBranchesPresent = STAFF_UNLOCK.newBranchIds.every((id) =>
    branches.some((b) => b.id === id),
  );
  const rolesWithBranches = STAFF_UNLOCK.hireableRoles.filter((r) => branchRoles.has(r)).length;

  let gapClosed = false;
  const kickoffPath = resolve(repoRoot, STAFF_UNLOCK.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    gapClosed =
      kickoff?.gaps?.[STAFF_UNLOCK.gapFlagClosed] === false &&
      (kickoff?.baseline?.staffComingSoonReasons ?? -1) === 0;
  }

  const missingGates: string[] = [];
  for (const gate of STAFF_UNLOCK.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  const roleKinds = new Set(content.workers.map((w) => w.role));
  return {
    hireableRoleCount: roleKinds.size,
    branchCount: branches.length,
    newBranchesPresent,
    rolesWithBranches,
    comingSoonReasons,
    gapClosed,
    missingGates,
  };
}
