/**
 * Finish 6.0 Phase 23 — Playwright E2E floors ≥24 readiness.
 *
 * Usage:
 *   npm run playwrighte2e6:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { WEB_E2E_ID_LIST } from "../src/e2e/webE2eIds";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  PLAYWRIGHT_E2E_6,
  PLAYWRIGHT_E2E_6_CLOSES_GAP,
  PLAYWRIGHT_E2E_6_ID_FLOOR,
  PLAYWRIGHT_E2E_6_MARKER,
  PLAYWRIGHT_E2E_6_NEST_ALIAS_MIN,
  PLAYWRIGHT_E2E_6_PHASE,
  PLAYWRIGHT_E2E_6_SCENARIO_FLOOR,
  PLAYWRIGHT_E2E_6_SCHEMA,
} from "../src/ship/playwrightE2e6";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/playwright-e2e-6.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-playwright-e2e-6.json"));
  const webE2e = readJson(resolve(root, "shared/ship/web-e2e.json"));
  const routes = readJson(resolve(root, "shared/deep-links/routes.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const finish6Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt"),
    "utf8",
  );
  const routesKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/deeplink/DeepLinkRoutes.kt"),
    "utf8",
  );
  const ids = readFileSync(resolve(root, "web/src/e2e/webE2eIds.ts"), "utf8");
  const smoke = readFileSync(resolve(root, "web/e2e/smoke.spec.ts"), "utf8");
  const tags = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/ComposeUiTags.kt"),
    "utf8",
  );

  if (catalog.phase !== 23) errors.push(`phase expected 23, got ${catalog.phase}`);
  if (catalog.schema !== PLAYWRIGHT_E2E_6_SCHEMA) errors.push("schema mismatch");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (PLAYWRIGHT_E2E_6_PHASE !== 23) errors.push("phase mirror mismatch");
  if (catalog.playwrightE2e6Marker !== PLAYWRIGHT_E2E_6_MARKER) errors.push("marker mismatch");
  if (fixture.playwrightE2e6Marker !== PLAYWRIGHT_E2E_6_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "5.0.0") errors.push("contentVersion must stay 5.0.0");
  if (catalog.schemaVersion !== 27) errors.push("catalog schemaVersion must stay 27");
  if (SCHEMA_VERSION < 27) errors.push("engine SCHEMA_VERSION must be ≥ 27");
  if (catalog.closesGap !== PLAYWRIGHT_E2E_6_CLOSES_GAP) errors.push("closesGap mismatch");
  if (!["5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack must be 5.0.0 or 6.0.0");

  if (catalog.scenarioFloor !== PLAYWRIGHT_E2E_6_SCENARIO_FLOOR) {
    errors.push("scenarioFloor mirror mismatch");
  }
  if (catalog.idCountFloor !== PLAYWRIGHT_E2E_6_ID_FLOOR) errors.push("idCountFloor mirror mismatch");
  if (catalog.nestAliasMin !== PLAYWRIGHT_E2E_6_NEST_ALIAS_MIN) {
    errors.push("nestAliasMin mirror mismatch");
  }

  const scenarios = (webE2e.scenarios as string[] | undefined) ?? [];
  if (scenarios.length < PLAYWRIGHT_E2E_6_SCENARIO_FLOOR) {
    errors.push(`web-e2e scenarios ${scenarios.length} < ${PLAYWRIGHT_E2E_6_SCENARIO_FLOOR}`);
  }
  if (WEB_E2E_ID_LIST.length < PLAYWRIGHT_E2E_6_ID_FLOOR) {
    errors.push(`WEB_E2E_ID_LIST ${WEB_E2E_ID_LIST.length} < ${PLAYWRIGHT_E2E_6_ID_FLOOR}`);
  }

  const panelAliases = routes.panelAliases ?? {};
  let nestAliasCount = 0;
  for (const alias of PLAYWRIGHT_E2E_6.nestAliases) {
    if (!panelAliases[alias]) errors.push(`routes missing panel alias ${alias}`);
    else nestAliasCount += 1;
    if (!routesKt.includes(`"${alias}"`)) {
      errors.push(`DeepLinkRoutes.kt missing "${alias}"`);
    }
  }
  if (nestAliasCount < PLAYWRIGHT_E2E_6_NEST_ALIAS_MIN) {
    errors.push(`nest aliases ${nestAliasCount} < ${PLAYWRIGHT_E2E_6_NEST_ALIAS_MIN}`);
  }

  for (const id of fixture.expect.requiredIds as string[]) {
    if (!ids.includes(`"${id}"`)) errors.push(`webE2eIds missing "${id}"`);
    if (!tags.includes(`"${id}"`)) errors.push(`ComposeUiTags missing "${id}"`);
  }
  for (const needle of fixture.expect.smokeMustContain as string[]) {
    if (!smoke.includes(needle)) errors.push(`smoke.spec missing "${needle}"`);
  }

  if (kickoff.gaps?.e2eDepthThin !== false) {
    errors.push("kickoff.gaps.e2eDepthThin must be false");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("e2eDepthThin")) {
    errors.push("OPEN_GAP_FLAGS must drop e2eDepthThin after Phase 23");
  }
  if (FINISH6_OPEN_GAP_FLAGS.length > 6) {
    errors.push(`OPEN_GAP_FLAGS expected ≤6 after Phase 23, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
  }
  const openSlice = finish6Kt.slice(
    finish6Kt.indexOf("OPEN_GAP_FLAGS"),
    finish6Kt.indexOf("OPEN_GAP_FLAGS") + 900,
  );
  if (openSlice.includes("e2eDepthThin")) {
    errors.push("Finish6Kickoff.OPEN_GAP_FLAGS must drop e2eDepthThin");
  }
  const phase23 = (kickoff.phases as any[])?.find((p) => p.phase === 23);
  if (!phase23 || phase23.validate !== "playwrighte2e6:validate") {
    errors.push("kickoff phase 23 validate must be playwrighte2e6:validate");
  }
  if (phase23?.id !== "playwright-e2e-6") errors.push("kickoff phase 23 id must be playwright-e2e-6");
  if (!finish6Kt.includes("playwrighte2e6:validate")) {
    errors.push("Finish6Kickoff.kt missing playwrighte2e6:validate");
  }

  if ((kickoff.baseline?.playwrightE2e ?? 0) < 24) {
    errors.push("kickoff.baseline.playwrightE2e must be ≥24");
  }
  if ((kickoff.endState?.playwrightE2eMin ?? 0) < 24) {
    errors.push("kickoff.endState.playwrightE2eMin must be ≥24");
  }

  if (listing.playwrightE2e6Phase !== 23) errors.push("listing.playwrightE2e6Phase must be 23");
  if (listing.playwrightE2e6Catalog !== "shared/ship/playwright-e2e-6.json") {
    errors.push("listing.playwrightE2e6Catalog mismatch");
  }
  if (pin.playwrightE2e6 !== "shared/ship/playwright-e2e-6.json") {
    errors.push("RELEASE_PIN.playwrightE2e6 missing");
  }
  if (!pin.fixtures?.includes("parity-playwright-e2e-6.json")) {
    errors.push("RELEASE_PIN missing parity-playwright-e2e-6.json");
  }

  if (!dod.playwrightE2e6 || dod.playwrightE2e6.status !== "complete") {
    errors.push("DoD playwrightE2e6 incomplete");
  }
  if (dod.playwrightE2e6?.playwrightE2e6Marker !== PLAYWRIGHT_E2E_6_MARKER) {
    errors.push("DoD playwrightE2e6 marker mismatch");
  }
  if ((dod.quotas?.playwrightE2eScenarios ?? 0) < 24) {
    errors.push("DoD quotas.playwrightE2eScenarios < 24");
  }

  if (!pkg.scripts?.["playwrighte2e6:validate"]) {
    errors.push("package.json missing playwrighte2e6:validate");
  }
  if (!ci.includes("playwrighte2e6:validate")) errors.push("ci.yml missing playwrighte2e6:validate");
  if (!ci.includes("deeplinke2e5:validate")) {
    errors.push("ci.yml missing soft deeplinke2e5:validate");
  }
  if (!ci.includes("webe2e:validate")) errors.push("ci.yml missing soft webe2e:validate");
  if (!existsSync(resolve(root, "shared/tools/author_playwright_e2e_6.py"))) {
    errors.push("missing author_playwright_e2e_6.py");
  }

  if (fixture.expect?.scenarioFloor !== 24) errors.push("parity scenarioFloor must be 24");
  if (fixture.expect?.openGapFlagMin > 6) errors.push("parity openGapFlagMin must be ≤6");
  if (fixture.expect?.e2eDepthThin !== false) errors.push("parity e2eDepthThin must be false");

  for (const gate of PLAYWRIGHT_E2E_6.preflightGates) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("playwrighte2e6:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK playwrighte2e6:validate — Playwright E2E ≥24 + nest deep-links wired");
