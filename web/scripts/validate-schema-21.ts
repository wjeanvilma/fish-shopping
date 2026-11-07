/**
 * Finish 2.0 Phase 7 — schema 21 kickoff readiness.
 *
 * Usage:
 *   npm run schema21:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import {
  SCHEMA_21,
  SCHEMA_21_PHASE,
  SCHEMA_21_SCHEMA,
  SCHEMA_21_VERSION,
} from "../src/ship/schema21";
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
  const catalog = readJson(resolve(root, "shared/ship/schema-21.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const packSchema = readJson(resolve(root, "shared/schema/content-pack.schema.json"));
  const lifecycle = readJson(resolve(root, "shared/lifecycle/browser-lifecycle.json"));
  const parity = readJson(resolve(root, "shared/fixtures/parity-lock.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const hotfix = readJson(resolve(root, "shared/ship/hotfix-lane.json"));
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
  const legacy20 = readJson(
    resolve(root, "shared/fixtures/legacy/snapshot-v20-starter-line-t2500.json"),
  );

  if (catalog.phase !== 7) errors.push(`phase expected 7, got ${catalog.phase}`);
  if (catalog.schema !== SCHEMA_21_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (SCHEMA_21_PHASE !== 7) errors.push("phase mirror mismatch");
  if (catalog.fromSchema !== 20 || catalog.toSchema !== 21) errors.push("from/to schema");
  if (SCHEMA_21_VERSION !== 21) errors.push("SCHEMA_21_VERSION mismatch");
  if (SCHEMA_VERSION < 21) errors.push("engine SCHEMA_VERSION must be >= 21");
  if (!foundationsKt.includes("SCHEMA_VERSION =")) errors.push("Kotlin SCHEMA_VERSION missing");
  if (!codecKt.includes("unlockedAchievements")) errors.push("Kotlin codec missing unlockedAchievements");
  if (!codecKt.includes("version >= 21")) errors.push("Kotlin codec missing version >= 21 branch");
  if (!snapshotTs.includes("unlockedAchievements")) errors.push("web codec missing unlockedAchievements");
  if (!snapshotTs.includes("version >= 21")) errors.push("web codec missing version >= 21 branch");

  if (pack.saveSchemaVersion < 21) errors.push("content-pack.saveSchemaVersion must be >= 21");
  if ((packSchema.properties?.saveSchemaVersion?.const ?? 0) < 21) {
    errors.push("content-pack.schema saveSchemaVersion const must be >= 21");
  }

  if (pin.schemaVersion < 21) errors.push("RELEASE_PIN.schemaVersion must be >= 21");
  if (pin.storeRelease?.schemaVersion !== 20) errors.push("storeRelease.schemaVersion must stay 20");
  if (pin.completeRelease?.schemaVersion !== 20) {
    errors.push("completeRelease.schemaVersion must stay 20");
  }
  if (pin.schema21 !== "shared/ship/schema-21.json") errors.push("RELEASE_PIN.schema21 path");
  if (!pin.fixtures?.includes("legacy/snapshot-v20-starter-line-t2500.json")) {
    errors.push("RELEASE_PIN missing legacy v20 fixture");
  }

  if (lifecycle.fixtures.currentSchema < 21) errors.push("lifecycle currentSchema must be >= 21");
  if (!lifecycle.fixtures.requiredLegacyVersions.includes(20)) {
    errors.push("lifecycle requiredLegacyVersions must include 20");
  }
  if (LIFECYCLE_CURRENT_SCHEMA < 21) {
    errors.push("lifecyclePolicy currentSchema must be >= 21");
  }
  if (![...LIFECYCLE_LEGACY_VERSIONS].includes(20)) errors.push("LIFECYCLE_LEGACY_VERSIONS missing 20");

  if (parity.schemaVersion < 21) errors.push("parity-lock schemaVersion must be >= 21");
  if (!parity.expandedExpectFields.includes("unlockedAchievements")) {
    errors.push("parity-lock expandedExpectFields missing unlockedAchievements");
  }
  const legacySuite = parity.suites.find((s: any) => s.id === "legacy_migrations");
  if (!legacySuite?.fixtures?.includes(SCHEMA_21.lifecycle.newLegacyFixture)) {
    errors.push("parity-lock legacy suite missing v20 fixture");
  }

  if (legacy20.schemaVersion !== 20) errors.push("legacy v20 fixture must have schemaVersion 20");
  if (!("fullHarborUnlock" in (legacy20.state ?? {}))) {
    errors.push("legacy v20 fixture missing fullHarborUnlock");
  }
  if ("unlockedAchievements" in (legacy20.state ?? {})) {
    errors.push("legacy v20 fixture must not include unlockedAchievements");
  }
  if (SCHEMA_VERSION === 21 && !currentSnap.startsWith('{"schemaVersion":21,')) {
    errors.push("current starter-line snapshot must be schemaVersion 21");
  }
  if (!currentSnap.includes('"unlockedAchievements":')) {
    errors.push("current starter-line snapshot missing unlockedAchievements");
  }

  if (hotfix.versioning.schemaMustStay !== 20) {
    errors.push("hotfix-lane schemaMustStay must remain 20");
  }
  if (listing.schema21Phase !== 7) errors.push("listing.schema21Phase must be 7");
  if (listing.schema21Catalog !== "shared/ship/schema-21.json") {
    errors.push("listing.schema21Catalog mismatch");
  }
  if (!ci.includes("schema21:validate")) errors.push("ci.yml missing schema21:validate");

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("schema21:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK schema21:validate — save schema 21 + v20→v21 migration ready");
