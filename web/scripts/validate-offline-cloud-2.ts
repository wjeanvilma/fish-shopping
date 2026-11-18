/**
 * Finish 4.0 Phase 21 — offline/cloud/analytics hardening readiness.
 *
 * Usage:
 *   npm run offlinecloud2:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import {
  OFFLINE_CLOUD_2,
  OFFLINE_CLOUD_2_MARKER,
  OFFLINE_CLOUD_2_PHASE,
  OFFLINE_CLOUD_2_SCHEMA,
  measureOfflineCloud2,
} from "../src/ship/offlineCloud2";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/offline-cloud-2.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-offline-cloud-2.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/OfflineCloud2.kt"),
    "utf8",
  );
  const finish4Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish4Kickoff.kt"),
    "utf8",
  );

  if (catalog.phase !== 21) errors.push(`phase expected 21, got ${catalog.phase}`);
  if (catalog.schema !== OFFLINE_CLOUD_2_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (OFFLINE_CLOUD_2_PHASE !== 21) errors.push("phase mirror mismatch");
  if (catalog.offlineCloud2Marker !== OFFLINE_CLOUD_2_MARKER) errors.push("marker mismatch");
  if (fixture.offlineCloud2Marker !== OFFLINE_CLOUD_2_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.schemaVersion !== 25) errors.push("schemaVersion must stay 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");

  const measure = measureOfflineCloud2(root);
  if (measure.dailyObjectiveCount < OFFLINE_CLOUD_2.dailyObjectiveMin) {
    errors.push(
      `daily objectives ${measure.dailyObjectiveCount} < ${OFFLINE_CLOUD_2.dailyObjectiveMin}`,
    );
  }
  if (measure.boardSlots < OFFLINE_CLOUD_2.boardSlotsMin) {
    errors.push(`boardSlots ${measure.boardSlots} < ${OFFLINE_CLOUD_2.boardSlotsMin}`);
  }
  if (!measure.objectivesPresent) errors.push("phase-21 daily objective ids missing from content-pack");
  if (!measure.journalFieldsPresent) errors.push("offline journal delta fields missing TS/Kotlin");
  if (!measure.conflictFieldsPresent) {
    errors.push("conflict reasonCode/diffHints missing from sync + title panels");
  }
  if (!measure.analyticsRetryWired) errors.push("analytics requeue/retry wiring incomplete");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 21 must set id=offline-cloud-2 validate=offlinecloud2:validate");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  const phase21 = (kickoff.phases as any[])?.find((p) => p.phase === 21);
  if (!phase21 || phase21.validate !== "offlinecloud2:validate") {
    errors.push("kickoff phase 21 validate must be offlinecloud2:validate");
  }
  if (phase21?.id !== "offline-cloud-2") errors.push("kickoff phase 21 id must be offline-cloud-2");

  if (listing.offlineCloud2Phase !== 21) errors.push("listing.offlineCloud2Phase must be 21");
  if (listing.offlineCloud2Catalog !== "shared/ship/offline-cloud-2.json") {
    errors.push("listing.offlineCloud2Catalog mismatch");
  }
  if (pin.offlineCloud2 !== "shared/ship/offline-cloud-2.json") {
    errors.push("RELEASE_PIN.offlineCloud2 path missing");
  }
  if (!pin.fixtures?.includes("parity-offline-cloud-2.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-offline-cloud-2.json");
  }

  const block = dod.offlineCloud2;
  if (!block) errors.push("DoD missing offlineCloud2 block");
  else {
    if (block.phase !== 21) errors.push("DoD offlineCloud2.phase must be 21");
    if (block.plan !== "30_finish_4.0") errors.push("DoD offlineCloud2.plan mismatch");
    if (block.status !== "complete") errors.push("DoD offlineCloud2.status must be complete");
    if (block.offlineCloud2Marker !== OFFLINE_CLOUD_2_MARKER) {
      errors.push("DoD offlineCloud2 marker mismatch");
    }
  }

  if (!pkg.scripts?.["offlinecloud2:validate"]) {
    errors.push("package.json missing offlinecloud2:validate");
  }
  if (!ci.includes("offlinecloud2:validate")) errors.push("ci.yml missing offlinecloud2:validate");
  if (!kotlin.includes("JOURNAL_DELTA_FIELDS")) {
    errors.push("Kotlin OfflineCloud2 missing JOURNAL_DELTA_FIELDS");
  }
  if (!kotlin.includes("CONFLICT_FIELDS")) {
    errors.push("Kotlin OfflineCloud2 missing CONFLICT_FIELDS");
  }
  if (!finish4Kt.includes("offlinecloud2:validate")) {
    errors.push("Finish4Kickoff.kt phase 21 missing offlinecloud2:validate");
  }
  if (!existsSync(resolve(root, "shared/tools/author_offline_cloud_2.py"))) {
    errors.push("missing author_offline_cloud_2.py");
  }

  if (fixture.expect?.dailyObjectiveMin !== 10) errors.push("parity dailyObjectiveMin must be 10");
  if (fixture.expect?.boardSlotsMin !== 4) errors.push("parity boardSlotsMin must be 4");
  if (fixture.expect?.requeueOnFlushFailure !== true) {
    errors.push("parity requeueOnFlushFailure must be true");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("offlinecloud2:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK offlinecloud2:validate — offline/cloud/analytics hardening wired");
