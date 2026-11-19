/**
 * Finish 6.0 Phase 16 — staff/worker AI depth wave 4 + decision-trace fixtures
 * (mirrors shared/ship/staff-ai-4.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/staff-ai-4.json";

export interface StaffAi4Behavior {
  branchId: string;
  role: string;
  markers: string[];
}

export interface StaffAi4Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  staffAi4Marker: string;
  extendsStaffAi3: string;
  staffTreesCatalog: string;
  decisionTraceFixture: string;
  depthStats: string[];
  depthBehaviors: StaffAi4Behavior[];
  decisionReasons: string[];
  newBranchIds: string[];
  newScheduleIds: string[];
  branchesMin: number;
  schedulesMin: number;
  webWorkersPath: string;
  kotlinWorkersPath: string;
  webStatsPath: string;
  kotlinStatsPath: string;
  webDecisionHooksPath: string;
  kotlinDecisionHooksPath: string;
  kickoffCatalog: string;
  parityFixture: string;
  validateScript: string;
  softStaffAi3Validate: string;
  softStaffTreesValidate: string;
  authorTool: string;
  checklist: string[];
  preflightGates: string[];
}

export const STAFF_AI_4 = catalogJson as unknown as StaffAi4Catalog;
export const STAFF_AI_4_PHASE = STAFF_AI_4.phase;
export const STAFF_AI_4_SCHEMA = STAFF_AI_4.schema;
export const STAFF_AI_4_MARKER = STAFF_AI_4.staffAi4Marker;

export interface StaffAi4Measure {
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
  decisionTraceFixtureOk: boolean;
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

export function measureStaffAi4(repoRoot: string): StaffAi4Measure {
  const tsWorkers = existsSync(resolve(repoRoot, STAFF_AI_4.webWorkersPath))
    ? readFileSync(resolve(repoRoot, STAFF_AI_4.webWorkersPath), "utf8")
    : "";
  const ktWorkers = existsSync(resolve(repoRoot, STAFF_AI_4.kotlinWorkersPath))
    ? readFileSync(resolve(repoRoot, STAFF_AI_4.kotlinWorkersPath), "utf8")
    : "";
  const tsStats = existsSync(resolve(repoRoot, STAFF_AI_4.webStatsPath))
    ? readFileSync(resolve(repoRoot, STAFF_AI_4.webStatsPath), "utf8")
    : "";
  const ktStats = existsSync(resolve(repoRoot, STAFF_AI_4.kotlinStatsPath))
    ? readFileSync(resolve(repoRoot, STAFF_AI_4.kotlinStatsPath), "utf8")
    : "";

  const missingTsMarkers: string[] = [];
  const missingKotlinMarkers: string[] = [];
  for (const b of STAFF_AI_4.depthBehaviors) {
    missingTsMarkers.push(...missingMarkers(tsWorkers, b.markers).map((m) => `${b.branchId}:${m}`));
    missingKotlinMarkers.push(
      ...missingMarkers(ktWorkers, b.markers).map((m) => `${b.branchId}:${m}`),
    );
  }

  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  const branches = pack.staffTrees?.branches ?? [];
  const schedules = pack.staffTrees?.schedules ?? [];
  const newBranchesPresent = STAFF_AI_4.newBranchIds.every((id) =>
    branches.some((b: any) => b.id === id),
  );
  const newSchedulesPresent = STAFF_AI_4.newScheduleIds.every((id) =>
    schedules.some((s: any) => s.id === id),
  );

  const decisionReasonsPresent = STAFF_AI_4.decisionReasons.every(
    (r) => tsWorkers.includes(r) && ktWorkers.includes(r),
  );

  const tracePath = resolve(repoRoot, STAFF_AI_4.decisionTraceFixture);
  let decisionTraceFixtureOk = false;
  if (existsSync(tracePath)) {
    const trace = readJson(tracePath);
    decisionTraceFixtureOk =
      trace.staffAi4Marker === STAFF_AI_4_MARKER &&
      Array.isArray(trace.samples) &&
      trace.samples.length >= 5 &&
      STAFF_AI_4.decisionReasons.every((r: string) => (trace.reasons ?? []).includes(r));
  }

  const kickoff = readJson(resolve(repoRoot, STAFF_AI_4.kickoffCatalog));
  const phase16 = (kickoff.phases as any[])?.find((p) => p.phase === 16);
  const kickoffWired =
    phase16?.id === "staff-ai-4" && phase16?.validate === "staffai4:validate";
  const kickoffClosed = kickoff.gaps?.staffAi4Incomplete === false;

  const missingGates: string[] = [];
  for (const gate of STAFF_AI_4.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    behaviorCount: STAFF_AI_4.depthBehaviors.length,
    statCount: STAFF_AI_4.depthStats.length,
    reasonCount: STAFF_AI_4.decisionReasons.length,
    branchCount: branches.length,
    scheduleCount: schedules.length,
    tsMarkersOk: missingTsMarkers.length === 0,
    kotlinMarkersOk: missingKotlinMarkers.length === 0,
    tsStatsOk: STAFF_AI_4.depthStats.every((s) => tsStats.includes(s)),
    kotlinStatsOk: STAFF_AI_4.depthStats.every((s) => ktStats.includes(s)),
    newBranchesPresent,
    newSchedulesPresent,
    decisionReasonsPresent,
    decisionTraceFixtureOk,
    kickoffClosed,
    kickoffWired,
    missingGates,
    missingTsMarkers,
    missingKotlinMarkers,
  };
}
