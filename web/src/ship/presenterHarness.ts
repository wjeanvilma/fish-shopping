/**
 * Finish 6.0 Phase 21 — Presenter/render CPU snapshot harness
 * (mirrors shared/ship/presenter-harness.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/presenter-harness.json";
import { PRESENTER_CPU_STAGES } from "../render/presenterCpuSnapshot";

export interface PresenterHarnessCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  presenterHarnessMarker: string;
  stageMin: number;
  snapshotFieldMin: number;
  stages: string[];
  snapshotFields: string[];
  requiredFiles: string[];
  requiredSymbols: Record<string, string[]>;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  softFrameTimingValidate: string;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const PRESENTER_HARNESS = catalogJson as unknown as PresenterHarnessCatalog;
export const PRESENTER_HARNESS_PHASE = PRESENTER_HARNESS.phase;
export const PRESENTER_HARNESS_SCHEMA = PRESENTER_HARNESS.schema;
export const PRESENTER_HARNESS_MARKER = PRESENTER_HARNESS.presenterHarnessMarker;

export interface PresenterHarnessMeasure {
  stageCount: number;
  snapshotFieldCount: number;
  requiredFilesPresent: boolean;
  symbolsPresent: boolean;
  missingSymbols: string[];
  nestStagePresent: boolean;
  kickoffClosed: boolean;
  kickoffWired: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function resolveSymbolFile(repoRoot: string, file: string): string | null {
  const candidates = [
    resolve(repoRoot, `web/src/render/${file}`),
    resolve(repoRoot, `app/src/main/java/com/willio/jeanvilma/fishshopping/render/${file}`),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

export function measurePresenterHarness(repoRoot: string): PresenterHarnessMeasure {
  const missingGates: string[] = [];
  for (const gate of PRESENTER_HARNESS.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  const requiredFilesPresent = PRESENTER_HARNESS.requiredFiles.every((f) =>
    existsSync(resolve(repoRoot, f)),
  );

  const missingSymbols: string[] = [];
  for (const [file, symbols] of Object.entries(PRESENTER_HARNESS.requiredSymbols)) {
    const path = resolveSymbolFile(repoRoot, file);
    const text = path ? readFileSync(path, "utf8") : "";
    for (const sym of symbols) {
      if (!text.includes(sym)) missingSymbols.push(`${file}:${sym}`);
    }
  }

  const kickoff = readJson(resolve(repoRoot, PRESENTER_HARNESS.kickoffCatalog));
  const phase21 = (kickoff.phases as any[])?.find((p) => p.phase === 21);

  return {
    stageCount: Math.max(PRESENTER_HARNESS.stages.length, PRESENTER_CPU_STAGES.length),
    snapshotFieldCount: PRESENTER_HARNESS.snapshotFields.length,
    requiredFilesPresent,
    symbolsPresent: missingSymbols.length === 0,
    missingSymbols,
    nestStagePresent:
      PRESENTER_HARNESS.stages.includes("nestHud") && PRESENTER_CPU_STAGES.includes("nestHud"),
    kickoffClosed: kickoff.gaps?.presenterHarnessMissing === false,
    kickoffWired:
      phase21?.id === "presenter-harness" && phase21?.validate === "presenterharness:validate",
    missingGates,
  };
}
