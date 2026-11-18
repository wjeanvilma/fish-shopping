/**
 * Finish 4.0 Phase 4 — Android GameViewModel intent/handler decomposition
 * (mirrors shared/ship/viewmodel-split.json).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import catalogJson from "../../../shared/ship/viewmodel-split.json";

export interface ViewModelSplitCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  viewModelSplitMarker: string;
  viewModelPackageRoot: string;
  viewModelPath: string;
  viewModelMaxLines: number;
  extractedFileMin: number;
  requiredFiles: string[];
  requiredSymbols: Record<string, string[]>;
  viewModelMustNotDefine: string[];
  kickoffCatalog: string;
  gapFlagClosed: string;
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const VIEWMODEL_SPLIT = catalogJson as unknown as ViewModelSplitCatalog;
export const VIEWMODEL_SPLIT_PHASE = VIEWMODEL_SPLIT.phase;
export const VIEWMODEL_SPLIT_SCHEMA = VIEWMODEL_SPLIT.schema;
export const VIEWMODEL_SPLIT_MARKER = VIEWMODEL_SPLIT.viewModelSplitMarker;

export interface ViewModelSplitMeasure {
  viewModelLines: number;
  viewModelSlim: boolean;
  extractedFiles: number;
  extractedEnough: boolean;
  missingFiles: string[];
  missingSymbols: string[];
  viewModelStillDefines: string[];
  gapClosed: boolean;
}

function countLines(path: string): number {
  if (!existsSync(path)) return 0;
  return readFileSync(path, "utf8").split(/\r?\n/).length;
}

function countExtracted(repoRoot: string): number {
  const root = resolve(repoRoot, VIEWMODEL_SPLIT.viewModelPackageRoot);
  let n = 0;
  if (existsSync(join(root, "GameUiState.kt"))) n++;
  const vmDir = join(root, "vm");
  if (existsSync(vmDir)) {
    n += readdirSync(vmDir).filter((f) => f.endsWith(".kt")).length;
  }
  return n;
}

export function measureViewModelSplit(repoRoot: string): ViewModelSplitMeasure {
  const vmPath = resolve(repoRoot, VIEWMODEL_SPLIT.viewModelPath);
  const viewModelLines = countLines(vmPath);
  const viewModelBody = existsSync(vmPath) ? readFileSync(vmPath, "utf8") : "";
  const pkgRoot = resolve(repoRoot, VIEWMODEL_SPLIT.viewModelPackageRoot);

  const missingFiles: string[] = [];
  const missingSymbols: string[] = [];
  for (const name of VIEWMODEL_SPLIT.requiredFiles) {
    const checkPath = join(pkgRoot, name);
    if (!existsSync(checkPath)) {
      missingFiles.push(name);
      continue;
    }
    const body = readFileSync(checkPath, "utf8");
    for (const sym of VIEWMODEL_SPLIT.requiredSymbols[name] ?? []) {
      if (!body.includes(sym)) missingSymbols.push(`${name}:${sym}`);
    }
  }

  // GameViewModel.kt symbols live at viewModelPath
  for (const sym of VIEWMODEL_SPLIT.requiredSymbols["GameViewModel.kt"] ?? []) {
    if (!viewModelBody.includes(sym)) missingSymbols.push(`GameViewModel.kt:${sym}`);
  }

  const viewModelStillDefines: string[] = [];
  for (const banned of VIEWMODEL_SPLIT.viewModelMustNotDefine) {
    if (viewModelBody.includes(banned)) viewModelStillDefines.push(banned);
  }

  let gapClosed = false;
  const kickoffPath = resolve(repoRoot, VIEWMODEL_SPLIT.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = JSON.parse(readFileSync(kickoffPath, "utf8"));
    gapClosed = kickoff?.gaps?.[VIEWMODEL_SPLIT.gapFlagClosed] === false;
  }

  const extractedFiles = countExtracted(repoRoot);
  return {
    viewModelLines,
    viewModelSlim: viewModelLines > 0 && viewModelLines <= VIEWMODEL_SPLIT.viewModelMaxLines,
    extractedFiles,
    extractedEnough: extractedFiles >= VIEWMODEL_SPLIT.extractedFileMin,
    missingFiles,
    missingSymbols,
    viewModelStillDefines,
    gapClosed,
  };
}
