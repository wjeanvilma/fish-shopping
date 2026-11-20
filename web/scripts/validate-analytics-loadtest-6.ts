/**
 * Finish 6.0 Phase 26 — Analytics + loadtest banks expansion 6 readiness.
 *
 * Usage:
 *   npm run analyticsloadtest6:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ANALYTICS_EVENT_NAMES } from "../src/engine/analytics";
import { SCHEMA_VERSION } from "../src/engine";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  ANALYTICS_LOADTEST_6,
  ANALYTICS_LOADTEST_6_BANK_SCHEMA_FLOOR,
  ANALYTICS_LOADTEST_6_EVENT_FLOOR,
  ANALYTICS_LOADTEST_6_MARKER,
  ANALYTICS_LOADTEST_6_OPS,
  ANALYTICS_LOADTEST_6_PHASE,
  ANALYTICS_LOADTEST_6_SCHEMA,
  ANALYTICS_LOADTEST_6_SOAK_FLOOR,
  measureAnalyticsLoadtest6,
} from "../src/ship/analyticsLoadtest6";
import { LOADTEST_BANKS } from "../src/ship/loadtestBanks";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/analytics-loadtest-6.json"));
  const ops = readJson(resolve(root, "shared/ops/analytics-loadtest-6.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-analytics-loadtest-6.json"));
  const banks = readJson(resolve(root, "shared/ship/loadtest-banks.json"));
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
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/AnalyticsLoadtest6.kt"),
    "utf8",
  );
  const loadtestKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/LoadtestBanks.kt"),
    "utf8",
  );
  const analyticsTs = readFileSync(resolve(root, "web/src/engine/analytics.ts"), "utf8");
  const analyticsKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/Analytics.kt"),
    "utf8",
  );
  const apiCatalog = readFileSync(resolve(root, "analytics-api/src/catalog.ts"), "utf8");
  const busTs = readFileSync(resolve(root, "web/src/analytics/analyticsBus.ts"), "utf8");
  const busKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/analytics/AnalyticsBus.kt"),
    "utf8",
  );
  const hostTs = readFileSync(resolve(root, "web/src/game/GameHost.ts"), "utf8");
  const vmKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt"),
    "utf8",
  );

  if (catalog.phase !== 26 || ops.phase !== 26) errors.push("phase expected 26");
  if (catalog.schema !== ANALYTICS_LOADTEST_6_SCHEMA) errors.push("schema mismatch");
  if (catalog.plan !== "30_finish_6.0" || ops.plan !== "30_finish_6.0") {
    errors.push("plan must be 30_finish_6.0");
  }
  if (ANALYTICS_LOADTEST_6_PHASE !== 26) errors.push("phase mirror mismatch");
  if (catalog.analyticsLoadtest6Marker !== ANALYTICS_LOADTEST_6_MARKER) {
    errors.push("marker mismatch");
  }
  if (fixture.analyticsLoadtest6Marker !== ANALYTICS_LOADTEST_6_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "5.0.0" || ops.contentVersion !== "5.0.0") {
    errors.push("contentVersion must stay 5.0.0");
  }
  if (catalog.schemaVersion !== 27 || ops.schemaVersion !== 27) {
    errors.push("schemaVersion must stay 27");
  }
  if (SCHEMA_VERSION < 27) errors.push("engine SCHEMA_VERSION must be >= 27");
  if (!["5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack must be 5.0.0 or 6.0.0");
  if (catalog.closesGap !== "loadtestBanksIncomplete") errors.push("closesGap mismatch");
  if (catalog.eventNameFloor !== 11 || ANALYTICS_LOADTEST_6_EVENT_FLOOR !== 11) {
    errors.push("eventNameFloor must be 11");
  }
  if (catalog.soakScenarioFloor !== 8 || ANALYTICS_LOADTEST_6_SOAK_FLOOR !== 8) {
    errors.push("soakScenarioFloor must be 8");
  }
  if (catalog.bankSchemaVersionFloor !== 27 || ANALYTICS_LOADTEST_6_BANK_SCHEMA_FLOOR !== 27) {
    errors.push("bankSchemaVersionFloor must be 27");
  }
  if ((ops.scenarios?.length ?? 0) < catalog.soakScenarioFloor) {
    errors.push("ops soak scenarios short");
  }
  for (const name of catalog.nestEvents ?? []) {
    if (!(ops.nestEvents ?? []).includes(name)) errors.push(`ops missing nest event ${name}`);
  }

  const measure = measureAnalyticsLoadtest6(root);
  if (!measure.eventsEnough) {
    errors.push(`analytics events ${measure.eventNameCount} < ${ANALYTICS_LOADTEST_6_EVENT_FLOOR}`);
  }
  if (!measure.nestEventsPresent) errors.push("nest analytics events missing from ANALYTICS_EVENT_NAMES");
  if (!measure.soakEnough) {
    errors.push(`soak scenarios ${measure.soakScenarioCount} < ${ANALYTICS_LOADTEST_6_SOAK_FLOOR}`);
  }
  if (!measure.banksFloorsMet) errors.push("loadtest bank floorsMet must be true");
  if (!measure.bankSchemaOk) errors.push("loadtest bank schemaVersion must be ≥27");
  if (!measure.gapClosed) errors.push("measure.gapClosed must be true");
  if (!measure.kickoffWired) errors.push("kickoff phase 26 must wire analyticsloadtest6:validate");
  for (const gate of measure.missingGates) errors.push(`missing preflight ${gate}`);

  if (banks.schemaVersion !== 27) errors.push("loadtest-banks.json schemaVersion must be 27");
  if (LOADTEST_BANKS.schemaVersion !== 27) errors.push("LOADTEST_BANKS.schemaVersion must be 27");
  if (!loadtestKt.includes("SCHEMA_VERSION = 27")) {
    errors.push("LoadtestBanks.kt SCHEMA_VERSION must be 27");
  }

  for (const name of ["nest_sigil_earned", "nest_contract_settled", "loadtest_bank_probed"]) {
    if (!analyticsTs.includes(`"${name}"`)) errors.push(`analytics.ts missing ${name}`);
    if (!analyticsKt.includes(`"${name}"`)) errors.push(`Analytics.kt missing ${name}`);
    if (!apiCatalog.includes(`"${name}"`)) errors.push(`analytics-api catalog missing ${name}`);
    if (!(ANALYTICS_EVENT_NAMES as readonly string[]).includes(name)) {
      errors.push(`ANALYTICS_EVENT_NAMES missing ${name}`);
    }
  }
  if (!busTs.includes("onLoadtestBankProbed")) errors.push("analyticsBus.ts missing onLoadtestBankProbed");
  if (!busKt.includes("onLoadtestBankProbed")) errors.push("AnalyticsBus.kt missing onLoadtestBankProbed");
  if (!hostTs.includes("onLoadtestBankProbed")) errors.push("GameHost.ts missing loadtest probe analytics");
  if (!vmKt.includes("onLoadtestBankProbed")) errors.push("GameViewModel.kt missing loadtest probe analytics");

  if (kickoff.gaps?.loadtestBanksIncomplete !== false) {
    errors.push("kickoff.gaps.loadtestBanksIncomplete must be false");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("loadtestBanksIncomplete")) {
    errors.push("OPEN_GAP_FLAGS must drop loadtestBanksIncomplete after Phase 26");
  }
  // Soft-floor: Phase 29 closed parityLock6Missing → openFlags ≤0.
  if (FINISH6_OPEN_GAP_FLAGS.length > 0) {
    errors.push(`OPEN_GAP_FLAGS expected ≤0 after Phase 29, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
  }
  const openSlice = finish6Kt.slice(
    finish6Kt.indexOf("OPEN_GAP_FLAGS"),
    finish6Kt.indexOf("OPEN_GAP_FLAGS") + 900,
  );
  if (openSlice.includes("loadtestBanksIncomplete")) {
    errors.push("Finish6Kickoff.OPEN_GAP_FLAGS must drop loadtestBanksIncomplete");
  }
  const phase26 = (kickoff.phases as any[])?.find((p) => p.phase === 26);
  if (!phase26 || phase26.validate !== "analyticsloadtest6:validate") {
    errors.push("kickoff phase 26 validate must be analyticsloadtest6:validate");
  }
  if (phase26?.id !== "analytics-loadtest-6") {
    errors.push("kickoff phase 26 id must be analytics-loadtest-6");
  }
  if (!finish6Kt.includes("analyticsloadtest6:validate")) {
    errors.push("Finish6Kickoff.kt missing analyticsloadtest6:validate");
  }
  if (!kotlin.includes("EVENT_NAME_FLOOR") || !kotlin.includes("BANK_SCHEMA_VERSION_FLOOR")) {
    errors.push("AnalyticsLoadtest6.kt missing constants");
  }

  if (listing.analyticsLoadtest6Phase !== 26) {
    errors.push("listing.analyticsLoadtest6Phase must be 26");
  }
  if (listing.analyticsLoadtest6Catalog !== "shared/ship/analytics-loadtest-6.json") {
    errors.push("listing.analyticsLoadtest6Catalog mismatch");
  }
  if (pin.analyticsLoadtest6 !== "shared/ship/analytics-loadtest-6.json") {
    errors.push("RELEASE_PIN.analyticsLoadtest6 missing");
  }
  if (!pin.fixtures?.includes("parity-analytics-loadtest-6.json")) {
    errors.push("RELEASE_PIN missing parity-analytics-loadtest-6.json");
  }
  if (!dod.analyticsLoadtest6 || dod.analyticsLoadtest6.status !== "complete") {
    errors.push("DoD analyticsLoadtest6 incomplete");
  }
  if ((dod.quotas?.analyticsLoadtest6EventNames ?? 0) < 11) {
    errors.push("DoD quotas.analyticsLoadtest6EventNames < 11");
  }
  if ((dod.quotas?.analyticsLoadtest6SoakScenarios ?? 0) < 8) {
    errors.push("DoD quotas.analyticsLoadtest6SoakScenarios < 8");
  }
  if ((dod.quotas?.loadtestBanksSchemaVersion ?? 0) < 27) {
    errors.push("DoD quotas.loadtestBanksSchemaVersion < 27");
  }

  if (!pkg.scripts?.["analyticsloadtest6:validate"]) {
    errors.push("package.json missing analyticsloadtest6:validate");
  }
  if (!ci.includes("analyticsloadtest6:validate")) {
    errors.push("ci.yml missing analyticsloadtest6:validate");
  }
  if (!ci.includes("remoteanalytics:validate")) {
    errors.push("ci.yml missing soft remoteanalytics:validate");
  }
  if (!existsSync(resolve(root, "shared/tools/author_analytics_loadtest_6.py"))) {
    errors.push("missing author_analytics_loadtest_6.py");
  }
  if (fixture.expect?.eventNameFloor !== 11) errors.push("parity eventNameFloor must be 11");
  if (fixture.expect?.loadtestBanksIncomplete !== false) {
    errors.push("parity loadtestBanksIncomplete must be false");
  }
  // Soft-floor: Phase 29 closed last boolean gap → openGapFlagMin ≤0.
  if ((fixture.expect?.openGapFlagMin ?? 99) > 0) {
    errors.push("parity openGapFlagMin must be ≤0 after Phase 29");
  }
  if (catalog.softRemoteAnalyticsValidate !== "npm run remoteanalytics:validate") {
    errors.push("catalog softRemoteAnalyticsValidate must pin remoteanalytics:validate");
  }

  for (const gate of catalog.preflightGates ?? []) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  void ANALYTICS_LOADTEST_6;
  void ANALYTICS_LOADTEST_6_OPS;
  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("analyticsloadtest6:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK analyticsloadtest6:validate — Analytics + loadtest banks expansion 6 wired");
