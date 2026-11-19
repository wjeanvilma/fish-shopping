/**
 * Finish 5.0 Phase 22 — offline/cloud/analytics hardening 3 readiness.
 *
 * Usage:
 *   npm run offlinecloud3:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import {
  measureOfflineCloud3,
  OFFLINE_CLOUD_3,
  OFFLINE_CLOUD_3_MARKER,
  OFFLINE_CLOUD_3_PHASE,
  OFFLINE_CLOUD_3_SCHEMA,
} from "../src/ship/offlineCloud3";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/offline-cloud-3.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-offline-cloud-3.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const policy = readJson(resolve(root, "shared/ops/remote-analytics-sink.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/OfflineCloud3.kt"),
    "utf8",
  );
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );
  const uiEn = readJson(resolve(root, "shared/i18n/ui-strings.en.json"));

  if (catalog.phase !== 22) errors.push(`phase expected 22, got ${catalog.phase}`);
  if (catalog.schema !== OFFLINE_CLOUD_3_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (OFFLINE_CLOUD_3_PHASE !== 22) errors.push("phase mirror mismatch");
  if (catalog.offlineCloud3Marker !== OFFLINE_CLOUD_3_MARKER) errors.push("marker mismatch");
  if (fixture.offlineCloud3Marker !== OFFLINE_CLOUD_3_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.schemaVersion !== 26) errors.push("schemaVersion must stay 26");
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");
  if (!["4.0.0", "5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack contentVersion must be 4.0.0, 5.0.0, or 6.0.0");
  if (pack.saveSchemaVersion < 26) errors.push("content-pack.saveSchemaVersion must be >= 26");

  const measure = measureOfflineCloud3(root);
  if (!measure.journalFieldsPresent) errors.push("offline journal fidelity fields missing TS/Kotlin");
  if (!measure.conflictFieldsPresent) errors.push("conflict severity/ageSkew/syncDiagnostics missing");
  if (!measure.syncDiagnosticsPresent) errors.push("cloud queue sync diagnostics missing");
  if (!measure.analyticsRetryWired) errors.push("analytics dead-letter/jitter wiring incomplete");
  if (!measure.conflictUxPresent) errors.push("web↔Android conflict UX polish missing");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 22 must set id=offline-cloud-3 validate=offlinecloud3:validate");
  }
  if (!measure.kickoffClosed) errors.push("kickoff.gaps.offlineCloud3Incomplete must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  // Soft-floor: Finish 6.0 Phase 18 raised retries/jitter; keep ≥ Phase-22 floors.
  if ((policy.batch?.maxFlushRetries ?? 0) < 5) errors.push("analytics maxFlushRetries must be ≥5");
  if ((policy.batch?.retryJitterMs ?? 0) < 500) errors.push("analytics retryJitterMs must be ≥500");
  if (policy.batch?.deadLetterAfterMaxRetries !== true) {
    errors.push("analytics deadLetterAfterMaxRetries must be true");
  }

  for (const key of ["cloud.severity", "cloud.syncDiagnostics", "cloud.ageSkew"]) {
    if (!uiEn.strings?.[key]) errors.push(`ui-strings.en missing ${key}`);
  }

  if (kickoff.gaps?.offlineCloud3Incomplete !== false) {
    errors.push("kickoff.gaps.offlineCloud3Incomplete must be false");
  }
  const phase22 = (kickoff.phases as any[])?.find((p) => p.phase === 22);
  if (!phase22) errors.push("kickoff missing phase 22");
  else if (phase22.validate !== "offlinecloud3:validate") {
    errors.push("kickoff phase 22 validate must be offlinecloud3:validate");
  }
  if (phase22?.id !== "offline-cloud-3") errors.push("kickoff phase 22 id mismatch");

  if (listing.offlineCloud3Phase !== 22) errors.push("listing.offlineCloud3Phase must be 22");
  if (listing.offlineCloud3Catalog !== "shared/ship/offline-cloud-3.json") {
    errors.push("listing.offlineCloud3Catalog mismatch");
  }

  const block = dod.offlineCloud3;
  if (!block) errors.push("DoD missing offlineCloud3 block");
  else {
    if (block.phase !== 22) errors.push("DoD offlineCloud3.phase must be 22");
    if (block.plan !== "30_finish_5.0") errors.push("DoD offlineCloud3.plan mismatch");
    if (block.status !== "complete") errors.push("DoD offlineCloud3.status must be complete");
    if (block.offlineCloud3Marker !== OFFLINE_CLOUD_3_MARKER) {
      errors.push("DoD offlineCloud3 marker mismatch");
    }
  }

  if (!pkg.scripts?.["offlinecloud3:validate"]) {
    errors.push("package.json missing offlinecloud3:validate");
  }
  if (!ci.includes("offlinecloud3:validate")) errors.push("ci.yml missing offlinecloud3:validate");
  if (!ci.includes("offlinecloud2:validate")) errors.push("ci.yml missing soft offlinecloud2:validate");
  if (!kotlin.includes("JOURNAL_DELTA_FIELDS")) {
    errors.push("Kotlin OfflineCloud3 missing JOURNAL_DELTA_FIELDS");
  }
  if (!kotlin.includes("CONFLICT_FIELDS")) errors.push("Kotlin OfflineCloud3 missing CONFLICT_FIELDS");
  if (!finish5Kt.includes("offlinecloud3:validate")) {
    errors.push("Finish5Kickoff.kt phase 22 missing offlinecloud3:validate");
  }
  if (finish5Kt.includes('"offlineCloud3Incomplete"')) {
    errors.push("Finish5Kickoff.kt OPEN_GAP_FLAGS must drop offlineCloud3Incomplete");
  }
  if (!existsSync(resolve(root, "shared/tools/author_offline_cloud_3.py"))) {
    errors.push("missing author_offline_cloud_3.py");
  }
  if (pin.offlineCloud3 !== "shared/ship/offline-cloud-3.json") {
    errors.push("RELEASE_PIN.offlineCloud3 path mismatch");
  }
  if (!pin.fixtures?.includes("parity-offline-cloud-3.json")) {
    errors.push("RELEASE_PIN missing parity-offline-cloud-3.json");
  }
  if (fixture.expect?.journalDeltaFieldCount !== 4) {
    errors.push("parity journalDeltaFieldCount must be 4");
  }
  if (fixture.expect?.conflictFieldCount !== 3) errors.push("parity conflictFieldCount must be 3");
  // Soft-floor: Phase-22 parity lock; live policy may be higher after Phase 18.
  if ((fixture.expect?.maxFlushRetries ?? 0) < 5) errors.push("parity maxFlushRetries must be ≥5");
  if (fixture.expect?.offlineCloud3Incomplete !== false) {
    errors.push("parity offlineCloud3Incomplete must be false");
  }
  if (catalog.journalDeltaFields?.length !== 4) errors.push("catalog journalDeltaFields must list 4");
  if (catalog.conflictFields?.length !== 3) errors.push("catalog conflictFields must list 3");

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("offlinecloud3:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK offlinecloud3:validate — offline/cloud/analytics hardening 3 wired");
