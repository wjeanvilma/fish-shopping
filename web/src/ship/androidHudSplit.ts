/**
 * Finish 3.0 Phase 2 — Android HUD panel decomposition
 * (mirrors shared/ship/android-hud-split.json).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import catalogJson from "../../../shared/ship/android-hud-split.json";

export interface AndroidHudSplitCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  androidHudSplitMarker: string;
  hudPackageRoot: string;
  gameScreenPath: string;
  gameScreenMaxLines: number;
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

export const ANDROID_HUD_SPLIT = catalogJson as unknown as AndroidHudSplitCatalog;
export const ANDROID_HUD_SPLIT_PHASE = ANDROID_HUD_SPLIT.phase;
export const ANDROID_HUD_SPLIT_SCHEMA = ANDROID_HUD_SPLIT.schema;
export const ANDROID_HUD_SPLIT_MARKER = ANDROID_HUD_SPLIT.androidHudSplitMarker;

export interface AndroidHudSplitMeasure {
  gameScreenLines: number;
  gameScreenSlim: boolean;
  extractedKtFiles: number;
  extractedEnough: boolean;
  missingFiles: string[];
  missingSymbols: string[];
  gapClosed: boolean;
}

function countLines(path: string): number {
  if (!existsSync(path)) return 0;
  return readFileSync(path, "utf8").split(/\r?\n/).length;
}

export function measureAndroidHudSplit(repoRoot: string): AndroidHudSplitMeasure {
  const hudRoot = resolve(repoRoot, ANDROID_HUD_SPLIT.hudPackageRoot);
  const gameScreenPath = resolve(repoRoot, ANDROID_HUD_SPLIT.gameScreenPath);
  const gameScreenLines = countLines(gameScreenPath);
  const ktFiles = existsSync(hudRoot)
    ? readdirSync(hudRoot).filter((n) => n.endsWith(".kt"))
    : [];
  const missingFiles: string[] = [];
  const missingSymbols: string[] = [];
  for (const name of ANDROID_HUD_SPLIT.requiredFiles) {
    const full = join(hudRoot, name);
    if (!existsSync(full)) {
      missingFiles.push(name);
      continue;
    }
    const body = readFileSync(full, "utf8");
    for (const sym of ANDROID_HUD_SPLIT.requiredSymbols[name] ?? []) {
      if (!body.includes(sym)) missingSymbols.push(`${name}:${sym}`);
    }
  }
  // Extracted modules exclude GameScreen + pre-existing Joystick/TapToMove.
  const extractedKtFiles = ktFiles.filter(
    (n) => n !== "GameScreen.kt" && n !== "Joystick.kt" && n !== "TapToMove.kt",
  ).length;

  let gapClosed = false;
  const kickoffPath = resolve(repoRoot, ANDROID_HUD_SPLIT.kickoffCatalog);
  if (existsSync(kickoffPath)) {
    const kickoff = JSON.parse(readFileSync(kickoffPath, "utf8"));
    gapClosed = kickoff?.gaps?.[ANDROID_HUD_SPLIT.gapFlagClosed] === false;
  }

  return {
    gameScreenLines,
    gameScreenSlim: gameScreenLines > 0 && gameScreenLines <= ANDROID_HUD_SPLIT.gameScreenMaxLines,
    extractedKtFiles,
    extractedEnough: extractedKtFiles >= ANDROID_HUD_SPLIT.extractedFileMin,
    missingFiles,
    missingSymbols,
    gapClosed,
  };
}
