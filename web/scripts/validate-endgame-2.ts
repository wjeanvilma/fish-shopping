/**
 * Finish 4.0 Phase 17 — endgame deepen + schema 25 readiness.
 *
 * Usage:
 *   npm run endgame2:validate
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
  ENDGAME_2,
  ENDGAME_2_MARKER,
  ENDGAME_2_PHASE,
  ENDGAME_2_SCHEMA,
  ENDGAME_2_VERSION,
  measureEndgame2,
} from "../src/ship/endgame2";
import { CONTENT_STRING_KEYS, contentStringKeyCount } from "../src/i18n/contentStrings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/endgame-2.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-endgame-2.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const packSchema = readJson(resolve(root, "shared/schema/content-pack.schema.json"));
  const lifecycle = readJson(resolve(root, "shared/lifecycle/browser-lifecycle.json"));
  const parity = readJson(resolve(root, "shared/fixtures/parity-lock.json"));
  const prep = readJson(resolve(root, "shared/ship/schema-25-prep.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const foundationsKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/Foundations.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Endgame2.kt"),
    "utf8",
  );
  const finish4Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish4Kickoff.kt"),
    "utf8",
  );
  const en = readJson(resolve(root, "shared/i18n/content-strings.en.json"));
  const currentSnap = readFileSync(
    resolve(root, "shared/fixtures/snapshot-starter-line-t2500.json"),
    "utf8",
  );
  const legacy24 = readJson(
    resolve(root, "shared/fixtures/legacy/snapshot-v24-starter-line-t2500.json"),
  );

  if (catalog.phase !== 17) errors.push(`phase expected 17, got ${catalog.phase}`);
  if (catalog.schema !== ENDGAME_2_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (ENDGAME_2_PHASE !== 17) errors.push("phase mirror mismatch");
  if (catalog.endgame2Marker !== ENDGAME_2_MARKER) errors.push("marker mismatch");
  if (fixture.endgame2Marker !== ENDGAME_2_MARKER) errors.push("fixture marker mismatch");
  if (catalog.fromSchema !== 24 || catalog.toSchema !== 25) errors.push("from/to schema");
  if (ENDGAME_2_VERSION !== 25) errors.push("ENDGAME_2_VERSION mismatch");
  if (SCHEMA_VERSION !== 25) errors.push("engine SCHEMA_VERSION must be 25");
  if (!foundationsKt.includes("SCHEMA_VERSION = 25")) {
    errors.push("Kotlin SCHEMA_VERSION must be 25");
  }
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.schemaVersion !== 25) errors.push("catalog schemaVersion must be 25");

  const measure = measureEndgame2(root);
  if (measure.schemaVersion !== 25) errors.push("measure schemaVersion must be 25");
  if (measure.tierCount < ENDGAME_2.tierCountMin) {
    errors.push(`tiers ${measure.tierCount} < ${ENDGAME_2.tierCountMin}`);
  }
  if (measure.challengeCount < ENDGAME_2.challengeCountMin) {
    errors.push(`challenges ${measure.challengeCount} < ${ENDGAME_2.challengeCountMin}`);
  }
  if (measure.markDefs < ENDGAME_2.markCountMin) {
    errors.push(`mark defs ${measure.markDefs} < ${ENDGAME_2.markCountMin}`);
  }
  if (!measure.newTiersPresent) errors.push("new deepen tiers missing");
  if (!measure.newChallengesPresent) errors.push("new deepen challenges missing");
  if (!measure.statsWiredTs) errors.push("TS stats missing endgame mark key");
  if (!measure.statsWiredKt) errors.push("Kotlin stats missing endgame mark key");
  if (!measure.systemMarkersTs) errors.push("TS EndgameSystem markers missing");
  if (!measure.systemMarkersKt) errors.push("Kotlin EndgameSystem markers missing");
  if (!measure.codecMarkersTs) errors.push("TS snapshot codec markers missing");
  if (!measure.codecMarkersKt) errors.push("Kotlin SnapshotCodec markers missing");
  if (!measure.kickoffClosed) {
    errors.push("kickoff must close endgameSchema25Pending and pin schema≥25 / endgame2:validate");
  }
  if (!measure.schemaPrepApplied) errors.push("schema-25-prep must be applied at schema 25");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const id of [...ENDGAME_2.newTierIds, ...ENDGAME_2.newChallengeIds, ...ENDGAME_2.markIds]) {
    if (!en.strings?.[id]) errors.push(`content-strings.en missing ${id}`);
  }

  const contentKeySet = new Set(CONTENT_STRING_KEYS);
  for (const id of [...ENDGAME_2.newTierIds, ...ENDGAME_2.newChallengeIds, ...ENDGAME_2.markIds]) {
    if (!contentKeySet.has(id)) errors.push(`missing content-string for ${id}`);
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("es")) {
    errors.push("en/es content string counts differ");
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("pt")) {
    errors.push("en/pt content string counts differ");
  }

  if (pack.saveSchemaVersion !== 25) errors.push("content-pack.saveSchemaVersion must be 25");
  if (packSchema.properties?.saveSchemaVersion?.const !== 25) {
    errors.push("content-pack.schema saveSchemaVersion const must be 25");
  }
  if (!packSchema.properties?.endgame?.properties?.tiers?.items?.properties?.requiresMarks) {
    errors.push("content-pack.schema endgame tiers missing requiresMarks");
  }
  if (!packSchema.properties?.endgame?.properties?.challenges?.items?.properties?.grantsMark) {
    errors.push("content-pack.schema endgame challenges missing grantsMark");
  }

  if (pin.schemaVersion !== 25) errors.push("RELEASE_PIN.schemaVersion must be 25");
  if (pin.storeRelease?.schemaVersion !== 20) errors.push("storeRelease.schemaVersion must stay 20");
  if (pin.completeRelease?.schemaVersion !== 20) {
    errors.push("completeRelease.schemaVersion must stay 20");
  }
  if (pin.endgame2 !== "shared/ship/endgame-2.json") {
    errors.push("RELEASE_PIN.endgame2 path missing");
  }
  if (!pin.fixtures?.includes("parity-endgame-2.json")) {
    errors.push("RELEASE_PIN missing parity-endgame-2.json");
  }
  if (!pin.fixtures?.includes("legacy/snapshot-v24-starter-line-t2500.json")) {
    errors.push("RELEASE_PIN missing legacy v24 fixture");
  }

  if (lifecycle.fixtures.currentSchema !== 25) errors.push("lifecycle currentSchema must be 25");
  if (lifecycle.fixtures.migrateThroughSchema !== 24) {
    errors.push("lifecycle migrateThroughSchema must be 24");
  }
  if (!lifecycle.fixtures.requiredLegacyVersions.includes(24)) {
    errors.push("lifecycle requiredLegacyVersions must include 24");
  }
  if (!lifecycle.fixtures.requiredLegacyVersions.includes(23)) {
    errors.push("lifecycle requiredLegacyVersions must include 23");
  }
  if (LIFECYCLE_CURRENT_SCHEMA !== 25 || LIFECYCLE_MIGRATE_THROUGH_SCHEMA !== 24) {
    errors.push("lifecyclePolicy mirrors mismatch");
  }
  if (![...LIFECYCLE_LEGACY_VERSIONS].includes(24)) {
    errors.push("LIFECYCLE_LEGACY_VERSIONS missing 24");
  }

  if (parity.schemaVersion < 25) errors.push("parity-lock schemaVersion must be ≥ 25");

  if (prep.status !== "applied") errors.push("schema-25-prep status must be applied");
  if (prep.currentSchemaVersion !== 25) errors.push("schema-25-prep current must be 25");
  if (prep.targetSchemaVersion !== 25) errors.push("schema-25-prep target must be 25");
  if (prep.ownedByPhase !== 17) errors.push("schema-25-prep ownedByPhase must be 17");

  const phase17 = (kickoff.phases as any[])?.find((p) => p.phase === 17);
  if (!phase17) errors.push("kickoff missing phase 17");
  else if (phase17.validate !== "endgame2:validate") {
    errors.push("kickoff phase 17 validate must be endgame2:validate");
  }
  if (phase17?.id !== "endgame-2") errors.push("kickoff phase 17 id must be endgame-2");
  if (kickoff.schemaVersion < 25) errors.push("kickoff schemaVersion must be ≥ 25");
  if ((kickoff.baseline?.schemaVersion ?? 0) < 25) {
    errors.push("kickoff.baseline.schemaVersion must be ≥ 25");
  }
  if (kickoff.gaps?.endgameSchema25Pending !== false) {
    errors.push("kickoff.gaps.endgameSchema25Pending must be false");
  }

  if (listing.endgame2Phase !== 17) errors.push("listing.endgame2Phase must be 17");
  if (listing.endgame2Catalog !== "shared/ship/endgame-2.json") {
    errors.push("listing.endgame2Catalog mismatch");
  }

  const block = dod.endgame2;
  if (!block) errors.push("DoD missing endgame2 block");
  else {
    if (block.phase !== 17) errors.push("DoD endgame2.phase must be 17");
    if (block.plan !== "30_finish_4.0") errors.push("DoD endgame2.plan mismatch");
    if (block.status !== "complete") errors.push("DoD endgame2.status must be complete");
    if (block.endgame2Marker !== ENDGAME_2_MARKER) {
      errors.push("DoD endgame2 marker mismatch");
    }
  }

  if (!pkg.scripts?.["endgame2:validate"]) errors.push("package.json missing endgame2:validate");
  if (!ci.includes("endgame2:validate")) errors.push("ci.yml missing endgame2:validate");
  if (!kotlin.includes("NEW_TIER_IDS")) errors.push("Kotlin Endgame2 missing NEW_TIER_IDS");
  if (!finish4Kt.includes("endgame2:validate")) {
    errors.push("Finish4Kickoff.kt phase 17 missing endgame2:validate");
  }
  if (!existsSync(resolve(root, "shared/tools/author_endgame_2.py"))) {
    errors.push("missing author_endgame_2.py");
  }

  if (!currentSnap.includes('"schemaVersion":25') && !currentSnap.includes('"schemaVersion": 25')) {
    errors.push("current starter-line snapshot must be schema 25");
  }
  if (legacy24.schemaVersion !== 24) errors.push("legacy v24 fixture schemaVersion must be 24");
  if (!existsSync(resolve(root, "shared/fixtures/legacy/snapshot-v24-starter-line-t2500.json"))) {
    errors.push("missing legacy v24 fixture file");
  }

  if (fixture.expect?.schemaVersion !== 25) errors.push("parity expect.schemaVersion must be 25");
  if (fixture.expect?.tierCountMin !== 6) errors.push("parity tierCountMin must be 6");
  if (fixture.expect?.challengeCountMin !== 8) errors.push("parity challengeCountMin must be 8");

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("endgame2:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK endgame2:validate — schema 25 + endgame deepen locked");
