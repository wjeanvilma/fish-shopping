/**
 * Finish 3.0 Phase 11 — worker AI depth
 * (mirrors shared/ship/worker-ai-depth.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/worker-ai-depth.json";

export interface WorkerAiDepthBehavior {
  branchId: string;
  role: string;
  markers: string[];
}

export interface WorkerAiDepthCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  workerAiDepthMarker: string;
  staffUnlockCatalog: string;
  staffTreesCatalog: string;
  depthStats: string[];
  depthBehaviors: WorkerAiDepthBehavior[];
  webWorkersPath: string;
  kotlinWorkersPath: string;
  webStatsPath: string;
  kotlinStatsPath: string;
  kickoffCatalog: string;
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const WORKER_AI_DEPTH = catalogJson as unknown as WorkerAiDepthCatalog;
export const WORKER_AI_DEPTH_PHASE = WORKER_AI_DEPTH.phase;
export const WORKER_AI_DEPTH_SCHEMA = WORKER_AI_DEPTH.schema;
export const WORKER_AI_DEPTH_MARKER = WORKER_AI_DEPTH.workerAiDepthMarker;

export interface WorkerAiDepthMeasure {
  behaviorCount: number;
  statCount: number;
  tsMarkersOk: boolean;
  kotlinMarkersOk: boolean;
  tsStatsOk: boolean;
  kotlinStatsOk: boolean;
  branchesPresent: boolean;
  kickoffWired: boolean;
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

export function measureWorkerAiDepth(repoRoot: string): WorkerAiDepthMeasure {
  const tsWorkers = existsSync(resolve(repoRoot, WORKER_AI_DEPTH.webWorkersPath))
    ? readFileSync(resolve(repoRoot, WORKER_AI_DEPTH.webWorkersPath), "utf8")
    : "";
  const ktWorkers = existsSync(resolve(repoRoot, WORKER_AI_DEPTH.kotlinWorkersPath))
    ? readFileSync(resolve(repoRoot, WORKER_AI_DEPTH.kotlinWorkersPath), "utf8")
    : "";
  const tsStats = existsSync(resolve(repoRoot, WORKER_AI_DEPTH.webStatsPath))
    ? readFileSync(resolve(repoRoot, WORKER_AI_DEPTH.webStatsPath), "utf8")
    : "";
  const ktStats = existsSync(resolve(repoRoot, WORKER_AI_DEPTH.kotlinStatsPath))
    ? readFileSync(resolve(repoRoot, WORKER_AI_DEPTH.kotlinStatsPath), "utf8")
    : "";

  const missingTsMarkers: string[] = [];
  const missingKotlinMarkers: string[] = [];
  for (const b of WORKER_AI_DEPTH.depthBehaviors) {
    missingTsMarkers.push(...missingMarkers(tsWorkers, b.markers).map((m) => `${b.branchId}:${m}`));
    missingKotlinMarkers.push(
      ...missingMarkers(ktWorkers, b.markers).map((m) => `${b.branchId}:${m}`),
    );
  }

  const tsStatsOk = WORKER_AI_DEPTH.depthStats.every((s) => tsStats.includes(s));
  const kotlinStatsOk = WORKER_AI_DEPTH.depthStats.every((s) => ktStats.includes(s));

  let branchesPresent = false;
  const treesPath = resolve(repoRoot, WORKER_AI_DEPTH.staffTreesCatalog);
  if (existsSync(treesPath)) {
    const trees = readJson(treesPath);
    const ids = new Set(
      (trees.branches ?? []).map((b: any) => (typeof b === "string" ? b : b.id)),
    );
    branchesPresent = WORKER_AI_DEPTH.depthBehaviors.every((b) => ids.has(b.branchId));
  }

  let kickoffWired = false;
  let measuredAtPhase = -1;
  const kickoffPath = resolve(repoRoot, WORKER_AI_DEPTH.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    measuredAtPhase = kickoff?.baseline?.measuredAtPhase ?? -1;
    const phase11 = (kickoff.phases as any[])?.find((p) => p.phase === 11);
    kickoffWired =
      phase11?.id === "worker-ai-depth" &&
      phase11?.validate === "workerai:validate" &&
      measuredAtPhase >= 11;
  }

  const missingGates: string[] = [];
  for (const gate of WORKER_AI_DEPTH.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    behaviorCount: WORKER_AI_DEPTH.depthBehaviors.length,
    statCount: WORKER_AI_DEPTH.depthStats.length,
    tsMarkersOk: missingTsMarkers.length === 0,
    kotlinMarkersOk: missingKotlinMarkers.length === 0,
    tsStatsOk,
    kotlinStatsOk,
    branchesPresent,
    kickoffWired,
    measuredAtPhase,
    missingGates,
    missingTsMarkers,
    missingKotlinMarkers,
  };
}
