/**
 * Finish 4.0 Phase 3 — systems.ts customers/contracts/progression split
 * (mirrors shared/ship/systems-split-2.json).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import catalogJson from "../../../shared/ship/systems-split-2.json";

export interface SystemsSplit2Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  systemsSplit2Marker: string;
  systemsPackageRoot: string;
  systemsFacadePath: string;
  systemsFacadeMaxLines: number;
  extractedFileMin: number;
  requiredFiles: string[];
  priorSplitFiles: string[];
  requiredSymbols: Record<string, string[]>;
  facadeMustReexport: string[];
  facadeMustNotDefine: string[];
  facadeMustBindBridge: boolean;
  kickoffCatalog: string;
  priorSplitCatalog: string;
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const SYSTEMS_SPLIT_2 = catalogJson as unknown as SystemsSplit2Catalog;
export const SYSTEMS_SPLIT_2_PHASE = SYSTEMS_SPLIT_2.phase;
export const SYSTEMS_SPLIT_2_SCHEMA = SYSTEMS_SPLIT_2.schema;
export const SYSTEMS_SPLIT_2_MARKER = SYSTEMS_SPLIT_2.systemsSplit2Marker;

export interface SystemsSplit2Measure {
  facadeLines: number;
  facadeSlim: boolean;
  extractedTsFiles: number;
  extractedEnough: boolean;
  missingFiles: string[];
  missingPriorFiles: string[];
  missingSymbols: string[];
  facadeStillDefines: string[];
  facadeMissingReexports: string[];
  bridgeBound: boolean;
  circularImports: string[];
}

function countLines(path: string): number {
  if (!existsSync(path)) return 0;
  return readFileSync(path, "utf8").split(/\r?\n/).length;
}

export function measureSystemsSplit2(repoRoot: string): SystemsSplit2Measure {
  const pkgRoot = resolve(repoRoot, SYSTEMS_SPLIT_2.systemsPackageRoot);
  const facadePath = resolve(repoRoot, SYSTEMS_SPLIT_2.systemsFacadePath);
  const facadeLines = countLines(facadePath);
  const facadeBody = existsSync(facadePath) ? readFileSync(facadePath, "utf8") : "";
  const tsFiles = existsSync(pkgRoot)
    ? readdirSync(pkgRoot).filter((n) => n.endsWith(".ts"))
    : [];

  const missingFiles: string[] = [];
  const missingSymbols: string[] = [];
  for (const name of SYSTEMS_SPLIT_2.requiredFiles) {
    const full = join(pkgRoot, name);
    if (!existsSync(full)) {
      missingFiles.push(name);
      continue;
    }
    const body = readFileSync(full, "utf8");
    for (const sym of SYSTEMS_SPLIT_2.requiredSymbols[name] ?? []) {
      if (!body.includes(sym)) missingSymbols.push(`${name}:${sym}`);
    }
  }

  const missingPriorFiles: string[] = [];
  for (const name of SYSTEMS_SPLIT_2.priorSplitFiles) {
    if (!existsSync(join(pkgRoot, name))) missingPriorFiles.push(name);
  }

  const facadeStillDefines: string[] = [];
  for (const banned of SYSTEMS_SPLIT_2.facadeMustNotDefine) {
    if (facadeBody.includes(banned)) facadeStillDefines.push(banned);
  }

  const facadeMissingReexports: string[] = [];
  for (const name of SYSTEMS_SPLIT_2.facadeMustReexport) {
    if (!facadeBody.includes(name)) facadeMissingReexports.push(name);
  }

  const bridgeBound =
    !SYSTEMS_SPLIT_2.facadeMustBindBridge || facadeBody.includes("bindSystemsBridge");

  const circularImports: string[] = [];
  for (const name of SYSTEMS_SPLIT_2.requiredFiles) {
    const full = join(pkgRoot, name);
    if (!existsSync(full)) continue;
    const body = readFileSync(full, "utf8");
    if (body.includes('from "../systems"') || body.includes("from '../systems'")) {
      circularImports.push(name);
    }
  }

  return {
    facadeLines,
    facadeSlim: facadeLines > 0 && facadeLines <= SYSTEMS_SPLIT_2.systemsFacadeMaxLines,
    extractedTsFiles: tsFiles.length,
    extractedEnough: tsFiles.length >= SYSTEMS_SPLIT_2.extractedFileMin,
    missingFiles,
    missingPriorFiles,
    missingSymbols,
    facadeStillDefines,
    facadeMissingReexports,
    bridgeBound,
    circularImports,
  };
}
