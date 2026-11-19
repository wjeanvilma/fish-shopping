/**
 * Finish 6.0 Phase 3 — ship catalog codegen readiness.
 *
 * Usage:
 *   npm run shipcodegen:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  measureShipCodegen,
  SHIP_CODEGEN,
  SHIP_CODEGEN_MARKER,
  SHIP_CODEGEN_PHASE,
  SHIP_CODEGEN_SCHEMA,
} from "../src/ship/shipCodegen";
import { SHIP_CODEGEN_GEN } from "../src/ship/generated/shipCodegen.gen";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/ship-codegen.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-ship-codegen.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ShipCodegen.kt"),
    "utf8",
  );
  const finish6Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt"),
    "utf8",
  );

  if (catalog.phase !== 3) errors.push(`phase expected 3, got ${catalog.phase}`);
  if (catalog.schema !== SHIP_CODEGEN_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (SHIP_CODEGEN_PHASE !== 3) errors.push("phase mirror mismatch");
  if (catalog.shipCodegenMarker !== SHIP_CODEGEN_MARKER) errors.push("marker mismatch");
  if (fixture.shipCodegenMarker !== SHIP_CODEGEN_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "5.0.0") errors.push("contentVersion must stay 5.0.0");
  if (catalog.schemaVersion !== 26) errors.push("schemaVersion must stay 26");
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");

  if (catalog.catalogMin !== 3) errors.push("catalogMin must be 3");
  if (catalog.featureMin !== 4) errors.push("featureMin must be 4");
  if (!Array.isArray(catalog.catalogs) || catalog.catalogs.length < 3) {
    errors.push("catalogs must list ≥3 Finish 6 entries");
  }
  if (!Array.isArray(catalog.features) || catalog.features.length < 4) {
    errors.push("features must list ≥4 entries");
  }
  for (const f of ["list", "check", "write", "finish6-only"]) {
    if (!catalog.features.includes(f)) errors.push(`features missing ${f}`);
  }

  const measure = measureShipCodegen(root);
  if (measure.catalogCount < SHIP_CODEGEN.catalogMin) {
    errors.push(`catalogCount ${measure.catalogCount} < ${SHIP_CODEGEN.catalogMin}`);
  }
  if (measure.featureCount < SHIP_CODEGEN.featureMin) {
    errors.push(`featureCount ${measure.featureCount} < ${SHIP_CODEGEN.featureMin}`);
  }
  if (!measure.generatedPresent) errors.push("generated TS/Kotlin mirrors missing");
  if (!measure.checkClean) {
    errors.push("ship:codegen --check would fail");
    errors.push(...measure.checkErrors.slice(0, 12));
  }
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 3 must set id=ship-codegen validate=shipcodegen:validate");
  }
  if (!measure.gapClosed) errors.push("kickoff.gaps.shipCodegenMissing must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if (kickoff.gaps?.shipCodegenMissing !== false) {
    errors.push("kickoff gap shipCodegenMissing must be false");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("shipCodegenMissing")) {
    errors.push("OPEN_GAP_FLAGS must not include shipCodegenMissing after Phase 3");
  }

  if (SHIP_CODEGEN_GEN.marker !== SHIP_CODEGEN_MARKER) {
    errors.push("generated SHIP_CODEGEN_GEN.marker mismatch");
  }
  if (SHIP_CODEGEN_GEN.phase !== 3) errors.push("generated SHIP_CODEGEN_GEN.phase must be 3");

  if (listing.shipCodegenPhase !== 3) errors.push("listing.shipCodegenPhase must be 3");
  if (listing.shipCodegenCatalog !== "shared/ship/ship-codegen.json") {
    errors.push("listing.shipCodegenCatalog mismatch");
  }
  if (pin.shipCodegen !== "shared/ship/ship-codegen.json") {
    errors.push("RELEASE_PIN.shipCodegen path missing");
  }
  if (!pin.fixtures?.includes("parity-ship-codegen.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-ship-codegen.json");
  }

  const block = dod.shipCodegen;
  if (!block) errors.push("DoD missing shipCodegen block");
  else {
    if (block.phase !== 3) errors.push("DoD shipCodegen.phase must be 3");
    if (block.plan !== "30_finish_6.0") errors.push("DoD shipCodegen.plan mismatch");
    if (block.status !== "complete") errors.push("DoD shipCodegen.status must be complete");
    if (block.shipCodegenMarker !== SHIP_CODEGEN_MARKER) {
      errors.push("DoD shipCodegen marker mismatch");
    }
  }

  if (!pkg.scripts?.["ship:codegen"]) errors.push("package.json missing ship:codegen");
  if (!pkg.scripts?.["shipcodegen:validate"]) errors.push("package.json missing shipcodegen:validate");
  if (!pkg.scripts?.["shipcodegen:smoke"]) errors.push("package.json missing shipcodegen:smoke");
  if (!ci.includes("shipcodegen:validate")) errors.push("ci.yml missing shipcodegen:validate");
  if (!ci.includes("shipcodegen:smoke")) errors.push("ci.yml missing shipcodegen:smoke");
  if (!ci.includes("ship:codegen")) errors.push("ci.yml missing ship:codegen check");
  if (!kotlin.includes("GENERATED_TS")) errors.push("Kotlin ShipCodegen missing GENERATED_TS");
  if (!kotlin.includes("CATALOG_IDS")) errors.push("Kotlin ShipCodegen missing CATALOG_IDS");
  if (!finish6Kt.includes("shipcodegen:validate")) {
    errors.push("Finish6Kickoff.kt phase 3 missing shipcodegen:validate");
  }
  const openBlock = finish6Kt.slice(
    finish6Kt.indexOf("OPEN_GAP_FLAGS"),
    finish6Kt.indexOf("fun score"),
  );
  if (openBlock.includes("shipCodegenMissing")) {
    errors.push("Finish6Kickoff OPEN_GAP_FLAGS must drop shipCodegenMissing");
  }

  if (!existsSync(resolve(root, "shared/tools/ship_codegen.py"))) {
    errors.push("missing ship_codegen.py wrapper");
  }
  if (fixture.expect?.catalogMin !== 3) errors.push("parity fixture catalogMin must be 3");
  if (fixture.expect?.gapClosed !== "shipCodegenMissing") {
    errors.push("parity fixture gapClosed mismatch");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("shipcodegen:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK shipcodegen:validate — Finish 6.0 Phase 3 ship catalog codegen locked");
