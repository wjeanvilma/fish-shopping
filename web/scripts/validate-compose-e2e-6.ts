/**
 * Finish 6.0 Phase 24 — Compose instrumented floors ≥20 readiness.
 *
 * Usage:
 *   npm run composee2e6:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  COMPOSE_E2E_6,
  COMPOSE_E2E_6_CLOSES_GAP,
  COMPOSE_E2E_6_MARKER,
  COMPOSE_E2E_6_PHASE,
  COMPOSE_E2E_6_SCENARIO_FLOOR,
  COMPOSE_E2E_6_SCHEMA,
  COMPOSE_E2E_6_TAG_FLOOR,
} from "../src/ship/composeE2e6";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/compose-e2e-6.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-compose-e2e-6.json"));
  const composeUi = readJson(resolve(root, "shared/ship/compose-ui-tests.json"));
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
  const tags = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/ComposeUiTags.kt"),
    "utf8",
  );
  const robo = readFileSync(
    resolve(root, "app/src/test/java/com/willio/jeanvilma/fishshopping/ComposeUiIntegrationTest.kt"),
    "utf8",
  );
  const dashKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/BusinessDashboardPanel.kt"),
    "utf8",
  );
  const bagKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/StationBagPanels.kt"),
    "utf8",
  );

  if (catalog.phase !== 24) errors.push(`phase expected 24, got ${catalog.phase}`);
  if (catalog.schema !== COMPOSE_E2E_6_SCHEMA) errors.push("schema mismatch");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (COMPOSE_E2E_6_PHASE !== 24) errors.push("phase mirror mismatch");
  if (catalog.composeE2e6Marker !== COMPOSE_E2E_6_MARKER) errors.push("marker mismatch");
  if (fixture.composeE2e6Marker !== COMPOSE_E2E_6_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "5.0.0") errors.push("contentVersion must stay 5.0.0");
  if (catalog.schemaVersion !== 27) errors.push("catalog schemaVersion must stay 27");
  if (SCHEMA_VERSION < 27) errors.push("engine SCHEMA_VERSION must be ≥ 27");
  if (catalog.closesGap !== COMPOSE_E2E_6_CLOSES_GAP) errors.push("closesGap mismatch");
  if (!["5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack must be 5.0.0 or 6.0.0");

  if (catalog.scenarioFloor !== COMPOSE_E2E_6_SCENARIO_FLOOR) {
    errors.push("scenarioFloor mirror mismatch");
  }
  if (catalog.tagCountFloor !== COMPOSE_E2E_6_TAG_FLOOR) errors.push("tagCountFloor mirror mismatch");

  const scenarios = (composeUi.scenarios as string[] | undefined) ?? [];
  if (scenarios.length < COMPOSE_E2E_6_SCENARIO_FLOOR) {
    errors.push(`compose scenarios ${scenarios.length} < ${COMPOSE_E2E_6_SCENARIO_FLOOR}`);
  }
  const tagCount = (tags.match(/const val [A-Z0-9_]+ = "/g) ?? []).length;
  if (tagCount < COMPOSE_E2E_6_TAG_FLOOR) {
    errors.push(`ComposeUiTags ${tagCount} < ${COMPOSE_E2E_6_TAG_FLOOR}`);
  }

  for (const tag of COMPOSE_E2E_6.nestTags) {
    if (!tags.includes(`"${tag}"`)) errors.push(`ComposeUiTags missing "${tag}"`);
  }
  for (const tag of fixture.expect.requiredTags as string[]) {
    if (!tags.includes(`"${tag}"`)) errors.push(`required tag missing "${tag}"`);
  }
  for (const needle of fixture.expect.robolectricMustContain as string[]) {
    if (!robo.includes(needle)) errors.push(`ComposeUiIntegrationTest missing ${needle}`);
  }

  if (!dashKt.includes("NEST_TREASURY") || !dashKt.includes("DASH_ROOT")) {
    errors.push("BusinessDashboardPanel missing nest/dash testTags");
  }
  if (!bagKt.includes("BAG_PANEL")) errors.push("BagDetailPanel missing BAG_PANEL testTag");

  if (kickoff.gaps?.composeE2eThin !== false) {
    errors.push("kickoff.gaps.composeE2eThin must be false");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("composeE2eThin")) {
    errors.push("OPEN_GAP_FLAGS must drop composeE2eThin after Phase 24");
  }
  if (FINISH6_OPEN_GAP_FLAGS.length > 5) {
    errors.push(`OPEN_GAP_FLAGS expected ≤5 after Phase 24, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
  }
  const openSlice = finish6Kt.slice(
    finish6Kt.indexOf("OPEN_GAP_FLAGS"),
    finish6Kt.indexOf("OPEN_GAP_FLAGS") + 900,
  );
  if (openSlice.includes("composeE2eThin")) {
    errors.push("Finish6Kickoff.OPEN_GAP_FLAGS must drop composeE2eThin");
  }
  const phase24 = (kickoff.phases as any[])?.find((p) => p.phase === 24);
  if (!phase24 || phase24.validate !== "composee2e6:validate") {
    errors.push("kickoff phase 24 validate must be composee2e6:validate");
  }
  if (phase24?.id !== "compose-e2e-6") errors.push("kickoff phase 24 id must be compose-e2e-6");
  if (!finish6Kt.includes("composee2e6:validate")) {
    errors.push("Finish6Kickoff.kt missing composee2e6:validate");
  }

  if ((kickoff.baseline?.composeE2e ?? 0) < 20) {
    errors.push("kickoff.baseline.composeE2e must be ≥20");
  }
  if ((kickoff.endState?.composeE2eMin ?? 0) < 20) {
    errors.push("kickoff.endState.composeE2eMin must be ≥20");
  }

  if (listing.composeE2e6Phase !== 24) errors.push("listing.composeE2e6Phase must be 24");
  if (listing.composeE2e6Catalog !== "shared/ship/compose-e2e-6.json") {
    errors.push("listing.composeE2e6Catalog mismatch");
  }
  if (pin.composeE2e6 !== "shared/ship/compose-e2e-6.json") {
    errors.push("RELEASE_PIN.composeE2e6 missing");
  }
  if (!pin.fixtures?.includes("parity-compose-e2e-6.json")) {
    errors.push("RELEASE_PIN missing parity-compose-e2e-6.json");
  }

  if (!dod.composeE2e6 || dod.composeE2e6.status !== "complete") {
    errors.push("DoD composeE2e6 incomplete");
  }
  if (dod.composeE2e6?.composeE2e6Marker !== COMPOSE_E2E_6_MARKER) {
    errors.push("DoD composeE2e6 marker mismatch");
  }
  if ((dod.quotas?.composeE2eScenarios ?? 0) < 20) {
    errors.push("DoD quotas.composeE2eScenarios < 20");
  }

  if (!pkg.scripts?.["composee2e6:validate"]) {
    errors.push("package.json missing composee2e6:validate");
  }
  if (!ci.includes("composee2e6:validate")) errors.push("ci.yml missing composee2e6:validate");
  if (!ci.includes("deeplinke2e5:validate")) {
    errors.push("ci.yml missing soft deeplinke2e5:validate");
  }
  if (!ci.includes("composeui:validate")) errors.push("ci.yml missing soft composeui:validate");
  if (!existsSync(resolve(root, "shared/tools/author_compose_e2e_6.py"))) {
    errors.push("missing author_compose_e2e_6.py");
  }

  if (fixture.expect?.scenarioFloor !== 20) errors.push("parity scenarioFloor must be 20");
  if (fixture.expect?.openGapFlagMin > 5) errors.push("parity openGapFlagMin must be ≤5");
  if (fixture.expect?.composeE2eThin !== false) errors.push("parity composeE2eThin must be false");

  for (const gate of COMPOSE_E2E_6.preflightGates) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("composee2e6:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK composee2e6:validate — Compose E2E ≥20 + nest tags wired");
