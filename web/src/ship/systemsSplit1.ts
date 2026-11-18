/**
 * Finish 4.0 Phase 2 — systems.ts fishing/production/inventory split
 * (mirrors shared/ship/systems-split-1.json).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import catalogJson from "../../../shared/ship/systems-split-1.json";

export interface SystemsSplit1Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  systemsSplit1Marker: string;
  systemsPackageRoot: string;
  systemsFacadePath: string;
  systemsFacadeMaxLines: number;
  extractedFileMin: number;
  requiredFiles: string[];
  requiredSymbols: Record<string, string[]>;
  facadeMustReexport: string[];
  facadeMustNotDefine: string[];
  facadeMustBindBridge: boolean;
  kickoffCatalog: string;
  gapFlagClosed: string;
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const SYSTEMS_SPLIT_1 = catalogJson as unknown as SystemsSplit1Catalog;
export const SYSTEMS_SPLIT_1_PHASE = SYSTEMS_SPLIT_1.phase;
export const SYSTEMS_SPLIT_1_SCHEMA = SYSTEMS_SPLIT_1.schema;
export const SYSTEMS_SPLIT_1_MARKER = SYSTEMS_SPLIT_1.systemsSplit1Marker;

export interface SystemsSplit1Measure {
  facadeLines: number;
  facadeSlim: boolean;
  extractedTsFiles: number;
  extractedEnough: boolean;
  missingFiles: string[];
  missingSymbols: string[];
  facadeStillDefines: string[];
  facadeMissingReexports: string[];
  bridgeBound: boolean;
  gapClosed: boolean;
}

function countLines(path: string): number {
  if (!existsSync(path)) return 0;
  return readFileSync(path, "utf8").split(/\r?\n/).length;
}

export function measureSystemsSplit1(repoRoot: string): SystemsSplit1Measure {
  const pkgRoot = resolve(repoRoot, SYSTEMS_SPLIT_1.systemsPackageRoot);
  const facadePath = resolve(repoRoot, SYSTEMS_SPLIT_1.systemsFacadePath);
  const facadeLines = countLines(facadePath);
  const facadeBody = existsSync(facadePath) ? readFileSync(facadePath, "utf8") : "";
  const tsFiles = existsSync(pkgRoot)
    ? readdirSync(pkgRoot).filter((n) => n.endsWith(".ts"))
    : [];

  const missingFiles: string[] = [];
  const missingSymbols: string[] = [];
  for (const name of SYSTEMS_SPLIT_1.requiredFiles) {
    const full = join(pkgRoot, name);
    if (!existsSync(full)) {
      missingFiles.push(name);
      continue;
    }
    const body = readFileSync(full, "utf8");
    for (const sym of SYSTEMS_SPLIT_1.requiredSymbols[name] ?? []) {
      if (!body.includes(sym)) missingSymbols.push(`${name}:${sym}`);
    }
  }

  const facadeStillDefines: string[] = [];
  for (const banned of SYSTEMS_SPLIT_1.facadeMustNotDefine) {
    if (facadeBody.includes(banned)) facadeStillDefines.push(banned);
  }

  const facadeMissingReexports: string[] = [];
  for (const name of SYSTEMS_SPLIT_1.facadeMustReexport) {
    if (!facadeBody.includes(name)) facadeMissingReexports.push(name);
  }

  const bridgeBound =
    !SYSTEMS_SPLIT_1.facadeMustBindBridge || facadeBody.includes("bindSystemsBridge");

  let gapClosed = false;
  const kickoffPath = resolve(repoRoot, SYSTEMS_SPLIT_1.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = JSON.parse(readFileSync(kickoffPath, "utf8"));
    gapClosed = kickoff?.gaps?.[SYSTEMS_SPLIT_1.gapFlagClosed] === false;
  }

  return {
    facadeLines,
    facadeSlim: facadeLines > 0 && facadeLines <= SYSTEMS_SPLIT_1.systemsFacadeMaxLines,
    extractedTsFiles: tsFiles.length,
    extractedEnough: tsFiles.length >= SYSTEMS_SPLIT_1.extractedFileMin,
    missingFiles,
    missingSymbols,
    facadeStillDefines,
    facadeMissingReexports,
    bridgeBound,
    gapClosed,
  };
}
