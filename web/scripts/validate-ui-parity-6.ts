/**
 * Finish 6.0 Phase 20 — Web↔Android panel parity depth 6 readiness.
 *
 * Usage:
 *   npm run uiparity6:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  UI_PARITY_6,
  UI_PARITY_6_MARKER,
  UI_PARITY_6_PHASE,
  UI_PARITY_6_SCHEMA,
  measureUiParity6,
} from "../src/ship/uiParity6";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/ui-parity-6.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-ui-parity-6.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/UiParity6.kt"),
    "utf8",
  );
  const finish6Kt = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt",
    ),
    "utf8",
  );
  const en = readJson(resolve(root, "shared/i18n/ui-strings.en.json"));

  if (catalog.phase !== 20) errors.push(`phase expected 20, got ${catalog.phase}`);
  if (catalog.schema !== UI_PARITY_6_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (UI_PARITY_6_PHASE !== 20) errors.push("phase mirror mismatch");
  if (catalog.uiParity6Marker !== UI_PARITY_6_MARKER) errors.push("marker mismatch");
  if (fixture.uiParity6Marker !== UI_PARITY_6_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "5.0.0") errors.push("contentVersion must stay 5.0.0");
  if (catalog.schemaVersion !== 27) errors.push("catalog schemaVersion must be 27");
  if (SCHEMA_VERSION < 27) errors.push("engine SCHEMA_VERSION must be >= 27");
  if (!["5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack contentVersion must be 5.0.0 or 6.0.0");
  if (pack.saveSchemaVersion < 27) errors.push("content-pack.saveSchemaVersion must be >= 27");

  const measure = measureUiParity6(root);
  if (measure.panelPairCount < UI_PARITY_6.panelPairMin) {
    errors.push(`panelPairs ${measure.panelPairCount} < ${UI_PARITY_6.panelPairMin}`);
  }
  if (measure.featureFloorCount < UI_PARITY_6.featureFloorMin) {
    errors.push(`featureFloors ${measure.featureFloorCount} < ${UI_PARITY_6.featureFloorMin}`);
  }
  if (!measure.pairsPresent) errors.push("one or more panel pair paths missing");
  if (!measure.featuresPresent) {
    for (const m of measure.missingFeatureMarkers.slice(0, 12)) {
      errors.push(`missing feature marker ${m}`);
    }
  }
  if (!measure.contentFloorsOk) {
    errors.push(
      `content floors below mins (loans≥${UI_PARITY_6.loanProductMin} goals≥${UI_PARITY_6.goalPresetMin} daily≥${UI_PARITY_6.dailyObjectiveMin})`,
    );
  }
  if (!measure.nestUxPresent) errors.push("nest UX markers missing in Goals/Dashboard/Title");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 20 must set id=ui-parity-6 validate=uiparity6:validate");
  }
  if (!measure.kickoffClosed) errors.push("kickoff.gaps.uiParity6Incomplete must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const id of UI_PARITY_6.newPanelPairIds) {
    if (!catalog.panelPairs.some((p: any) => p.id === id)) {
      errors.push(`catalog missing new panel pair ${id}`);
    }
  }
  for (const id of UI_PARITY_6.newFeatureFloorIds) {
    if (!catalog.featureFloors.some((f: any) => f.id === id)) {
      errors.push(`catalog missing new feature floor ${id}`);
    }
  }

  for (const key of ["bank.nestLoanBadge", "offline.nestJournal", "a11y.offlineNestJournal"]) {
    if (!en.strings?.[key]) errors.push(`ui-strings.en missing ${key}`);
  }

  if (kickoff.gaps?.uiParity6Incomplete !== false) {
    errors.push("kickoff.gaps.uiParity6Incomplete must be false");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("uiParity6Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must drop uiParity6Incomplete after Phase 20");
  }
  if (FINISH6_OPEN_GAP_FLAGS.length > 7) {
    errors.push(`OPEN_GAP_FLAGS expected ≤7 after Phase 22, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
  }
  const openSlice = finish6Kt.slice(
    finish6Kt.indexOf("OPEN_GAP_FLAGS"),
    finish6Kt.indexOf("OPEN_GAP_FLAGS") + 900,
  );
  if (openSlice.includes("uiParity6Incomplete")) {
    errors.push("Finish6Kickoff OPEN_GAP_FLAGS must drop uiParity6Incomplete");
  }
  const phase20 = (kickoff.phases as any[])?.find((p) => p.phase === 20);
  if (!phase20) errors.push("kickoff missing phase 20");
  else if (phase20.validate !== "uiparity6:validate") {
    errors.push("kickoff phase 20 validate must be uiparity6:validate");
  }
  if (phase20?.id !== "ui-parity-6") errors.push("kickoff phase 20 id mismatch");

  if (listing.uiParity6Phase !== 20) errors.push("listing.uiParity6Phase must be 20");
  if (listing.uiParity6Catalog !== "shared/ship/ui-parity-6.json") {
    errors.push("listing.uiParity6Catalog mismatch");
  }

  const block = dod.uiParity6;
  if (!block) errors.push("DoD missing uiParity6 block");
  else {
    if (block.phase !== 20) errors.push("DoD uiParity6.phase must be 20");
    if (block.plan !== "30_finish_6.0") errors.push("DoD uiParity6.plan mismatch");
    if (block.status !== "complete") errors.push("DoD uiParity6.status must be complete");
    if (block.uiParity6Marker !== UI_PARITY_6_MARKER) {
      errors.push("DoD uiParity6 marker mismatch");
    }
  }

  if (!pkg.scripts?.["uiparity6:validate"]) errors.push("package.json missing uiparity6:validate");
  if (!ci.includes("uiparity6:validate")) errors.push("ci.yml missing uiparity6:validate");
  if (!ci.includes("uiparity5:validate")) errors.push("ci.yml missing soft uiparity5:validate");
  if (!kotlin.includes("FEATURE_FLOOR_IDS")) errors.push("Kotlin UiParity6 missing FEATURE_FLOOR_IDS");
  if (!kotlin.includes("NEW_FEATURE_FLOOR_IDS")) {
    errors.push("Kotlin UiParity6 missing NEW_FEATURE_FLOOR_IDS");
  }
  if (!finish6Kt.includes("uiparity6:validate")) {
    errors.push("Finish6Kickoff.kt phase 20 missing uiparity6:validate");
  }
  if (!existsSync(resolve(root, "shared/tools/author_ui_parity_6.py"))) {
    errors.push("missing author_ui_parity_6.py");
  }
  if (pin.uiParity6 !== "shared/ship/ui-parity-6.json") {
    errors.push("RELEASE_PIN.uiParity6 path mismatch");
  }
  if (!pin.fixtures?.includes("parity-ui-parity-6.json")) {
    errors.push("RELEASE_PIN missing parity-ui-parity-6.json");
  }
  if (fixture.expect?.panelPairMin !== 16) errors.push("parity panelPairMin must be 16");
  if (fixture.expect?.featureFloorMin !== 23) {
    errors.push("parity featureFloorMin must be 23");
  }
  if (fixture.expect?.uiParity6Incomplete !== false) {
    errors.push("parity uiParity6Incomplete must be false");
  }
  if (fixture.expect?.openGapFlagMin > 7) {
    errors.push("parity openGapFlagMin must be ≤7 after Phase 20");
  }
  if ((catalog.panelPairs?.length ?? 0) < 16) errors.push("catalog panelPairs must list ≥16");
  if ((catalog.featureFloors?.length ?? 0) < 23) errors.push("catalog featureFloors must list ≥23");
  if ((catalog.newFeatureFloorIds?.length ?? 0) < 5) {
    errors.push("catalog newFeatureFloorIds must list ≥5");
  }
  if (catalog.softUiParity5Validate !== "npm run uiparity5:validate") {
    errors.push("catalog softUiParity5Validate must pin uiparity5:validate");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("uiparity6:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK uiparity6:validate — Web↔Android panel parity depth 6 wired");
