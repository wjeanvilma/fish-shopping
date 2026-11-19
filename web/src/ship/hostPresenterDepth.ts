/**
 * Finish 5.0 Phase 5 — GameHost + presenter/HUD depth
 * (mirrors shared/ship/host-presenter-depth.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/host-presenter-depth.json";

export interface HostPresenterDepthCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  hostPresenterDepthMarker: string;
  viewFields: string[];
  viewFieldMin: number;
  requiredFiles: string[];
  requiredSymbols: Record<string, string[]>;
  hudBindings: Record<string, string[]>;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const HOST_PRESENTER_DEPTH = catalogJson as unknown as HostPresenterDepthCatalog;
export const HOST_PRESENTER_DEPTH_PHASE = HOST_PRESENTER_DEPTH.phase;
export const HOST_PRESENTER_DEPTH_SCHEMA = HOST_PRESENTER_DEPTH.schema;
export const HOST_PRESENTER_DEPTH_MARKER = HOST_PRESENTER_DEPTH.hostPresenterDepthMarker;

export interface HostPresenterDepthMeasure {
  viewFieldCount: number;
  requiredFilesPresent: boolean;
  symbolsPresent: boolean;
  hudBindingsPresent: boolean;
  loopSnapshotCoversFields: boolean;
  kickoffWired: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureHostPresenterDepth(repoRoot: string): HostPresenterDepthMeasure {
  const missingGates: string[] = [];
  for (const gate of HOST_PRESENTER_DEPTH.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  const requiredFilesPresent = HOST_PRESENTER_DEPTH.requiredFiles.every((f) =>
    existsSync(resolve(repoRoot, f)),
  );

  const missingSymbols: string[] = [];
  for (const [file, symbols] of Object.entries(HOST_PRESENTER_DEPTH.requiredSymbols)) {
    const candidates = [
      resolve(repoRoot, `web/src/game/host/${file}`),
      resolve(repoRoot, `web/src/game/${file}`),
    ];
    const path = candidates.find((p) => existsSync(p));
    const text = path ? readFileSync(path, "utf8") : "";
    for (const sym of symbols) {
      const needle = sym.replace(/^class /, "");
      if (!text.includes(needle) && !text.includes(sym)) {
        missingSymbols.push(`${file}:${sym}`);
      }
    }
  }

  const hudOk = Object.entries(HOST_PRESENTER_DEPTH.hudBindings).every(([surface, fields]) => {
    const path = resolve(repoRoot, `web/src/ui/${surface}`);
    if (!existsSync(path)) return false;
    const text = readFileSync(path, "utf8");
    return fields.every((f) => text.includes(f));
  });

  const snapshotPath = resolve(repoRoot, "web/src/game/loopHudSnapshot.ts");
  const snapshotText = existsSync(snapshotPath) ? readFileSync(snapshotPath, "utf8") : "";
  const loopSnapshotCoversFields = HOST_PRESENTER_DEPTH.viewFields.every((f) =>
    snapshotText.includes(f),
  );

  const kickoff = readJson(resolve(repoRoot, HOST_PRESENTER_DEPTH.kickoffCatalog));
  const phase5 = (kickoff.phases as any[])?.find((p) => p.phase === 5);

  return {
    viewFieldCount: HOST_PRESENTER_DEPTH.viewFields.length,
    requiredFilesPresent,
    symbolsPresent: missingSymbols.length === 0,
    hudBindingsPresent: hudOk,
    loopSnapshotCoversFields,
    kickoffWired:
      phase5?.id === "host-presenter-depth" &&
      phase5?.validate === "hostpresenterdepth:validate",
    missingGates,
  };
}
