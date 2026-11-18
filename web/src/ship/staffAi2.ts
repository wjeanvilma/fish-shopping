/**
 * Finish 4.0 Phase 19 — staff/worker AI depth wave 2
 * (mirrors shared/ship/staff-ai-2.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/staff-ai-2.json";

export interface StaffAi2Behavior {
  branchId: string;
  role: string;
  markers: string[];
}

export interface StaffAi2Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  staffAi2Marker: string;
  extendsWorkerAiDepth: string;
  staffTreesCatalog: string;
  depthStats: string[];
  depthBehaviors: StaffAi2Behavior[];
  decisionReasons: string[];
  webWorkersPath: string;
  kotlinWorkersPath: string;
  webStatsPath: string;
  kotlinStatsPath: string;
  kickoffCatalog: string;
  parityFixture: string;
  validateScript: string;
  softWorkerAiValidate: string;
  authorTool: string;
  checklist: string[];
  preflightGates: string[];
}

export const STAFF_AI_2 = catalogJson as unknown as StaffAi2Catalog;
export const STAFF_AI_2_PHASE = STAFF_AI_2.phase;
export const STAFF_AI_2_SCHEMA = STAFF_AI_2.schema;
export const STAFF_AI_2_MARKER = STAFF_AI_2.staffAi2Marker;

export interface StaffAi2Measure {
  behaviorCount: number;
  statCount: number;
  reasonCount: number;
  tsMarkersOk: boolean;
  kotlinMarkersOk: boolean;
  tsStatsOk: boolean;
  kotlinStatsOk: boolean;
  branchesPresent: boolean;
  decisionReasonsPresent: boolean;
  kickoffWired: boolean;
  softWorkerAiPath: boolean;
  measuredAtPhase: number;
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

export function measureStaffAi2(repoRoot: string): StaffAi2Measure {
  const tsWorkers = existsSync(resolve(repoRoot, STAFF_AI_2.webWorkersPath))
    ? readFileSync(resolve(repoRoot, STAFF_AI_2.webWorkersPath), "utf8")
    : "";
  const ktWorkers = existsSync(resolve(repoRoot, STAFF_AI_2.kotlinWorkersPath))
    ? readFileSync(resolve(repoRoot, STAFF_AI_2.kotlinWorkersPath), "utf8")
    : "";
  const tsStats = existsSync(resolve(repoRoot, STAFF_AI_2.webStatsPath))
    ? readFileSync(resolve(repoRoot, STAFF_AI_2.webStatsPath), "utf8")
    : "";
  const ktStats = existsSync(resolve(repoRoot, STAFF_AI_2.kotlinStatsPath))
    ? readFileSync(resolve(repoRoot, STAFF_AI_2.kotlinStatsPath), "utf8")
    : "";

  const missingTsMarkers: string[] = [];
  const missingKotlinMarkers: string[] = [];
  for (const b of STAFF_AI_2.depthBehaviors) {
    missingTsMarkers.push(...missingMarkers(tsWorkers, b.markers).map((m) => `${b.branchId}:${m}`));
    missingKotlinMarkers.push(
      ...missingMarkers(ktWorkers, b.markers).map((m) => `${b.branchId}:${m}`),
    );
  }

  const tsStatsOk = STAFF_AI_2.depthStats.every((s) => tsStats.includes(s));
  const kotlinStatsOk = STAFF_AI_2.depthStats.every((s) => ktStats.includes(s));

  let branchesPresent = false;
  const treesPath = resolve(repoRoot, STAFF_AI_2.staffTreesCatalog);
  if (existsSync(treesPath)) {
    const trees = readJson(treesPath);
    const ids = new Set(
      (trees.branches ?? []).map((b: any) => (typeof b === "string" ? b : b.id)),
    );
    branchesPresent = STAFF_AI_2.depthBehaviors.every((b) => ids.has(b.branchId));
  }

  const decisionReasonsPresent = STAFF_AI_2.decisionReasons.every(
    (r) => tsWorkers.includes(r) && ktWorkers.includes(r),
  );

  let kickoffWired = false;
  let measuredAtPhase = -1;
  const kickoffPath = resolve(repoRoot, STAFF_AI_2.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    measuredAtPhase = kickoff?.baseline?.measuredAtPhase ?? -1;
    const phase19 = (kickoff.phases as any[])?.find((p) => p.phase === 19);
    kickoffWired =
      phase19?.id === "staff-ai-2" &&
      phase19?.validate === "staffai2:validate";
  }

  const wave1 = existsSync(resolve(repoRoot, STAFF_AI_2.extendsWorkerAiDepth))
    ? readJson(resolve(repoRoot, STAFF_AI_2.extendsWorkerAiDepth))
    : null;
  const softWorkerAiPath =
    typeof wave1?.kotlinWorkersPath === "string" &&
    wave1.kotlinWorkersPath.includes("WorkerAi.kt");

  const missingGates: string[] = [];
  for (const gate of STAFF_AI_2.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    behaviorCount: STAFF_AI_2.depthBehaviors.length,
    statCount: STAFF_AI_2.depthStats.length,
    reasonCount: STAFF_AI_2.decisionReasons.length,
    tsMarkersOk: missingTsMarkers.length === 0,
    kotlinMarkersOk: missingKotlinMarkers.length === 0,
    tsStatsOk,
    kotlinStatsOk,
    branchesPresent,
    decisionReasonsPresent,
    kickoffWired,
    softWorkerAiPath,
    measuredAtPhase,
    missingGates,
    missingTsMarkers,
    missingKotlinMarkers,
  };
}
