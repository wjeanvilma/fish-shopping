/**
 * Finish 6.0 Phase 20 — Web↔Android panel parity depth 6
 * (mirrors shared/ship/ui-parity-6.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/ui-parity-6.json";
import { loadContent } from "../engine";

export interface UiParity6FeatureFloor {
  id: string;
  webFile: string;
  androidFile: string;
  webMarkers: string[];
  androidMarkers: string[];
}

export interface UiParity6PanelPair {
  id: string;
  web: string;
  android: string;
}

export interface UiParity6Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  uiParity6Marker: string;
  extendsUiParity: string;
  extendsUiParity5: string;
  panelPairMin: number;
  featureFloorMin: number;
  panelPairs: UiParity6PanelPair[];
  newPanelPairIds: string[];
  newFeatureFloorIds: string[];
  featureFloors: UiParity6FeatureFloor[];
  goalPresetMin: number;
  loanProductMin: number;
  dailyObjectiveMin: number;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  softUiParity5Validate: string;
  softUiParityValidate: string;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const UI_PARITY_6 = catalogJson as unknown as UiParity6Catalog;
export const UI_PARITY_6_PHASE = UI_PARITY_6.phase;
export const UI_PARITY_6_SCHEMA = UI_PARITY_6.schema;
export const UI_PARITY_6_MARKER = UI_PARITY_6.uiParity6Marker;

export interface UiParity6Measure {
  panelPairCount: number;
  featureFloorCount: number;
  pairsPresent: boolean;
  featuresPresent: boolean;
  missingFeatureMarkers: string[];
  contentFloorsOk: boolean;
  nestUxPresent: boolean;
  kickoffClosed: boolean;
  kickoffWired: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureUiParity6(repoRoot: string): UiParity6Measure {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  loadContent(pack);
  const bank = pack.bank ?? {};
  const products = bank.loanProducts ?? [];
  const goals = bank.goalPresets ?? [];
  const daily = pack.dailyGoals ?? {};

  const missingFeatureMarkers: string[] = [];
  for (const floor of UI_PARITY_6.featureFloors) {
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

  const pairsPresent = UI_PARITY_6.panelPairs.every(
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
  const dashWeb = existsSync(resolve(repoRoot, "web/src/ui/BusinessDashboardPanel.tsx"))
    ? readFileSync(resolve(repoRoot, "web/src/ui/BusinessDashboardPanel.tsx"), "utf8")
    : "";
  const titleWeb = existsSync(resolve(repoRoot, "web/src/ui/TitlePanels.tsx"))
    ? readFileSync(resolve(repoRoot, "web/src/ui/TitlePanels.tsx"), "utf8")
    : "";

  const kickoff = readJson(resolve(repoRoot, UI_PARITY_6.kickoffCatalog));
  const phase20 = (kickoff.phases as any[])?.find((p) => p.phase === 20);

  const missingGates: string[] = [];
  for (const gate of UI_PARITY_6.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    panelPairCount: UI_PARITY_6.panelPairs.length,
    featureFloorCount: UI_PARITY_6.featureFloors.length,
    pairsPresent,
    featuresPresent: missingFeatureMarkers.length === 0,
    missingFeatureMarkers,
    contentFloorsOk:
      products.length >= UI_PARITY_6.loanProductMin &&
      goals.length >= UI_PARITY_6.goalPresetMin &&
      (daily.objectives?.length ?? 0) >= UI_PARITY_6.dailyObjectiveMin,
    nestUxPresent:
      questWeb.includes("loan.nest_ember") &&
      questWeb.includes("loan.saffron_crest") &&
      questKt.includes("loan.nest_ember") &&
      questKt.includes("loan.saffron_crest") &&
      dashWeb.includes("dashboard.nestTreasury") &&
      titleWeb.includes("nestConflictHint"),
    kickoffClosed: kickoff.gaps?.uiParity6Incomplete === false,
    kickoffWired: phase20?.id === "ui-parity-6" && phase20?.validate === "uiparity6:validate",
    missingGates,
  };
}
