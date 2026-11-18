/**
 * Finish 4.0 Phase 5 — Workers.kt + SimView.kt split + AI hooks
 * (mirrors shared/ship/workers-simview-split.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/workers-simview-split.json";

export interface WorkersSimViewSplitCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  workersSimViewSplitMarker: string;
  workersPath: string;
  simViewPath: string;
  workersMaxLines: number;
  simViewMaxLines: number;
  extractedFileMin: number;
  requiredFiles: string[];
  requiredSymbols: Record<string, string[]>;
  facadeMustNotDefine: Record<string, string[]>;
  kickoffCatalog: string;
  gapFlagClosed: string;
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const WORKERS_SIMVIEW_SPLIT = catalogJson as unknown as WorkersSimViewSplitCatalog;
export const WORKERS_SIMVIEW_SPLIT_PHASE = WORKERS_SIMVIEW_SPLIT.phase;
export const WORKERS_SIMVIEW_SPLIT_SCHEMA = WORKERS_SIMVIEW_SPLIT.schema;
export const WORKERS_SIMVIEW_SPLIT_MARKER = WORKERS_SIMVIEW_SPLIT.workersSimViewSplitMarker;

export interface WorkersSimViewSplitMeasure {
  workersLines: number;
  simViewLines: number;
  workersSlim: boolean;
  simViewSlim: boolean;
  extractedFiles: number;
  extractedEnough: boolean;
  missingFiles: string[];
  missingSymbols: string[];
  stillDefines: string[];
  gapClosed: boolean;
  decisionHooksWired: boolean;
}

function countLines(path: string): number {
  if (!existsSync(path)) return 0;
  return readFileSync(path, "utf8").split(/\r?\n/).length;
}

function fileKey(path: string): string {
  const base = path.split("/").pop()!;
  return base;
}

export function measureWorkersSimViewSplit(repoRoot: string): WorkersSimViewSplitMeasure {
  const workersPath = resolve(repoRoot, WORKERS_SIMVIEW_SPLIT.workersPath);
  const simViewPath = resolve(repoRoot, WORKERS_SIMVIEW_SPLIT.simViewPath);
  const workersLines = countLines(workersPath);
  const simViewLines = countLines(simViewPath);
  const workersBody = existsSync(workersPath) ? readFileSync(workersPath, "utf8") : "";
  const simViewBody = existsSync(simViewPath) ? readFileSync(simViewPath, "utf8") : "";

  const missingFiles: string[] = [];
  const missingSymbols: string[] = [];
  for (const rel of WORKERS_SIMVIEW_SPLIT.requiredFiles) {
    const full = resolve(repoRoot, rel);
    if (!existsSync(full)) {
      missingFiles.push(rel);
      continue;
    }
    const body = readFileSync(full, "utf8");
    const key = fileKey(rel);
    for (const sym of WORKERS_SIMVIEW_SPLIT.requiredSymbols[key] ?? []) {
      if (!body.includes(sym)) missingSymbols.push(`${key}:${sym}`);
    }
  }

  for (const sym of WORKERS_SIMVIEW_SPLIT.requiredSymbols["Workers.kt"] ?? []) {
    if (!workersBody.includes(sym)) missingSymbols.push(`Workers.kt:${sym}`);
  }
  for (const sym of WORKERS_SIMVIEW_SPLIT.requiredSymbols["SimView.kt"] ?? []) {
    if (!simViewBody.includes(sym)) missingSymbols.push(`SimView.kt:${sym}`);
  }

  const stillDefines: string[] = [];
  for (const banned of WORKERS_SIMVIEW_SPLIT.facadeMustNotDefine["Workers.kt"] ?? []) {
    if (workersBody.includes(banned)) stillDefines.push(`Workers.kt:${banned}`);
  }
  for (const banned of WORKERS_SIMVIEW_SPLIT.facadeMustNotDefine["SimView.kt"] ?? []) {
    if (simViewBody.includes(banned)) stillDefines.push(`SimView.kt:${banned}`);
  }

  let gapClosed = false;
  const kickoffPath = resolve(repoRoot, WORKERS_SIMVIEW_SPLIT.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = JSON.parse(readFileSync(kickoffPath, "utf8"));
    gapClosed = kickoff?.gaps?.[WORKERS_SIMVIEW_SPLIT.gapFlagClosed] === false;
  }

  const systemsTs = resolve(repoRoot, "web/src/engine/systems.ts");
  const systemsBody = existsSync(systemsTs) ? readFileSync(systemsTs, "utf8") : "";
  const decisionHooksWired =
    systemsBody.includes("WorkerDecisionHooks.record") &&
    systemsBody.includes("best_score");

  return {
    workersLines,
    simViewLines,
    workersSlim: workersLines > 0 && workersLines <= WORKERS_SIMVIEW_SPLIT.workersMaxLines,
    simViewSlim: simViewLines > 0 && simViewLines <= WORKERS_SIMVIEW_SPLIT.simViewMaxLines,
    extractedFiles: WORKERS_SIMVIEW_SPLIT.requiredFiles.filter((f) =>
      existsSync(resolve(repoRoot, f)),
    ).length,
    extractedEnough:
      WORKERS_SIMVIEW_SPLIT.requiredFiles.filter((f) => existsSync(resolve(repoRoot, f)))
        .length >= WORKERS_SIMVIEW_SPLIT.extractedFileMin,
    missingFiles,
    missingSymbols,
    stillDefines,
    gapClosed,
    decisionHooksWired,
  };
}
