/**
 * Finish 6.0 Phase 17 — economy/bank/dashboard depth 4 readiness.
 *
 * Usage:
 *   npm run economy4:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  ECONOMY_4,
  ECONOMY_4_MARKER,
  ECONOMY_4_PHASE,
  ECONOMY_4_SCHEMA,
  measureEconomy4,
} from "../src/ship/economy4";
import { CONTENT_STRING_KEYS, contentStringKeyCount } from "../src/i18n/contentStrings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/economy-bank-4.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-economy-bank-4.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Economy4.kt"),
    "utf8",
  );
  const finish6Kt = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt",
    ),
    "utf8",
  );
  const en = readJson(resolve(root, "shared/i18n/content-strings.en.json"));
  const uiEn = readJson(resolve(root, "shared/i18n/ui-strings.en.json"));

  if (catalog.phase !== 17) errors.push(`phase expected 17, got ${catalog.phase}`);
  if (catalog.schema !== ECONOMY_4_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (ECONOMY_4_PHASE !== 17) errors.push("phase mirror mismatch");
  if (catalog.economy4Marker !== ECONOMY_4_MARKER) errors.push("marker mismatch");
  if (fixture.economy4Marker !== ECONOMY_4_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "5.0.0") errors.push("contentVersion must stay 5.0.0");
  if (catalog.schemaVersion !== 27) errors.push("schemaVersion must be 27");
  if (SCHEMA_VERSION < 27) errors.push("engine SCHEMA_VERSION must be >= 27");
  if (!["5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack contentVersion must be 5.0.0 or 6.0.0");
  if (pack.saveSchemaVersion < 27) errors.push("content-pack.saveSchemaVersion must be >= 27");

  if (catalog.dashboardFields?.length !== 6) errors.push("dashboardFields must list 6");
  if (catalog.loanProductMin !== 7) errors.push("loanProductMin must be 7");
  if (catalog.goalPresetMin !== 16) errors.push("goalPresetMin must be 16");

  const measure = measureEconomy4(root);
  if (measure.loanProductCount < ECONOMY_4.loanProductMin) {
    errors.push(`loans ${measure.loanProductCount} < ${ECONOMY_4.loanProductMin}`);
  }
  if (measure.goalPresetCount < ECONOMY_4.goalPresetMin) {
    errors.push(`goals ${measure.goalPresetCount} < ${ECONOMY_4.goalPresetMin}`);
  }
  if (!measure.loanProductsPresent) errors.push("loan product ids missing from content-pack");
  if (!measure.newLoansPresent) errors.push("nest_ember/saffron_crest loans missing");
  if (!measure.goalsPresent) errors.push("goal presets missing from content-pack");
  if (!measure.dashboardFieldsPresent) {
    errors.push("nest treasury dashboard fields missing from TS/Kotlin dashboard");
  }
  if (!measure.nestTreasuryUxPresent) {
    errors.push("web/Android nest treasury UX missing");
  }
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 17 must set id=economy-bank-4 validate=economy4:validate");
  }
  if (!measure.kickoffClosed) errors.push("kickoff.gaps.economy4Incomplete must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const id of ECONOMY_4.newLoanProductIds) {
    if (!en.strings?.[id]) errors.push(`content-strings.en missing ${id}`);
  }
  const contentKeySet = new Set(CONTENT_STRING_KEYS);
  for (const id of ECONOMY_4.newLoanProductIds) {
    if (!contentKeySet.has(id)) errors.push(`missing content-string for ${id}`);
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("es")) {
    errors.push("en/es content string counts differ");
  }

  for (const key of [
    "dashboard.nestTreasury",
    "dashboard.wageBurden",
    "dashboard.loanCoverage",
    "dashboard.rivalLoss",
    "dashboard.sigilsEarned",
    "dashboard.coinGoalsHit",
  ]) {
    if (!uiEn.strings?.[key]) errors.push(`ui-strings.en missing ${key}`);
  }

  if (kickoff.gaps?.economy4Incomplete !== false) {
    errors.push("kickoff.gaps.economy4Incomplete must be false");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("economy4Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must drop economy4Incomplete after Phase 17");
  }
  if (FINISH6_OPEN_GAP_FLAGS.length > 7) {
    errors.push(`OPEN_GAP_FLAGS expected ≤7 after Phase 22, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
  }
  const openSlice = finish6Kt.slice(
    finish6Kt.indexOf("OPEN_GAP_FLAGS"),
    finish6Kt.indexOf("OPEN_GAP_FLAGS") + 900,
  );
  if (openSlice.includes("economy4Incomplete")) {
    errors.push("Finish6Kickoff OPEN_GAP_FLAGS must drop economy4Incomplete");
  }
  const phase17 = (kickoff.phases as any[])?.find((p) => p.phase === 17);
  if (!phase17) errors.push("kickoff missing phase 17");
  else if (phase17.validate !== "economy4:validate") {
    errors.push("kickoff phase 17 validate must be economy4:validate");
  }
  if (phase17?.id !== "economy-bank-4") errors.push("kickoff phase 17 id mismatch");

  if (listing.economy4Phase !== 17) errors.push("listing.economy4Phase must be 17");
  if (listing.economy4Catalog !== "shared/ship/economy-bank-4.json") {
    errors.push("listing.economy4Catalog mismatch");
  }

  const block = dod.economy4;
  if (!block) errors.push("DoD missing economy4 block");
  else {
    if (block.phase !== 17) errors.push("DoD economy4.phase must be 17");
    if (block.plan !== "30_finish_6.0") errors.push("DoD economy4.plan mismatch");
    if (block.status !== "complete") errors.push("DoD economy4.status must be complete");
    if (block.economy4Marker !== ECONOMY_4_MARKER) {
      errors.push("DoD economy4 marker mismatch");
    }
  }

  if (!pkg.scripts?.["economy4:validate"]) errors.push("package.json missing economy4:validate");
  if (!ci.includes("economy4:validate")) errors.push("ci.yml missing economy4:validate");
  if (!ci.includes("economy3:validate")) errors.push("ci.yml missing soft economy3:validate");
  if (!kotlin.includes("NEW_LOAN_PRODUCT_IDS")) errors.push("Kotlin Economy4 missing NEW_LOAN_PRODUCT_IDS");
  if (!kotlin.includes("DASHBOARD_FIELDS")) errors.push("Kotlin Economy4 missing DASHBOARD_FIELDS");
  if (!finish6Kt.includes("economy4:validate")) {
    errors.push("Finish6Kickoff.kt phase 17 missing economy4:validate");
  }
  if (!existsSync(resolve(root, "shared/tools/author_economy_4.py"))) {
    errors.push("missing author_economy_4.py");
  }
  if (pin.economy4 !== "shared/ship/economy-bank-4.json") {
    errors.push("RELEASE_PIN.economy4 path mismatch");
  }
  if (!pin.fixtures?.includes("parity-economy-bank-4.json")) {
    errors.push("RELEASE_PIN missing parity-economy-bank-4.json");
  }
  if (fixture.expect?.loanProductMin !== 7) errors.push("parity loanProductMin must be 7");
  if (fixture.expect?.goalPresetMin !== 16) errors.push("parity goalPresetMin must be 16");
  if (fixture.expect?.dashboardFieldCount !== 6) {
    errors.push("parity dashboardFieldCount must be 6");
  }
  if (fixture.expect?.economy4Incomplete !== false) {
    errors.push("parity economy4Incomplete must be false");
  }
  if (fixture.expect?.openGapFlagMin > 7) {
    errors.push("parity openGapFlagMin must be ≤7 after Phase 17");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("economy4:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK economy4:validate — economy/bank/dashboard depth 4 wired");
