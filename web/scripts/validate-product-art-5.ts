/**
 * Finish 5.0 Phase 10 — product/cosmetic art presentation 5 readiness.
 *
 * Usage:
 *   npm run productart5:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import {
  PRODUCT_ART_5,
  PRODUCT_ART_5_MARKER,
  PRODUCT_ART_5_PHASE,
  PRODUCT_ART_5_SCHEMA,
  measureProductArt5,
} from "../src/ship/productArt5";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/product-art-5.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-product-art-5.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ProductArt5.kt"),
    "utf8",
  );
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );
  const themes = readFileSync(resolve(root, "shared/tools/product_themes.py"), "utf8");

  if (catalog.phase !== 10) errors.push(`phase expected 10, got ${catalog.phase}`);
  if (catalog.schema !== PRODUCT_ART_5_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (PRODUCT_ART_5_PHASE !== 10) errors.push("phase mirror mismatch");
  if (catalog.productArt5Marker !== PRODUCT_ART_5_MARKER) errors.push("marker mismatch");
  if (fixture.productArt5Marker !== PRODUCT_ART_5_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.schemaVersion !== 25) errors.push("schemaVersion must stay 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");

  const measure = measureProductArt5(root);
  if (measure.productCount < PRODUCT_ART_5.authoredProductTarget) {
    errors.push(`products ${measure.productCount} < ${PRODUCT_ART_5.authoredProductTarget}`);
  }
  if (measure.bannerCount < PRODUCT_ART_5.cosmeticBannerTarget) {
    errors.push(`banners ${measure.bannerCount} < ${PRODUCT_ART_5.cosmeticBannerTarget}`);
  }
  if (measure.productsStamped < PRODUCT_ART_5.authoredProductTarget) {
    errors.push(`stamped products ${measure.productsStamped} < target`);
  }
  if (measure.bannersStamped < PRODUCT_ART_5.cosmeticBannerTarget) {
    errors.push(`stamped banners ${measure.bannersStamped} < target`);
  }
  if (!measure.minNodesMet) errors.push("product/cosmetic art node floors not met");
  if (!measure.gapClosed) errors.push("gaps.productArt5Incomplete must be false after Phase 10");
  if (FINISH5_OPEN_GAP_FLAGS.includes("productArt5Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must drop productArt5Incomplete after Phase 10");
  }
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 10 must set id=product-art-5 validate=productart5:validate");
  }
  for (const a of measure.missingAssets) errors.push(`missing asset ${a}`);
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if (kickoff.gaps?.productArt5Incomplete !== false) {
    errors.push("kickoff gaps.productArt5Incomplete must be false");
  }
  if (listing.productArt5Phase !== 10) errors.push("listing.productArt5Phase must be 10");
  if (listing.productArt5Catalog !== "shared/ship/product-art-5.json") {
    errors.push("listing.productArt5Catalog mismatch");
  }
  if (pin.productArt5 !== "shared/ship/product-art-5.json") {
    errors.push("RELEASE_PIN.productArt5 path missing");
  }
  if (!pin.fixtures?.includes("parity-product-art-5.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-product-art-5.json");
  }

  const block = dod.productArt5;
  if (!block) errors.push("DoD missing productArt5 block");
  else {
    if (block.phase !== 10) errors.push("DoD productArt5.phase must be 10");
    if (block.status !== "complete") errors.push("DoD productArt5.status must be complete");
    if (block.productArt5Marker !== PRODUCT_ART_5_MARKER) {
      errors.push("DoD productArt5 marker mismatch");
    }
  }

  if (!pkg.scripts?.["productart5:validate"]) {
    errors.push("package.json missing productart5:validate");
  }
  if (!ci.includes("productart5:validate")) {
    errors.push("ci.yml missing productart5:validate");
  }
  if (!kotlin.includes("PRODUCT_FINISH5_MARKER")) {
    errors.push("Kotlin ProductArt5 missing PRODUCT_FINISH5_MARKER");
  }
  if (!finish5Kt.includes("productart5:validate")) {
    errors.push("Finish5Kickoff.kt phase 10 missing productart5:validate");
  }
  const openBlock = finish5Kt.slice(
    finish5Kt.indexOf("OPEN_GAP_FLAGS"),
    finish5Kt.indexOf("OPEN_GAP_FLAGS") + 800,
  );
  if (openBlock.includes("productArt5Incomplete")) {
    errors.push("Finish5Kickoff OPEN_GAP_FLAGS must drop productArt5Incomplete");
  }
  if (!themes.includes("PRODUCT_FINISH5_MARKER")) {
    errors.push("product_themes.py missing PRODUCT_FINISH5_MARKER");
  }
  if (!existsSync(resolve(root, "shared/tools/author_product_art_5.py"))) {
    errors.push("missing author_product_art_5.py");
  }
  if (fixture.expect?.productArt5IncompleteClosed !== true) {
    errors.push("parity must expect productArt5IncompleteClosed");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("productart5:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK productart5:validate — product/cosmetic art 5 locked; productArt5Incomplete closed");
