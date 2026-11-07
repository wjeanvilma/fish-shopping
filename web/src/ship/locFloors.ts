/**
 * Finish 2.0 Phase 6 → Phase 30 — product LOC floors scoreboard
 * (mirrors shared/ship/loc-floors.json).
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import locJson from "../../../shared/ship/loc-floors.json";

export interface LocScopeDef {
  id: string;
  root: string;
  extensions: string[];
  phase30Floor: number;
  planTarget?: number;
}

export interface LocFloorsCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  metric: { unit: string; excludeGlobs: string[] };
  scopes: {
    gameCore: LocScopeDef;
    app: LocScopeDef;
    webSrc: LocScopeDef;
  };
  productTotalFloor: number;
  productTotalPlanTarget?: number;
  enforceFloors: boolean;
  enforceAtPhase: number;
  enforceMode?: string;
  baseline: {
    measuredAtPhase: number;
    gameCore: number;
    app: number;
    webSrc: number;
    productTotal: number;
  };
  checklist: string[];
  preflightGates: string[];
}

export interface LocScopeMeasure {
  id: string;
  root: string;
  files: number;
  lines: number;
  floor: number;
  remaining: number;
  met: boolean;
}

export interface LocScoreboard {
  gameCore: LocScopeMeasure;
  app: LocScopeMeasure;
  webSrc: LocScopeMeasure;
  productTotal: number;
  productTotalFloor: number;
  productRemaining: number;
  productMet: boolean;
  enforceFloors: boolean;
}

export const LOC_FLOORS = locJson as unknown as LocFloorsCatalog;
export const LOC_FLOORS_PHASE = LOC_FLOORS.phase;
export const LOC_FLOORS_SCHEMA = LOC_FLOORS.schema;
export const LOC_PRODUCT_TOTAL_FLOOR = LOC_FLOORS.productTotalFloor;
export const LOC_PRODUCT_TOTAL_PLAN_TARGET = LOC_FLOORS.productTotalPlanTarget ?? 80000;
export const LOC_ENFORCE_MODE = LOC_FLOORS.enforceMode ?? "print_only";

const EXCLUDE_DIR_NAMES = new Set([
  "node_modules",
  "build",
  "dist",
  "dist-legal",
  ".gradle",
  "generated",
]);

function shouldSkipDir(name: string): boolean {
  return EXCLUDE_DIR_NAMES.has(name) || name.startsWith(".");
}

function walkFiles(dir: string, extensions: Set<string>, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (shouldSkipDir(name)) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walkFiles(full, extensions, out);
    } else if (st.isFile()) {
      const ext = name.includes(".") ? `.${name.split(".").pop()}` : "";
      if (extensions.has(ext)) out.push(full);
    }
  }
}

function countPhysicalLines(filePath: string): number {
  const text = readFileSync(filePath, "utf8");
  if (text.length === 0) return 0;
  const parts = text.split(/\r?\n/);
  if (parts.length > 0 && parts[parts.length - 1] === "") {
    return parts.length - 1;
  }
  return parts.length;
}

function measureScope(
  repoRoot: string,
  def: LocScopeDef,
): LocScopeMeasure {
  const abs = resolve(repoRoot, def.root);
  const files: string[] = [];
  walkFiles(abs, new Set(def.extensions), files);
  let lines = 0;
  for (const f of files) lines += countPhysicalLines(f);
  const remaining = Math.max(0, def.phase30Floor - lines);
  return {
    id: def.id,
    root: def.root.replace(/\//g, sep),
    files: files.length,
    lines,
    floor: def.phase30Floor,
    remaining,
    met: lines >= def.phase30Floor,
  };
}

/** Measure product LOC for the three Phase 30 scopes. */
export function measureLocScoreboard(repoRoot: string): LocScoreboard {
  const gameCore = measureScope(repoRoot, LOC_FLOORS.scopes.gameCore);
  const app = measureScope(repoRoot, LOC_FLOORS.scopes.app);
  const webSrc = measureScope(repoRoot, LOC_FLOORS.scopes.webSrc);
  const productTotal = gameCore.lines + app.lines + webSrc.lines;
  const productTotalFloor = LOC_FLOORS.productTotalFloor;
  return {
    gameCore,
    app,
    webSrc,
    productTotal,
    productTotalFloor,
    productRemaining: Math.max(0, productTotalFloor - productTotal),
    productMet: productTotal >= productTotalFloor,
    enforceFloors: LOC_FLOORS.enforceFloors,
  };
}

export function formatLocScoreboard(board: LocScoreboard): string {
  const rows: Array<[string, LocScopeMeasure | { lines: number; floor: number; remaining: number; met: boolean; files?: number }]> = [
    ["game-core", board.gameCore],
    ["app", board.app],
    ["web/src", board.webSrc],
  ];
  const linesOut = [
    "LOC floors scoreboard (Finish 2.0 Phase 6 → Phase 30 freeze)",
    "scope          lines    floor   remain  met   files",
    "-------------  -------  ------  ------  ----  -----",
  ];
  for (const [label, m] of rows) {
    const files = "files" in m && typeof m.files === "number" ? String(m.files).padStart(5) : "    -";
    linesOut.push(
      `${label.padEnd(13)}  ${String(m.lines).padStart(7)}  ${String(m.floor).padStart(6)}  ${String(m.remaining).padStart(6)}  ${m.met ? "yes" : " no"}  ${files}`,
    );
  }
  linesOut.push(
    `${"product".padEnd(13)}  ${String(board.productTotal).padStart(7)}  ${String(board.productTotalFloor).padStart(6)}  ${String(board.productRemaining).padStart(6)}  ${board.productMet ? "yes" : " no"}  ${"".padStart(5)}`,
  );
  linesOut.push(
    board.enforceFloors
      ? `enforceFloors=true (${LOC_ENFORCE_MODE})`
      : "enforceFloors=false (print-only until Phase 30)",
  );
  linesOut.push(
    `planTargets retained: game-core=${LOC_FLOORS.scopes.gameCore.planTarget ?? 25000} ` +
      `app=${LOC_FLOORS.scopes.app.planTarget ?? 16000} ` +
      `web/src=${LOC_FLOORS.scopes.webSrc.planTarget ?? 38000} ` +
      `product=${LOC_PRODUCT_TOTAL_PLAN_TARGET}`,
  );
  return linesOut.join("\n");
}

/** Relative path helper for tests. */
export function locScopeRelFiles(repoRoot: string, scopeKey: keyof LocFloorsCatalog["scopes"]): string[] {
  const def = LOC_FLOORS.scopes[scopeKey];
  const abs = resolve(repoRoot, def.root);
  const files: string[] = [];
  walkFiles(abs, new Set(def.extensions), files);
  return files.map((f) => relative(repoRoot, f));
}
