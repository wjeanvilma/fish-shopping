/**
 * Finish 5.0 Phase 26 — Deep links + E2E floors ≥12/≥14.
 *
 * Usage:
 *   npm run deeplinke2e5:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import { parseDeepLink } from "../src/deeplink/deepLinks";
import { WEB_E2E_ID_LIST } from "../src/e2e/webE2eIds";
import {
  DEEPLINK_E2E_5,
  DEEPLINK_E2E_5_MARKER,
  DEEPLINK_E2E_5_MIN_ID_COUNT,
  DEEPLINK_E2E_5_MIN_TAG_COUNT,
  DEEPLINK_E2E_5_PANEL_ALIAS_FLOOR,
  DEEPLINK_E2E_5_PHASE,
  DEEPLINK_E2E_5_SCHEMA,
  measureDeeplinkE2e5,
} from "../src/ship/deeplinkE2e5";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/deeplink-e2e-5.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-deeplink-e2e-5.json"));
  const routes = readJson(resolve(root, catalog.routesCatalog));
  const webE2e = readJson(resolve(root, catalog.webE2eShip));
  const compose = readJson(resolve(root, catalog.composeUiShip));
  const deepParity = readJson(resolve(root, "shared/fixtures/parity-deep-links.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/DeeplinkE2e5.kt"),
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
  if (catalog.schema !== DEEPLINK_E2E_5_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (DEEPLINK_E2E_5_PHASE !== 26) errors.push("phase mirror mismatch");
  if (catalog.deeplinkE2e5Marker !== DEEPLINK_E2E_5_MARKER) errors.push("marker mismatch");
  if (fixture.deeplinkE2e5Marker !== DEEPLINK_E2E_5_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.schemaVersion !== 26) errors.push("schemaVersion must stay 26");
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");
  if (!["4.0.0", "5.0.0"].includes(pack.contentVersion)) errors.push("content-pack contentVersion must be 4.0.0 or 5.0.0");
  if (pack.saveSchemaVersion !== 26) errors.push("content-pack.saveSchemaVersion must be 26");
  if (catalog.closesGap !== "deeplinkE2e5Thin") errors.push("closesGap mismatch");
  if (catalog.panelAliasFloor !== DEEPLINK_E2E_5_PANEL_ALIAS_FLOOR) {
    errors.push("panelAliasFloor mirror mismatch");
  }
  if (catalog.minIdCount !== DEEPLINK_E2E_5_MIN_ID_COUNT) errors.push("minIdCount mirror mismatch");
  if (catalog.minTagCount !== DEEPLINK_E2E_5_MIN_TAG_COUNT) {
    errors.push("minTagCount mirror mismatch");
  }
  if (catalog.webScenarioFloor !== 12) errors.push("webScenarioFloor must be 12");
  if (catalog.composeScenarioFloor !== 14) errors.push("composeScenarioFloor must be 14");
  if (catalog.uriVectorFloor !== 12) errors.push("uriVectorFloor must be 12");

  const measure = measureDeeplinkE2e5(root);
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
  if (!measure.finish5AliasesWired) errors.push("Finish 5 aliases / ids / tags / smoke / compose not wired");
  if (!measure.gapClosed) errors.push("kickoff.gaps.deeplinkE2e5Thin must be false");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 26 must set id=deeplink-e2e-5 validate=deeplinke2e5:validate");
  }
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

  if (kickoff.gaps?.deeplinkE2e5Thin !== false) {
    errors.push("kickoff gap deeplinkE2e5Thin must be false");
  }
  if (FINISH5_OPEN_GAP_FLAGS.includes("deeplinkE2e5Thin")) {
    errors.push("OPEN_GAP_FLAGS must not include closed deeplinkE2e5Thin");
  }
  // Soft-floor: later phases may close more gaps; Phase 26 only requires deeplink closed.
  if (FINISH5_OPEN_GAP_FLAGS.length > 3) {
    errors.push(`OPEN_GAP_FLAGS unexpectedly large after Phase 26: ${FINISH5_OPEN_GAP_FLAGS.length}`);
  }
  const phase26 = (kickoff.phases as any[])?.find((p: any) => p.phase === 26);
  if (!phase26 || phase26.validate !== "deeplinke2e5:validate") {
    errors.push("kickoff phase 26 validate must be deeplinke2e5:validate");
  }
  if (phase26?.id !== "deeplink-e2e-5") errors.push("kickoff phase 26 id must be deeplink-e2e-5");
  if (!finish5Kt.includes("deeplinke2e5:validate")) {
    errors.push("Finish5Kickoff.kt missing deeplinke2e5:validate");
  }
  {
    const openBlock = finish5Kt.slice(
      finish5Kt.indexOf("OPEN_GAP_FLAGS"),
      finish5Kt.indexOf("fun score"),
    );
    if (openBlock.includes("deeplinkE2e5Thin")) {
      errors.push("Finish5Kickoff.OPEN_GAP_FLAGS must drop deeplinkE2e5Thin");
    }
  }

  if (listing.deeplinkE2e5Phase !== 26) errors.push("listing.deeplinkE2e5Phase must be 26");
  if (listing.deeplinkE2e5Catalog !== "shared/ship/deeplink-e2e-5.json") {
    errors.push("listing.deeplinkE2e5Catalog mismatch");
  }
  if (pin.deeplinkE2e5 !== "shared/ship/deeplink-e2e-5.json") {
    errors.push("RELEASE_PIN.deeplinkE2e5 missing");
  }
  if (!pin.fixtures?.includes("parity-deeplink-e2e-5.json")) {
    errors.push("RELEASE_PIN missing parity-deeplink-e2e-5.json");
  }

  if (!dod.deeplinkE2e5 || dod.deeplinkE2e5.status !== "complete") {
    errors.push("DoD deeplinkE2e5 incomplete");
  }
  if (dod.deeplinkE2e5?.deeplinkE2e5Marker !== DEEPLINK_E2E_5_MARKER) {
    errors.push("DoD deeplinkE2e5 marker mismatch");
  }
  if ((dod.quotas?.playwrightE2eScenarios ?? 0) < 12) {
    errors.push("DoD quotas.playwrightE2eScenarios < 12");
  }
  if ((dod.quotas?.composeE2eScenarios ?? 0) < 14) {
    errors.push("DoD quotas.composeE2eScenarios < 14");
  }
  if ((dod.quotas?.deeplinkPanelAliases ?? 0) < 40) {
    errors.push("DoD quotas.deeplinkPanelAliases < 40");
  }

  if (!pkg.scripts?.["deeplinke2e5:validate"]) {
    errors.push("package.json missing deeplinke2e5:validate");
  }
  if (!ci.includes("deeplinke2e5:validate")) errors.push("ci.yml missing deeplinke2e5:validate");
  if (!ci.includes("deeplinke2e4:validate")) {
    errors.push("ci.yml missing soft deeplinke2e4:validate");
  }
  if (!kotlin.includes("CLOSES_GAP") || !kotlin.includes("PANEL_ALIAS_FLOOR")) {
    errors.push("Kotlin DeeplinkE2e5 missing constants");
  }
  if (!kotlin.includes("WEB_SCENARIO_FLOOR") || !kotlin.includes("COMPOSE_SCENARIO_FLOOR")) {
    errors.push("Kotlin DeeplinkE2e5 missing scenario floors");
  }

  if ((catalog.softFloors?.deeplinkE2e4PanelAliasFloor ?? 0) < 28) {
    errors.push("soft floor deeplink e2e 4 panel aliases must stay ≥28");
  }
  if ((catalog.softFloors?.webE2eHistoricalMinIdCount ?? 0) < 24) {
    errors.push("soft floor web E2E historical min must stay ≥24");
  }
  if ((catalog.softFloors?.composeHistoricalMinTagCount ?? 0) < 24) {
    errors.push("soft floor compose historical min must stay ≥24");
  }
  if (catalog.softDeeplinkE2e4Validate !== "npm run deeplinke2e4:validate") {
    errors.push("catalog softDeeplinkE2e4Validate must pin deeplinke2e4:validate");
  }

  for (const gate of DEEPLINK_E2E_5.preflightGates) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  if (fixture.expect?.closesGap !== "deeplinkE2e5Thin") {
    errors.push("parity expect.closesGap mismatch");
  }
  if (fixture.expect?.deeplinkE2e5Thin !== false) {
    errors.push("parity deeplinkE2e5Thin must be false");
  }
  if (!existsSync(resolve(root, "shared/tools/author_deeplink_e2e_5.py"))) {
    errors.push("missing author_deeplink_e2e_5.py");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("deeplinke2e5:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK deeplinke2e5:validate — Deep links + E2E floors ≥12/≥14 locked");
