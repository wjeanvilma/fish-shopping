/**
 * Finish 5.0 Phase 18 — rivals/seasonal/baits/cosmetics growth readiness.
 *
 * Usage:
 *   npm run rivalsseasonal5:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION, loadContent } from "../src/engine";
import {
  RIVALS_SEASONAL_5,
  RIVALS_SEASONAL_5_MARKER,
  RIVALS_SEASONAL_5_PHASE,
  RIVALS_SEASONAL_5_SCHEMA,
  measureRivalsSeasonal5,
} from "../src/ship/rivalsSeasonal5";
import { CONTENT_STRING_KEYS, contentStringKeyCount } from "../src/i18n/contentStrings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/rivals-seasonal-5.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-rivals-seasonal-5.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const content = loadContent(pack);
  const entitlements = readJson(resolve(root, "shared/billing/entitlements.json"));
  const presentation = readJson(resolve(root, "shared/content/cosmetic-presentation.json"));
  const productArt = readJson(resolve(root, "shared/ship/product-art.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const rivals2 = readJson(resolve(root, "shared/ship/rival-markets-2.json"));
  const seasonal4 = readJson(resolve(root, "shared/ship/seasonal-bait-4.json"));
  const cosmetics4 = readJson(resolve(root, "shared/ship/cosmetics-iap-4.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/RivalsSeasonal5.kt"),
    "utf8",
  );
  const systems = readFileSync(resolve(root, "web/src/engine/systems.ts"), "utf8");
  const en = readJson(resolve(root, "shared/i18n/content-strings.en.json"));

  if (catalog.phase !== 18) errors.push(`phase expected 18, got ${catalog.phase}`);
  if (catalog.schema !== RIVALS_SEASONAL_5_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (RIVALS_SEASONAL_5_PHASE !== 18) errors.push("phase mirror mismatch");
  if (catalog.rivalsSeasonal5Marker !== RIVALS_SEASONAL_5_MARKER) errors.push("marker mismatch");
  if (fixture.rivalsSeasonal5Marker !== RIVALS_SEASONAL_5_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.schemaVersion !== 26) errors.push("catalog schemaVersion must be 26");
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");
  if (!["4.0.0", "5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack contentVersion must be 4.0.0, 5.0.0, or 6.0.0");
  if (pack.saveSchemaVersion < 26) errors.push("content-pack.saveSchemaVersion must be >= 26");

  if ((rivals2.rivalCount ?? 0) < 12) errors.push("Finish 4 rivals-2 floor must stay ≥12");
  if ((seasonal4.seasonalEventsMin ?? 0) < 12 || (seasonal4.baitsMin ?? 0) < 12) {
    errors.push("Finish 4 seasonal-bait-4 floors must stay ≥12");
  }
  if ((cosmetics4.cosmeticsMin ?? 0) < 18) errors.push("Finish 4 cosmetics-4 floor must stay ≥18");

  const measure = measureRivalsSeasonal5(root);
  if (measure.rivalCount < RIVALS_SEASONAL_5.rivalsMin) {
    errors.push(`rivals ${measure.rivalCount} < ${RIVALS_SEASONAL_5.rivalsMin}`);
  }
  if (measure.seasonalCount < RIVALS_SEASONAL_5.seasonalEventsMin) {
    errors.push(`seasonal ${measure.seasonalCount} < ${RIVALS_SEASONAL_5.seasonalEventsMin}`);
  }
  if (measure.baitCount < RIVALS_SEASONAL_5.baitsMin) {
    errors.push(`baits ${measure.baitCount} < ${RIVALS_SEASONAL_5.baitsMin}`);
  }
  if (measure.cosmeticCount < RIVALS_SEASONAL_5.cosmeticsMin) {
    errors.push(`cosmetics ${measure.cosmeticCount} < ${RIVALS_SEASONAL_5.cosmeticsMin}`);
  }
  // Soft-floor: Finish 6 harbors grew to 14; Finish 5 rivals still cover the ≥12 baseline.
  if (measure.harborsCovered < 12) {
    errors.push(`rivals cover ${measure.harborsCovered}/12 Finish-5 harbors`);
  }
  if (!measure.newRivalsPresent) errors.push("new rivals missing");
  if (!measure.newEventsPresent) errors.push("new events missing");
  if (!measure.newBaitsPresent) errors.push("new baits missing");
  if (!measure.newCosmeticsPresent) errors.push("new cosmetics missing");
  if (!measure.kickoffFloorsMet) errors.push("kickoff floors / contentFloorsShort not met");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  for (const e of content.raw.seasonalEvents.events) {
    if ((e.periodTicks ?? 0) < RIVALS_SEASONAL_5.periodTicks) {
      errors.push(`event ${e.id} periodTicks < ${RIVALS_SEASONAL_5.periodTicks}`);
      break;
    }
  }

  for (const id of [
    ...RIVALS_SEASONAL_5.newRivalIds,
    ...RIVALS_SEASONAL_5.newEventIds,
    ...RIVALS_SEASONAL_5.newBaitIds,
  ]) {
    if (!en.strings?.[id]) errors.push(`content-strings.en missing ${id}`);
  }
  const contentKeySet = new Set(CONTENT_STRING_KEYS);
  for (const id of [
    ...RIVALS_SEASONAL_5.newRivalIds,
    ...RIVALS_SEASONAL_5.newEventIds,
    ...RIVALS_SEASONAL_5.newBaitIds,
  ]) {
    if (!contentKeySet.has(id)) errors.push(`missing content-string for ${id}`);
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("es")) {
    errors.push("en/es content string counts differ");
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("pt")) {
    errors.push("en/pt content string counts differ");
  }

  if ((presentation.items ?? []).length < 24) {
    errors.push("cosmetic-presentation items must be ≥24");
  }
  if ((productArt.cosmeticBannerTarget ?? 0) < 24) {
    errors.push("product-art cosmeticBannerTarget must be ≥24");
  }
  if ((productArt.cosmeticBanners ?? []).length < 24) {
    errors.push("product-art cosmeticBanners must be ≥24");
  }
  for (const id of RIVALS_SEASONAL_5.newCosmeticIds) {
    if (!systems.includes(id)) errors.push(`systems.ts missing cosmetic ${id}`);
    const short = id.replace("banner.iap_", "");
    const glb = resolve(root, `shared/assets/models/cosmetic_banner_${short}.glb`);
    if (!existsSync(glb)) errors.push(`missing banner mesh ${glb}`);
  }
  for (const sku of RIVALS_SEASONAL_5.newCosmeticSkus) {
    if (!(entitlements.cosmetics ?? []).some((c: any) => c.sku === sku)) {
      errors.push(`entitlements missing sku ${sku}`);
    }
  }

  if ((kickoff.baseline?.rivalMarkets ?? 0) < 16) {
    errors.push("kickoff.baseline.rivalMarkets must be ≥16");
  }
  if ((kickoff.baseline?.seasonalEvents ?? 0) < 16) {
    errors.push("kickoff.baseline.seasonalEvents must be ≥16");
  }
  if ((kickoff.baseline?.baits ?? 0) < 16) {
    errors.push("kickoff.baseline.baits must be ≥16");
  }
  if ((kickoff.baseline?.cosmetics ?? 0) < 24) {
    errors.push("kickoff.baseline.cosmetics must be ≥24");
  }
  if (kickoff.gaps?.contentFloorsShort !== false) {
    errors.push("kickoff.gaps.contentFloorsShort must be false");
  }

  const phase18 = (kickoff.phases as any[])?.find((p) => p.phase === 18);
  if (!phase18) errors.push("kickoff missing phase 18");
  else if (phase18.validate !== "rivalsseasonal5:validate") {
    errors.push("kickoff phase 18 validate must be rivalsseasonal5:validate");
  }
  if (phase18?.id !== "rivals-seasonal-5") errors.push("kickoff phase 18 id mismatch");

  if (listing.rivalsSeasonal5Phase !== 18) errors.push("listing.rivalsSeasonal5Phase must be 18");
  if (listing.rivalsSeasonal5Catalog !== "shared/ship/rivals-seasonal-5.json") {
    errors.push("listing.rivalsSeasonal5Catalog mismatch");
  }

  const block = dod.rivalsSeasonal5;
  if (!block) errors.push("DoD missing rivalsSeasonal5 block");
  else {
    if (block.phase !== 18) errors.push("DoD rivalsSeasonal5.phase must be 18");
    if (block.status !== "complete") errors.push("DoD rivalsSeasonal5.status must be complete");
    if (block.rivalsSeasonal5Marker !== RIVALS_SEASONAL_5_MARKER) {
      errors.push("DoD rivalsSeasonal5 marker mismatch");
    }
  }

  if (!pkg.scripts?.["rivalsseasonal5:validate"]) {
    errors.push("package.json missing rivalsseasonal5:validate");
  }
  if (!ci.includes("rivalsseasonal5:validate")) errors.push("ci.yml missing rivalsseasonal5:validate");
  if (!ci.includes("rivals2:validate")) errors.push("ci.yml missing baseline rivals2:validate");
  if (!ci.includes("seasonalbait4:validate")) {
    errors.push("ci.yml missing baseline seasonalbait4:validate");
  }
  if (!ci.includes("cosmetics4:validate")) {
    errors.push("ci.yml missing baseline cosmetics4:validate");
  }
  if (!kotlin.includes("NEW_RIVAL_IDS")) errors.push("Kotlin RivalsSeasonal5 missing NEW_RIVAL_IDS");
  if (!existsSync(resolve(root, "shared/tools/author_rivals_seasonal_5.py"))) {
    errors.push("missing author_rivals_seasonal_5.py");
  }
  if (pin.rivalsSeasonal5 !== "shared/ship/rivals-seasonal-5.json") {
    errors.push("RELEASE_PIN.rivalsSeasonal5 path mismatch");
  }
  if (!pin.fixtures?.includes("parity-rivals-seasonal-5.json")) {
    errors.push("RELEASE_PIN missing parity-rivals-seasonal-5.json");
  }
  if (fixture.expect?.rivalsMin !== 16) errors.push("parity rivalsMin must be 16");
  if (fixture.expect?.contentFloorsShort !== false) {
    errors.push("parity contentFloorsShort must be false");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("FAIL rivalsseasonal5:validate\n" + errors.map((e) => ` - ${e}`).join("\n"));
  process.exit(1);
}
console.log("OK rivalsseasonal5:validate — rivals/seasonal/baits/cosmetics floors locked");
