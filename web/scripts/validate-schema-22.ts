/**
 * Finish 2.0 Phase 14 — schema 22 kickoff readiness.
 *
 * Usage:
 *   npm run schema22:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import {
  SCHEMA_22,
  SCHEMA_22_PHASE,
  SCHEMA_22_SCHEMA,
  SCHEMA_22_VERSION,
} from "../src/ship/schema22";
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
  const catalog = readJson(resolve(root, "shared/ship/schema-22.json"));
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
  const legacy21 = readJson(
    resolve(root, "shared/fixtures/legacy/snapshot-v21-starter-line-t2500.json"),
  );

  if (catalog.phase !== 14) errors.push(`phase expected 14, got ${catalog.phase}`);
  if (catalog.schema !== SCHEMA_22_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (SCHEMA_22_PHASE !== 14) errors.push("phase mirror mismatch");
  if (catalog.fromSchema !== 21 || catalog.toSchema !== 22) errors.push("from/to schema");
  if (SCHEMA_22_VERSION !== 22) errors.push("SCHEMA_22_VERSION mismatch");
  if (SCHEMA_VERSION < 22) errors.push("engine SCHEMA_VERSION must be >= 22");
  if (!foundationsKt.includes("SCHEMA_VERSION =")) errors.push("Kotlin SCHEMA_VERSION missing");
  if (!codecKt.includes("speciesMasteryXp")) errors.push("Kotlin codec missing speciesMasteryXp");
  if (!codecKt.includes("activeTechniqueId")) errors.push("Kotlin codec missing activeTechniqueId");
  if (!codecKt.includes("version >= 22")) errors.push("Kotlin codec missing version >= 22 branch");
  if (!snapshotTs.includes("speciesMasteryXp")) errors.push("web codec missing speciesMasteryXp");
  if (!snapshotTs.includes("activeTechniqueId")) errors.push("web codec missing activeTechniqueId");
  if (!snapshotTs.includes("version >= 22")) errors.push("web codec missing version >= 22 branch");

  if (pack.saveSchemaVersion < 22) errors.push("content-pack.saveSchemaVersion must be >= 22");
  if ((packSchema.properties?.saveSchemaVersion?.const ?? 0) < 22) {
    errors.push("content-pack.schema saveSchemaVersion const must be >= 22");
  }

  if (pin.schemaVersion < 22) errors.push("RELEASE_PIN.schemaVersion must be >= 22");
  if (pin.storeRelease?.schemaVersion !== 20) errors.push("storeRelease.schemaVersion must stay 20");
  if (pin.completeRelease?.schemaVersion !== 20) {
    errors.push("completeRelease.schemaVersion must stay 20");
  }
  if (pin.schema22 !== "shared/ship/schema-22.json") errors.push("RELEASE_PIN.schema22 path");
  if (!pin.fixtures?.includes("legacy/snapshot-v21-starter-line-t2500.json")) {
    errors.push("RELEASE_PIN missing legacy v21 fixture");
  }

  if (lifecycle.fixtures.currentSchema < 22) errors.push("lifecycle currentSchema must be >= 22");
  if (!lifecycle.fixtures.requiredLegacyVersions.includes(21)) {
    errors.push("lifecycle requiredLegacyVersions must include 21");
  }
  if (!lifecycle.fixtures.requiredLegacyVersions.includes(20)) {
    errors.push("lifecycle requiredLegacyVersions must include 20");
  }
  if (LIFECYCLE_CURRENT_SCHEMA < 22) {
    errors.push("lifecyclePolicy currentSchema must be >= 22");
  }
  if (![...LIFECYCLE_LEGACY_VERSIONS].includes(21)) errors.push("LIFECYCLE_LEGACY_VERSIONS missing 21");
  if (![...LIFECYCLE_LEGACY_VERSIONS].includes(20)) errors.push("LIFECYCLE_LEGACY_VERSIONS missing 20");

  if (parity.schemaVersion < 22) errors.push("parity-lock schemaVersion must be >= 22");
  if (!parity.expandedExpectFields.includes("speciesMasteryXp")) {
    errors.push("parity-lock expandedExpectFields missing speciesMasteryXp");
  }
  if (!parity.expandedExpectFields.includes("activeTechniqueId")) {
    errors.push("parity-lock expandedExpectFields missing activeTechniqueId");
  }

  if (!ci.includes("schema22:validate")) errors.push("ci.yml missing schema22:validate");

  if (
    !currentSnap.includes('"schemaVersion":22') &&
    !currentSnap.includes('"schemaVersion": 22') &&
    !currentSnap.includes('"schemaVersion":23') &&
    !currentSnap.includes('"schemaVersion": 23')
  ) {
    errors.push("current starter-line snapshot must be schema >= 22");
  }
  if (legacy21.schemaVersion !== 21) errors.push("legacy v21 fixture schemaVersion must be 21");
  if (!existsSync(resolve(root, "shared/fixtures/legacy/snapshot-v21-starter-line-t2500.json"))) {
    errors.push("missing legacy v21 fixture file");
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("schema22:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK schema22:validate — schema 22 ready");
