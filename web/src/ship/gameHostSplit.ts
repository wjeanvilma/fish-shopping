/**
 * Finish 4.0 Phase 6 — GameHost + renderer presenter split
 * (mirrors shared/ship/gamehost-split.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/gamehost-split.json";

export interface GameHostSplitCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  gameHostSplitMarker: string;
  gameHostPath: string;
  gameHostMaxLines: number;
  presentersFacadePath: string;
  harborRendererPath: string;
  harborRendererMaxLines: number;
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

export const GAMEHOST_SPLIT = catalogJson as unknown as GameHostSplitCatalog;
export const GAMEHOST_SPLIT_PHASE = GAMEHOST_SPLIT.phase;
export const GAMEHOST_SPLIT_SCHEMA = GAMEHOST_SPLIT.schema;
export const GAMEHOST_SPLIT_MARKER = GAMEHOST_SPLIT.gameHostSplitMarker;

export interface GameHostSplitMeasure {
  gameHostLines: number;
  harborRendererLines: number;
  gameHostSlim: boolean;
  harborRendererSlim: boolean;
  extractedFiles: number;
  extractedEnough: boolean;
  missingFiles: string[];
  missingSymbols: string[];
  stillDefines: string[];
  gapClosed: boolean;
}

function countLines(path: string): number {
  if (!existsSync(path)) return 0;
  return readFileSync(path, "utf8").split(/\r?\n/).length;
}

function bodyOf(repoRoot: string, rel: string): string {
  const p = resolve(repoRoot, rel);
  return existsSync(p) ? readFileSync(p, "utf8") : "";
}

export function measureGameHostSplit(repoRoot: string): GameHostSplitMeasure {
  const gameHostLines = countLines(resolve(repoRoot, GAMEHOST_SPLIT.gameHostPath));
  const harborRendererLines = countLines(resolve(repoRoot, GAMEHOST_SPLIT.harborRendererPath));
  const gameHostBody = bodyOf(repoRoot, GAMEHOST_SPLIT.gameHostPath);
  const presentersBody = bodyOf(repoRoot, GAMEHOST_SPLIT.presentersFacadePath);
  const harborBody = bodyOf(repoRoot, GAMEHOST_SPLIT.harborRendererPath);

  const missingFiles: string[] = [];
  const missingSymbols: string[] = [];
  for (const rel of GAMEHOST_SPLIT.requiredFiles) {
    if (!existsSync(resolve(repoRoot, rel))) {
      missingFiles.push(rel);
      continue;
    }
    const base = rel.split("/").pop()!;
    const body = bodyOf(repoRoot, rel);
    for (const sym of GAMEHOST_SPLIT.requiredSymbols[base] ?? []) {
      if (!body.includes(sym)) missingSymbols.push(`${base}:${sym}`);
    }
  }

  for (const sym of GAMEHOST_SPLIT.requiredSymbols["GameHost.ts"] ?? []) {
    if (!gameHostBody.includes(sym)) missingSymbols.push(`GameHost.ts:${sym}`);
  }
  for (const sym of GAMEHOST_SPLIT.requiredSymbols["presenters.ts"] ?? []) {
    if (!presentersBody.includes(sym)) missingSymbols.push(`presenters.ts:${sym}`);
  }
  for (const sym of GAMEHOST_SPLIT.requiredSymbols["HarborRendererMath.kt"] ?? []) {
    const body = bodyOf(
      repoRoot,
      "app/src/main/java/com/willio/jeanvilma/fishshopping/render/HarborRendererMath.kt",
    );
    if (!body.includes(sym)) missingSymbols.push(`HarborRendererMath.kt:${sym}`);
  }

  const stillDefines: string[] = [];
  const facadeBodies: Record<string, string> = {
    "GameHost.ts": gameHostBody,
    "presenters.ts": presentersBody,
    "HarborRenderer.kt": harborBody,
  };
  for (const [facade, bannedList] of Object.entries(GAMEHOST_SPLIT.facadeMustNotDefine)) {
    const body = facadeBodies[facade] ?? "";
    for (const banned of bannedList) {
      if (body.includes(banned)) stillDefines.push(`${facade}:${banned}`);
    }
  }

  let gapClosed = false;
  const kickoffPath = resolve(repoRoot, GAMEHOST_SPLIT.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = JSON.parse(readFileSync(kickoffPath, "utf8"));
    gapClosed = kickoff?.gaps?.[GAMEHOST_SPLIT.gapFlagClosed] === false;
  }

  const extractedFiles = GAMEHOST_SPLIT.requiredFiles.filter((rel) =>
    existsSync(resolve(repoRoot, rel)),
  ).length;

  return {
    gameHostLines,
    harborRendererLines,
    gameHostSlim: gameHostLines > 0 && gameHostLines <= GAMEHOST_SPLIT.gameHostMaxLines,
    harborRendererSlim:
      harborRendererLines > 0 && harborRendererLines <= GAMEHOST_SPLIT.harborRendererMaxLines,
    extractedFiles,
    extractedEnough: extractedFiles >= GAMEHOST_SPLIT.extractedFileMin,
    missingFiles,
    missingSymbols,
    stillDefines,
    gapClosed,
  };
}
