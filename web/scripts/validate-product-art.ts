/**
 * Finish 4.0 Phase 10 — product/cosmetic art presentation readiness.
 *
 * Usage:
 *   npm run productart:validate
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import {
  measureProductArt,
  PRODUCT_ART,
  PRODUCT_ART_MARKER,
  PRODUCT_ART_PHASE,
  PRODUCT_ART_SCHEMA,
} from "../src/ship/productArt";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/product-art.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-product-art.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const scene = readFileSync(resolve(root, "web/src/render/HarborScene.ts"), "utf8");
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ProductArt.kt"),
    "utf8",
  );

  if (catalog.phase !== 10) errors.push(`phase expected 10, got ${catalog.phase}`);
  if (catalog.schema !== PRODUCT_ART_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (PRODUCT_ART_PHASE !== 10) errors.push("phase mirror mismatch");
  if (catalog.productArtMarker !== PRODUCT_ART_MARKER) errors.push("marker mismatch");
  if (fixture.productArtMarker !== PRODUCT_ART_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.schemaVersion !== 24) errors.push("schemaVersion must stay 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");

  if (catalog.authoredProductTarget < 34) errors.push("authoredProductTarget must be ≥ 34");
  if (catalog.cosmeticBannerTarget < 12) errors.push("cosmeticBannerTarget must be ≥ 12");
  if (catalog.minProductArtNodes !== 4) errors.push("minProductArtNodes must be 4");
  if ((catalog.authoredProducts as unknown[]).length < 34) {
    errors.push("authoredProducts must list ≥ 34");
  }
  if ((catalog.cosmeticBanners as unknown[]).length < 12) {
    errors.push("cosmeticBanners must list ≥ 12");
  }

  const measure = measureProductArt(root);
  if (measure.productCount < 34) errors.push(`product count ${measure.productCount} < 34`);
  if (measure.bannerCount < 12) errors.push(`banner count ${measure.bannerCount} < 12`);
  if (!measure.productsPresent) errors.push("all 34 products must be ProductArt-authored");
  if (!measure.bannersPresent) errors.push("all catalog cosmetic banners must be authored");
  if (!measure.minProductNodesMet) errors.push("each product needs ≥4 ProductArt_* nodes");
  if (!measure.minBannerNodesMet) errors.push("each banner needs ≥4 CosmeticArt_* nodes");
  if (!measure.gapClosed) errors.push("kickoff gaps.productArtIncomplete must be false");
  if (!measure.licensesOk) errors.push("licenses product/cosmetic art paths incomplete");
  if (!measure.presentationOk) {
    errors.push("cosmetic-presentation must wire meshAsset + counterPresentation + markers");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);
  for (const a of measure.missingAssets) errors.push(`missing asset ${a}`);

  let productBytes = 0;
  for (const entry of PRODUCT_ART.authoredProducts) {
    const size = statSync(resolve(root, entry.asset)).size;
    productBytes += size;
    if (size > PRODUCT_ART.maxBytesPerProduct) {
      errors.push(`${entry.asset} size ${size} > maxBytesPerProduct`);
    }
  }
  if (productBytes > PRODUCT_ART.maxTotalProductBytes) {
    errors.push(`product total bytes ${productBytes} > maxTotalProductBytes`);
  }
  for (const entry of PRODUCT_ART.cosmeticBanners) {
    const size = statSync(resolve(root, entry.asset)).size;
    if (size > PRODUCT_ART.maxBytesPerBanner) {
      errors.push(`${entry.asset} size ${size} > maxBytesPerBanner`);
    }
  }

  const phase10 = (kickoff.phases as any[])?.find((p) => p.phase === 10);
  if (!phase10) errors.push("kickoff missing phase 10");
  else if (phase10.validate !== "productart:validate") {
    errors.push("kickoff phase 10 validate must be productart:validate");
  }
  if (phase10?.id !== "product-art") errors.push("kickoff phase 10 id must be product-art");
  if (kickoff.gaps?.productArtIncomplete !== false) {
    errors.push("kickoff.gaps.productArtIncomplete must be false");
  }

  if (listing.productArtPhase !== 10) errors.push("listing.productArtPhase must be 10");
  if (listing.productArtCatalog !== "shared/ship/product-art.json") {
    errors.push("listing.productArtCatalog mismatch");
  }
  if (pin.productArt !== "shared/ship/product-art.json") errors.push("RELEASE_PIN.productArt path missing");
  if (!pin.fixtures?.includes("parity-product-art.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-product-art.json");
  }

  const block = dod.productArt;
  if (!block) errors.push("DoD missing productArt block");
  else {
    if (block.phase !== 10) errors.push("DoD productArt.phase must be 10");
    if (block.plan !== "30_finish_4.0") errors.push("DoD productArt.plan mismatch");
    if (block.status !== "complete") errors.push("DoD productArt.status must be complete");
    if (block.productArtMarker !== PRODUCT_ART_MARKER) errors.push("DoD productArt marker mismatch");
  }

  if (!pkg.scripts?.["productart:validate"]) errors.push("package.json missing productart:validate");
  if (!ci.includes("productart:validate")) errors.push("ci.yml missing productart:validate");
  if (!kotlin.includes("AUTHORED_PRODUCT_TARGET")) {
    errors.push("Kotlin ProductArt missing AUTHORED_PRODUCT_TARGET");
  }
  if (!kotlin.includes("COSMETIC_BANNER_TARGET")) {
    errors.push("Kotlin ProductArt missing COSMETIC_BANNER_TARGET");
  }
  if (!scene.includes("CosmeticBanner") || !scene.includes("cosmeticBannerCloth")) {
    errors.push("HarborScene missing multi-part cosmetic banner presentation");
  }

  if ((fixture.expect?.authoredProductTarget ?? 0) < 34) {
    errors.push("parity authoredProductTarget must be 34");
  }
  if (fixture.expect?.productArtIncomplete !== false) {
    errors.push("parity productArtIncomplete must be false");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("productart:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK productart:validate — product/cosmetic art presentation locked");
