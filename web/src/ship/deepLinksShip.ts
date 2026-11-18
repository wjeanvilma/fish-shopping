/**
 * Finish 3.0 Phase 20 — Android App Links + web deep links
 * (mirrors shared/ship/deep-links.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/deep-links.json";
import { SCHEMA_VERSION } from "../engine";
import {
  DEEP_LINK_CUSTOM_SCHEME,
  DEEP_LINK_HOST,
  DEEP_LINK_PATH_PREFIX,
  parseDeepLink,
} from "../deeplink/deepLinks";

export interface DeepLinksShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  deepLinksMarker: string;
  closesGap: string;
  routesCatalog: string;
  assetLinksPath: string;
  packageName: string;
  host: string;
  pathPrefix: string;
  customScheme: string;
  customHost: string;
  kickoffCatalog: string;
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const DEEP_LINKS_SHIP = catalogJson as unknown as DeepLinksShipCatalog;
export const DEEP_LINKS_PHASE = DEEP_LINKS_SHIP.phase;
export const DEEP_LINKS_SCHEMA = DEEP_LINKS_SHIP.schema;
export const DEEP_LINKS_MARKER = DEEP_LINKS_SHIP.deepLinksMarker;
export const DEEP_LINKS_CLOSES_GAP = DEEP_LINKS_SHIP.closesGap;

export interface DeepLinksMeasure {
  schemaVersion: number;
  routesPresent: boolean;
  assetLinksPresent: boolean;
  manifestWired: boolean;
  mainActivityWired: boolean;
  viewModelWired: boolean;
  gameHostWired: boolean;
  buildPagesCopiesAssetLinks: boolean;
  parseSmokeOk: boolean;
  gapClosed: boolean;
  kickoffWired: boolean;
  measuredAtPhase: number;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureDeepLinks(repoRoot: string): DeepLinksMeasure {
  const routesPath = resolve(repoRoot, DEEP_LINKS_SHIP.routesCatalog);
  const assetPath = resolve(repoRoot, DEEP_LINKS_SHIP.assetLinksPath);
  const manifestPath = resolve(repoRoot, "app/src/main/AndroidManifest.xml");
  const mainPath = resolve(repoRoot, "app/src/main/java/com/willio/jeanvilma/fishshopping/MainActivity.kt");
  const vmPath = resolve(
    repoRoot,
    "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt",
  );
  const hostPath = resolve(repoRoot, "web/src/game/GameHost.ts");
  const buildPath = resolve(repoRoot, "web/scripts/build-pages-site.ts");
  const deepTs = resolve(repoRoot, "web/src/deeplink/deepLinks.ts");

  const manifest = existsSync(manifestPath) ? readFileSync(manifestPath, "utf8") : "";
  const main = existsSync(mainPath) ? readFileSync(mainPath, "utf8") : "";
  const vm = existsSync(vmPath) ? readFileSync(vmPath, "utf8") : "";
  const host = existsSync(hostPath) ? readFileSync(hostPath, "utf8") : "";
  const build = existsSync(buildPath) ? readFileSync(buildPath, "utf8") : "";
  const deep = existsSync(deepTs) ? readFileSync(deepTs, "utf8") : "";
  const asset = existsSync(assetPath) ? readFileSync(assetPath, "utf8") : "";

  let measuredAtPhase = -1;
  let kickoffWired = false;
  let gapClosed = false;
  try {
    const kickoff = readJson(resolve(repoRoot, DEEP_LINKS_SHIP.kickoffCatalog));
    measuredAtPhase = kickoff?.baseline?.measuredAtPhase ?? -1;
    gapClosed = kickoff.gaps?.deepLinksMissing === false;
    const phase20 = (kickoff.phases as any[])?.find((p) => p.phase === 20);
    kickoffWired =
      measuredAtPhase >= 20 &&
      phase20?.id === "deep-links" &&
      phase20?.validate === "deeplink:validate" &&
      gapClosed;
  } catch {
    kickoffWired = false;
  }

  const sample = parseDeepLink({
    href: "https://wjeanvilma.github.io/fish-shopping/play/?panel=goals",
  });
  const parseSmokeOk =
    sample.panel === "quests" &&
    DEEP_LINK_HOST === DEEP_LINKS_SHIP.host &&
    DEEP_LINK_PATH_PREFIX === DEEP_LINKS_SHIP.pathPrefix &&
    DEEP_LINK_CUSTOM_SCHEME === DEEP_LINKS_SHIP.customScheme &&
    deep.includes("parseLocation") &&
    deep.includes("stripDeepLinkQuery");

  const missingGates = DEEP_LINKS_SHIP.preflightGates.filter(
    (g) => !existsSync(resolve(repoRoot, g)),
  );

  return {
    schemaVersion: SCHEMA_VERSION,
    routesPresent: existsSync(routesPath),
    assetLinksPresent:
      asset.includes(DEEP_LINKS_SHIP.packageName) &&
      asset.includes("REPLACE_WITH_UPLOAD_CERT_SHA256"),
    manifestWired:
      manifest.includes('android:autoVerify="true"') &&
      manifest.includes(DEEP_LINKS_SHIP.host) &&
      manifest.includes(DEEP_LINKS_SHIP.pathPrefix) &&
      manifest.includes(DEEP_LINKS_SHIP.customScheme) &&
      manifest.includes('android:launchMode="singleTop"'),
    mainActivityWired:
      main.includes("DeepLinkHandler") &&
      main.includes("onNewIntent") &&
      main.includes("applyDeepLink"),
    viewModelWired:
      vm.includes("applyDeepLink") &&
      vm.includes("pendingDeepLink") &&
      vm.includes("flushPendingDeepLink"),
    gameHostWired:
      host.includes("applyDeepLink") &&
      host.includes("pendingDeepLink") &&
      host.includes("flushPendingDeepLink") &&
      host.includes("parseLocation"),
    buildPagesCopiesAssetLinks:
      build.includes(".well-known/assetlinks.json") && build.includes(".well-known"),
    parseSmokeOk,
    gapClosed,
    kickoffWired,
    measuredAtPhase,
    missingGates,
  };
}
