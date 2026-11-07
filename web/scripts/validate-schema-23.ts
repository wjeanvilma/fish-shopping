/**
 * Finish 2.0 Phase 15 — schema 23 kickoff readiness.
 *
 * Usage:
 *   npm run schema23:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import {
  SCHEMA_23,
  SCHEMA_23_PHASE,
  SCHEMA_23_SCHEMA,
  SCHEMA_23_VERSION,
} from "../src/ship/schema23";
import {
  LIFECYCLE_CURRENT_SCHEMA,
  LIFECYCLE_LEGACY_VERSIONS,
  LIFECYCLE_MIGRATE_THROUGH_SCHEMA,
} from "../src/game/lifecyclePolicy";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/schema-23.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const packSchema = readJson(resolve(root, "shared/schema/content-pack.schema.json"));
  const lifecycle = readJson(resolve(root, "shared/lifecycle/browser-lifecycle.json"));
  const parity = readJson(resolve(root, "shared/fixtures/parity-lock.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const foundationsKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/Foundations.kt"),
    "utf8",
  );
  const codecKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/persistence/SnapshotCodec.kt"),
    "utf8",
  );
  const snapshotTs = readFileSync(resolve(root, "web/src/engine/snapshot.ts"), "utf8");
  const currentSnap = readFileSync(
    resolve(root, "shared/fixtures/snapshot-starter-line-t2500.json"),
    "utf8",
  );
  const legacy22 = readJson(
    resolve(root, "shared/fixtures/legacy/snapshot-v22-starter-line-t2500.json"),
  );

  if (catalog.phase !== 15) errors.push(`phase expected 15, got ${catalog.phase}`);
  if (catalog.schema !== SCHEMA_23_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (SCHEMA_23_PHASE !== 15) errors.push("phase mirror mismatch");
  if (catalog.fromSchema !== 22 || catalog.toSchema !== 23) errors.push("from/to schema");
  if (SCHEMA_23_VERSION !== 23) errors.push("SCHEMA_23_VERSION mismatch");
  if (SCHEMA_VERSION !== 23) errors.push("engine SCHEMA_VERSION must be 23");
  if (!foundationsKt.includes("SCHEMA_VERSION = 23")) errors.push("Kotlin SCHEMA_VERSION must be 23");
  if (!codecKt.includes("unlockedBranchIds")) errors.push("Kotlin codec missing unlockedBranchIds");
  if (!codecKt.includes("activeBranchId")) errors.push("Kotlin codec missing activeBranchId");
  if (!codecKt.includes("branchTrainingXp")) errors.push("Kotlin codec missing branchTrainingXp");
  if (!codecKt.includes("scheduleId")) errors.push("Kotlin codec missing scheduleId");
  if (!codecKt.includes("version >= 23")) errors.push("Kotlin codec missing version >= 23 branch");
  if (!snapshotTs.includes("unlockedBranchIds")) errors.push("web codec missing unlockedBranchIds");
  if (!snapshotTs.includes("activeBranchId")) errors.push("web codec missing activeBranchId");
  if (!snapshotTs.includes("version >= 23")) errors.push("web codec missing version >= 23 branch");

  if (pack.saveSchemaVersion !== 23) errors.push("content-pack.saveSchemaVersion must be 23");
  if (packSchema.properties?.saveSchemaVersion?.const !== 23) {
    errors.push("content-pack.schema saveSchemaVersion const must be 23");
  }

  if (pin.schemaVersion !== 23) errors.push("RELEASE_PIN.schemaVersion must be 23");
  if (pin.storeRelease?.schemaVersion !== 20) errors.push("storeRelease.schemaVersion must stay 20");
  if (pin.completeRelease?.schemaVersion !== 20) {
    errors.push("completeRelease.schemaVersion must stay 20");
  }
  if (pin.schema23 !== "shared/ship/schema-23.json") errors.push("RELEASE_PIN.schema23 path");
  if (!pin.fixtures?.includes("legacy/snapshot-v22-starter-line-t2500.json")) {
    errors.push("RELEASE_PIN missing legacy v22 fixture");
  }

  if (lifecycle.fixtures.currentSchema !== 23) errors.push("lifecycle currentSchema must be 23");
  if (lifecycle.fixtures.migrateThroughSchema !== 22) {
    errors.push("lifecycle migrateThroughSchema must be 22");
  }
  if (!lifecycle.fixtures.requiredLegacyVersions.includes(22)) {
    errors.push("lifecycle requiredLegacyVersions must include 22");
  }
  if (!lifecycle.fixtures.requiredLegacyVersions.includes(21)) {
    errors.push("lifecycle requiredLegacyVersions must include 21");
  }
  if (LIFECYCLE_CURRENT_SCHEMA !== 23 || LIFECYCLE_MIGRATE_THROUGH_SCHEMA !== 22) {
    errors.push("lifecyclePolicy mirrors mismatch");
  }
  if (![...LIFECYCLE_LEGACY_VERSIONS].includes(22)) errors.push("LIFECYCLE_LEGACY_VERSIONS missing 22");
  if (![...LIFECYCLE_LEGACY_VERSIONS].includes(21)) errors.push("LIFECYCLE_LEGACY_VERSIONS missing 21");

  if (parity.schemaVersion !== 23) errors.push("parity-lock schemaVersion must be 23");
  if (!parity.expandedExpectFields.includes("workers")) {
    errors.push("parity-lock expandedExpectFields missing workers");
  }

  if (!ci.includes("schema23:validate")) errors.push("ci.yml missing schema23:validate");

  if (!currentSnap.includes('"schemaVersion":23') && !currentSnap.includes('"schemaVersion": 23')) {
    errors.push("current starter-line snapshot must be schema 23");
  }
  if (legacy22.schemaVersion !== 22) errors.push("legacy v22 fixture schemaVersion must be 22");
  if (!existsSync(resolve(root, "shared/fixtures/legacy/snapshot-v22-starter-line-t2500.json"))) {
    errors.push("missing legacy v22 fixture file");
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("schema23:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK schema23:validate — schema 23 ready");
