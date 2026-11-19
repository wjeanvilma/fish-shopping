/**
 * Finish 5.0 Phase 26 — Deep links + E2E floors ≥12/≥14
 * (mirrors shared/ship/deeplink-e2e-5.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/deeplink-e2e-5.json";
import { WEB_E2E_ID_LIST } from "../e2e/webE2eIds";

export interface DeeplinkE2e5ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  deeplinkE2e5Marker: string;
  closesGap: string;
  routesCatalog: string;
  deepLinksShip: string;
  webE2eShip: string;
  composeUiShip: string;
  panelAliasFloor: number;
  hashAliasFloor: number;
  minIdCount: number;
  minTagCount: number;
  webScenarioFloor: number;
  composeScenarioFloor: number;
  uriVectorFloor: number;
  parityFixture: string;
  validateScript: string;
  softDeeplinkE2e4Validate: string;
  kickoffCatalog: string;
  authorTool: string;
  softFloors: {
    deeplinkE2e4PanelAliasFloor: number;
    deeplinkE2e4WebScenarioFloor: number;
    deeplinkE2e4ComposeScenarioFloor: number;
    webE2eHistoricalMinIdCount: number;
    composeHistoricalMinTagCount: number;
    note: string;
  };
  checklist: string[];
  preflightGates: string[];
}

export const DEEPLINK_E2E_5 = catalogJson as unknown as DeeplinkE2e5ShipCatalog;
export const DEEPLINK_E2E_5_PHASE = DEEPLINK_E2E_5.phase;
export const DEEPLINK_E2E_5_SCHEMA = DEEPLINK_E2E_5.schema;
export const DEEPLINK_E2E_5_MARKER = DEEPLINK_E2E_5.deeplinkE2e5Marker;
export const DEEPLINK_E2E_5_CLOSES_GAP = DEEPLINK_E2E_5.closesGap;
export const DEEPLINK_E2E_5_PANEL_ALIAS_FLOOR = DEEPLINK_E2E_5.panelAliasFloor;
export const DEEPLINK_E2E_5_MIN_ID_COUNT = DEEPLINK_E2E_5.minIdCount;
export const DEEPLINK_E2E_5_MIN_TAG_COUNT = DEEPLINK_E2E_5.minTagCount;

export interface DeeplinkE2e5Measure {
  panelAliasCount: number;
  hashAliasCount: number;
  idCount: number;
  tagCount: number;
  webScenarioCount: number;
  composeScenarioCount: number;
  uriVectorCount: number;
  aliasesEnough: boolean;
  idsEnough: boolean;
  tagsEnough: boolean;
  webScenariosEnough: boolean;
  composeScenariosEnough: boolean;
  uriVectorsEnough: boolean;
  finish5AliasesWired: boolean;
  gapClosed: boolean;
  kickoffWired: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureDeeplinkE2e5(repoRoot: string): DeeplinkE2e5Measure {
  const routesPath = resolve(repoRoot, DEEPLINK_E2E_5.routesCatalog);
  const webE2ePath = resolve(repoRoot, DEEPLINK_E2E_5.webE2eShip);
  const composePath = resolve(repoRoot, DEEPLINK_E2E_5.composeUiShip);
  const deepParityPath = resolve(repoRoot, "shared/fixtures/parity-deep-links.json");
  const tagsPath = resolve(
    repoRoot,
    "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/ComposeUiTags.kt",
  );
  const routesKtPath = resolve(
    repoRoot,
    "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/deeplink/DeepLinkRoutes.kt",
  );
  const kickoffPath = resolve(repoRoot, DEEPLINK_E2E_5.kickoffCatalog);
  const idsPath = resolve(repoRoot, "web/src/e2e/webE2eIds.ts");
  const smokePath = resolve(repoRoot, "web/e2e/smoke.spec.ts");
  const roboPath = resolve(
    repoRoot,
    "app/src/test/java/com/willio/jeanvilma/fishshopping/ComposeUiIntegrationTest.kt",
  );

  const routes = existsSync(routesPath) ? readJson(routesPath) : {};
  const webE2e = existsSync(webE2ePath) ? readJson(webE2ePath) : {};
  const compose = existsSync(composePath) ? readJson(composePath) : {};
  const deepParity = existsSync(deepParityPath) ? readJson(deepParityPath) : {};
  const tagsSrc = existsSync(tagsPath) ? readFileSync(tagsPath, "utf8") : "";
  const routesKt = existsSync(routesKtPath) ? readFileSync(routesKtPath, "utf8") : "";
  const idsSrc = existsSync(idsPath) ? readFileSync(idsPath, "utf8") : "";
  const smokeSrc = existsSync(smokePath) ? readFileSync(smokePath, "utf8") : "";
  const roboSrc = existsSync(roboPath) ? readFileSync(roboPath, "utf8") : "";

  const panelAliasCount = Object.keys(routes.panelAliases ?? {}).length;
  const hashAliasCount = Object.keys(routes.hashAliases ?? {}).length;
  const tagCount = (tagsSrc.match(/const val [A-Z0-9_]+ = "/g) ?? []).length;
  const webScenarioCount = (webE2e.scenarios as string[] | undefined)?.length ?? 0;
  const composeScenarioCount = (compose.scenarios as string[] | undefined)?.length ?? 0;
  const uriVectorCount =
    (deepParity.expect?.uriVectors as unknown[] | undefined)?.length ?? 0;

  let gapClosed = false;
  let kickoffWired = false;
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    gapClosed = kickoff?.gaps?.deeplinkE2e5Thin === false;
    const phase26 = (kickoff.phases as any[] | undefined)?.find((p) => p.phase === 26);
    kickoffWired =
      phase26?.id === "deeplink-e2e-5" && phase26?.validate === "deeplinke2e5:validate";
  }

  const missingGates = DEEPLINK_E2E_5.preflightGates.filter(
    (g) => !existsSync(resolve(repoRoot, g)),
  );

  return {
    panelAliasCount,
    hashAliasCount,
    idCount: WEB_E2E_ID_LIST.length,
    tagCount,
    webScenarioCount,
    composeScenarioCount,
    uriVectorCount,
    aliasesEnough:
      panelAliasCount >= DEEPLINK_E2E_5.panelAliasFloor &&
      hashAliasCount >= DEEPLINK_E2E_5.hashAliasFloor,
    idsEnough: WEB_E2E_ID_LIST.length >= DEEPLINK_E2E_5.minIdCount,
    tagsEnough: tagCount >= DEEPLINK_E2E_5.minTagCount,
    webScenariosEnough: webScenarioCount >= DEEPLINK_E2E_5.webScenarioFloor,
    composeScenariosEnough: composeScenarioCount >= DEEPLINK_E2E_5.composeScenarioFloor,
    uriVectorsEnough: uriVectorCount >= DEEPLINK_E2E_5.uriVectorFloor,
    finish5AliasesWired:
      routesKt.includes('"weekly"') &&
      routesKt.includes('"endgame"') &&
      routesKt.includes('"pierledger"') &&
      routesKt.includes('"friction"') &&
      routesKt.includes('"licenses"') &&
      idsSrc.includes('"goals.weekly"') &&
      idsSrc.includes('"friction.nudge"') &&
      tagsSrc.includes('"goals.weekly"') &&
      tagsSrc.includes('"friction.nudge"') &&
      smokeSrc.includes("deep link panel=weekly") &&
      smokeSrc.includes("deep link hash endgame") &&
      roboSrc.includes("composeUiTagsFinish5Floor") &&
      roboSrc.includes("hudNavWarehouseGoalsFire"),
    gapClosed,
    kickoffWired,
    missingGates,
  };
}
