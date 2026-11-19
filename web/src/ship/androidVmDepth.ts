/**
 * Finish 5.0 Phase 4 — Android VM/intent depth
 * (mirrors shared/ship/android-vm-depth.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/android-vm-depth.json";

export interface AndroidVmDepthCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  androidVmDepthMarker: string;
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

export const ANDROID_VM_DEPTH = catalogJson as unknown as AndroidVmDepthCatalog;
export const ANDROID_VM_DEPTH_PHASE = ANDROID_VM_DEPTH.phase;
export const ANDROID_VM_DEPTH_SCHEMA = ANDROID_VM_DEPTH.schema;
export const ANDROID_VM_DEPTH_MARKER = ANDROID_VM_DEPTH.androidVmDepthMarker;

export interface AndroidVmDepthMeasure {
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

export function measureAndroidVmDepth(repoRoot: string): AndroidVmDepthMeasure {
  const missingGates: string[] = [];
  for (const gate of ANDROID_VM_DEPTH.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  const requiredFilesPresent = ANDROID_VM_DEPTH.requiredFiles.every((f) =>
    existsSync(resolve(repoRoot, f)),
  );

  const missingSymbols: string[] = [];
  for (const [file, symbols] of Object.entries(ANDROID_VM_DEPTH.requiredSymbols)) {
    const candidates = [
      resolve(repoRoot, `app/src/main/java/com/willio/jeanvilma/fishshopping/game/vm/${file}`),
      resolve(repoRoot, `app/src/main/java/com/willio/jeanvilma/fishshopping/game/${file}`),
    ];
    const path = candidates.find((p) => existsSync(p));
    const text = path ? readFileSync(path, "utf8") : "";
    for (const sym of symbols) {
      const needle = sym
        .replace(/^fun /, "")
        .replace(/^class /, "")
        .replace(/^data class /, "");
      if (!text.includes(needle) && !text.includes(sym)) {
        missingSymbols.push(`${file}:${sym}`);
      }
    }
  }

  const hudOk = Object.entries(ANDROID_VM_DEPTH.hudBindings).every(([surface, fields]) => {
    const path = resolve(
      repoRoot,
      `app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/${surface}`,
    );
    if (!existsSync(path)) return false;
    const text = readFileSync(path, "utf8");
    return fields.every((f) => text.includes(f));
  });

  const snapshotPath = resolve(
    repoRoot,
    "app/src/main/java/com/willio/jeanvilma/fishshopping/game/LoopHudSnapshot.kt",
  );
  const snapshotText = existsSync(snapshotPath) ? readFileSync(snapshotPath, "utf8") : "";
  const loopSnapshotCoversFields = ANDROID_VM_DEPTH.viewFields.every((f) =>
    snapshotText.includes(f),
  );

  const kickoff = readJson(resolve(repoRoot, ANDROID_VM_DEPTH.kickoffCatalog));
  const phase4 = (kickoff.phases as any[])?.find((p) => p.phase === 4);

  return {
    viewFieldCount: ANDROID_VM_DEPTH.viewFields.length,
    requiredFilesPresent,
    symbolsPresent: missingSymbols.length === 0,
    hudBindingsPresent: hudOk,
    loopSnapshotCoversFields,
    kickoffWired:
      phase4?.id === "android-vm-depth" && phase4?.validate === "androidvmdepth:validate",
    missingGates,
  };
}
