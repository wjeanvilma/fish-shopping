/**
 * Finish 4.0 Phase 22 — Web↔Android panel feature parity depth
 * (mirrors shared/ship/ui-parity-depth.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/ui-parity-depth.json";
import { loadContent } from "../engine";

export interface UiParityFeatureFloor {
  id: string;
  webFile: string;
  androidFile: string;
  webMarkers: string[];
  androidMarkers: string[];
}

export interface UiParityPanelPair {
  id: string;
  web: string;
  android: string;
}

export interface UiParityCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  uiParityMarker: string;
  panelPairMin: number;
  panelPairs: UiParityPanelPair[];
  featureFloors: UiParityFeatureFloor[];
  goalPresetMin: number;
  loanProductMin: number;
  dailyObjectiveMin: number;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const UI_PARITY = catalogJson as unknown as UiParityCatalog;
export const UI_PARITY_PHASE = UI_PARITY.phase;
export const UI_PARITY_SCHEMA = UI_PARITY.schema;
export const UI_PARITY_MARKER = UI_PARITY.uiParityMarker;

export interface UiParityMeasure {
  panelPairCount: number;
  featureFloorCount: number;
  pairsPresent: boolean;
  featuresPresent: boolean;
  missingFeatureMarkers: string[];
  contentFloorsOk: boolean;
  kickoffWired: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureUiParity(repoRoot: string): UiParityMeasure {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  loadContent(pack);
  const bank = pack.bank ?? {};
  const products = bank.loanProducts ?? [];
  const goals = bank.goalPresets ?? [];
  const daily = pack.dailyGoals ?? {};

  const missingFeatureMarkers: string[] = [];
  for (const floor of UI_PARITY.featureFloors) {
    const webPath = resolve(repoRoot, floor.webFile);
    const androidPath = resolve(repoRoot, floor.androidFile);
    const webSrc = existsSync(webPath) ? readFileSync(webPath, "utf8") : "";
    const androidSrc = existsSync(androidPath) ? readFileSync(androidPath, "utf8") : "";
    for (const marker of floor.webMarkers) {
      if (!webSrc.includes(marker)) {
        missingFeatureMarkers.push(`${floor.id}/web:${marker}`);
      }
    }
    for (const marker of floor.androidMarkers) {
      if (!androidSrc.includes(marker)) {
        missingFeatureMarkers.push(`${floor.id}/android:${marker}`);
      }
    }
  }

  const pairsPresent = UI_PARITY.panelPairs.every(
    (p) => existsSync(resolve(repoRoot, p.web)) && existsSync(resolve(repoRoot, p.android)),
  );

  const kickoff = readJson(resolve(repoRoot, UI_PARITY.kickoffCatalog));
  const phase22 = (kickoff.phases as any[])?.find((p) => p.phase === 22);

  const missingGates: string[] = [];
  for (const gate of UI_PARITY.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    panelPairCount: UI_PARITY.panelPairs.length,
    featureFloorCount: UI_PARITY.featureFloors.length,
    pairsPresent,
    featuresPresent: missingFeatureMarkers.length === 0,
    missingFeatureMarkers,
    contentFloorsOk:
      products.length >= UI_PARITY.loanProductMin &&
      goals.length >= UI_PARITY.goalPresetMin &&
      (daily.objectives?.length ?? 0) >= UI_PARITY.dailyObjectiveMin,
    kickoffWired:
      phase22?.id === "ui-parity-depth" && phase22?.validate === "uiparity:validate",
    missingGates,
  };
}
