/**
 * Finish 3.0 Phase 4 — shared shell controller ship catalog
 * (mirrors shared/ship/shell-controller.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/shell-controller.json";
import { SHELL_PANEL_IDS, ShellHudPolicy } from "../shell/shellPanels";

export interface ShellControllerCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  shellControllerMarker: string;
  panelCount: number;
  panelWires: string[];
  hudPublishIntervalMs: number;
  androidHostPath: string;
  webHostPath: string;
  androidHostMaxLines: number;
  webHostMaxLines: number;
  requiredFiles: string[];
  requiredSymbols: Record<string, string[]>;
  kickoffCatalog: string;
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const SHELL_CONTROLLER = catalogJson as unknown as ShellControllerCatalog;
export const SHELL_CONTROLLER_PHASE = SHELL_CONTROLLER.phase;
export const SHELL_CONTROLLER_SCHEMA = SHELL_CONTROLLER.schema;
export const SHELL_CONTROLLER_MARKER = SHELL_CONTROLLER.shellControllerMarker;

export interface ShellControllerMeasure {
  androidHostLines: number;
  webHostLines: number;
  androidHostSlim: boolean;
  webHostSlim: boolean;
  panelWiresMatch: boolean;
  hudIntervalMatch: boolean;
  missingFiles: string[];
  missingSymbols: string[];
}

function countLines(path: string): number {
  if (!existsSync(path)) return 0;
  return readFileSync(path, "utf8").split(/\r?\n/).length;
}

export function measureShellController(repoRoot: string): ShellControllerMeasure {
  const androidPath = resolve(repoRoot, SHELL_CONTROLLER.androidHostPath);
  const webPath = resolve(repoRoot, SHELL_CONTROLLER.webHostPath);
  const androidHostLines = countLines(androidPath);
  const webHostLines = countLines(webPath);
  const missingFiles: string[] = [];
  const missingSymbols: string[] = [];

  for (const rel of SHELL_CONTROLLER.requiredFiles) {
    const full = resolve(repoRoot, rel);
    if (!existsSync(full)) {
      missingFiles.push(rel);
      continue;
    }
    const body = readFileSync(full, "utf8");
    const base = rel.split("/").pop() ?? rel;
    for (const sym of SHELL_CONTROLLER.requiredSymbols[base] ?? []) {
      if (!body.includes(sym)) missingSymbols.push(`${base}:${sym}`);
    }
  }
  // Hosts are also requiredSymbols keys
  for (const host of ["GameViewModel.kt", "GameHost.ts"] as const) {
    const rel =
      host === "GameViewModel.kt"
        ? SHELL_CONTROLLER.androidHostPath
        : SHELL_CONTROLLER.webHostPath;
    const body = readFileSync(resolve(repoRoot, rel), "utf8");
    for (const sym of SHELL_CONTROLLER.requiredSymbols[host] ?? []) {
      if (!body.includes(sym)) missingSymbols.push(`${host}:${sym}`);
    }
  }

  const panelWiresMatch =
    SHELL_CONTROLLER.panelWires.length === SHELL_PANEL_IDS.length &&
    SHELL_CONTROLLER.panelWires.every((w, i) => w === SHELL_PANEL_IDS[i]);

  return {
    androidHostLines,
    webHostLines,
    androidHostSlim: androidHostLines > 0 && androidHostLines <= SHELL_CONTROLLER.androidHostMaxLines,
    webHostSlim: webHostLines > 0 && webHostLines <= SHELL_CONTROLLER.webHostMaxLines,
    panelWiresMatch,
    hudIntervalMatch: ShellHudPolicy.PUBLISH_INTERVAL_MS === SHELL_CONTROLLER.hudPublishIntervalMs,
    missingFiles,
    missingSymbols,
  };
}
