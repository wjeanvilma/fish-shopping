/**
 * Finish 5.0 Phase 21 — economy/bank/dashboard depth 3 readiness.
 *
 * Usage:
 *   npm run economy3:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import { CONTENT_STRING_KEYS, contentStringKeyCount } from "../src/i18n/contentStrings";
import {
  ECONOMY_3,
  ECONOMY_3_MARKER,
  ECONOMY_3_PHASE,
  ECONOMY_3_SCHEMA,
  measureEconomy3,
} from "../src/ship/economy3";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/economy-bank-3.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-economy-bank-3.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Economy3.kt"),
    "utf8",
  );
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );
  const en = readJson(resolve(root, "shared/i18n/content-strings.en.json"));
  const uiEn = readJson(resolve(root, "shared/i18n/ui-strings.en.json"));

  if (catalog.phase !== 21) errors.push(`phase expected 21, got ${catalog.phase}`);
  if (catalog.schema !== ECONOMY_3_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (ECONOMY_3_PHASE !== 21) errors.push("phase mirror mismatch");
  if (catalog.economy3Marker !== ECONOMY_3_MARKER) errors.push("marker mismatch");
  if (fixture.economy3Marker !== ECONOMY_3_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.schemaVersion !== 26) errors.push("schemaVersion must stay 26");
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");
  if (!["4.0.0", "5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack contentVersion must be 4.0.0, 5.0.0, or 6.0.0");
  if (pack.saveSchemaVersion < 26) errors.push("content-pack.saveSchemaVersion must be >= 26");

  const measure = measureEconomy3(root);
  if (measure.loanProductCount < ECONOMY_3.loanProductMin) {
    errors.push(`loan products ${measure.loanProductCount} < ${ECONOMY_3.loanProductMin}`);
  }
  if (measure.goalPresetCount < ECONOMY_3.goalPresetMin) {
    errors.push(`goal presets ${measure.goalPresetCount} < ${ECONOMY_3.goalPresetMin}`);
  }
  if (!measure.loanProductsPresent) errors.push("loan product ids missing from content-pack");
  if (!measure.newLoansPresent) errors.push("new tideglass/aurora loans missing from content-pack");
  if (!measure.goalsPresent) errors.push("goal presets missing from content-pack");
  if (!measure.dashboardFieldsPresent) errors.push("dashboard ledger fields missing TS/Kotlin");
  if (!measure.ledgerUxPresent) errors.push("web↔Android pier ledger UX missing");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 21 must set id=economy-bank-3 validate=economy3:validate");
  }
  if (!measure.kickoffClosed) errors.push("kickoff.gaps.economy3Incomplete must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const id of ECONOMY_3.newLoanProductIds) {
    if (!en.strings?.[id]) errors.push(`content-strings.en missing ${id}`);
  }
  const contentKeySet = new Set(CONTENT_STRING_KEYS);
  for (const id of ECONOMY_3.newLoanProductIds) {
    if (!contentKeySet.has(id)) errors.push(`missing content-string for ${id}`);
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("es")) {
    errors.push("en/es content string counts differ");
  }

  for (const key of [
    "dashboard.pierLedger",
    "dashboard.loanBook",
    "dashboard.coinGoalProgress",
    "dashboard.ledgerCashflow",
    "dashboard.contractShare",
  ]) {
    if (!uiEn.strings?.[key]) errors.push(`ui-strings.en missing ${key}`);
  }

  if (kickoff.gaps?.economy3Incomplete !== false) {
    errors.push("kickoff.gaps.economy3Incomplete must be false");
  }
  const phase21 = (kickoff.phases as any[])?.find((p) => p.phase === 21);
  if (!phase21) errors.push("kickoff missing phase 21");
  else if (phase21.validate !== "economy3:validate") {
    errors.push("kickoff phase 21 validate must be economy3:validate");
  }
  if (phase21?.id !== "economy-bank-3") errors.push("kickoff phase 21 id mismatch");

  if (listing.economy3Phase !== 21) errors.push("listing.economy3Phase must be 21");
  if (listing.economy3Catalog !== "shared/ship/economy-bank-3.json") {
    errors.push("listing.economy3Catalog mismatch");
  }

  const block = dod.economy3;
  if (!block) errors.push("DoD missing economy3 block");
  else {
    if (block.phase !== 21) errors.push("DoD economy3.phase must be 21");
    if (block.plan !== "30_finish_5.0") errors.push("DoD economy3.plan mismatch");
    if (block.status !== "complete") errors.push("DoD economy3.status must be complete");
    if (block.economy3Marker !== ECONOMY_3_MARKER) {
      errors.push("DoD economy3 marker mismatch");
    }
  }

  if (!pkg.scripts?.["economy3:validate"]) errors.push("package.json missing economy3:validate");
  if (!ci.includes("economy3:validate")) errors.push("ci.yml missing economy3:validate");
  if (!ci.includes("economy2:validate")) errors.push("ci.yml missing soft economy2:validate");
  if (!kotlin.includes("NEW_LOAN_PRODUCT_IDS")) errors.push("Kotlin Economy3 missing NEW_LOAN_PRODUCT_IDS");
  if (!kotlin.includes("DASHBOARD_FIELDS")) errors.push("Kotlin Economy3 missing DASHBOARD_FIELDS");
  if (!finish5Kt.includes("economy3:validate")) {
    errors.push("Finish5Kickoff.kt phase 21 missing economy3:validate");
  }
  if (finish5Kt.includes('"economy3Incomplete"')) {
    errors.push("Finish5Kickoff.kt OPEN_GAP_FLAGS must drop economy3Incomplete");
  }
  if (!existsSync(resolve(root, "shared/tools/author_economy_3.py"))) {
    errors.push("missing author_economy_3.py");
  }
  if (pin.economy3 !== "shared/ship/economy-bank-3.json") {
    errors.push("RELEASE_PIN.economy3 path mismatch");
  }
  if (!pin.fixtures?.includes("parity-economy-bank-3.json")) {
    errors.push("RELEASE_PIN missing parity-economy-bank-3.json");
  }
  if (fixture.expect?.loanProductMin !== 5) errors.push("parity loanProductMin must be 5");
  if (fixture.expect?.goalPresetMin !== 12) errors.push("parity goalPresetMin must be 12");
  if (fixture.expect?.dashboardFieldCount !== 8) {
    errors.push("parity dashboardFieldCount must be 8");
  }
  if (fixture.expect?.economy3Incomplete !== false) {
    errors.push("parity economy3Incomplete must be false");
  }
  if (catalog.dashboardFields?.length !== 8) errors.push("catalog dashboardFields must list 8");
  if (catalog.newLoanProductIds?.length !== 2) errors.push("catalog newLoanProductIds must list 2");

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("economy3:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK economy3:validate — economy/bank/dashboard depth 3 wired");
