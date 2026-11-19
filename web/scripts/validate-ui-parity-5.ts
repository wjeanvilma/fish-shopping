/**
 * Finish 5.0 Phase 23 — Web↔Android panel parity depth 5 readiness.
 *
 * Usage:
 *   npm run uiparity5:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import {
  measureUiParity5,
  UI_PARITY_5,
  UI_PARITY_5_MARKER,
  UI_PARITY_5_PHASE,
  UI_PARITY_5_SCHEMA,
} from "../src/ship/uiParity5";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/ui-parity-5.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-ui-parity-5.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/UiParity5.kt"),
    "utf8",
  );
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );
  const uiEn = readJson(resolve(root, "shared/i18n/ui-strings.en.json"));

  if (catalog.phase !== 23) errors.push(`phase expected 23, got ${catalog.phase}`);
  if (catalog.schema !== UI_PARITY_5_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (UI_PARITY_5_PHASE !== 23) errors.push("phase mirror mismatch");
  if (catalog.uiParity5Marker !== UI_PARITY_5_MARKER) errors.push("marker mismatch");
  if (fixture.uiParity5Marker !== UI_PARITY_5_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.schemaVersion !== 26) errors.push("schemaVersion must stay 26");
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");
  if (!["4.0.0", "5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack contentVersion must be 4.0.0, 5.0.0, or 6.0.0");
  if (pack.saveSchemaVersion < 26) errors.push("content-pack.saveSchemaVersion must be >= 26");

  const measure = measureUiParity5(root);
  if (measure.panelPairCount < UI_PARITY_5.panelPairMin) {
    errors.push(`panel pairs ${measure.panelPairCount} < ${UI_PARITY_5.panelPairMin}`);
  }
  if (measure.featureFloorCount < UI_PARITY_5.featureFloorMin) {
    errors.push(`feature floors ${measure.featureFloorCount} < ${UI_PARITY_5.featureFloorMin}`);
  }
  if (!measure.pairsPresent) errors.push("one or more panel pair paths missing");
  if (!measure.featuresPresent) {
    for (const m of measure.missingFeatureMarkers) {
      errors.push(`missing feature marker ${m}`);
    }
  }
  if (!measure.contentFloorsOk) {
    errors.push("content floors short (loans/goals/dailies)");
  }
  if (!measure.weeklyEndgameUxPresent) {
    errors.push("weekly/endgame Goals UX missing web↔Android");
  }
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 23 must set id=ui-parity-5 validate=uiparity5:validate");
  }
  if (!measure.kickoffClosed) errors.push("kickoff.gaps.uiParity5Incomplete must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const key of [
    "a11y.weeklyGoalsSection",
    "a11y.endgameSection",
    "goals.weeklyEmpty",
    "endgame.locked",
    "endgame.marks",
    "endgame.crests",
  ]) {
    if (!uiEn.strings?.[key]) errors.push(`ui-strings.en missing ${key}`);
  }

  if (kickoff.gaps?.uiParity5Incomplete !== false) {
    errors.push("kickoff.gaps.uiParity5Incomplete must be false");
  }
  const phase23 = (kickoff.phases as any[])?.find((p) => p.phase === 23);
  if (!phase23) errors.push("kickoff missing phase 23");
  else if (phase23.validate !== "uiparity5:validate") {
    errors.push("kickoff phase 23 validate must be uiparity5:validate");
  }
  if (phase23?.id !== "ui-parity-5") errors.push("kickoff phase 23 id mismatch");

  if (listing.uiParity5Phase !== 23) errors.push("listing.uiParity5Phase must be 23");
  if (listing.uiParity5Catalog !== "shared/ship/ui-parity-5.json") {
    errors.push("listing.uiParity5Catalog mismatch");
  }

  const block = dod.uiParity5;
  if (!block) errors.push("DoD missing uiParity5 block");
  else {
    if (block.phase !== 23) errors.push("DoD uiParity5.phase must be 23");
    if (block.plan !== "30_finish_5.0") errors.push("DoD uiParity5.plan mismatch");
    if (block.status !== "complete") errors.push("DoD uiParity5.status must be complete");
    if (block.uiParity5Marker !== UI_PARITY_5_MARKER) {
      errors.push("DoD uiParity5 marker mismatch");
    }
  }

  if (!pkg.scripts?.["uiparity5:validate"]) {
    errors.push("package.json missing uiparity5:validate");
  }
  if (!ci.includes("uiparity5:validate")) errors.push("ci.yml missing uiparity5:validate");
  if (!ci.includes("uiparity:validate")) errors.push("ci.yml missing soft uiparity:validate");
  if (!kotlin.includes("FEATURE_FLOOR_IDS")) errors.push("Kotlin UiParity5 missing FEATURE_FLOOR_IDS");
  if (!kotlin.includes("NEW_FEATURE_FLOOR_IDS")) {
    errors.push("Kotlin UiParity5 missing NEW_FEATURE_FLOOR_IDS");
  }
  if (!finish5Kt.includes("uiparity5:validate")) {
    errors.push("Finish5Kickoff.kt phase 23 missing uiparity5:validate");
  }
  if (finish5Kt.includes('"uiParity5Incomplete"')) {
    errors.push("Finish5Kickoff.kt OPEN_GAP_FLAGS must drop uiParity5Incomplete");
  }
  if (!existsSync(resolve(root, "shared/tools/author_ui_parity_5.py"))) {
    errors.push("missing author_ui_parity_5.py");
  }
  if (pin.uiParity5 !== "shared/ship/ui-parity-5.json") {
    errors.push("RELEASE_PIN.uiParity5 path mismatch");
  }
  if (!pin.fixtures?.includes("parity-ui-parity-5.json")) {
    errors.push("RELEASE_PIN missing parity-ui-parity-5.json");
  }
  if (fixture.expect?.panelPairMin !== 14) errors.push("parity panelPairMin must be 14");
  if (fixture.expect?.featureFloorMin !== 18) {
    errors.push("parity featureFloorMin must be 18");
  }
  if (fixture.expect?.uiParity5Incomplete !== false) {
    errors.push("parity uiParity5Incomplete must be false");
  }
  if ((catalog.panelPairs?.length ?? 0) < 14) errors.push("catalog panelPairs must list ≥14");
  if ((catalog.featureFloors?.length ?? 0) < 18) errors.push("catalog featureFloors must list ≥18");
  if ((catalog.newFeatureFloorIds?.length ?? 0) < 5) {
    errors.push("catalog newFeatureFloorIds must list ≥5");
  }
  if (catalog.softUiParityValidate !== "npm run uiparity:validate") {
    errors.push("catalog softUiParityValidate must pin uiparity:validate");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("uiparity5:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK uiparity5:validate — Web↔Android panel parity depth 5 wired");
