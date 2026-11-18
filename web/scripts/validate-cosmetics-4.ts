/**
 * Finish 4.0 Phase 18 — cosmetics/IAP 12→18 power-neutral readiness.
 *
 * Usage:
 *   npm run cosmetics4:validate
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CosmeticsIapSystem, SCHEMA_VERSION } from "../src/engine";
import {
  COSMETICS_4,
  COSMETICS_4_MARKER,
  COSMETICS_4_PHASE,
  COSMETICS_4_SCHEMA,
  measureCosmetics4,
} from "../src/ship/cosmetics4";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/cosmetics-iap-4.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-cosmetics-iap-4.json"));
  const entitlements = readJson(resolve(root, "shared/billing/entitlements.json"));
  const presentation = readJson(resolve(root, "shared/content/cosmetic-presentation.json"));
  const productArt = readJson(resolve(root, "shared/ship/product-art.json"));
  const support = readJson(resolve(root, "shared/ops/support-runbook.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Cosmetics4.kt"),
    "utf8",
  );
  const finish4Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish4Kickoff.kt"),
    "utf8",
  );
  const cosmeticsKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/progression/CosmeticsIap.kt"),
    "utf8",
  );
  const presentationKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/CosmeticPresentation.kt"),
    "utf8",
  );

  if (catalog.phase !== 18) errors.push(`phase expected 18, got ${catalog.phase}`);
  if (catalog.schema !== COSMETICS_4_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (COSMETICS_4_PHASE !== 18) errors.push("phase mirror mismatch");
  if (catalog.cosmetics4Marker !== COSMETICS_4_MARKER) errors.push("marker mismatch");
  if (fixture.cosmetics4Marker !== COSMETICS_4_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "3.0.0") errors.push("contentVersion must stay 3.0.0");
  if (catalog.schemaVersion !== 25) errors.push("schemaVersion must stay 25");
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");
  if (catalog.cosmeticsMin !== 18) errors.push("cosmeticsMin must be 18");

  const measure = measureCosmetics4(root);
  if (measure.cosmeticCount < COSMETICS_4.cosmeticsMin) {
    errors.push(`cosmetics ${measure.cosmeticCount} < ${COSMETICS_4.cosmeticsMin}`);
  }
  if (!measure.newCosmeticsPresent) errors.push("new cosmetics missing from entitlements");
  if (!measure.engineParity) errors.push("CosmeticsIapSystem / entitlements parity failed");
  if (!measure.presentationParity) errors.push("presentation missing IAP catalog entries");
  if (!measure.powerNeutral) errors.push("all cosmetics must be powerNeutral");
  if (!measure.kickoffFloorsMet) {
    errors.push("kickoff baseline.cosmetics≥18 and contentFloorsShort=false required");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);
  for (const a of measure.missingAssets) errors.push(`missing asset ${a}`);

  if (CosmeticsIapSystem.CATALOG.length < 18) {
    errors.push(`engine CosmeticsIapSystem.CATALOG ${CosmeticsIapSystem.CATALOG.length} < 18`);
  }
  if ((entitlements.cosmetics as any[]).length < 18) {
    errors.push("entitlements.cosmetics must be ≥ 18");
  }
  if ((presentation.items as any[]).length < 18) {
    errors.push("cosmetic-presentation items must be ≥ 18");
  }
  if ((productArt.cosmeticBannerTarget ?? 0) < 18) {
    errors.push("product-art cosmeticBannerTarget must be ≥ 18");
  }
  if ((productArt.cosmeticBanners as any[]).length < 18) {
    errors.push("product-art cosmeticBanners must list ≥ 18");
  }

  for (const id of COSMETICS_4.newCosmeticIds) {
    if (!cosmeticsKt.includes(id)) errors.push(`CosmeticsIap.kt missing ${id}`);
    if (!presentationKt.includes(id)) errors.push(`CosmeticPresentation.kt missing ${id}`);
  }

  const restoreSkus = support.restore?.skus as string[] | undefined;
  if (!restoreSkus) errors.push("support-runbook restore.skus missing");
  else {
    for (const sku of COSMETICS_4.newSkus) {
      if (!restoreSkus.includes(sku)) errors.push(`support restore.skus missing ${sku}`);
    }
  }

  // Decor must never gate on IAP cosmetics (power-neutral).
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  for (const id of COSMETICS_4.newCosmeticIds) {
    if ((pack.decor?.items as any[] | undefined)?.some((d) => d.requiresCosmetic === id)) {
      errors.push(`decor gates on power-neutral cosmetic ${id}`);
    }
  }

  for (const entry of productArt.cosmeticBanners as Array<{ cosmeticId: string; asset: string }>) {
    const abs = resolve(root, entry.asset);
    if (!existsSync(abs)) errors.push(`missing banner asset ${entry.asset}`);
    else if (statSync(abs).size > (productArt.maxBytesPerBanner ?? 32000)) {
      errors.push(`${entry.asset} exceeds maxBytesPerBanner`);
    }
  }

  if ((dod.quotas?.cosmetics ?? 0) < 18) errors.push("DoD quotas.cosmetics must be ≥ 18");
  if ((kickoff.baseline?.cosmetics ?? 0) < 18) {
    errors.push("kickoff.baseline.cosmetics must be ≥ 18");
  }
  if (kickoff.gaps?.contentFloorsShort !== false) {
    errors.push("kickoff.gaps.contentFloorsShort must be false after Phase 18");
  }

  const phase18 = (kickoff.phases as any[])?.find((p) => p.phase === 18);
  if (!phase18 || phase18.validate !== "cosmetics4:validate") {
    errors.push("kickoff phase 18 validate must be cosmetics4:validate");
  }
  if (phase18?.id !== "cosmetics-iap-4") errors.push("kickoff phase 18 id must be cosmetics-iap-4");

  if (listing.cosmetics4Phase !== 18) errors.push("listing.cosmetics4Phase must be 18");
  if (listing.cosmetics4Catalog !== "shared/ship/cosmetics-iap-4.json") {
    errors.push("listing.cosmetics4Catalog mismatch");
  }
  if (pin.cosmetics4 !== "shared/ship/cosmetics-iap-4.json") {
    errors.push("RELEASE_PIN.cosmetics4 path missing");
  }
  if (!pin.fixtures?.includes("parity-cosmetics-iap-4.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-cosmetics-iap-4.json");
  }

  const block = dod.cosmetics4;
  if (!block) errors.push("DoD missing cosmetics4 block");
  else {
    if (block.phase !== 18) errors.push("DoD cosmetics4.phase must be 18");
    if (block.plan !== "30_finish_4.0") errors.push("DoD cosmetics4.plan mismatch");
    if (block.status !== "complete") errors.push("DoD cosmetics4.status must be complete");
    if (block.cosmetics4Marker !== COSMETICS_4_MARKER) {
      errors.push("DoD cosmetics4 marker mismatch");
    }
  }

  if (!pkg.scripts?.["cosmetics4:validate"]) errors.push("package.json missing cosmetics4:validate");
  if (!ci.includes("cosmetics4:validate")) errors.push("ci.yml missing cosmetics4:validate");
  if (!ci.includes("cosmetics:validate")) errors.push("ci.yml missing baseline cosmetics:validate");
  if (!kotlin.includes("NEW_COSMETIC_IDS")) errors.push("Kotlin Cosmetics4 missing NEW_COSMETIC_IDS");
  if (!finish4Kt.includes("cosmetics4:validate")) {
    errors.push("Finish4Kickoff.kt phase 18 missing cosmetics4:validate");
  }
  if (!existsSync(resolve(root, "shared/tools/author_cosmetics_4.py"))) {
    errors.push("missing author_cosmetics_4.py");
  }

  if (fixture.expect?.cosmeticsMin !== 18) errors.push("parity cosmeticsMin must be 18");
  if (fixture.expect?.powerNeutral !== true) errors.push("parity powerNeutral must be true");

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("cosmetics4:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK cosmetics4:validate — cosmetics 18 / power-neutral IAP wired");
