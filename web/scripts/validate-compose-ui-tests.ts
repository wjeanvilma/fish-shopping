/**
 * Finish 3.0 Phase 21 — Compose UI integration tests readiness.
 *
 * Usage:
 *   npm run composeui:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import { FINISH3_OPEN_GAP_FLAGS } from "../src/ship/finish3Kickoff";
import {
  COMPOSE_UI_CLOSES_GAP,
  COMPOSE_UI_TESTS,
  COMPOSE_UI_TESTS_MARKER,
  COMPOSE_UI_TESTS_PHASE,
  COMPOSE_UI_TESTS_SCHEMA,
  measureComposeUiTests,
} from "../src/ship/composeUiTests";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/compose-ui-tests.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-compose-ui-tests.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ComposeUiTests.kt"),
    "utf8",
  );
  const tags = readFileSync(resolve(root, catalog.tagsModule), "utf8");
  const robo = readFileSync(resolve(root, catalog.robolectricSuite), "utf8");
  const instr = readFileSync(resolve(root, catalog.instrumentedSuite), "utf8");
  const build = readFileSync(resolve(root, "app/build.gradle.kts"), "utf8");

  if (catalog.phase !== 21) errors.push(`phase expected 21, got ${catalog.phase}`);
  if (catalog.schema !== COMPOSE_UI_TESTS_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (COMPOSE_UI_TESTS_PHASE !== 21) errors.push("phase mirror mismatch");
  if (catalog.composeUiTestsMarker !== COMPOSE_UI_TESTS_MARKER) errors.push("marker mismatch");
  if (fixture.composeUiTestsMarker !== COMPOSE_UI_TESTS_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (catalog.schemaVersion !== 24) errors.push("catalog schemaVersion must stay 24");
  if (SCHEMA_VERSION !== 24) errors.push("engine SCHEMA_VERSION must stay 24");
  if (catalog.closesGap !== "composeUiTestsMissing") errors.push("closesGap mismatch");
  if (COMPOSE_UI_CLOSES_GAP !== "composeUiTestsMissing") {
    errors.push("closesGap mirror mismatch");
  }

  const measure = measureComposeUiTests(root);
  if (measure.schemaVersion !== 24) errors.push("measure schemaVersion must be 24");
  if (!measure.tagsPresent) errors.push("ComposeUiTags incomplete");
  if (!measure.tagCountOk) errors.push(`tag count must be ≥ ${catalog.minTagCount}`);
  if (!measure.robolectricPresent) errors.push("Robolectric ComposeUiIntegrationTest incomplete");
  if (!measure.instrumentedPresent) errors.push("TitleMenuInstrumentedTest incomplete");
  if (!measure.titleMenuExtracted) errors.push("TitleMenuContent extract missing");
  if (!measure.buildGradleWired) errors.push("app build.gradle Robolectric wiring incomplete");
  if (!measure.gapClosed) errors.push("kickoff.gaps.composeUiTestsMissing must be false");
  if (!measure.kickoffWired) {
    errors.push(
      "kickoff phase 21 must set validate=composeui:validate, gap closed, measuredAtPhase≥21",
    );
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const tag of fixture.expect.requiredTags as string[]) {
    if (!tags.includes(`"${tag}"`)) errors.push(`ComposeUiTags missing "${tag}"`);
  }
  for (const needle of fixture.expect.tagsSourceMustContain as string[]) {
    if (!tags.includes(needle)) errors.push(`ComposeUiTags missing ${needle}`);
  }
  for (const needle of fixture.expect.robolectricMustContain as string[]) {
    if (!robo.includes(needle)) errors.push(`ComposeUiIntegrationTest missing "${needle}"`);
  }
  for (const needle of fixture.expect.instrumentedMustContain as string[]) {
    if (!instr.includes(needle)) errors.push(`instrumented suite missing "${needle}"`);
  }
  for (const needle of fixture.expect.buildGradleMustContain as string[]) {
    if (!build.includes(needle) && needle !== "robolectric") {
      errors.push(`app/build.gradle.kts missing "${needle}"`);
    }
  }
  if (!build.includes("robolectric") && !build.includes("libs.robolectric")) {
    errors.push("app/build.gradle.kts missing robolectric dependency");
  }

  if ((catalog.scenarios as string[]).length < 5) {
    errors.push("catalog must list ≥5 scenarios");
  }

  if (kickoff.gaps?.composeUiTestsMissing !== false) {
    errors.push("kickoff gap composeUiTestsMissing must be false");
  }
  if (FINISH3_OPEN_GAP_FLAGS.includes("composeUiTestsMissing")) {
    errors.push("OPEN_GAP_FLAGS must not include closed composeUiTestsMissing");
  }
  const phase21 = (kickoff.phases as any[])?.find((p: any) => p.phase === 21);
  if (!phase21 || phase21.validate !== "composeui:validate") {
    errors.push("kickoff phase 21 validate must be composeui:validate");
  }
  if ((kickoff.baseline?.measuredAtPhase ?? 0) < 21) {
    errors.push("kickoff.baseline.measuredAtPhase must be ≥ 21");
  }

  if (listing.composeUiTestsPhase !== 21) errors.push("listing.composeUiTestsPhase must be 21");
  if (listing.composeUiTestsCatalog !== "shared/ship/compose-ui-tests.json") {
    errors.push("listing.composeUiTestsCatalog mismatch");
  }
  if (pin.composeUiTests !== "shared/ship/compose-ui-tests.json") {
    errors.push("RELEASE_PIN.composeUiTests path missing");
  }
  if (!pin.fixtures?.includes("parity-compose-ui-tests.json")) {
    errors.push("RELEASE_PIN missing parity-compose-ui-tests.json");
  }

  const block = dod.composeUiTests;
  if (!block) errors.push("DoD missing composeUiTests block");
  else {
    if (block.phase !== 21) errors.push("DoD composeUiTests.phase must be 21");
    if (block.plan !== "30_finish_3.0") errors.push("DoD composeUiTests.plan mismatch");
    if (block.status !== "complete") errors.push("DoD composeUiTests.status must be complete");
    if (block.composeUiTestsMarker !== COMPOSE_UI_TESTS_MARKER) {
      errors.push("DoD composeUiTests marker mismatch");
    }
  }

  if (!pkg.scripts?.["composeui:validate"]) errors.push("package.json missing composeui:validate");
  if (!ci.includes("composeui:validate")) errors.push("ci.yml missing composeui:validate");
  if (!ci.includes("ComposeUiIntegrationTest") && !ci.includes("testDebugUnitTest")) {
    errors.push("ci.yml missing Compose UI unit test gate");
  }
  if (!kotlin.includes("CLOSES_GAP") || !kotlin.includes("ROBOLECTRIC_SUITE")) {
    errors.push("Kotlin ComposeUiTests missing constants");
  }

  if (fixture.expect?.closesGap !== "composeUiTestsMissing") {
    errors.push("parity expect.closesGap mismatch");
  }

  for (const gate of COMPOSE_UI_TESTS.preflightGates) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("composeui:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK composeui:validate — Compose UI integration tests locked");
