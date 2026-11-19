/**
 * Finish 5.0 Phase 17 — endgame deepen + schema 26 readiness.
 *
 * Usage:
 *   npm run endgame3:validate
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
  ENDGAME_3,
  ENDGAME_3_MARKER,
  ENDGAME_3_PHASE,
  ENDGAME_3_SCHEMA,
  ENDGAME_3_VERSION,
  measureEndgame3,
} from "../src/ship/endgame3";
import { CONTENT_STRING_KEYS, contentStringKeyCount } from "../src/i18n/contentStrings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/endgame-3.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-endgame-3.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const packSchema = readJson(resolve(root, "shared/schema/content-pack.schema.json"));
  const lifecycle = readJson(resolve(root, "shared/lifecycle/browser-lifecycle.json"));
  const parity = readJson(resolve(root, "shared/fixtures/parity-lock.json"));
  const prep = readJson(resolve(root, "shared/ship/schema-26-prep.json"));
  const endgame2 = readJson(resolve(root, "shared/ship/endgame-2.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const foundationsKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/Foundations.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Endgame3.kt"),
    "utf8",
  );
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );
  const en = readJson(resolve(root, "shared/i18n/content-strings.en.json"));
  const currentSnap = readFileSync(
    resolve(root, "shared/fixtures/snapshot-starter-line-t2500.json"),
    "utf8",
  );
  const legacy25 = readJson(
    resolve(root, "shared/fixtures/legacy/snapshot-v25-starter-line-t2500.json"),
  );

  if (catalog.phase !== 17) errors.push(`phase expected 17, got ${catalog.phase}`);
  if (catalog.schema !== ENDGAME_3_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (ENDGAME_3_PHASE !== 17) errors.push("phase mirror mismatch");
  if (catalog.endgame3Marker !== ENDGAME_3_MARKER) errors.push("marker mismatch");
  if (fixture.endgame3Marker !== ENDGAME_3_MARKER) errors.push("fixture marker mismatch");
  if (catalog.fromSchema !== 25 || catalog.toSchema !== 26) errors.push("from/to schema");
  if (ENDGAME_3_VERSION !== 26) errors.push("ENDGAME_3_VERSION mismatch");
  if (SCHEMA_VERSION !== 26) errors.push("engine SCHEMA_VERSION must be 26");
  if (!foundationsKt.includes("SCHEMA_VERSION = 26")) {
    errors.push("Kotlin SCHEMA_VERSION must be 26");
  }
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.schemaVersion !== 26) errors.push("catalog schemaVersion must be 26");
  if ((endgame2.tierCountMin ?? 0) < 6 || (endgame2.challengeCountMin ?? 0) < 8) {
    errors.push("Finish 4.0 endgame-2 floors must stay intact");
  }

  const measure = measureEndgame3(root);
  if (measure.schemaVersion !== 26) errors.push("measure schemaVersion must be 26");
  if (measure.tierCount < ENDGAME_3.tierCountMin) {
    errors.push(`tiers ${measure.tierCount} < ${ENDGAME_3.tierCountMin}`);
  }
  if (measure.challengeCount < ENDGAME_3.challengeCountMin) {
    errors.push(`challenges ${measure.challengeCount} < ${ENDGAME_3.challengeCountMin}`);
  }
  if (measure.markDefs < ENDGAME_3.markCountMin) {
    errors.push(`mark defs ${measure.markDefs} < ${ENDGAME_3.markCountMin}`);
  }
  if (measure.crestDefs < ENDGAME_3.crestCountMin) {
    errors.push(`crest defs ${measure.crestDefs} < ${ENDGAME_3.crestCountMin}`);
  }
  if (!measure.newTiersPresent) errors.push("new deepen tiers missing");
  if (!measure.newChallengesPresent) errors.push("new deepen challenges missing");
  if (!measure.statsWiredTs) errors.push("TS stats missing endgame crest key");
  if (!measure.statsWiredKt) errors.push("Kotlin stats missing endgame crest key");
  if (!measure.systemMarkersTs) errors.push("TS EndgameSystem markers missing");
  if (!measure.systemMarkersKt) errors.push("Kotlin EndgameSystem markers missing");
  if (!measure.codecMarkersTs) errors.push("TS snapshot codec markers missing");
  if (!measure.codecMarkersKt) errors.push("Kotlin SnapshotCodec markers missing");
  if (!measure.kickoffClosed) {
    errors.push("kickoff must close endgameSchema26Pending and pin schema≥26 / endgame3:validate");
  }
  if (!measure.schemaPrepApplied) errors.push("schema-26-prep must be applied at schema 26");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const id of [...ENDGAME_3.newTierIds, ...ENDGAME_3.newChallengeIds, ...ENDGAME_3.crestIds]) {
    if (!en.strings?.[id]) errors.push(`content-strings.en missing ${id}`);
  }

  const contentKeySet = new Set(CONTENT_STRING_KEYS);
  for (const id of [...ENDGAME_3.newTierIds, ...ENDGAME_3.newChallengeIds, ...ENDGAME_3.crestIds]) {
    if (!contentKeySet.has(id)) errors.push(`missing content-string for ${id}`);
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("es")) {
    errors.push("en/es content string counts differ");
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("pt")) {
    errors.push("en/pt content string counts differ");
  }

  if (pack.saveSchemaVersion !== 26) errors.push("content-pack.saveSchemaVersion must be 26");
  if (packSchema.properties?.saveSchemaVersion?.const !== 26) {
    errors.push("content-pack.schema saveSchemaVersion const must be 26");
  }
  if (!packSchema.properties?.endgame?.properties?.tiers?.items?.properties?.requiresCrests) {
    errors.push("content-pack.schema endgame tiers missing requiresCrests");
  }
  if (!packSchema.properties?.endgame?.properties?.challenges?.items?.properties?.grantsCrest) {
    errors.push("content-pack.schema endgame challenges missing grantsCrest");
  }

  if (pin.schemaVersion !== 26) errors.push("RELEASE_PIN.schemaVersion must be 26");
  if (pin.storeRelease?.schemaVersion !== 20) errors.push("storeRelease.schemaVersion must stay 20");
  if (pin.completeRelease?.schemaVersion !== 20) {
    errors.push("completeRelease.schemaVersion must stay 20");
  }
  if (pin.endgame3 !== "shared/ship/endgame-3.json") {
    errors.push("RELEASE_PIN.endgame3 path missing");
  }
  if (!pin.fixtures?.includes("parity-endgame-3.json")) {
    errors.push("RELEASE_PIN missing parity-endgame-3.json");
  }
  if (!pin.fixtures?.includes("legacy/snapshot-v25-starter-line-t2500.json")) {
    errors.push("RELEASE_PIN missing legacy v25 fixture");
  }

  if (lifecycle.fixtures.currentSchema !== 26) errors.push("lifecycle currentSchema must be 26");
  if (lifecycle.fixtures.migrateThroughSchema !== 25) {
    errors.push("lifecycle migrateThroughSchema must be 25");
  }
  if (!lifecycle.fixtures.requiredLegacyVersions.includes(25)) {
    errors.push("lifecycle requiredLegacyVersions must include 25");
  }
  if (!lifecycle.fixtures.requiredLegacyVersions.includes(24)) {
    errors.push("lifecycle requiredLegacyVersions must include 24");
  }
  if (LIFECYCLE_CURRENT_SCHEMA !== 26 || LIFECYCLE_MIGRATE_THROUGH_SCHEMA !== 25) {
    errors.push("lifecyclePolicy mirrors mismatch");
  }
  if (![...LIFECYCLE_LEGACY_VERSIONS].includes(25)) {
    errors.push("LIFECYCLE_LEGACY_VERSIONS missing 25");
  }

  if (parity.schemaVersion < 26) errors.push("parity-lock schemaVersion must be ≥ 26");

  if (prep.status !== "applied") errors.push("schema-26-prep status must be applied");
  if (prep.currentSchemaVersion !== 26) errors.push("schema-26-prep current must be 26");
  if (prep.targetSchemaVersion !== 26) errors.push("schema-26-prep target must be 26");
  if (prep.ownedByPhase !== 17) errors.push("schema-26-prep ownedByPhase must be 17");

  const phase17 = (kickoff.phases as any[])?.find((p) => p.phase === 17);
  if (!phase17) errors.push("kickoff missing phase 17");
  else if (phase17.validate !== "endgame3:validate") {
    errors.push("kickoff phase 17 validate must be endgame3:validate");
  }
  if (phase17?.id !== "endgame-3") errors.push("kickoff phase 17 id must be endgame-3");
  if (kickoff.schemaVersion < 26) errors.push("kickoff schemaVersion must be ≥ 26");
  if ((kickoff.baseline?.schemaVersion ?? 0) < 26) {
    errors.push("kickoff.baseline.schemaVersion must be ≥ 26");
  }
  if (kickoff.gaps?.endgameSchema26Pending !== false) {
    errors.push("kickoff.gaps.endgameSchema26Pending must be false");
  }

  if (listing.endgame3Phase !== 17) errors.push("listing.endgame3Phase must be 17");
  if (listing.endgame3Catalog !== "shared/ship/endgame-3.json") {
    errors.push("listing.endgame3Catalog mismatch");
  }

  const block = dod.endgame3;
  if (!block) errors.push("DoD missing endgame3 block");
  else {
    if (block.phase !== 17) errors.push("DoD endgame3.phase must be 17");
    if (block.plan !== "30_finish_5.0") errors.push("DoD endgame3.plan mismatch");
    if (block.status !== "complete") errors.push("DoD endgame3.status must be complete");
    if (block.endgame3Marker !== ENDGAME_3_MARKER) {
      errors.push("DoD endgame3 marker mismatch");
    }
  }

  if (!pkg.scripts?.["endgame3:validate"]) errors.push("package.json missing endgame3:validate");
  if (!ci.includes("endgame3:validate")) errors.push("ci.yml missing endgame3:validate");
  if (!ci.includes("endgame2:validate")) errors.push("ci.yml missing baseline endgame2:validate");
  if (!kotlin.includes("NEW_TIER_IDS")) errors.push("Kotlin Endgame3 missing NEW_TIER_IDS");
  if (!finish5Kt.includes("endgame3:validate")) {
    errors.push("Finish5Kickoff.kt phase 17 missing endgame3:validate");
  }
  if (!existsSync(resolve(root, "shared/tools/author_endgame_3.py"))) {
    errors.push("missing author_endgame_3.py");
  }

  if (!currentSnap.includes('"schemaVersion":26') && !currentSnap.includes('"schemaVersion": 26')) {
    errors.push("current starter-line snapshot must be schema 26");
  }
  if (legacy25.schemaVersion !== 25) errors.push("legacy v25 fixture schemaVersion must be 25");
  if (!existsSync(resolve(root, "shared/fixtures/legacy/snapshot-v25-starter-line-t2500.json"))) {
    errors.push("missing legacy v25 fixture file");
  }
  if (fixture.expect?.schemaVersion !== 26) errors.push("parity expect.schemaVersion must be 26");
  if (fixture.firstNewTierId !== "endgame.tier.aurora_throne") {
    errors.push("parity firstNewTierId must be aurora_throne");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("FAIL endgame3:validate\n" + errors.map((e) => ` - ${e}`).join("\n"));
  process.exit(1);
}
console.log("OK endgame3:validate — endgame deepen + schema 26 locked");
