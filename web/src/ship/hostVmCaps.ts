/**
 * Finish 6.0 Phase 5 — GameViewModel ≤1200 + GameHost ≤1100
 * (mirrors shared/ship/host-vm-caps.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/host-vm-caps.json";

export interface HostVmCapsCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  hostVmCapsMarker: string;
  closesGap: string;
  viewModelPath: string;
  viewModelMaxLines: number;
  gameHostPath: string;
  gameHostMaxLines: number;
  extractedFileMin: number;
  requiredFiles: string[];
  priorSplitFiles: string[];
  requiredSymbols: Record<string, string[]>;
  facadeMustNotDefine: Record<string, string[]>;
  kickoffCatalog: string;
  priorViewModelSplit: string;
  priorGameHostSplit: string;
  parityFixture: string;
  validateScript: string;
  smokeScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const HOST_VM_CAPS = catalogJson as unknown as HostVmCapsCatalog;
export const HOST_VM_CAPS_PHASE = HOST_VM_CAPS.phase;
export const HOST_VM_CAPS_SCHEMA = HOST_VM_CAPS.schema;
export const HOST_VM_CAPS_MARKER = HOST_VM_CAPS.hostVmCapsMarker;

export interface HostVmCapsMeasure {
  viewModelLines: number;
  viewModelSlim: boolean;
  gameHostLines: number;
  gameHostSlim: boolean;
  extractedPresent: number;
  extractedEnough: boolean;
  missingFiles: string[];
  missingPriorFiles: string[];
  missingSymbols: string[];
  facadeStillDefines: string[];
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

function basenameKey(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] ?? path;
}

export function measureHostVmCaps(repoRoot: string): HostVmCapsMeasure {
  const vmPath = resolve(repoRoot, HOST_VM_CAPS.viewModelPath);
  const hostPath = resolve(repoRoot, HOST_VM_CAPS.gameHostPath);
  const viewModelLines = countLines(vmPath);
  const gameHostLines = countLines(hostPath);
  const vmBody = existsSync(vmPath) ? readFileSync(vmPath, "utf8") : "";
  const hostBody = existsSync(hostPath) ? readFileSync(hostPath, "utf8") : "";

  const missingFiles: string[] = [];
  const missingSymbols: string[] = [];
  let extractedPresent = 0;
  for (const rel of HOST_VM_CAPS.requiredFiles) {
    const full = resolve(repoRoot, rel);
    if (!existsSync(full)) {
      missingFiles.push(rel);
      continue;
    }
    extractedPresent += 1;
    const body = readFileSync(full, "utf8");
    const key = basenameKey(rel);
    for (const sym of HOST_VM_CAPS.requiredSymbols[key] ?? []) {
      if (!body.includes(sym)) missingSymbols.push(`${key}:${sym}`);
    }
  }

  for (const [facadeKey, symbols] of Object.entries(HOST_VM_CAPS.requiredSymbols)) {
    if (facadeKey === "GameViewModel.kt") {
      for (const sym of symbols) {
        if (!vmBody.includes(sym)) missingSymbols.push(`GameViewModel.kt:${sym}`);
      }
    }
    if (facadeKey === "GameHost.ts") {
      for (const sym of symbols) {
        if (!hostBody.includes(sym)) missingSymbols.push(`GameHost.ts:${sym}`);
      }
    }
  }

  const missingPriorFiles: string[] = [];
  for (const rel of HOST_VM_CAPS.priorSplitFiles) {
    if (!existsSync(resolve(repoRoot, rel))) missingPriorFiles.push(rel);
  }

  const facadeStillDefines: string[] = [];
  for (const banned of HOST_VM_CAPS.facadeMustNotDefine["GameViewModel.kt"] ?? []) {
    if (vmBody.includes(banned)) facadeStillDefines.push(`GameViewModel.kt:${banned}`);
  }
  for (const banned of HOST_VM_CAPS.facadeMustNotDefine["GameHost.ts"] ?? []) {
    if (hostBody.includes(banned)) facadeStillDefines.push(`GameHost.ts:restoreOrCreate-body`);
  }

  let gapClosed = false;
  let kickoffWired = false;
  const kickoffPath = resolve(repoRoot, HOST_VM_CAPS.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    gapClosed = kickoff?.gaps?.[HOST_VM_CAPS.closesGap] === false;
    const phase5 = (kickoff.phases as any[])?.find((p: any) => p.phase === 5);
    kickoffWired =
      phase5?.id === "host-vm-caps" && phase5?.validate === "hostvmcaps:validate";
  }

  const missingGates: string[] = [];
  for (const gate of HOST_VM_CAPS.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    viewModelLines,
    viewModelSlim: viewModelLines > 0 && viewModelLines <= HOST_VM_CAPS.viewModelMaxLines,
    gameHostLines,
    gameHostSlim: gameHostLines > 0 && gameHostLines <= HOST_VM_CAPS.gameHostMaxLines,
    extractedPresent,
    extractedEnough: extractedPresent >= HOST_VM_CAPS.extractedFileMin,
    missingFiles,
    missingPriorFiles,
    missingSymbols,
    facadeStillDefines,
    gapClosed,
    kickoffWired,
    missingGates,
  };
}
