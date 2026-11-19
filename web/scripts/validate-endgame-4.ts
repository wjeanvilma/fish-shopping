/**
 * Finish 6.0 Phase 14 — endgame deepen + schema 27 readiness.
 *
 * Usage:
 *   npm run endgame4:validate
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
  ENDGAME_4,
  ENDGAME_4_MARKER,
  ENDGAME_4_PHASE,
  ENDGAME_4_SCHEMA,
  ENDGAME_4_VERSION,
  measureEndgame4,
} from "../src/ship/endgame4";
import { CONTENT_STRING_KEYS, contentStringKeyCount } from "../src/i18n/contentStrings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/endgame-4.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-endgame-4.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const packSchema = readJson(resolve(root, "shared/schema/content-pack.schema.json"));
  const lifecycle = readJson(resolve(root, "shared/lifecycle/browser-lifecycle.json"));
  const parity = readJson(resolve(root, "shared/fixtures/parity-lock.json"));
  const prep = readJson(resolve(root, "shared/ship/schema-27-prep.json"));
  const endgame3 = readJson(resolve(root, "shared/ship/endgame-3.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const foundationsKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/Foundations.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Endgame4.kt"),
    "utf8",
  );
  const finish6Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt"),
    "utf8",
  );
  const en = readJson(resolve(root, "shared/i18n/content-strings.en.json"));
  const currentSnap = readFileSync(
    resolve(root, "shared/fixtures/snapshot-starter-line-t2500.json"),
    "utf8",
  );
  const legacy26 = readJson(
    resolve(root, "shared/fixtures/legacy/snapshot-v26-starter-line-t2500.json"),
  );

  if (catalog.phase !== 14) errors.push(`phase expected 14, got ${catalog.phase}`);
  if (catalog.schema !== ENDGAME_4_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (ENDGAME_4_PHASE !== 14) errors.push("phase mirror mismatch");
  if (catalog.endgame4Marker !== ENDGAME_4_MARKER) errors.push("marker mismatch");
  if (fixture.endgame4Marker !== ENDGAME_4_MARKER) errors.push("fixture marker mismatch");
  if (catalog.fromSchema !== 26 || catalog.toSchema !== 27) errors.push("from/to schema");
  if (ENDGAME_4_VERSION !== 27) errors.push("ENDGAME_4_VERSION mismatch");
  if (SCHEMA_VERSION !== 27) errors.push("engine SCHEMA_VERSION must be 27");
  if (!foundationsKt.includes("SCHEMA_VERSION = 27")) {
    errors.push("Kotlin SCHEMA_VERSION must be 27");
  }
  if (catalog.contentVersion !== "5.0.0") errors.push("contentVersion must stay 5.0.0");
  if (catalog.schemaVersion !== 27) errors.push("catalog schemaVersion must be 27");
  if ((endgame3.tierCountMin ?? 0) < 8 || (endgame3.challengeCountMin ?? 0) < 12) {
    errors.push("Finish 5.0 endgame-3 floors must stay intact");
  }

  const measure = measureEndgame4(root);
  if (measure.schemaVersion !== 27) errors.push("measure schemaVersion must be 27");
  if (measure.tierCount < ENDGAME_4.tierCountMin) {
    errors.push(`tiers ${measure.tierCount} < ${ENDGAME_4.tierCountMin}`);
  }
  if (measure.challengeCount < ENDGAME_4.challengeCountMin) {
    errors.push(`challenges ${measure.challengeCount} < ${ENDGAME_4.challengeCountMin}`);
  }
  if (measure.markDefs < ENDGAME_4.markCountMin) {
    errors.push(`mark defs ${measure.markDefs} < ${ENDGAME_4.markCountMin}`);
  }
  if (measure.crestDefs < ENDGAME_4.crestCountMin) {
    errors.push(`crest defs ${measure.crestDefs} < ${ENDGAME_4.crestCountMin}`);
  }
  if (measure.sigilDefs < ENDGAME_4.sigilCountMin) {
    errors.push(`sigil defs ${measure.sigilDefs} < ${ENDGAME_4.sigilCountMin}`);
  }
  if (!measure.newTiersPresent) errors.push("new deepen tiers missing");
  if (!measure.newChallengesPresent) errors.push("new deepen challenges missing");
  if (!measure.statsWiredTs) errors.push("TS stats missing endgame sigil key");
  if (!measure.statsWiredKt) errors.push("Kotlin stats missing endgame sigil key");
  if (!measure.systemMarkersTs) errors.push("TS EndgameSystem markers missing");
  if (!measure.systemMarkersKt) errors.push("Kotlin EndgameSystem markers missing");
  if (!measure.codecMarkersTs) errors.push("TS snapshot codec markers missing");
  if (!measure.codecMarkersKt) errors.push("Kotlin SnapshotCodec markers missing");
  if (!measure.kickoffClosed) {
    errors.push("kickoff must close endgameSchema27Pending and pin schema≥27 / endgame4:validate");
  }
  if (!measure.schemaPrepApplied) errors.push("schema-27-prep must be applied at schema 27");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const id of [...ENDGAME_4.newTierIds, ...ENDGAME_4.newChallengeIds, ...ENDGAME_4.sigilIds]) {
    if (!en.strings?.[id]) errors.push(`content-strings.en missing ${id}`);
  }

  const contentKeySet = new Set(CONTENT_STRING_KEYS);
  for (const id of [...ENDGAME_4.newTierIds, ...ENDGAME_4.newChallengeIds, ...ENDGAME_4.sigilIds]) {
    if (!contentKeySet.has(id)) errors.push(`missing content-string for ${id}`);
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("es")) {
    errors.push("en/es content string counts differ");
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("pt")) {
    errors.push("en/pt content string counts differ");
  }

  if (pack.saveSchemaVersion !== 27) errors.push("content-pack.saveSchemaVersion must be 27");
  if (packSchema.properties?.saveSchemaVersion?.const !== 27) {
    errors.push("content-pack.schema saveSchemaVersion const must be 27");
  }
  if (!packSchema.properties?.endgame?.properties?.tiers?.items?.properties?.requiresSigils) {
    errors.push("content-pack.schema endgame tiers missing requiresSigils");
  }
  if (!packSchema.properties?.endgame?.properties?.challenges?.items?.properties?.grantsSigil) {
    errors.push("content-pack.schema endgame challenges missing grantsSigil");
  }

  if (pin.schemaVersion !== 27) errors.push("RELEASE_PIN.schemaVersion must be 27");
  if (pin.storeRelease?.schemaVersion !== 20) errors.push("storeRelease.schemaVersion must stay 20");
  if (pin.completeRelease?.schemaVersion !== 20) {
    errors.push("completeRelease.schemaVersion must stay 20");
  }
  if (pin.endgame4 !== "shared/ship/endgame-4.json") {
    errors.push("RELEASE_PIN.endgame4 path missing");
  }
  if (!pin.fixtures?.includes("parity-endgame-4.json")) {
    errors.push("RELEASE_PIN missing parity-endgame-4.json");
  }
  if (!pin.fixtures?.includes("legacy/snapshot-v26-starter-line-t2500.json")) {
    errors.push("RELEASE_PIN missing legacy v26 fixture");
  }

  if (lifecycle.fixtures.currentSchema !== 27) errors.push("lifecycle currentSchema must be 27");
  if (lifecycle.fixtures.migrateThroughSchema !== 26) {
    errors.push("lifecycle migrateThroughSchema must be 26");
  }
  if (!lifecycle.fixtures.requiredLegacyVersions.includes(26)) {
    errors.push("lifecycle requiredLegacyVersions must include 26");
  }
  if (!lifecycle.fixtures.requiredLegacyVersions.includes(25)) {
    errors.push("lifecycle requiredLegacyVersions must include 25");
  }
  if (LIFECYCLE_CURRENT_SCHEMA !== 27 || LIFECYCLE_MIGRATE_THROUGH_SCHEMA !== 26) {
    errors.push("lifecyclePolicy mirrors mismatch");
  }
  if (![...LIFECYCLE_LEGACY_VERSIONS].includes(26)) {
    errors.push("LIFECYCLE_LEGACY_VERSIONS missing 26");
  }

  if (parity.schemaVersion < 27) errors.push("parity-lock schemaVersion must be ≥ 27");

  if (prep.status !== "applied") errors.push("schema-27-prep status must be applied");
  if (prep.currentSchemaVersion !== 27) errors.push("schema-27-prep current must be 27");
  if (prep.targetSchemaVersion !== 27) errors.push("schema-27-prep target must be 27");
  if (prep.ownedByPhase !== 14) errors.push("schema-27-prep ownedByPhase must be 14");

  const phase14 = (kickoff.phases as any[])?.find((p) => p.phase === 14);
  if (!phase14) errors.push("kickoff missing phase 14");
  else if (phase14.validate !== "endgame4:validate") {
    errors.push("kickoff phase 14 validate must be endgame4:validate");
  }
  if (phase14?.id !== "endgame-4") errors.push("kickoff phase 14 id must be endgame-4");
  if (kickoff.schemaVersion < 27) errors.push("kickoff schemaVersion must be ≥ 27");
  if ((kickoff.baseline?.schemaVersion ?? 0) < 26) {
    errors.push("kickoff.baseline.schemaVersion must stay ≥ 26 (Phase-1 lock)");
  }
  if (kickoff.gaps?.endgameSchema27Pending !== false) {
    errors.push("kickoff.gaps.endgameSchema27Pending must be false");
  }

  if (listing.endgame4Phase !== 14) errors.push("listing.endgame4Phase must be 14");
  if (listing.endgame4Catalog !== "shared/ship/endgame-4.json") {
    errors.push("listing.endgame4Catalog mismatch");
  }

  const block = dod.endgame4;
  if (!block) errors.push("DoD missing endgame4 block");
  else {
    if (block.phase !== 14) errors.push("DoD endgame4.phase must be 14");
    if (block.plan !== "30_finish_6.0") errors.push("DoD endgame4.plan mismatch");
    if (block.status !== "complete") errors.push("DoD endgame4.status must be complete");
    if (block.endgame4Marker !== ENDGAME_4_MARKER) {
      errors.push("DoD endgame4 marker mismatch");
    }
  }

  if (!pkg.scripts?.["endgame4:validate"]) errors.push("package.json missing endgame4:validate");
  if (!ci.includes("endgame4:validate")) errors.push("ci.yml missing endgame4:validate");
  if (!ci.includes("endgame3:validate")) errors.push("ci.yml missing baseline endgame3:validate");
  if (!kotlin.includes("NEW_TIER_IDS")) errors.push("Kotlin Endgame4 missing NEW_TIER_IDS");
  if (!finish6Kt.includes("endgame4:validate")) {
    errors.push("Finish6Kickoff.kt phase 14 missing endgame4:validate");
  }
  if (!existsSync(resolve(root, "shared/tools/author_endgame_4.py"))) {
    errors.push("missing author_endgame_4.py");
  }

  if (!currentSnap.includes('"schemaVersion":27') && !currentSnap.includes('"schemaVersion": 27')) {
    errors.push("current starter-line snapshot must be schema 27");
  }
  if (legacy26.schemaVersion !== 26) errors.push("legacy v26 fixture schemaVersion must be 26");
  if (!existsSync(resolve(root, "shared/fixtures/legacy/snapshot-v26-starter-line-t2500.json"))) {
    errors.push("missing legacy v26 fixture file");
  }
  if (fixture.expect?.schemaVersion !== 27) errors.push("parity expect.schemaVersion must be 27");
  if (fixture.firstNewTierId !== "endgame.tier.saffron_nest") {
    errors.push("parity firstNewTierId must be saffron_nest");
  }
  if (fixture.expect?.openGapFlagMin > 7) {
    errors.push("parity openGapFlagMin must be ≤7 after Phase 15");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("FAIL endgame4:validate\n" + errors.map((e) => ` - ${e}`).join("\n"));
  process.exit(1);
}
console.log("OK endgame4:validate — endgame deepen + schema 27 locked");
