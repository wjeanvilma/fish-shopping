/**
 * Finish 6.0 Phase 15 — rivals/seasonal/baits/cosmetics growth readiness.
 *
 * Usage:
 *   npm run rivalsseasonal6:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION, loadContent } from "../src/engine";
import {
  FINISH6_OPEN_GAP_FLAGS,
} from "../src/ship/finish6Kickoff";
import {
  RIVALS_SEASONAL_6,
  RIVALS_SEASONAL_6_MARKER,
  RIVALS_SEASONAL_6_PHASE,
  RIVALS_SEASONAL_6_SCHEMA,
  measureRivalsSeasonal6,
} from "../src/ship/rivalsSeasonal6";
import { CONTENT_STRING_KEYS, contentStringKeyCount } from "../src/i18n/contentStrings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/rivals-seasonal-6.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-rivals-seasonal-6.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const content = loadContent(pack);
  const entitlements = readJson(resolve(root, "shared/billing/entitlements.json"));
  const presentation = readJson(resolve(root, "shared/content/cosmetic-presentation.json"));
  const productArt = readJson(resolve(root, "shared/ship/product-art.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const rivals5 = readJson(resolve(root, "shared/ship/rivals-seasonal-5.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/RivalsSeasonal6.kt"),
    "utf8",
  );
  const finish6Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt"),
    "utf8",
  );
  const systems = readFileSync(resolve(root, "web/src/engine/systems.ts"), "utf8");
  const en = readJson(resolve(root, "shared/i18n/content-strings.en.json"));

  if (catalog.phase !== 15) errors.push(`phase expected 15, got ${catalog.phase}`);
  if (catalog.schema !== RIVALS_SEASONAL_6_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (RIVALS_SEASONAL_6_PHASE !== 15) errors.push("phase mirror mismatch");
  if (catalog.rivalsSeasonal6Marker !== RIVALS_SEASONAL_6_MARKER) errors.push("marker mismatch");
  if (fixture.rivalsSeasonal6Marker !== RIVALS_SEASONAL_6_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "5.0.0") errors.push("contentVersion must stay 5.0.0");
  if (catalog.schemaVersion !== 27) errors.push("catalog schemaVersion must be 27");
  if (SCHEMA_VERSION < 27) errors.push("engine SCHEMA_VERSION must be >= 27");
  if (!["5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack contentVersion must be 5.0.0 or 6.0.0");
  if (pack.saveSchemaVersion < 27) errors.push("content-pack.saveSchemaVersion must be >= 27");

  if ((rivals5.rivalsMin ?? 0) < 16 || (rivals5.seasonalEventsMin ?? 0) < 16) {
    errors.push("Finish 5 rivals-seasonal-5 floors must stay intact");
  }

  const measure = measureRivalsSeasonal6(root);
  if (measure.rivalCount < RIVALS_SEASONAL_6.rivalsMin) {
    errors.push(`rivals ${measure.rivalCount} < ${RIVALS_SEASONAL_6.rivalsMin}`);
  }
  if (measure.seasonalCount < RIVALS_SEASONAL_6.seasonalEventsMin) {
    errors.push(`seasonal ${measure.seasonalCount} < ${RIVALS_SEASONAL_6.seasonalEventsMin}`);
  }
  if (measure.baitCount < RIVALS_SEASONAL_6.baitsMin) {
    errors.push(`baits ${measure.baitCount} < ${RIVALS_SEASONAL_6.baitsMin}`);
  }
  if (measure.cosmeticCount < RIVALS_SEASONAL_6.cosmeticsMin) {
    errors.push(`cosmetics ${measure.cosmeticCount} < ${RIVALS_SEASONAL_6.cosmeticsMin}`);
  }
  if (measure.harborsCovered < measure.harborTotal) {
    errors.push(`rivals cover ${measure.harborsCovered}/${measure.harborTotal} harbors`);
  }
  if (!measure.newRivalsPresent) errors.push("new rivals missing");
  if (!measure.newEventsPresent) errors.push("new events missing");
  if (!measure.newBaitsPresent) errors.push("new baits missing");
  if (!measure.newCosmeticsPresent) errors.push("new cosmetics missing");
  if (!measure.kickoffFloorsMet) errors.push("kickoff floors / contentFloorsShort not met");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const e of content.raw.seasonalEvents.events) {
    if ((e.periodTicks ?? 0) < RIVALS_SEASONAL_6.periodTicks) {
      errors.push(`event ${e.id} periodTicks < ${RIVALS_SEASONAL_6.periodTicks}`);
      break;
    }
  }

  for (const id of [
    ...RIVALS_SEASONAL_6.newRivalIds,
    ...RIVALS_SEASONAL_6.newEventIds,
    ...RIVALS_SEASONAL_6.newBaitIds,
    ...RIVALS_SEASONAL_6.newCosmeticIds,
  ]) {
    if (!en.strings?.[id]) errors.push(`content-strings.en missing ${id}`);
  }
  const contentKeySet = new Set(CONTENT_STRING_KEYS);
  for (const id of [
    ...RIVALS_SEASONAL_6.newRivalIds,
    ...RIVALS_SEASONAL_6.newEventIds,
    ...RIVALS_SEASONAL_6.newBaitIds,
    ...RIVALS_SEASONAL_6.newCosmeticIds,
  ]) {
    if (!contentKeySet.has(id)) errors.push(`missing content-string for ${id}`);
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("es")) {
    errors.push("en/es content string counts differ");
  }

  for (const id of RIVALS_SEASONAL_6.newCosmeticIds) {
    if (!entitlements.cosmetics?.some((c: any) => c.grantsCosmetic === id)) {
      errors.push(`entitlements missing ${id}`);
    }
    if (!presentation.items?.some((c: any) => c.cosmeticId === id)) {
      errors.push(`cosmetic-presentation missing ${id}`);
    }
    if (!productArt.cosmeticBanners?.some((c: any) => c.cosmeticId === id)) {
      errors.push(`product-art banners missing ${id}`);
    }
    if (!systems.includes(id)) errors.push(`systems.ts missing cosmetic ${id}`);
  }
  if ((productArt.cosmeticBannerTarget ?? 0) < 30) {
    errors.push("product-art cosmeticBannerTarget must be ≥30");
  }

  const phase15 = (kickoff.phases as any[])?.find((p) => p.phase === 15);
  if (!phase15) errors.push("kickoff missing phase 15");
  else if (phase15.validate !== "rivalsseasonal6:validate") {
    errors.push("kickoff phase 15 validate must be rivalsseasonal6:validate");
  }
  if (phase15?.id !== "rivals-seasonal-6") errors.push("kickoff phase 15 id must be rivals-seasonal-6");
  if (kickoff.gaps?.contentFloorsShort !== false) {
    errors.push("kickoff.gaps.contentFloorsShort must be false");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("contentFloorsShort")) {
    errors.push("OPEN_GAP_FLAGS must not include contentFloorsShort after Phase 15");
  }
  if (FINISH6_OPEN_GAP_FLAGS.length > 7) {
    errors.push(`OPEN_GAP_FLAGS expected ≤7 after Phase 22, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
  }

  if (listing.rivalsSeasonal6Phase !== 15) errors.push("listing.rivalsSeasonal6Phase must be 15");
  if (listing.rivalsSeasonal6Catalog !== "shared/ship/rivals-seasonal-6.json") {
    errors.push("listing.rivalsSeasonal6Catalog mismatch");
  }
  if (pin.rivalsSeasonal6 !== "shared/ship/rivals-seasonal-6.json") {
    errors.push("RELEASE_PIN.rivalsSeasonal6 path missing");
  }
  if (!pin.fixtures?.includes("parity-rivals-seasonal-6.json")) {
    errors.push("RELEASE_PIN missing parity-rivals-seasonal-6.json");
  }

  const block = dod.rivalsSeasonal6;
  if (!block) errors.push("DoD missing rivalsSeasonal6 block");
  else {
    if (block.phase !== 15) errors.push("DoD rivalsSeasonal6.phase must be 15");
    if (block.status !== "complete") errors.push("DoD rivalsSeasonal6.status must be complete");
    if (block.rivalsSeasonal6Marker !== RIVALS_SEASONAL_6_MARKER) {
      errors.push("DoD rivalsSeasonal6 marker mismatch");
    }
  }

  if (!pkg.scripts?.["rivalsseasonal6:validate"]) {
    errors.push("package.json missing rivalsseasonal6:validate");
  }
  if (!ci.includes("rivalsseasonal6:validate")) errors.push("ci.yml missing rivalsseasonal6:validate");
  if (!ci.includes("rivalsseasonal5:validate")) {
    errors.push("ci.yml missing baseline rivalsseasonal5:validate");
  }
  if (!kotlin.includes("NEW_RIVAL_IDS")) errors.push("Kotlin RivalsSeasonal6 missing NEW_RIVAL_IDS");
  if (!finish6Kt.includes("rivalsseasonal6:validate")) {
    errors.push("Finish6Kickoff.kt phase 15 missing rivalsseasonal6:validate");
  }
  if (!existsSync(resolve(root, "shared/tools/author_rivals_seasonal_6.py"))) {
    errors.push("missing author_rivals_seasonal_6.py");
  }
  if (fixture.expect?.rivalsMin !== 20) errors.push("parity rivalsMin must be 20");
  if (fixture.expect?.openGapFlagMin > 7) {
    errors.push("parity openGapFlagMin must be ≤7 after Phase 15");
  }
  if (fixture.expect?.contentFloorsShort !== false) {
    errors.push("parity contentFloorsShort must be false");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("FAIL rivalsseasonal6:validate\n" + errors.map((e) => ` - ${e}`).join("\n"));
  process.exit(1);
}
console.log("OK rivalsseasonal6:validate — rivals/seasonal/baits/cosmetics floors locked");
