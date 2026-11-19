/**
 * Finish 6.0 Phase 2 — schema foundations readiness.
 *
 * Usage:
 *   npm run schema6:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { SCHEMA_INDEX } from "../src/schema/contractValidate";
import {
  FINISH6_OPEN_GAP_FLAGS,
} from "../src/ship/finish6Kickoff";
import {
  measureSchema6,
  SCHEMA_6,
  SCHEMA_6_MARKER,
  SCHEMA_6_PHASE,
  SCHEMA_6_SCHEMA,
} from "../src/ship/schema6";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/schema-6.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-schema-6.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const index = readJson(resolve(root, "shared/schema/schema-index.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Schema6.kt"),
    "utf8",
  );
  const finish6Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt"),
    "utf8",
  );
  const entitlements = readJson(resolve(root, "shared/billing/entitlements.json"));

  if (catalog.phase !== 2) errors.push(`phase expected 2, got ${catalog.phase}`);
  if (catalog.schema !== SCHEMA_6_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (SCHEMA_6_PHASE !== 2) errors.push("phase mirror mismatch");
  if (catalog.schema6Marker !== SCHEMA_6_MARKER) errors.push("marker mismatch");
  if (fixture.schema6Marker !== SCHEMA_6_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "5.0.0") errors.push("contentVersion must stay 5.0.0");
  if (catalog.schemaVersion !== 26) errors.push("schemaVersion must stay 26");
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");

  if (catalog.schemaMin !== 4) errors.push("schemaMin must be 4");
  if (catalog.sampleCatalogMin?.ship !== 5) errors.push("sampleCatalogMin.ship must be 5");
  if (catalog.sampleCatalogMin?.billing !== 5) errors.push("sampleCatalogMin.billing must be 5");
  if (catalog.sampleCatalogMin?.ops !== 5) errors.push("sampleCatalogMin.ops must be 5");

  for (const [key, path] of Object.entries(catalog.schemas as Record<string, string>)) {
    if (!existsSync(resolve(root, path))) errors.push(`missing schema file for ${key}: ${path}`);
  }
  if (!existsSync(resolve(root, catalog.schemaIndex))) {
    errors.push("schema-index.json missing");
  }
  if ((index.schemas as unknown[])?.length < 4) errors.push("schema-index must list ≥4 schemas");
  if (SCHEMA_INDEX.schemas.length < 4) errors.push("SCHEMA_INDEX mirror length < 4");

  const measure = measureSchema6(root);
  if (!measure.indexOk) errors.push("schema index floors not met");
  if (measure.schemaCount < SCHEMA_6.schemaMin) {
    errors.push(`schemaCount ${measure.schemaCount} < ${SCHEMA_6.schemaMin}`);
  }
  if (measure.shipValidated < 5) errors.push("ship samples validated < 5");
  if (measure.billingValidated < 5) errors.push("billing samples validated < 5");
  if (measure.opsValidated < 5) errors.push("ops samples validated < 5");
  if (!measure.ajvOk) {
    errors.push("Ajv sample validation failed");
    errors.push(...measure.sampleErrors.slice(0, 20));
  }
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 2 must set id=schema-foundations validate=schema6:validate");
  }
  if (!measure.gapClosed) errors.push("kickoff.gaps.schemaFoundationsIncomplete must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if (kickoff.gaps?.schemaFoundationsIncomplete !== false) {
    errors.push("kickoff gap schemaFoundationsIncomplete must be false");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("schemaFoundationsIncomplete")) {
    errors.push("OPEN_GAP_FLAGS must not include schemaFoundationsIncomplete after Phase 2");
  }

  if (entitlements.schema !== "fish.billing.entitlements.v1") {
    errors.push("entitlements.json must declare fish.billing.entitlements.v1");
  }
  if (typeof entitlements.description !== "string" || entitlements.description.length < 16) {
    errors.push("entitlements.json must include a description");
  }

  if (listing.schema6Phase !== 2) errors.push("listing.schema6Phase must be 2");
  if (listing.schema6Catalog !== "shared/ship/schema-6.json") {
    errors.push("listing.schema6Catalog mismatch");
  }
  if (pin.schema6 !== "shared/ship/schema-6.json") {
    errors.push("RELEASE_PIN.schema6 path missing");
  }
  if (!pin.fixtures?.includes("parity-schema-6.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-schema-6.json");
  }

  const block = dod.schema6;
  if (!block) errors.push("DoD missing schema6 block");
  else {
    if (block.phase !== 2) errors.push("DoD schema6.phase must be 2");
    if (block.plan !== "30_finish_6.0") errors.push("DoD schema6.plan mismatch");
    if (block.status !== "complete") errors.push("DoD schema6.status must be complete");
    if (block.schema6Marker !== SCHEMA_6_MARKER) errors.push("DoD schema6 marker mismatch");
  }

  if (!pkg.scripts?.["schema6:validate"]) errors.push("package.json missing schema6:validate");
  if (!pkg.scripts?.["schema6:smoke"]) errors.push("package.json missing schema6:smoke");
  if (!ci.includes("schema6:validate")) errors.push("ci.yml missing schema6:validate");
  if (!ci.includes("schema6:smoke")) errors.push("ci.yml missing schema6:smoke");
  if (!kotlin.includes("SCHEMA_PATHS")) errors.push("Kotlin Schema6 missing SCHEMA_PATHS");
  if (!kotlin.includes("SAMPLE_SHIP")) errors.push("Kotlin Schema6 missing SAMPLE_SHIP");
  if (!finish6Kt.includes("schema6:validate")) {
    errors.push("Finish6Kickoff.kt phase 2 missing schema6:validate");
  }
  const openBlock = finish6Kt.slice(
    finish6Kt.indexOf("OPEN_GAP_FLAGS"),
    finish6Kt.indexOf("fun score"),
  );
  if (openBlock.includes("schemaFoundationsIncomplete")) {
    errors.push("Finish6Kickoff OPEN_GAP_FLAGS must drop schemaFoundationsIncomplete");
  }

  if (fixture.expect?.schemaMin !== 4) errors.push("parity fixture schemaMin must be 4");
  if (fixture.expect?.gapClosed !== "schemaFoundationsIncomplete") {
    errors.push("parity fixture gapClosed mismatch");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("schema6:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK schema6:validate — Finish 6.0 Phase 2 schema foundations locked");
