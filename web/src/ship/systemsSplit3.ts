/**
 * Finish 6.0 Phase 4 — systems.ts rivals/economy/staffTrees/workers split
 * (mirrors shared/ship/systems-split-3.json).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import catalogJson from "../../../shared/ship/systems-split-3.json";

export interface SystemsSplit3Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  systemsSplit3Marker: string;
  closesGap: string;
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
  bridgeRequiredModules: string[];
  kickoffCatalog: string;
  priorSplitCatalog: string;
  parityFixture: string;
  validateScript: string;
  smokeScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const SYSTEMS_SPLIT_3 = catalogJson as unknown as SystemsSplit3Catalog;
export const SYSTEMS_SPLIT_3_PHASE = SYSTEMS_SPLIT_3.phase;
export const SYSTEMS_SPLIT_3_SCHEMA = SYSTEMS_SPLIT_3.schema;
export const SYSTEMS_SPLIT_3_MARKER = SYSTEMS_SPLIT_3.systemsSplit3Marker;

export interface SystemsSplit3Measure {
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
  missingBridgeModules: string[];
  circularImports: string[];
  gapClosed: boolean;
  kickoffWired: boolean;
  missingGates: string[];
}

function countLines(path: string): number {
  if (!existsSync(path)) return 0;
  return readFileSync(path, "utf8").split(/\r?\n/).length;
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureSystemsSplit3(repoRoot: string): SystemsSplit3Measure {
  const pkgRoot = resolve(repoRoot, SYSTEMS_SPLIT_3.systemsPackageRoot);
  const facadePath = resolve(repoRoot, SYSTEMS_SPLIT_3.systemsFacadePath);
  const facadeLines = countLines(facadePath);
  const facadeBody = existsSync(facadePath) ? readFileSync(facadePath, "utf8") : "";
  const tsFiles = existsSync(pkgRoot)
    ? readdirSync(pkgRoot).filter((n) => n.endsWith(".ts"))
    : [];

  const missingFiles: string[] = [];
  const missingSymbols: string[] = [];
  for (const name of SYSTEMS_SPLIT_3.requiredFiles) {
    const full = join(pkgRoot, name);
    if (!existsSync(full)) {
      missingFiles.push(name);
      continue;
    }
    const body = readFileSync(full, "utf8");
    for (const sym of SYSTEMS_SPLIT_3.requiredSymbols[name] ?? []) {
      if (!body.includes(sym)) missingSymbols.push(`${name}:${sym}`);
    }
  }

  const missingPriorFiles: string[] = [];
  for (const name of SYSTEMS_SPLIT_3.priorSplitFiles) {
    if (!existsSync(join(pkgRoot, name))) missingPriorFiles.push(name);
  }

  const facadeStillDefines: string[] = [];
  for (const banned of SYSTEMS_SPLIT_3.facadeMustNotDefine) {
    if (facadeBody.includes(banned)) facadeStillDefines.push(banned);
  }

  const facadeMissingReexports: string[] = [];
  for (const name of SYSTEMS_SPLIT_3.facadeMustReexport) {
    if (!facadeBody.includes(name)) facadeMissingReexports.push(name);
  }

  const bridgeBound =
    !SYSTEMS_SPLIT_3.facadeMustBindBridge || facadeBody.includes("bindSystemsBridge");

  const missingBridgeModules: string[] = [];
  for (const name of SYSTEMS_SPLIT_3.bridgeRequiredModules) {
    const full = join(pkgRoot, name);
    if (!existsSync(full)) {
      missingBridgeModules.push(name);
      continue;
    }
    const body = readFileSync(full, "utf8");
    if (!body.includes("systemsBridge")) missingBridgeModules.push(name);
  }

  const circularImports: string[] = [];
  for (const name of SYSTEMS_SPLIT_3.requiredFiles) {
    const full = join(pkgRoot, name);
    if (!existsSync(full)) continue;
    const body = readFileSync(full, "utf8");
    if (body.includes('from "../systems"') || body.includes("from '../systems'")) {
      circularImports.push(name);
    }
  }

  let gapClosed = false;
  let kickoffWired = false;
  const kickoffPath = resolve(repoRoot, SYSTEMS_SPLIT_3.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    gapClosed = kickoff?.gaps?.[SYSTEMS_SPLIT_3.closesGap] === false;
    const phase4 = (kickoff.phases as any[])?.find((p: any) => p.phase === 4);
    kickoffWired =
      phase4?.id === "systems-split-3" && phase4?.validate === "systemssplit3:validate";
  }

  const missingGates: string[] = [];
  for (const gate of SYSTEMS_SPLIT_3.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    facadeLines,
    facadeSlim: facadeLines > 0 && facadeLines <= SYSTEMS_SPLIT_3.systemsFacadeMaxLines,
    extractedTsFiles: tsFiles.length,
    extractedEnough: tsFiles.length >= SYSTEMS_SPLIT_3.extractedFileMin,
    missingFiles,
    missingPriorFiles,
    missingSymbols,
    facadeStillDefines,
    facadeMissingReexports,
    bridgeBound,
    missingBridgeModules,
    circularImports,
    gapClosed,
    kickoffWired,
    missingGates,
  };
}
