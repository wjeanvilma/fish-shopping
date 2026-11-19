/**
 * Finish 6.0 Phase 10 — product/cosmetic art presentation 6 readiness.
 *
 * Usage:
 *   npm run productart6:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  PRODUCT_ART_6,
  PRODUCT_ART_6_MARKER,
  PRODUCT_ART_6_PHASE,
  PRODUCT_ART_6_SCHEMA,
  measureProductArt6,
} from "../src/ship/productArt6";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/product-art-6.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-product-art-6.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ProductArt6.kt"),
    "utf8",
  );
  const finish6Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt"),
    "utf8",
  );
  const themes = readFileSync(resolve(root, "shared/tools/product_themes.py"), "utf8");

  if (catalog.phase !== 10) errors.push(`phase expected 10, got ${catalog.phase}`);
  if (catalog.schema !== PRODUCT_ART_6_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (PRODUCT_ART_6_PHASE !== 10) errors.push("phase mirror mismatch");
  if (catalog.productArt6Marker !== PRODUCT_ART_6_MARKER) errors.push("marker mismatch");
  if (fixture.productArt6Marker !== PRODUCT_ART_6_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "5.0.0") errors.push("contentVersion must stay 5.0.0");
  if (catalog.schemaVersion !== 26) errors.push("schemaVersion must stay 26");
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");

  const measure = measureProductArt6(root);
  if (measure.productCount < PRODUCT_ART_6.authoredProductTarget) {
    errors.push(`products ${measure.productCount} < ${PRODUCT_ART_6.authoredProductTarget}`);
  }
  if (measure.bannerCount < PRODUCT_ART_6.cosmeticBannerTarget) {
    errors.push(`banners ${measure.bannerCount} < ${PRODUCT_ART_6.cosmeticBannerTarget}`);
  }
  if (measure.productsStamped < PRODUCT_ART_6.authoredProductTarget) {
    errors.push(`stamped products ${measure.productsStamped} < target`);
  }
  if (measure.bannersStamped < PRODUCT_ART_6.cosmeticBannerTarget) {
    errors.push(`stamped banners ${measure.bannersStamped} < target`);
  }
  if (!measure.finish5Retained) errors.push("Finish 5 product/cosmetic stamps must be retained");
  if (!measure.minNodesMet) errors.push("product/cosmetic art node floors not met");
  if (!measure.gapClosed) errors.push("gaps.productArt6Incomplete must be false after Phase 10");
  if (FINISH6_OPEN_GAP_FLAGS.includes("productArt6Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must drop productArt6Incomplete after Phase 10");
  }
  if (FINISH6_OPEN_GAP_FLAGS.length > 7) {
    errors.push(`OPEN_GAP_FLAGS expected ≤7 after Phase 22, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
  }
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 10 must set id=product-art-6 validate=productart6:validate");
  }
  for (const a of measure.missingAssets) errors.push(`missing asset ${a}`);
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if (kickoff.gaps?.productArt6Incomplete !== false) {
    errors.push("kickoff gaps.productArt6Incomplete must be false");
  }
  if (listing.productArt6Phase !== 10) errors.push("listing.productArt6Phase must be 10");
  if (listing.productArt6Catalog !== "shared/ship/product-art-6.json") {
    errors.push("listing.productArt6Catalog mismatch");
  }
  if (pin.productArt6 !== "shared/ship/product-art-6.json") {
    errors.push("RELEASE_PIN.productArt6 path missing");
  }
  if (!pin.fixtures?.includes("parity-product-art-6.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-product-art-6.json");
  }

  const block = dod.productArt6;
  if (!block) errors.push("DoD missing productArt6 block");
  else {
    if (block.phase !== 10) errors.push("DoD productArt6.phase must be 10");
    if (block.plan !== "30_finish_6.0") errors.push("DoD productArt6.plan mismatch");
    if (block.status !== "complete") errors.push("DoD productArt6.status must be complete");
    if (block.productArt6Marker !== PRODUCT_ART_6_MARKER) {
      errors.push("DoD productArt6 marker mismatch");
    }
  }

  if (!pkg.scripts?.["productart6:validate"]) {
    errors.push("package.json missing productart6:validate");
  }
  if (!pkg.scripts?.["productart6:smoke"]) {
    errors.push("package.json missing productart6:smoke");
  }
  if (!ci.includes("productart6:validate")) {
    errors.push("ci.yml missing productart6:validate");
  }
  if (!kotlin.includes("PRODUCT_FINISH6_MARKER")) {
    errors.push("Kotlin ProductArt6 missing PRODUCT_FINISH6_MARKER");
  }
  if (!finish6Kt.includes("productart6:validate")) {
    errors.push("Finish6Kickoff.kt phase 10 missing productart6:validate");
  }
  const openBlock = finish6Kt.slice(
    finish6Kt.indexOf("OPEN_GAP_FLAGS"),
    finish6Kt.indexOf("OPEN_GAP_FLAGS") + 900,
  );
  if (openBlock.includes("productArt6Incomplete")) {
    errors.push("Finish6Kickoff OPEN_GAP_FLAGS must drop productArt6Incomplete");
  }
  if (!themes.includes("PRODUCT_FINISH6_MARKER")) {
    errors.push("product_themes.py missing PRODUCT_FINISH6_MARKER");
  }
  if (!existsSync(resolve(root, "shared/tools/author_product_art_6.py"))) {
    errors.push("missing author_product_art_6.py");
  }
  if (fixture.expect?.productArt6IncompleteClosed !== true) {
    errors.push("parity must expect productArt6IncompleteClosed");
  }
  // Soft-floor: Phase 14 closed endgameSchema27Pending → openGapFlagMin 15.
  if (fixture.expect?.openGapFlagMin > 7) {
    errors.push("parity openGapFlagMin must be ≤7");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("productart6:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK productart6:validate — product/cosmetic art 6 locked; productArt6Incomplete closed");
