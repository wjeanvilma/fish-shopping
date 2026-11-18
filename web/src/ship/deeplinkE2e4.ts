/**
 * Finish 4.0 Phase 26 — Deep links + expanded E2E/Compose
 * (mirrors shared/ship/deeplink-e2e-4.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/deeplink-e2e-4.json";
import { WEB_E2E_ID_LIST } from "../e2e/webE2eIds";

export interface DeeplinkE2e4ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  deeplinkE2e4Marker: string;
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
  kickoffCatalog: string;
  softFloors: {
    webE2eHistoricalMinIdCount: number;
    composeHistoricalMinTagCount: number;
    deepLinkHistoricalUriVectors: number;
    note: string;
  };
  checklist: string[];
  preflightGates: string[];
}

export const DEEPLINK_E2E_4 = catalogJson as unknown as DeeplinkE2e4ShipCatalog;
export const DEEPLINK_E2E_4_PHASE = DEEPLINK_E2E_4.phase;
export const DEEPLINK_E2E_4_SCHEMA = DEEPLINK_E2E_4.schema;
export const DEEPLINK_E2E_4_MARKER = DEEPLINK_E2E_4.deeplinkE2e4Marker;
export const DEEPLINK_E2E_4_CLOSES_GAP = DEEPLINK_E2E_4.closesGap;
export const DEEPLINK_PANEL_ALIAS_FLOOR = DEEPLINK_E2E_4.panelAliasFloor;
export const DEEPLINK_MIN_ID_COUNT = DEEPLINK_E2E_4.minIdCount;
export const DEEPLINK_MIN_TAG_COUNT = DEEPLINK_E2E_4.minTagCount;

export interface DeeplinkE2e4Measure {
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
  hudToolbarWired: boolean;
  gapClosed: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureDeeplinkE2e4(repoRoot: string): DeeplinkE2e4Measure {
  const routesPath = resolve(repoRoot, DEEPLINK_E2E_4.routesCatalog);
  const webE2ePath = resolve(repoRoot, DEEPLINK_E2E_4.webE2eShip);
  const composePath = resolve(repoRoot, DEEPLINK_E2E_4.composeUiShip);
  const deepParityPath = resolve(repoRoot, "shared/fixtures/parity-deep-links.json");
  const tagsPath = resolve(
    repoRoot,
    "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/ComposeUiTags.kt",
  );
  const appPath = resolve(repoRoot, "web/src/ui/App.tsx");
  const gameScreenPath = resolve(
    repoRoot,
    "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt",
  );
  const hudPath = resolve(
    repoRoot,
    "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/HudNavToolbar.kt",
  );
  const routesKtPath = resolve(
    repoRoot,
    "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/deeplink/DeepLinkRoutes.kt",
  );
  const kickoffPath = resolve(repoRoot, DEEPLINK_E2E_4.kickoffCatalog);

  const routes = existsSync(routesPath) ? readJson(routesPath) : {};
  const webE2e = existsSync(webE2ePath) ? readJson(webE2ePath) : {};
  const compose = existsSync(composePath) ? readJson(composePath) : {};
  const deepParity = existsSync(deepParityPath) ? readJson(deepParityPath) : {};
  const tagsSrc = existsSync(tagsPath) ? readFileSync(tagsPath, "utf8") : "";
  const appSrc = existsSync(appPath) ? readFileSync(appPath, "utf8") : "";
  const gameSrc = existsSync(gameScreenPath) ? readFileSync(gameScreenPath, "utf8") : "";
  const hudSrc = existsSync(hudPath) ? readFileSync(hudPath, "utf8") : "";
  const routesKt = existsSync(routesKtPath) ? readFileSync(routesKtPath, "utf8") : "";

  const panelAliasCount = Object.keys(routes.panelAliases ?? {}).length;
  const hashAliasCount = Object.keys(routes.hashAliases ?? {}).length;
  const tagCount = (tagsSrc.match(/const val [A-Z0-9_]+ = "/g) ?? []).length;
  const webScenarioCount = (webE2e.scenarios as string[] | undefined)?.length ?? 0;
  const composeScenarioCount = (compose.scenarios as string[] | undefined)?.length ?? 0;
  const uriVectorCount =
    (deepParity.expect?.uriVectors as unknown[] | undefined)?.length ?? 0;

  let gapClosed = false;
  if (existsSync(kickoffPath)) {
    const kickoff = readJson(kickoffPath);
    gapClosed = kickoff?.gaps?.deeplinkE2eThin === false;
  }

  const missingGates = DEEPLINK_E2E_4.preflightGates.filter(
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
      panelAliasCount >= DEEPLINK_E2E_4.panelAliasFloor &&
      hashAliasCount >= DEEPLINK_E2E_4.hashAliasFloor &&
      routesKt.includes('"bag"') &&
      routesKt.includes('"bank"') &&
      routesKt.includes('"station"'),
    idsEnough: WEB_E2E_ID_LIST.length >= DEEPLINK_E2E_4.minIdCount,
    tagsEnough: tagCount >= DEEPLINK_E2E_4.minTagCount,
    webScenariosEnough: webScenarioCount >= DEEPLINK_E2E_4.webScenarioFloor,
    composeScenariosEnough: composeScenarioCount >= DEEPLINK_E2E_4.composeScenarioFloor,
    uriVectorsEnough: uriVectorCount >= DEEPLINK_E2E_4.uriVectorFloor,
    hudToolbarWired:
      appSrc.includes("NAV_JOBS") &&
      appSrc.includes("NAV_DASH") &&
      appSrc.includes("NAV_WAREHOUSE") &&
      hudSrc.includes("HudNavToolbarContent") &&
      gameSrc.includes("HudNavToolbarContent"),
    gapClosed,
    missingGates,
  };
}
