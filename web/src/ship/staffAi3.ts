/**
 * Finish 5.0 Phase 20 — staff/worker AI depth wave 3
 * (mirrors shared/ship/staff-ai-3.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/staff-ai-3.json";

export interface StaffAi3Behavior {
  branchId: string;
  role: string;
  markers: string[];
}

export interface StaffAi3Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  staffAi3Marker: string;
  extendsStaffAi2: string;
  extendsWorkerAiDepth: string;
  staffTreesCatalog: string;
  depthStats: string[];
  depthBehaviors: StaffAi3Behavior[];
  decisionReasons: string[];
  newBranchIds: string[];
  newScheduleIds: string[];
  branchesMin: number;
  schedulesMin: number;
  webWorkersPath: string;
  kotlinWorkersPath: string;
  webStatsPath: string;
  kotlinStatsPath: string;
  kickoffCatalog: string;
  parityFixture: string;
  validateScript: string;
  softStaffAi2Validate: string;
  softWorkerAiValidate: string;
  softStaffTreesValidate: string;
  authorTool: string;
  checklist: string[];
  preflightGates: string[];
}

export const STAFF_AI_3 = catalogJson as unknown as StaffAi3Catalog;
export const STAFF_AI_3_PHASE = STAFF_AI_3.phase;
export const STAFF_AI_3_SCHEMA = STAFF_AI_3.schema;
export const STAFF_AI_3_MARKER = STAFF_AI_3.staffAi3Marker;

export interface StaffAi3Measure {
  behaviorCount: number;
  statCount: number;
  reasonCount: number;
  branchCount: number;
  scheduleCount: number;
  tsMarkersOk: boolean;
  kotlinMarkersOk: boolean;
  tsStatsOk: boolean;
  kotlinStatsOk: boolean;
  newBranchesPresent: boolean;
  newSchedulesPresent: boolean;
  decisionReasonsPresent: boolean;
  kickoffClosed: boolean;
  kickoffWired: boolean;
  missingGates: string[];
  missingTsMarkers: string[];
  missingKotlinMarkers: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function missingMarkers(src: string, markers: string[]): string[] {
  return markers.filter((m) => !src.includes(m));
}

export function measureStaffAi3(repoRoot: string): StaffAi3Measure {
  const tsWorkers = existsSync(resolve(repoRoot, STAFF_AI_3.webWorkersPath))
    ? readFileSync(resolve(repoRoot, STAFF_AI_3.webWorkersPath), "utf8")
    : "";
  const ktWorkers = existsSync(resolve(repoRoot, STAFF_AI_3.kotlinWorkersPath))
    ? readFileSync(resolve(repoRoot, STAFF_AI_3.kotlinWorkersPath), "utf8")
    : "";
  const tsStats = existsSync(resolve(repoRoot, STAFF_AI_3.webStatsPath))
    ? readFileSync(resolve(repoRoot, STAFF_AI_3.webStatsPath), "utf8")
    : "";
  const ktStats = existsSync(resolve(repoRoot, STAFF_AI_3.kotlinStatsPath))
    ? readFileSync(resolve(repoRoot, STAFF_AI_3.kotlinStatsPath), "utf8")
    : "";

  const missingTsMarkers: string[] = [];
  const missingKotlinMarkers: string[] = [];
  for (const b of STAFF_AI_3.depthBehaviors) {
    missingTsMarkers.push(...missingMarkers(tsWorkers, b.markers).map((m) => `${b.branchId}:${m}`));
    missingKotlinMarkers.push(
      ...missingMarkers(ktWorkers, b.markers).map((m) => `${b.branchId}:${m}`),
    );
  }

  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  const branches = pack.staffTrees?.branches ?? [];
  const schedules = pack.staffTrees?.schedules ?? [];
  const newBranchesPresent = STAFF_AI_3.newBranchIds.every((id) =>
    branches.some((b: any) => b.id === id),
  );
  const newSchedulesPresent = STAFF_AI_3.newScheduleIds.every((id) =>
    schedules.some((s: any) => s.id === id),
  );

  const decisionReasonsPresent = STAFF_AI_3.decisionReasons.every(
    (r) => tsWorkers.includes(r) && ktWorkers.includes(r),
  );

  const kickoff = readJson(resolve(repoRoot, STAFF_AI_3.kickoffCatalog));
  const phase20 = (kickoff.phases as any[])?.find((p) => p.phase === 20);
  const kickoffWired =
    phase20?.id === "staff-ai-3" && phase20?.validate === "staffai3:validate";
  const kickoffClosed = kickoff.gaps?.staffAi3Incomplete === false;

  const missingGates: string[] = [];
  for (const gate of STAFF_AI_3.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    behaviorCount: STAFF_AI_3.depthBehaviors.length,
    statCount: STAFF_AI_3.depthStats.length,
    reasonCount: STAFF_AI_3.decisionReasons.length,
    branchCount: branches.length,
    scheduleCount: schedules.length,
    tsMarkersOk: missingTsMarkers.length === 0,
    kotlinMarkersOk: missingKotlinMarkers.length === 0,
    tsStatsOk: STAFF_AI_3.depthStats.every((s) => tsStats.includes(s)),
    kotlinStatsOk: STAFF_AI_3.depthStats.every((s) => ktStats.includes(s)),
    newBranchesPresent,
    newSchedulesPresent,
    decisionReasonsPresent,
    kickoffClosed,
    kickoffWired,
    missingGates,
    missingTsMarkers,
    missingKotlinMarkers,
  };
}
