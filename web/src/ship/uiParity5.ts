/**
 * Finish 5.0 Phase 23 — Web↔Android panel parity depth 5
 * (mirrors shared/ship/ui-parity-5.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/ui-parity-5.json";
import { loadContent } from "../engine";

export interface UiParity5FeatureFloor {
  id: string;
  webFile: string;
  androidFile: string;
  webMarkers: string[];
  androidMarkers: string[];
}

export interface UiParity5PanelPair {
  id: string;
  web: string;
  android: string;
}

export interface UiParity5Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  uiParity5Marker: string;
  extendsUiParity: string;
  panelPairMin: number;
  featureFloorMin: number;
  panelPairs: UiParity5PanelPair[];
  newPanelPairIds: string[];
  newFeatureFloorIds: string[];
  featureFloors: UiParity5FeatureFloor[];
  goalPresetMin: number;
  loanProductMin: number;
  dailyObjectiveMin: number;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  softUiParityValidate: string;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const UI_PARITY_5 = catalogJson as unknown as UiParity5Catalog;
export const UI_PARITY_5_PHASE = UI_PARITY_5.phase;
export const UI_PARITY_5_SCHEMA = UI_PARITY_5.schema;
export const UI_PARITY_5_MARKER = UI_PARITY_5.uiParity5Marker;

export interface UiParity5Measure {
  panelPairCount: number;
  featureFloorCount: number;
  pairsPresent: boolean;
  featuresPresent: boolean;
  missingFeatureMarkers: string[];
  contentFloorsOk: boolean;
  weeklyEndgameUxPresent: boolean;
  kickoffClosed: boolean;
  kickoffWired: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureUiParity5(repoRoot: string): UiParity5Measure {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  loadContent(pack);
  const bank = pack.bank ?? {};
  const products = bank.loanProducts ?? [];
  const goals = bank.goalPresets ?? [];
  const daily = pack.dailyGoals ?? {};

  const missingFeatureMarkers: string[] = [];
  for (const floor of UI_PARITY_5.featureFloors) {
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

  const pairsPresent = UI_PARITY_5.panelPairs.every(
    (p) => existsSync(resolve(repoRoot, p.web)) && existsSync(resolve(repoRoot, p.android)),
  );

  const questWeb = existsSync(resolve(repoRoot, "web/src/ui/QuestLogPanel.tsx"))
    ? readFileSync(resolve(repoRoot, "web/src/ui/QuestLogPanel.tsx"), "utf8")
    : "";
  const questKt = existsSync(
    resolve(repoRoot, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/QuestLogPanel.kt"),
  )
    ? readFileSync(
      resolve(repoRoot, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/QuestLogPanel.kt"),
      "utf8",
    )
    : "";

  const kickoff = readJson(resolve(repoRoot, UI_PARITY_5.kickoffCatalog));
  const phase23 = (kickoff.phases as any[])?.find((p) => p.phase === 23);

  const missingGates: string[] = [];
  for (const gate of UI_PARITY_5.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    panelPairCount: UI_PARITY_5.panelPairs.length,
    featureFloorCount: UI_PARITY_5.featureFloors.length,
    pairsPresent,
    featuresPresent: missingFeatureMarkers.length === 0,
    missingFeatureMarkers,
    contentFloorsOk:
      products.length >= UI_PARITY_5.loanProductMin &&
      goals.length >= UI_PARITY_5.goalPresetMin &&
      (daily.objectives?.length ?? 0) >= UI_PARITY_5.dailyObjectiveMin,
    weeklyEndgameUxPresent:
      questWeb.includes("weeklyGoals") &&
      questWeb.includes("onClaimWeeklyGoal") &&
      questWeb.includes("endgameTiers") &&
      questWeb.includes("a11y.endgameSection") &&
      questKt.includes("weeklyGoals") &&
      questKt.includes("onClaimWeeklyGoal") &&
      questKt.includes("endgameTiers") &&
      questKt.includes("a11y.endgameSection"),
    kickoffClosed: kickoff.gaps?.uiParity5Incomplete === false,
    kickoffWired: phase23?.id === "ui-parity-5" && phase23?.validate === "uiparity5:validate",
    missingGates,
  };
}
