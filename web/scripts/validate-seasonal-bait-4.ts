/**
 * Finish 4.0 Phase 16 — seasonal→12, baits→12, mastery depth readiness.
 *
 * Usage:
 *   npm run seasonalbait4:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent, SCHEMA_VERSION, SeasonalEventSystem } from "../src/engine";
import {
  SEASONAL_BAIT_4,
  SEASONAL_BAIT_4_MARKER,
  SEASONAL_BAIT_4_PHASE,
  SEASONAL_BAIT_4_SCHEMA,
  measureSeasonalBait4,
} from "../src/ship/seasonalBait4";
import { CONTENT_STRING_KEYS, contentStringKeyCount } from "../src/i18n/contentStrings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/seasonal-bait-4.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-seasonal-bait-4.json"));
  const festivals = readJson(resolve(root, "shared/ship/festival-weekends.json"));
  const masteryShip = readJson(resolve(root, "shared/ship/fishing-mastery.json"));
  const packRaw = readJson(resolve(root, "shared/content/content-pack.json"));
  const content = loadContent(packRaw);
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/SeasonalBait4.kt"),
    "utf8",
  );
  const finish4Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish4Kickoff.kt"),
    "utf8",
  );

  if (catalog.phase !== 16) errors.push(`phase expected 16, got ${catalog.phase}`);
  if (catalog.schema !== SEASONAL_BAIT_4_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (SEASONAL_BAIT_4_PHASE !== 16) errors.push("phase mirror mismatch");
  if (catalog.seasonalBait4Marker !== SEASONAL_BAIT_4_MARKER) errors.push("marker mismatch");
  if (fixture.seasonalBait4Marker !== SEASONAL_BAIT_4_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.schemaVersion !== 24) errors.push("schemaVersion must stay 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");
  if (!["3.0.0", "4.0.0"].includes(packRaw.contentVersion)) {
    errors.push("content-pack contentVersion must be 3.0.0 or 4.0.0");
  }
  if ((festivals.weekendEventCount ?? 0) !== 8) {
    errors.push("Finish 2.0 festival-weekends weekendEventCount must stay 8");
  }
  if ((masteryShip.techniqueCount ?? 0) !== 3) {
    errors.push("Finish 2.0 fishing-mastery techniqueCount must stay 3");
  }

  const measure = measureSeasonalBait4(root);
  if (measure.seasonalCount < SEASONAL_BAIT_4.seasonalEventsMin) {
    errors.push(`seasonal events ${measure.seasonalCount} < ${SEASONAL_BAIT_4.seasonalEventsMin}`);
  }
  if (measure.baitCount < SEASONAL_BAIT_4.baitsMin) {
    errors.push(`baits ${measure.baitCount} < ${SEASONAL_BAIT_4.baitsMin}`);
  }
  if (measure.masteryMaxLevel < SEASONAL_BAIT_4.masteryMaxLevel) {
    errors.push(`mastery maxLevel ${measure.masteryMaxLevel} < ${SEASONAL_BAIT_4.masteryMaxLevel}`);
  }
  if (measure.techniqueCount < SEASONAL_BAIT_4.masteryTechniquesMin) {
    errors.push(`techniques ${measure.techniqueCount} < ${SEASONAL_BAIT_4.masteryTechniquesMin}`);
  }
  if (measure.coachingTipCount < SEASONAL_BAIT_4.masteryCoachingTipsMin) {
    errors.push(`coaching tips ${measure.coachingTipCount} < ${SEASONAL_BAIT_4.masteryCoachingTipsMin}`);
  }
  if (!measure.newEventsPresent) errors.push("new seasonal events missing");
  if (!measure.newBaitsPresent) errors.push("new baits missing");
  if (!measure.newTechniquesPresent) errors.push("new mastery techniques missing");
  if (!measure.kickoffFloorsMet) {
    errors.push("kickoff baseline seasonalEvents≥12 and baits≥12 required");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const id of SEASONAL_BAIT_4.newFestivalCustomers) {
    if (!content.customersById.has(id)) errors.push(`missing festival customer ${id}`);
  }
  for (const id of SEASONAL_BAIT_4.newFestivalContracts) {
    if (!content.contractTemplatesById.has(id)) errors.push(`missing festival contract ${id}`);
  }
  for (const id of SEASONAL_BAIT_4.newCoachingTips) {
    if (!content.fishingMastery.coachingTips.some((t) => t.id === id)) {
      errors.push(`missing coaching tip ${id}`);
    }
  }

  const mist = content.seasonalEventsById.get(fixture.eventId);
  if (!mist) errors.push(`fixture event ${fixture.eventId} missing`);
  else {
    const active = SeasonalEventSystem.active(content, fixture.tickInWindow);
    if (active?.id !== fixture.eventId) {
      errors.push(`tick ${fixture.tickInWindow} should activate ${fixture.eventId}`);
    }
    if (mist.customerSpawnMultPermille !== fixture.expect.customerSpawnMultPermille) {
      errors.push("mist festival spawn mult mismatch");
    }
  }

  const contentKeySet = new Set(CONTENT_STRING_KEYS);
  for (const id of [
    ...SEASONAL_BAIT_4.newEvents,
    ...SEASONAL_BAIT_4.newBaits,
    ...SEASONAL_BAIT_4.newTechniques,
    ...SEASONAL_BAIT_4.newFestivalCustomers,
    ...SEASONAL_BAIT_4.newFestivalContracts,
  ]) {
    if (!contentKeySet.has(id)) errors.push(`missing content-string for ${id}`);
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("es")) {
    errors.push("en/es content string counts differ");
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("pt")) {
    errors.push("en/pt content string counts differ");
  }

  if ((dod.quotas?.seasonalEvents ?? 0) < 12) errors.push("DoD quotas.seasonalEvents must be ≥ 12");
  if ((dod.quotas?.baits ?? 0) < 12) errors.push("DoD quotas.baits must be ≥ 12");
  if ((dod.quotas?.masteryTechniques ?? 0) < 6) {
    errors.push("DoD quotas.masteryTechniques must be ≥ 6");
  }
  if ((dod.quotas?.masteryCoachingTips ?? 0) < 8) {
    errors.push("DoD quotas.masteryCoachingTips must be ≥ 8");
  }

  if ((kickoff.baseline?.seasonalEvents ?? 0) < 12) {
    errors.push("kickoff.baseline.seasonalEvents must be ≥ 12");
  }
  if ((kickoff.baseline?.baits ?? 0) < 12) {
    errors.push("kickoff.baseline.baits must be ≥ 12");
  }
  if ((kickoff.gapTargets?.seasonalMin ?? 0) < 12) {
    errors.push("kickoff.gapTargets.seasonalMin must be ≥ 12");
  }
  if ((kickoff.gapTargets?.baitsMin ?? 0) < 12) {
    errors.push("kickoff.gapTargets.baitsMin must be ≥ 12");
  }

  const phase16 = (kickoff.phases as any[])?.find((p) => p.phase === 16);
  if (!phase16 || phase16.validate !== "seasonalbait4:validate") {
    errors.push("kickoff phase 16 validate must be seasonalbait4:validate");
  }
  if (phase16?.id !== "seasonal-bait-4") errors.push("kickoff phase 16 id must be seasonal-bait-4");

  if (listing.seasonalBait4Phase !== 16) errors.push("listing.seasonalBait4Phase must be 16");
  if (listing.seasonalBait4Catalog !== "shared/ship/seasonal-bait-4.json") {
    errors.push("listing.seasonalBait4Catalog mismatch");
  }
  if (pin.seasonalBait4 !== "shared/ship/seasonal-bait-4.json") {
    errors.push("RELEASE_PIN.seasonalBait4 path missing");
  }
  if (!pin.fixtures?.includes("parity-seasonal-bait-4.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-seasonal-bait-4.json");
  }

  const block = dod.seasonalBait4;
  if (!block) errors.push("DoD missing seasonalBait4 block");
  else {
    if (block.phase !== 16) errors.push("DoD seasonalBait4.phase must be 16");
    if (block.plan !== "30_finish_4.0") errors.push("DoD seasonalBait4.plan mismatch");
    if (block.status !== "complete") errors.push("DoD seasonalBait4.status must be complete");
    if (block.seasonalBait4Marker !== SEASONAL_BAIT_4_MARKER) {
      errors.push("DoD seasonalBait4 marker mismatch");
    }
  }

  if (!pkg.scripts?.["seasonalbait4:validate"]) {
    errors.push("package.json missing seasonalbait4:validate");
  }
  if (!ci.includes("seasonalbait4:validate")) errors.push("ci.yml missing seasonalbait4:validate");
  if (!ci.includes("festivals:validate")) errors.push("ci.yml missing baseline festivals:validate");
  if (!ci.includes("mastery:validate")) errors.push("ci.yml missing baseline mastery:validate");
  if (!kotlin.includes("NEW_EVENTS") || !kotlin.includes("NEW_TECHNIQUES")) {
    errors.push("Kotlin SeasonalBait4 missing constants");
  }
  if (!finish4Kt.includes("seasonalbait4:validate")) {
    errors.push("Finish4Kickoff.kt phase 16 missing seasonalbait4:validate");
  }
  if (!existsSync(resolve(root, "shared/tools/author_seasonal_bait_4.py"))) {
    errors.push("missing author_seasonal_bait_4.py");
  }

  if (fixture.expect?.seasonalEventsMin !== 12) errors.push("parity seasonalEventsMin must be 12");
  if (fixture.expect?.baitsMin !== 12) errors.push("parity baitsMin must be 12");
  if (fixture.expect?.masteryMaxLevel !== 7) errors.push("parity masteryMaxLevel must be 7");

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("seasonalbait4:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK seasonalbait4:validate — seasonal 12 / baits 12 / mastery depth wired");
