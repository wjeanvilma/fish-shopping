/**
 * Finish 3.0 Phase 3 — web HUD panel decomposition
 * (mirrors shared/ship/web-hud-split.json).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import catalogJson from "../../../shared/ship/web-hud-split.json";

export interface WebHudSplitCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  webHudSplitMarker: string;
  uiPackageRoot: string;
  appPath: string;
  appMaxLines: number;
  extractedFileMin: number;
  requiredFiles: string[];
  requiredSymbols: Record<string, string[]>;
  kickoffCatalog: string;
  gapFlagClosed: string;
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const WEB_HUD_SPLIT = catalogJson as unknown as WebHudSplitCatalog;
export const WEB_HUD_SPLIT_PHASE = WEB_HUD_SPLIT.phase;
export const WEB_HUD_SPLIT_SCHEMA = WEB_HUD_SPLIT.schema;
export const WEB_HUD_SPLIT_MARKER = WEB_HUD_SPLIT.webHudSplitMarker;

export interface WebHudSplitMeasure {
  appLines: number;
  appSlim: boolean;
  extractedUiFiles: number;
  extractedEnough: boolean;
  missingFiles: string[];
  missingSymbols: string[];
  gapClosed: boolean;
}

function countLines(path: string): number {
  if (!existsSync(path)) return 0;
  return readFileSync(path, "utf8").split(/\r?\n/).length;
}

const PREEXISTING = new Set(["App.tsx", "Joystick.tsx", "portraitLayout.ts"]);

export function measureWebHudSplit(repoRoot: string): WebHudSplitMeasure {
  const uiRoot = resolve(repoRoot, WEB_HUD_SPLIT.uiPackageRoot);
  const appPath = resolve(repoRoot, WEB_HUD_SPLIT.appPath);
  const appLines = countLines(appPath);
  const uiFiles = existsSync(uiRoot)
    ? readdirSync(uiRoot).filter((n) => n.endsWith(".ts") || n.endsWith(".tsx"))
    : [];
  const missingFiles: string[] = [];
  const missingSymbols: string[] = [];
  for (const name of WEB_HUD_SPLIT.requiredFiles) {
    const full = join(uiRoot, name);
    if (!existsSync(full)) {
      missingFiles.push(name);
      continue;
    }
    const body = readFileSync(full, "utf8");
    for (const sym of WEB_HUD_SPLIT.requiredSymbols[name] ?? []) {
      if (!body.includes(sym)) missingSymbols.push(`${name}:${sym}`);
    }
  }
  const extractedUiFiles = uiFiles.filter((n) => !PREEXISTING.has(n)).length;

  let gapClosed = false;
  const kickoffPath = resolve(repoRoot, WEB_HUD_SPLIT.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = JSON.parse(readFileSync(kickoffPath, "utf8"));
    gapClosed = kickoff?.gaps?.[WEB_HUD_SPLIT.gapFlagClosed] === false;
  }

  return {
    appLines,
    appSlim: appLines > 0 && appLines <= WEB_HUD_SPLIT.appMaxLines,
    extractedUiFiles,
    extractedEnough: extractedUiFiles >= WEB_HUD_SPLIT.extractedFileMin,
    missingFiles,
    missingSymbols,
    gapClosed,
  };
}
