/**
 * Finish 3.0 Phase 20 — Android App Links + web deep links readiness.
 *
 * Usage:
 *   npm run deeplink:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import { FINISH3_OPEN_GAP_FLAGS } from "../src/ship/finish3Kickoff";
import {
  DEEP_LINKS_CLOSES_GAP,
  DEEP_LINKS_MARKER,
  DEEP_LINKS_PHASE,
  DEEP_LINKS_SCHEMA,
  DEEP_LINKS_SHIP,
  measureDeepLinks,
} from "../src/ship/deepLinksShip";
import { parseDeepLink, parseLocation, stripDeepLinkQuery } from "../src/deeplink/deepLinks";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/deep-links.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-deep-links.json"));
  const routes = readJson(resolve(root, "shared/deep-links/routes.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/DeepLinks.kt"),
    "utf8",
  );
  const routesKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/deeplink/DeepLinkRoutes.kt"),
    "utf8",
  );
  const manifest = readFileSync(resolve(root, "app/src/main/AndroidManifest.xml"), "utf8");
  const mainActivity = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/MainActivity.kt"),
    "utf8",
  );
  const buildScript = readFileSync(resolve(root, "web/scripts/build-pages-site.ts"), "utf8");
  const assetLinks = readFileSync(resolve(root, "web/public/.well-known/assetlinks.json"), "utf8");

  if (catalog.phase !== 20) errors.push(`phase expected 20, got ${catalog.phase}`);
  if (catalog.schema !== DEEP_LINKS_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (DEEP_LINKS_PHASE !== 20) errors.push("phase mirror mismatch");
  if (catalog.deepLinksMarker !== DEEP_LINKS_MARKER) errors.push("marker mismatch");
  if (fixture.deepLinksMarker !== DEEP_LINKS_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (catalog.schemaVersion !== 24) errors.push("catalog schemaVersion must stay 24");
  if (SCHEMA_VERSION !== 24) errors.push("engine SCHEMA_VERSION must stay 24");
  if (catalog.closesGap !== "deepLinksMissing") errors.push("closesGap mismatch");
  if (DEEP_LINKS_CLOSES_GAP !== "deepLinksMissing") errors.push("closesGap mirror mismatch");

  if (routes.host !== catalog.host) errors.push("routes.host ≠ catalog.host");
  if (routes.pathPrefix !== catalog.pathPrefix) errors.push("routes.pathPrefix mismatch");
  if (routes.customScheme !== catalog.customScheme) errors.push("routes.customScheme mismatch");
  if (routes.packageName !== catalog.packageName) errors.push("routes.packageName mismatch");

  const measure = measureDeepLinks(root);
  if (measure.schemaVersion !== 24) errors.push("measure schemaVersion must be 24");
  if (!measure.routesPresent) errors.push("routes catalog missing");
  if (!measure.assetLinksPresent) errors.push("assetlinks.json incomplete");
  if (!measure.manifestWired) errors.push("AndroidManifest App Links wiring incomplete");
  if (!measure.mainActivityWired) errors.push("MainActivity deep-link wiring incomplete");
  if (!measure.viewModelWired) errors.push("GameViewModel deep-link wiring incomplete");
  if (!measure.gameHostWired) errors.push("GameHost deep-link wiring incomplete");
  if (!measure.buildPagesCopiesAssetLinks) {
    errors.push("build-pages-site must copy .well-known/assetlinks.json to site root");
  }
  if (!measure.parseSmokeOk) errors.push("web parseDeepLink smoke failed");
  if (!measure.gapClosed) errors.push("kickoff.gaps.deepLinksMissing must be false");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 20 must set validate=deeplink:validate, gap closed, measuredAtPhase≥20");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const vector of fixture.expect.uriVectors as Array<{
    uri: string;
    panel: string | null;
    harborId: string | null;
    source: string;
  }>) {
    const parsed = parseDeepLink({ href: vector.uri });
    if (parsed.panel !== vector.panel) {
      errors.push(`uri ${vector.uri} panel expected ${vector.panel}, got ${parsed.panel}`);
    }
    if ((parsed.harborId ?? null) !== vector.harborId) {
      errors.push(`uri ${vector.uri} harbor expected ${vector.harborId}, got ${parsed.harborId}`);
    }
    if (parsed.source !== vector.source) {
      errors.push(`uri ${vector.uri} source expected ${vector.source}, got ${parsed.source}`);
    }
  }

  for (const needle of fixture.expect.manifestMustContain as string[]) {
    if (!manifest.includes(needle)) errors.push(`AndroidManifest missing "${needle}"`);
  }
  for (const needle of fixture.expect.mainActivityMustContain as string[]) {
    if (!mainActivity.includes(needle)) errors.push(`MainActivity missing "${needle}"`);
  }
  for (const needle of fixture.expect.buildPagesMustContain as string[]) {
    if (!buildScript.includes(needle)) errors.push(`build-pages-site missing "${needle}"`);
  }
  for (const needle of fixture.expect.assetLinksMustContain as string[]) {
    if (!assetLinks.includes(needle)) errors.push(`assetlinks.json missing "${needle}"`);
  }

  // stripDeepLinkQuery keeps billing params
  let replaced = "";
  stripDeepLinkQuery("?panel=goals&billing=success&session_id=abc", (url) => {
    replaced = url;
  });
  if (!replaced.includes("billing=success") || !replaced.includes("session_id=abc")) {
    errors.push("stripDeepLinkQuery must keep billing params");
  }
  if (replaced.includes("panel=")) {
    errors.push("stripDeepLinkQuery must remove panel");
  }

  const emptyLoc = parseLocation(null);
  if (emptyLoc.panel !== null || emptyLoc.harborId !== null) {
    errors.push("parseLocation(null) must be empty");
  }

  if (kickoff.gaps?.deepLinksMissing !== false) {
    errors.push("kickoff gap deepLinksMissing must be false");
  }
  if (FINISH3_OPEN_GAP_FLAGS.includes("deepLinksMissing")) {
    errors.push("OPEN_GAP_FLAGS must not include closed deepLinksMissing");
  }
  const phase20 = (kickoff.phases as any[])?.find((p) => p.phase === 20);
  if (!phase20 || phase20.validate !== "deeplink:validate") {
    errors.push("kickoff phase 20 validate must be deeplink:validate");
  }
  if ((kickoff.baseline?.measuredAtPhase ?? 0) < 20) {
    errors.push("kickoff.baseline.measuredAtPhase must be ≥ 20");
  }

  if (listing.deepLinksPhase !== 20) errors.push("listing.deepLinksPhase must be 20");
  if (listing.deepLinksCatalog !== "shared/ship/deep-links.json") {
    errors.push("listing.deepLinksCatalog mismatch");
  }
  if (pin.deepLinks !== "shared/ship/deep-links.json") errors.push("RELEASE_PIN.deepLinks path missing");
  if (!pin.fixtures?.includes("parity-deep-links.json")) {
    errors.push("RELEASE_PIN missing parity-deep-links.json");
  }

  const block = dod.deepLinks;
  if (!block) errors.push("DoD missing deepLinks block");
  else {
    if (block.phase !== 20) errors.push("DoD deepLinks.phase must be 20");
    if (block.plan !== "30_finish_3.0") errors.push("DoD deepLinks.plan mismatch");
    if (block.status !== "complete") errors.push("DoD deepLinks.status must be complete");
    if (block.deepLinksMarker !== DEEP_LINKS_MARKER) errors.push("DoD deepLinks marker mismatch");
  }

  if (!pkg.scripts?.["deeplink:validate"]) errors.push("package.json missing deeplink:validate");
  if (!ci.includes("deeplink:validate")) errors.push("ci.yml missing deeplink:validate");
  if (!kotlin.includes("CLOSES_GAP") || !kotlin.includes("ASSET_LINKS_PATH")) {
    errors.push("Kotlin DeepLinks missing constants");
  }
  if (!routesKt.includes("parseUriString") || !routesKt.includes("PANEL_ALIASES")) {
    errors.push("DeepLinkRoutes.kt missing parse symbols");
  }

  if (fixture.expect?.closesGap !== "deepLinksMissing") errors.push("parity expect.closesGap mismatch");

  for (const gate of DEEP_LINKS_SHIP.preflightGates) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("deeplink:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK deeplink:validate — Android App Links + web deep links locked");
