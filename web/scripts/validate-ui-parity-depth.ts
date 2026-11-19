/**
 * Finish 4.0 Phase 22 — Web↔Android panel feature parity depth readiness.
 *
 * Usage:
 *   npm run uiparity:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import {
  UI_PARITY,
  UI_PARITY_MARKER,
  UI_PARITY_PHASE,
  UI_PARITY_SCHEMA,
  measureUiParity,
} from "../src/ship/uiParity";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/ui-parity-depth.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-ui-parity-depth.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/UiParity.kt"),
    "utf8",
  );
  const finish4Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish4Kickoff.kt"),
    "utf8",
  );

  if (catalog.phase !== 22) errors.push(`phase expected 22, got ${catalog.phase}`);
  if (catalog.schema !== UI_PARITY_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (UI_PARITY_PHASE !== 22) errors.push("phase mirror mismatch");
  if (catalog.uiParityMarker !== UI_PARITY_MARKER) errors.push("marker mismatch");
  if (fixture.uiParityMarker !== UI_PARITY_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.schemaVersion !== 25) errors.push("schemaVersion must stay 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");

  const measure = measureUiParity(root);
  // Finish 5.0 Phase 23 soft-floor: historical Finish 4 floors stay met (≥).
  if (measure.panelPairCount < UI_PARITY.panelPairMin) {
    errors.push(`panel pairs ${measure.panelPairCount} < ${UI_PARITY.panelPairMin}`);
  }
  if (measure.featureFloorCount < 13) {
    errors.push(`feature floors ${measure.featureFloorCount} < 13`);
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
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 22 must set id=ui-parity-depth validate=uiparity:validate");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  const phase22 = (kickoff.phases as any[])?.find((p) => p.phase === 22);
  if (!phase22 || phase22.validate !== "uiparity:validate") {
    errors.push("kickoff phase 22 validate must be uiparity:validate");
  }
  if (phase22?.id !== "ui-parity-depth") errors.push("kickoff phase 22 id must be ui-parity-depth");

  if (listing.uiParityPhase !== 22) errors.push("listing.uiParityPhase must be 22");
  if (listing.uiParityCatalog !== "shared/ship/ui-parity-depth.json") {
    errors.push("listing.uiParityCatalog mismatch");
  }
  if (pin.uiParity !== "shared/ship/ui-parity-depth.json") {
    errors.push("RELEASE_PIN.uiParity path missing");
  }
  if (!pin.fixtures?.includes("parity-ui-parity-depth.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-ui-parity-depth.json");
  }

  const block = dod.uiParity;
  if (!block) errors.push("DoD missing uiParity block");
  else {
    if (block.phase !== 22) errors.push("DoD uiParity.phase must be 22");
    if (block.plan !== "30_finish_4.0") errors.push("DoD uiParity.plan mismatch");
    if (block.status !== "complete") errors.push("DoD uiParity.status must be complete");
    if (block.uiParityMarker !== UI_PARITY_MARKER) {
      errors.push("DoD uiParity marker mismatch");
    }
  }

  if (!pkg.scripts?.["uiparity:validate"]) errors.push("package.json missing uiparity:validate");
  if (!ci.includes("uiparity:validate")) errors.push("ci.yml missing uiparity:validate");
  if (!kotlin.includes("FEATURE_FLOOR_IDS")) errors.push("Kotlin UiParity missing FEATURE_FLOOR_IDS");
  if (!finish4Kt.includes("uiparity:validate")) {
    errors.push("Finish4Kickoff.kt phase 22 missing uiparity:validate");
  }
  if (!existsSync(resolve(root, "shared/tools/author_ui_parity_depth.py"))) {
    errors.push("missing author_ui_parity_depth.py");
  }

  if ((fixture.expect?.panelPairMin ?? 0) < 12) errors.push("parity panelPairMin must be ≥12");
  if ((fixture.expect?.featureFloorCount ?? 0) < 13) {
    errors.push("parity featureFloorCount must be ≥13");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("uiparity:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK uiparity:validate — Web↔Android panel feature parity depth wired");
