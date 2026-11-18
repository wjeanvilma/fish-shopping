/**
 * Finish 3.0 Phase 15 — schema 24 + endgame deepen readiness.
 *
 * Usage:
 *   npm run schema24:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import {
  LIFECYCLE_CURRENT_SCHEMA,
  LIFECYCLE_LEGACY_VERSIONS,
  LIFECYCLE_MIGRATE_THROUGH_SCHEMA,
} from "../src/game/lifecyclePolicy";
import {
  measureSchema24Endgame,
  SCHEMA_24_CHALLENGE_COUNT,
  SCHEMA_24_ENDGAME,
  SCHEMA_24_ENDGAME_MARKER,
  SCHEMA_24_ENDGAME_PHASE,
  SCHEMA_24_ENDGAME_SCHEMA,
  SCHEMA_24_TIER_COUNT,
  SCHEMA_24_VERSION,
} from "../src/ship/schema24Endgame";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/schema-24-endgame.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-schema-24-endgame.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const packSchema = readJson(resolve(root, "shared/schema/content-pack.schema.json"));
  const lifecycle = readJson(resolve(root, "shared/lifecycle/browser-lifecycle.json"));
  const parity = readJson(resolve(root, "shared/fixtures/parity-lock.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const foundationsKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/Foundations.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Schema24Endgame.kt"),
    "utf8",
  );
  const en = readJson(resolve(root, "shared/i18n/content-strings.en.json"));
  const currentSnap = readFileSync(
    resolve(root, "shared/fixtures/snapshot-starter-line-t2500.json"),
    "utf8",
  );
  const legacy23 = readJson(
    resolve(root, "shared/fixtures/legacy/snapshot-v23-starter-line-t2500.json"),
  );

  if (catalog.phase !== 15) errors.push(`phase expected 15, got ${catalog.phase}`);
  if (catalog.schema !== SCHEMA_24_ENDGAME_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (SCHEMA_24_ENDGAME_PHASE !== 15) errors.push("phase mirror mismatch");
  if (catalog.schema24EndgameMarker !== SCHEMA_24_ENDGAME_MARKER) errors.push("marker mismatch");
  if (fixture.schema24EndgameMarker !== SCHEMA_24_ENDGAME_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.fromSchema !== 23 || catalog.toSchema !== 24) errors.push("from/to schema");
  if (SCHEMA_24_VERSION !== 24) errors.push("SCHEMA_24_VERSION mismatch");
  if (SCHEMA_VERSION !== 24) errors.push("engine SCHEMA_VERSION must be 24");
  if (!foundationsKt.includes("SCHEMA_VERSION = 24")) {
    errors.push("Kotlin SCHEMA_VERSION must be 24");
  }
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (catalog.schemaVersion !== 24) errors.push("catalog schemaVersion must be 24");
  if (catalog.tierCount !== 4 || SCHEMA_24_TIER_COUNT !== 4) errors.push("tierCount must be 4");
  if (catalog.challengeCount !== 4 || SCHEMA_24_CHALLENGE_COUNT !== 4) {
    errors.push("challengeCount must be 4");
  }

  const measure = measureSchema24Endgame(root);
  if (measure.schemaVersion !== 24) errors.push("measure schemaVersion must be 24");
  if (measure.tierCount !== 4) errors.push(`tiers ${measure.tierCount} ≠ 4`);
  if (measure.challengeCount !== 4) errors.push(`challenges ${measure.challengeCount} ≠ 4`);
  if (!measure.tiersPresent) errors.push(`missing tiers: ${measure.missingTiers.join(", ")}`);
  if (!measure.challengesPresent) {
    errors.push(`missing challenges: ${measure.missingChallenges.join(", ")}`);
  }
  if (!measure.statsWiredTs) errors.push("TS stats missing endgame keys");
  if (!measure.statsWiredKt) errors.push("Kotlin stats missing endgame keys");
  if (!measure.systemMarkersTs) errors.push("TS EndgameSystem markers missing");
  if (!measure.systemMarkersKt) errors.push("Kotlin EndgameSystem markers missing");
  if (!measure.codecMarkersTs) errors.push("TS snapshot codec markers missing");
  if (!measure.codecMarkersKt) errors.push("Kotlin SnapshotCodec markers missing");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 15 must set validate=schema24:validate, schemaVersion≥24, measuredAtPhase≥15");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const id of SCHEMA_24_ENDGAME.tierIds) {
    if (!en.strings?.[id]) errors.push(`content-strings.en missing ${id}`);
  }
  for (const id of SCHEMA_24_ENDGAME.challengeIds) {
    if (!en.strings?.[id]) errors.push(`content-strings.en missing ${id}`);
  }

  if (pack.saveSchemaVersion !== 24) errors.push("content-pack.saveSchemaVersion must be 24");
  if (packSchema.properties?.saveSchemaVersion?.const !== 24) {
    errors.push("content-pack.schema saveSchemaVersion const must be 24");
  }
  if (!packSchema.required?.includes("endgame")) {
    errors.push("content-pack.schema required must include endgame");
  }
  if (!packSchema.properties?.endgame) errors.push("content-pack.schema missing endgame");

  if (pin.schemaVersion !== 24) errors.push("RELEASE_PIN.schemaVersion must be 24");
  if (pin.storeRelease?.schemaVersion !== 20) errors.push("storeRelease.schemaVersion must stay 20");
  if (pin.completeRelease?.schemaVersion !== 20) {
    errors.push("completeRelease.schemaVersion must stay 20");
  }
  if (pin.schema24Endgame !== "shared/ship/schema-24-endgame.json") {
    errors.push("RELEASE_PIN.schema24Endgame path missing");
  }
  if (!pin.fixtures?.includes("parity-schema-24-endgame.json")) {
    errors.push("RELEASE_PIN missing parity-schema-24-endgame.json");
  }
  if (!pin.fixtures?.includes("legacy/snapshot-v23-starter-line-t2500.json")) {
    errors.push("RELEASE_PIN missing legacy v23 fixture");
  }

  if (lifecycle.fixtures.currentSchema !== 24) errors.push("lifecycle currentSchema must be 24");
  if (lifecycle.fixtures.migrateThroughSchema !== 23) {
    errors.push("lifecycle migrateThroughSchema must be 23");
  }
  if (!lifecycle.fixtures.requiredLegacyVersions.includes(23)) {
    errors.push("lifecycle requiredLegacyVersions must include 23");
  }
  if (!lifecycle.fixtures.requiredLegacyVersions.includes(22)) {
    errors.push("lifecycle requiredLegacyVersions must include 22");
  }
  if (LIFECYCLE_CURRENT_SCHEMA !== 24 || LIFECYCLE_MIGRATE_THROUGH_SCHEMA !== 23) {
    errors.push("lifecyclePolicy mirrors mismatch");
  }
  if (![...LIFECYCLE_LEGACY_VERSIONS].includes(23)) {
    errors.push("LIFECYCLE_LEGACY_VERSIONS missing 23");
  }

  if (parity.schemaVersion !== 24) errors.push("parity-lock schemaVersion must be 24");

  const phase15 = (kickoff.phases as any[])?.find((p) => p.phase === 15);
  if (!phase15) errors.push("kickoff missing phase 15");
  else if (phase15.validate !== "schema24:validate") {
    errors.push("kickoff phase 15 validate must be schema24:validate");
  }
  if (kickoff.schemaVersion !== 24) errors.push("kickoff schemaVersion must be 24");
  if ((kickoff.baseline?.measuredAtPhase ?? 0) < 15) {
    errors.push("kickoff.baseline.measuredAtPhase must be ≥ 15");
  }
  if ((kickoff.baseline?.schemaVersion ?? 0) < 24) {
    errors.push("kickoff.baseline.schemaVersion must be ≥ 24");
  }

  if (listing.schema24EndgamePhase !== 15) errors.push("listing.schema24EndgamePhase must be 15");
  if (listing.schema24EndgameCatalog !== "shared/ship/schema-24-endgame.json") {
    errors.push("listing.schema24EndgameCatalog mismatch");
  }

  const block = dod.schema24Endgame;
  if (!block) errors.push("DoD missing schema24Endgame block");
  else {
    if (block.phase !== 15) errors.push("DoD schema24Endgame.phase must be 15");
    if (block.plan !== "30_finish_3.0") errors.push("DoD schema24Endgame.plan mismatch");
    if (block.status !== "complete") errors.push("DoD schema24Endgame.status must be complete");
    if (block.schema24EndgameMarker !== SCHEMA_24_ENDGAME_MARKER) {
      errors.push("DoD schema24Endgame marker mismatch");
    }
  }

  if (!pkg.scripts?.["schema24:validate"]) errors.push("package.json missing schema24:validate");
  if (!ci.includes("schema24:validate")) errors.push("ci.yml missing schema24:validate");
  if (!kotlin.includes("TIER_IDS")) errors.push("Kotlin Schema24Endgame missing TIER_IDS");
  if (!existsSync(resolve(root, "shared/tools/mutate_phase15_endgame.py"))) {
    errors.push("missing mutate_phase15_endgame.py");
  }

  if (!currentSnap.includes('"schemaVersion":24') && !currentSnap.includes('"schemaVersion": 24')) {
    errors.push("current starter-line snapshot must be schema 24");
  }
  if (legacy23.schemaVersion !== 23) errors.push("legacy v23 fixture schemaVersion must be 23");
  if (!existsSync(resolve(root, "shared/fixtures/legacy/snapshot-v23-starter-line-t2500.json"))) {
    errors.push("missing legacy v23 fixture file");
  }

  if (fixture.expect?.schemaVersion !== 24) errors.push("parity expect.schemaVersion must be 24");
  if (fixture.expect?.tierCount !== 4) errors.push("parity tierCount must be 4");
  if (fixture.expect?.challengeCount !== 4) errors.push("parity challengeCount must be 4");

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("schema24:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK schema24:validate — schema 24 + endgame deepen locked");
