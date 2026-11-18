/**
 * Finish 4.0 Phase 26 — Deep links + expanded E2E/Compose.
 *
 * Usage:
 *   npm run deeplinke2e4:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { FINISH4_OPEN_GAP_FLAGS } from "../src/ship/finish4Kickoff";
import { parseDeepLink } from "../src/deeplink/deepLinks";
import { WEB_E2E_ID_LIST } from "../src/e2e/webE2eIds";
import {
  DEEPLINK_E2E_4,
  DEEPLINK_E2E_4_MARKER,
  DEEPLINK_E2E_4_PHASE,
  DEEPLINK_E2E_4_SCHEMA,
  DEEPLINK_MIN_ID_COUNT,
  DEEPLINK_MIN_TAG_COUNT,
  DEEPLINK_PANEL_ALIAS_FLOOR,
  measureDeeplinkE2e4,
} from "../src/ship/deeplinkE2e4";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/deeplink-e2e-4.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-deeplink-e2e-4.json"));
  const routes = readJson(resolve(root, catalog.routesCatalog));
  const webE2e = readJson(resolve(root, catalog.webE2eShip));
  const compose = readJson(resolve(root, catalog.composeUiShip));
  const deepParity = readJson(resolve(root, "shared/fixtures/parity-deep-links.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const finish4Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish4Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/DeeplinkE2e4.kt"),
    "utf8",
  );
  const ids = readFileSync(resolve(root, "web/src/e2e/webE2eIds.ts"), "utf8");
  const tags = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/ComposeUiTags.kt"),
    "utf8",
  );
  const smoke = readFileSync(resolve(root, "web/e2e/smoke.spec.ts"), "utf8");
  const robo = readFileSync(
    resolve(root, "app/src/test/java/com/willio/jeanvilma/fishshopping/ComposeUiIntegrationTest.kt"),
    "utf8",
  );

  if (catalog.phase !== 26) errors.push(`phase expected 26, got ${catalog.phase}`);
  if (catalog.schema !== DEEPLINK_E2E_4_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (DEEPLINK_E2E_4_PHASE !== 26) errors.push("phase mirror mismatch");
  if (catalog.deeplinkE2e4Marker !== DEEPLINK_E2E_4_MARKER) errors.push("marker mismatch");
  if (fixture.deeplinkE2e4Marker !== DEEPLINK_E2E_4_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.schemaVersion !== 25) errors.push("schemaVersion must stay 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");
  if (catalog.closesGap !== "deeplinkE2eThin") errors.push("closesGap mismatch");
  if (catalog.panelAliasFloor !== DEEPLINK_PANEL_ALIAS_FLOOR) {
    errors.push("panelAliasFloor mirror mismatch");
  }
  if (catalog.minIdCount !== DEEPLINK_MIN_ID_COUNT) errors.push("minIdCount mirror mismatch");
  if (catalog.minTagCount !== DEEPLINK_MIN_TAG_COUNT) errors.push("minTagCount mirror mismatch");

  const measure = measureDeeplinkE2e4(root);
  if (!measure.aliasesEnough) {
    errors.push(
      `aliases short (panel=${measure.panelAliasCount} hash=${measure.hashAliasCount})`,
    );
  }
  if (!measure.idsEnough) errors.push(`id count ${measure.idCount} < ${catalog.minIdCount}`);
  if (!measure.tagsEnough) errors.push(`tag count ${measure.tagCount} < ${catalog.minTagCount}`);
  if (!measure.webScenariosEnough) {
    errors.push(`web scenarios ${measure.webScenarioCount} < ${catalog.webScenarioFloor}`);
  }
  if (!measure.composeScenariosEnough) {
    errors.push(
      `compose scenarios ${measure.composeScenarioCount} < ${catalog.composeScenarioFloor}`,
    );
  }
  if (!measure.uriVectorsEnough) {
    errors.push(`uri vectors ${measure.uriVectorCount} < ${catalog.uriVectorFloor}`);
  }
  if (!measure.hudToolbarWired) errors.push("HUD toolbar / nav ids not wired");
  if (!measure.gapClosed) errors.push("kickoff.gaps.deeplinkE2eThin must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if ((webE2e.minIdCount ?? 0) < catalog.minIdCount) {
    errors.push("web-e2e.json minIdCount soft-floor too low");
  }
  if ((compose.minTagCount ?? 0) < catalog.minTagCount) {
    errors.push("compose-ui-tests.json minTagCount soft-floor too low");
  }
  if ((webE2e.scenarios?.length ?? 0) < catalog.webScenarioFloor) {
    errors.push("web-e2e scenarios short");
  }
  if ((compose.scenarios?.length ?? 0) < catalog.composeScenarioFloor) {
    errors.push("compose-ui-tests scenarios short");
  }
  if (Object.keys(routes.panelAliases ?? {}).length < catalog.panelAliasFloor) {
    errors.push("routes panelAliases short");
  }
  if (Object.keys(routes.hashAliases ?? {}).length < catalog.hashAliasFloor) {
    errors.push("routes hashAliases short");
  }

  for (const alias of fixture.expect.requiredAliases as string[]) {
    if (!routes.panelAliases?.[alias]) errors.push(`routes missing panel alias ${alias}`);
  }
  for (const id of fixture.expect.requiredIds as string[]) {
    if (!ids.includes(`"${id}"`)) errors.push(`webE2eIds missing "${id}"`);
  }
  for (const tag of fixture.expect.requiredTags as string[]) {
    if (!tags.includes(`"${tag}"`)) errors.push(`ComposeUiTags missing "${tag}"`);
  }
  for (const needle of fixture.expect.smokeMustContain as string[]) {
    if (!smoke.includes(needle)) errors.push(`smoke.spec missing "${needle}"`);
  }
  for (const needle of fixture.expect.robolectricMustContain as string[]) {
    if (!robo.includes(needle)) errors.push(`ComposeUiIntegrationTest missing ${needle}`);
  }

  if (WEB_E2E_ID_LIST.length < catalog.minIdCount) {
    errors.push(`WEB_E2E_ID_LIST ${WEB_E2E_ID_LIST.length} < ${catalog.minIdCount}`);
  }

  for (const vector of (deepParity.expect?.uriVectors ?? []) as Array<{
    uri: string;
    panel: string | null;
  }>) {
    const parsed = parseDeepLink({ href: vector.uri });
    if (parsed.panel !== vector.panel) {
      errors.push(`uri ${vector.uri} panel expected ${vector.panel}, got ${parsed.panel}`);
    }
  }

  if (kickoff.gaps?.deeplinkE2eThin !== false) {
    errors.push("kickoff gap deeplinkE2eThin must be false");
  }
  if (FINISH4_OPEN_GAP_FLAGS.includes("deeplinkE2eThin")) {
    errors.push("OPEN_GAP_FLAGS must not include closed deeplinkE2eThin");
  }
  // Soft-floor: later phases may close more gaps; Phase 26 only requires deeplink closed.
  if (FINISH4_OPEN_GAP_FLAGS.includes("deeplinkE2eThin")) {
    errors.push("OPEN_GAP_FLAGS must not include deeplinkE2eThin");
  }
  if (FINISH4_OPEN_GAP_FLAGS.length > 3) {
    errors.push(`OPEN_GAP_FLAGS unexpectedly large after Phase 26: ${FINISH4_OPEN_GAP_FLAGS.length}`);
  }
  const phase26 = (kickoff.phases as any[])?.find((p: any) => p.phase === 26);
  if (!phase26 || phase26.validate !== "deeplinke2e4:validate") {
    errors.push("kickoff phase 26 validate must be deeplinke2e4:validate");
  }
  if (!finish4Kt.includes("deeplinke2e4:validate")) {
    errors.push("Finish4Kickoff.kt missing deeplinke2e4:validate");
  }
  {
    const openBlock = finish4Kt.slice(
      finish4Kt.indexOf("OPEN_GAP_FLAGS"),
      finish4Kt.indexOf("fun score"),
    );
    if (openBlock.includes("deeplinkE2eThin")) {
      errors.push("Finish4Kickoff.OPEN_GAP_FLAGS must drop deeplinkE2eThin");
    }
  }

  if (listing.deeplinkE2e4Phase !== 26) errors.push("listing.deeplinkE2e4Phase must be 26");
  if (listing.deeplinkE2e4Catalog !== "shared/ship/deeplink-e2e-4.json") {
    errors.push("listing.deeplinkE2e4Catalog mismatch");
  }
  if (pin.deeplinkE2e4 !== "shared/ship/deeplink-e2e-4.json") {
    errors.push("RELEASE_PIN.deeplinkE2e4 missing");
  }
  if (!pin.fixtures?.includes("parity-deeplink-e2e-4.json")) {
    errors.push("RELEASE_PIN missing parity-deeplink-e2e-4.json");
  }

  if (!dod.deeplinkE2e4 || dod.deeplinkE2e4.status !== "complete") {
    errors.push("DoD deeplinkE2e4 incomplete");
  }
  if (dod.deeplinkE2e4?.deeplinkE2e4Marker !== DEEPLINK_E2E_4_MARKER) {
    errors.push("DoD deeplinkE2e4 marker mismatch");
  }

  if (!pkg.scripts?.["deeplinke2e4:validate"]) {
    errors.push("package.json missing deeplinke2e4:validate");
  }
  if (!ci.includes("deeplinke2e4:validate")) errors.push("ci.yml missing deeplinke2e4:validate");
  if (!kotlin.includes("CLOSES_GAP") || !kotlin.includes("PANEL_ALIAS_FLOOR")) {
    errors.push("Kotlin DeeplinkE2e4 missing constants");
  }

  if ((catalog.softFloors?.webE2eHistoricalMinIdCount ?? 0) < 18) {
    errors.push("soft floor web E2E historical min must stay ≥18");
  }
  if ((catalog.softFloors?.composeHistoricalMinTagCount ?? 0) < 16) {
    errors.push("soft floor compose historical min must stay ≥16");
  }

  for (const gate of DEEPLINK_E2E_4.preflightGates) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  if (fixture.expect?.closesGap !== "deeplinkE2eThin") {
    errors.push("parity expect.closesGap mismatch");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("deeplinke2e4:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK deeplinke2e4:validate — Deep links + expanded E2E/Compose locked");
