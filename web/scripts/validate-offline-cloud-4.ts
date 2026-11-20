/**
 * Finish 6.0 Phase 18 — offline/cloud/analytics hardening 4 readiness.
 *
 * Usage:
 *   npm run offlinecloud4:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  measureOfflineCloud4,
  OFFLINE_CLOUD_4,
  OFFLINE_CLOUD_4_MARKER,
  OFFLINE_CLOUD_4_PHASE,
  OFFLINE_CLOUD_4_SCHEMA,
} from "../src/ship/offlineCloud4";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/offline-cloud-4.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-offline-cloud-4.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const policy = readJson(resolve(root, "shared/ops/remote-analytics-sink.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/OfflineCloud4.kt"),
    "utf8",
  );
  const finish6Kt = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt",
    ),
    "utf8",
  );
  const uiEn = readJson(resolve(root, "shared/i18n/ui-strings.en.json"));

  if (catalog.phase !== 18) errors.push(`phase expected 18, got ${catalog.phase}`);
  if (catalog.schema !== OFFLINE_CLOUD_4_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (OFFLINE_CLOUD_4_PHASE !== 18) errors.push("phase mirror mismatch");
  if (catalog.offlineCloud4Marker !== OFFLINE_CLOUD_4_MARKER) errors.push("marker mismatch");
  if (fixture.offlineCloud4Marker !== OFFLINE_CLOUD_4_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "5.0.0") errors.push("contentVersion must stay 5.0.0");
  if (catalog.schemaVersion !== 27) errors.push("schemaVersion must stay 27");
  if (SCHEMA_VERSION < 27) errors.push("engine SCHEMA_VERSION must be >= 27");
  if (!["5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack contentVersion must be 5.0.0 or 6.0.0");
  if (pack.saveSchemaVersion < 27) errors.push("content-pack.saveSchemaVersion must be >= 27");

  const measure = measureOfflineCloud4(root);
  if (!measure.journalFieldsPresent) errors.push("nest journal fidelity fields missing TS/Kotlin");
  if (!measure.conflictFieldsPresent) {
    errors.push("preferredSide/conflictScore/nestConflictHint missing");
  }
  if (!measure.syncDiagnosticsPresent) {
    errors.push("queue lastAttemptAge/flushFailures/circuitOpen missing");
  }
  if (!measure.analyticsRetryWired) {
    errors.push("analytics circuit-breaker/jitter wiring incomplete");
  }
  if (!measure.conflictUxPresent) errors.push("web↔Android nest conflict UX missing");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 18 must set id=offline-cloud-4 validate=offlinecloud4:validate");
  }
  if (!measure.kickoffClosed) errors.push("kickoff.gaps.offlineCloud4Incomplete must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if ((policy.batch?.maxFlushRetries ?? 0) < 7) errors.push("analytics maxFlushRetries must be ≥7");
  if (policy.batch?.retryJitterMs !== 750) errors.push("analytics retryJitterMs must be 750");
  if (policy.batch?.deadLetterAfterMaxRetries !== true) {
    errors.push("analytics deadLetterAfterMaxRetries must be true");
  }
  if (policy.batch?.circuitBreakerAfterDeadLetters !== 3) {
    errors.push("analytics circuitBreakerAfterDeadLetters must be 3");
  }

  for (const key of [
    "cloud.preferredSide",
    "cloud.conflictScore",
    "cloud.nestConflictHint",
    "cloud.circuitOpen",
    "cloud.lastAttemptAge",
  ]) {
    if (!uiEn.strings?.[key]) errors.push(`ui-strings.en missing ${key}`);
  }

  if (kickoff.gaps?.offlineCloud4Incomplete !== false) {
    errors.push("kickoff.gaps.offlineCloud4Incomplete must be false");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("offlineCloud4Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must drop offlineCloud4Incomplete after Phase 18");
  }
  if (FINISH6_OPEN_GAP_FLAGS.length > 7) {
    errors.push(`OPEN_GAP_FLAGS expected ≤7 after Phase 22, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
  }
  const openSlice = finish6Kt.slice(
    finish6Kt.indexOf("OPEN_GAP_FLAGS"),
    finish6Kt.indexOf("OPEN_GAP_FLAGS") + 900,
  );
  if (openSlice.includes("offlineCloud4Incomplete")) {
    errors.push("Finish6Kickoff OPEN_GAP_FLAGS must drop offlineCloud4Incomplete");
  }
  const phase18 = (kickoff.phases as any[])?.find((p) => p.phase === 18);
  if (!phase18) errors.push("kickoff missing phase 18");
  else if (phase18.validate !== "offlinecloud4:validate") {
    errors.push("kickoff phase 18 validate must be offlinecloud4:validate");
  }
  if (phase18?.id !== "offline-cloud-4") errors.push("kickoff phase 18 id mismatch");

  if (listing.offlineCloud4Phase !== 18) errors.push("listing.offlineCloud4Phase must be 18");
  if (listing.offlineCloud4Catalog !== "shared/ship/offline-cloud-4.json") {
    errors.push("listing.offlineCloud4Catalog mismatch");
  }

  const block = dod.offlineCloud4;
  if (!block) errors.push("DoD missing offlineCloud4 block");
  else {
    if (block.phase !== 18) errors.push("DoD offlineCloud4.phase must be 18");
    if (block.plan !== "30_finish_6.0") errors.push("DoD offlineCloud4.plan mismatch");
    if (block.status !== "complete") errors.push("DoD offlineCloud4.status must be complete");
    if (block.offlineCloud4Marker !== OFFLINE_CLOUD_4_MARKER) {
      errors.push("DoD offlineCloud4 marker mismatch");
    }
  }

  if (!pkg.scripts?.["offlinecloud4:validate"]) {
    errors.push("package.json missing offlinecloud4:validate");
  }
  if (!ci.includes("offlinecloud4:validate")) errors.push("ci.yml missing offlinecloud4:validate");
  if (!ci.includes("offlinecloud3:validate")) errors.push("ci.yml missing soft offlinecloud3:validate");
  if (!kotlin.includes("JOURNAL_DELTA_FIELDS")) {
    errors.push("Kotlin OfflineCloud4 missing JOURNAL_DELTA_FIELDS");
  }
  if (!kotlin.includes("CONFLICT_FIELDS")) errors.push("Kotlin OfflineCloud4 missing CONFLICT_FIELDS");
  if (!finish6Kt.includes("offlinecloud4:validate")) {
    errors.push("Finish6Kickoff.kt phase 18 missing offlinecloud4:validate");
  }
  if (!existsSync(resolve(root, "shared/tools/author_offline_cloud_4.py"))) {
    errors.push("missing author_offline_cloud_4.py");
  }
  if (pin.offlineCloud4 !== "shared/ship/offline-cloud-4.json") {
    errors.push("RELEASE_PIN.offlineCloud4 path mismatch");
  }
  if (!pin.fixtures?.includes("parity-offline-cloud-4.json")) {
    errors.push("RELEASE_PIN missing parity-offline-cloud-4.json");
  }
  if (fixture.expect?.journalDeltaFieldCount !== 4) {
    errors.push("parity journalDeltaFieldCount must be 4");
  }
  if (fixture.expect?.conflictFieldCount !== 3) errors.push("parity conflictFieldCount must be 3");
  if (fixture.expect?.maxFlushRetries !== 7) errors.push("parity maxFlushRetries must be 7");
  if (fixture.expect?.circuitBreakerAfterDeadLetters !== 3) {
    errors.push("parity circuitBreakerAfterDeadLetters must be 3");
  }
  if (fixture.expect?.offlineCloud4Incomplete !== false) {
    errors.push("parity offlineCloud4Incomplete must be false");
  }
  if (fixture.expect?.openGapFlagMin > 7) {
    errors.push("parity openGapFlagMin must be ≤7 after Phase 18");
  }
  if (catalog.journalDeltaFields?.length !== 4) errors.push("catalog journalDeltaFields must list 4");
  if (catalog.conflictFields?.length !== 3) errors.push("catalog conflictFields must list 3");
  if (OFFLINE_CLOUD_4.analyticsRetry.maxFlushRetries !== 7) {
    errors.push("catalog maxFlushRetries must be 7");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("offlinecloud4:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK offlinecloud4:validate — offline/cloud/analytics hardening 4 wired");
