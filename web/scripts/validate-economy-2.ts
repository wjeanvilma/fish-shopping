/**
 * Finish 4.0 Phase 20 — economy/bank/dashboard depth readiness.
 *
 * Usage:
 *   npm run economy2:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import {
  ECONOMY_2,
  ECONOMY_2_MARKER,
  ECONOMY_2_PHASE,
  ECONOMY_2_SCHEMA,
  measureEconomy2,
} from "../src/ship/economy2";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/economy-bank-2.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-economy-bank-2.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Economy2.kt"),
    "utf8",
  );
  const finish4Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish4Kickoff.kt"),
    "utf8",
  );

  if (catalog.phase !== 20) errors.push(`phase expected 20, got ${catalog.phase}`);
  if (catalog.schema !== ECONOMY_2_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (ECONOMY_2_PHASE !== 20) errors.push("phase mirror mismatch");
  if (catalog.economy2Marker !== ECONOMY_2_MARKER) errors.push("marker mismatch");
  if (fixture.economy2Marker !== ECONOMY_2_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.schemaVersion !== 25) errors.push("schemaVersion must stay 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");

  const measure = measureEconomy2(root);
  if (measure.loanProductCount < ECONOMY_2.loanProductMin) {
    errors.push(`loan products ${measure.loanProductCount} < ${ECONOMY_2.loanProductMin}`);
  }
  if (measure.goalPresetCount < ECONOMY_2.goalPresetMin) {
    errors.push(`goal presets ${measure.goalPresetCount} < ${ECONOMY_2.goalPresetMin}`);
  }
  if (!measure.loanProductsPresent) errors.push("loan product ids missing from content-pack");
  if (!measure.goalsPresent) errors.push("goal presets missing from content-pack");
  if (!measure.scarcityMatches) errors.push("scarcity curve mismatch vs ship catalog");
  if (!measure.dashboardFieldsPresent) errors.push("dashboard cashflow fields missing TS/Kotlin");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 20 must set id=economy-bank-2 validate=economy2:validate");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  const phase20 = (kickoff.phases as any[])?.find((p) => p.phase === 20);
  if (!phase20 || phase20.validate !== "economy2:validate") {
    errors.push("kickoff phase 20 validate must be economy2:validate");
  }
  if (phase20?.id !== "economy-bank-2") errors.push("kickoff phase 20 id must be economy-bank-2");

  if (listing.economy2Phase !== 20) errors.push("listing.economy2Phase must be 20");
  if (listing.economy2Catalog !== "shared/ship/economy-bank-2.json") {
    errors.push("listing.economy2Catalog mismatch");
  }
  if (pin.economy2 !== "shared/ship/economy-bank-2.json") {
    errors.push("RELEASE_PIN.economy2 path missing");
  }
  if (!pin.fixtures?.includes("parity-economy-bank-2.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-economy-bank-2.json");
  }

  const block = dod.economy2;
  if (!block) errors.push("DoD missing economy2 block");
  else {
    if (block.phase !== 20) errors.push("DoD economy2.phase must be 20");
    if (block.plan !== "30_finish_4.0") errors.push("DoD economy2.plan mismatch");
    if (block.status !== "complete") errors.push("DoD economy2.status must be complete");
    if (block.economy2Marker !== ECONOMY_2_MARKER) {
      errors.push("DoD economy2 marker mismatch");
    }
  }

  if (!pkg.scripts?.["economy2:validate"]) errors.push("package.json missing economy2:validate");
  if (!ci.includes("economy2:validate")) errors.push("ci.yml missing economy2:validate");
  if (!kotlin.includes("LOAN_PRODUCT_IDS")) errors.push("Kotlin Economy2 missing LOAN_PRODUCT_IDS");
  if (!kotlin.includes("DASHBOARD_FIELDS")) errors.push("Kotlin Economy2 missing DASHBOARD_FIELDS");
  if (!finish4Kt.includes("economy2:validate")) {
    errors.push("Finish4Kickoff.kt phase 20 missing economy2:validate");
  }
  if (!existsSync(resolve(root, "shared/tools/author_economy_2.py"))) {
    errors.push("missing author_economy_2.py");
  }

  if (fixture.expect?.loanProductMin !== 3) errors.push("parity loanProductMin must be 3");
  if (fixture.expect?.goalPresetMin !== 8) errors.push("parity goalPresetMin must be 8");
  if (fixture.expect?.dashboardFieldCount !== 10) {
    errors.push("parity dashboardFieldCount must be 10");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("economy2:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK economy2:validate — economy/bank/dashboard depth wired");
