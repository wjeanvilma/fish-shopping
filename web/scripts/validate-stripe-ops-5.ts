/**
 * Finish 5.0 Phase 25 — Stripe/checkout live-ready catalog ops 5.
 *
 * Usage:
 *   npm run stripeops5:validate
 */
import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine";
import { CheckoutStore } from "../../checkout-api/src/store";
import {
  applyStripeCheckoutCompleted,
  loadStripePriceMap,
  stripeOpsReadiness,
  verifyStripeWebhook,
} from "../../checkout-api/src/stripeLive";
import {
  measureStripeOps5,
  STRIPE_OPS_5,
  STRIPE_OPS_5_COSMETIC_FLOOR,
  STRIPE_OPS_5_MARKER,
  STRIPE_OPS_5_OPS,
  STRIPE_OPS_5_PHASE,
  STRIPE_OPS_5_PRICE_MAP_FLOOR,
  STRIPE_OPS_5_READINESS_PATH,
  STRIPE_OPS_5_SCHEMA,
  STRIPE_OPS_5_SKU_FLOOR,
} from "../src/ship/stripeOps5";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/stripe-ops-5.json"));
  const ops = readJson(resolve(root, "shared/ops/stripe-ops-5.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-stripe-ops-5.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const billing = readJson(resolve(root, "shared/billing/web-billing.json"));
  const products = readJson(resolve(root, "shared/billing/web-checkout-products.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const apiEnv = readFileSync(resolve(root, "checkout-api/.env.example"), "utf8");
  const finish5Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish5Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/StripeOps5.kt"),
    "utf8",
  );

  if (catalog.phase !== 25) errors.push(`phase expected 25, got ${catalog.phase}`);
  if (catalog.schema !== STRIPE_OPS_5_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (STRIPE_OPS_5_PHASE !== 25) errors.push("phase mirror mismatch");
  if (catalog.stripeOps5Marker !== STRIPE_OPS_5_MARKER) errors.push("marker mismatch");
  if (fixture.stripeOps5Marker !== STRIPE_OPS_5_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "4.0.0" || ops.contentVersion !== "4.0.0") {
    errors.push("contentVersion must stay 4.0.0");
  }
  if (catalog.schemaVersion !== 26 || ops.schemaVersion !== 26) {
    errors.push("schemaVersion must stay 26");
  }
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");
  if (!["4.0.0", "5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack contentVersion must be 4.0.0, 5.0.0, or 6.0.0");
  if (pack.saveSchemaVersion < 26) errors.push("content-pack.saveSchemaVersion must be >= 26");
  if (catalog.closesGap !== "stripeOps5Incomplete") errors.push("closesGap mismatch");
  if (catalog.skuFloor < 25 || STRIPE_OPS_5_SKU_FLOOR < 25) errors.push("skuFloor must be ≥25");
  if (catalog.cosmeticSkuFloor < 24 || STRIPE_OPS_5_COSMETIC_FLOOR < 24) {
    errors.push("cosmeticSkuFloor must be ≥24");
  }
  if (catalog.priceMapFloor < 25 || STRIPE_OPS_5_PRICE_MAP_FLOOR < 25) {
    errors.push("priceMapFloor must be ≥25");
  }
  if (catalog.readinessPath !== STRIPE_OPS_5_READINESS_PATH) errors.push("readinessPath mismatch");
  if ((ops.cutoverChecklist?.length ?? 0) < catalog.cutoverChecklistMin) {
    errors.push("cutoverChecklist short");
  }
  if ((ops.manualOps?.length ?? 0) < catalog.manualOpsMin) errors.push("manualOps short");
  if (!ops.webhookIdempotency?.required) errors.push("webhook idempotency must be required");
  if (!(ops.readinessFields ?? []).includes("finish5CatalogOk")) {
    errors.push("ops readinessFields must include finish5CatalogOk");
  }

  const measure = measureStripeOps5(root);
  if (!measure.skusEnough) errors.push(`active SKUs ${measure.skuCount} < ${STRIPE_OPS_5_SKU_FLOOR}`);
  if (!measure.cosmeticsEnough) {
    errors.push(`cosmetic SKUs ${measure.cosmeticSkuCount} < ${STRIPE_OPS_5_COSMETIC_FLOOR}`);
  }
  if (!measure.priceMapEnough) {
    errors.push(`price-mapped SKUs ${measure.priceMappedCount} < ${STRIPE_OPS_5_PRICE_MAP_FLOOR}`);
  }
  if (!measure.entitlementDriftOk) errors.push("entitlements→checkout SKU drift");
  if (!measure.webhookIdempotencyWired) errors.push("webhook idempotency not wired");
  if (!measure.readinessWired) errors.push("ops readiness endpoint not wired");
  if (!measure.finish5ReadinessWired) errors.push("finish5CatalogOk readiness not wired");
  if (!measure.gapClosed) errors.push("kickoff.gaps.stripeOps5Incomplete must be false");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 25 must set id=stripe-ops-5 validate=stripeops5:validate");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  const priceMap = loadStripePriceMap(resolve(root, catalog.productsCatalog));
  if (priceMap.size < STRIPE_OPS_5_PRICE_MAP_FLOOR) {
    errors.push(`runtime price map ${priceMap.size} < ${STRIPE_OPS_5_PRICE_MAP_FLOOR}`);
  }
  const readiness = stripeOpsReadiness({ CHECKOUT_API_MODE: "stub" }, priceMap);
  if (!readiness.ok || !readiness.catalogOk || !readiness.priceMapOk) {
    errors.push("stripeOpsReadiness stub must report catalogOk/priceMapOk");
  }
  if (!readiness.finish5CatalogOk) errors.push("stub readiness must report finish5CatalogOk");
  if ((readiness.cosmeticSkuCount ?? 0) < 24) errors.push("readiness cosmeticSkuCount < 24");
  if (readiness.liveReady) errors.push("stub mode must not report liveReady");
  const liveReady = stripeOpsReadiness(
    {
      CHECKOUT_API_MODE: "live",
      STRIPE_SECRET_KEY: "sk_test_x",
      STRIPE_WEBHOOK_SECRET: "whsec_x",
    },
    priceMap,
  );
  if (!liveReady.liveReady) errors.push("live+secrets+finish5 floors must report liveReady");

  const store = new CheckoutStore();
  const secret = "whsec_test_ops5";
  const body = JSON.stringify({
    id: "evt_ops5_dup",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_ops5",
        client_reference_id: "",
        metadata: { webProductId: "fish.cosmetic.aurora_bunting", cloudAccountId: "acct_ops5" },
      },
    },
  });
  const ts = Math.floor(Date.now() / 1000);
  const v1 = createHmac("sha256", secret).update(`${ts}.${body}`, "utf8").digest("hex");
  const verified = verifyStripeWebhook(body, `t=${ts},v1=${v1}`, secret);
  if ("error" in verified) errors.push(`webhook verify failed: ${verified.error}`);
  else {
    const first = applyStripeCheckoutCompleted(verified, store);
    const second = applyStripeCheckoutCompleted(verified, store);
    if ("error" in first) errors.push(`webhook apply failed: ${first.error}`);
    if ("error" in second) errors.push(`webhook replay failed: ${second.error}`);
    if (!("error" in second) && second.duplicate !== true) {
      errors.push("webhook replay must set duplicate=true");
    }
    const owned = store.getOwned("acct_ops5", "fish.cosmetic.aurora_bunting");
    if (!owned) errors.push("webhook must grant Finish 5 cosmetic once");
  }

  const active = (products.products as any[]).filter((p) => p.status === "active");
  if (active.length < 25) errors.push(`checkout products active ${active.length} < 25`); // soft-floor ≥25
  for (const p of active) {
    if (!(p.stripePriceId ?? "").trim()) errors.push(`missing stripePriceId for ${p.webProductId}`);
  }

  if (kickoff.gaps?.stripeOps5Incomplete !== false) {
    errors.push("kickoff.gaps.stripeOps5Incomplete must be false");
  }
  const phase25 = (kickoff.phases as any[])?.find((p) => p.phase === 25);
  if (!phase25 || phase25.validate !== "stripeops5:validate") {
    errors.push("kickoff phase 25 validate must be stripeops5:validate");
  }
  if (phase25?.id !== "stripe-ops-5") errors.push("kickoff phase 25 id must be stripe-ops-5");
  if (!finish5Kt.includes("stripeops5:validate")) {
    errors.push("Finish5Kickoff.kt missing stripeops5:validate");
  }
  if (finish5Kt.includes('"stripeOps5Incomplete"')) {
    errors.push("Finish5Kickoff.kt OPEN_GAP_FLAGS must drop stripeOps5Incomplete");
  }
  if (!kotlin.includes("SKU_FLOOR") || !kotlin.includes("READINESS_PATH")) {
    errors.push("StripeOps5.kt missing constants");
  }
  if (!kotlin.includes("COSMETIC_SKU_FLOOR")) errors.push("StripeOps5.kt missing COSMETIC_SKU_FLOOR");

  if (listing.stripeOps5Phase !== 25) errors.push("listing.stripeOps5Phase must be 25");
  if (listing.stripeOps5Catalog !== "shared/ship/stripe-ops-5.json") {
    errors.push("listing.stripeOps5Catalog mismatch");
  }
  if (pin.stripeOps5 !== "shared/ship/stripe-ops-5.json") errors.push("RELEASE_PIN.stripeOps5 missing");
  if (!pin.fixtures?.includes("parity-stripe-ops-5.json")) {
    errors.push("RELEASE_PIN missing parity-stripe-ops-5.json");
  }
  if (!dod.stripeOps5 || dod.stripeOps5.status !== "complete") errors.push("DoD stripeOps5 incomplete");
  if ((dod.quotas?.stripeOps5Skus ?? 0) < 25) errors.push("DoD quotas.stripeOps5Skus < 25");
  if ((dod.quotas?.stripeOps5Cosmetics ?? 0) < 24) errors.push("DoD quotas.stripeOps5Cosmetics < 24");
  if ((dod.quotas?.stripeOps5PriceMapped ?? 0) < 25) {
    errors.push("DoD quotas.stripeOps5PriceMapped < 25");
  }

  if (billing.finish5StripeOpsPhase !== 25) errors.push("web-billing.finish5StripeOpsPhase must be 25");
  if (billing.stripeOps5Catalog !== "shared/ship/stripe-ops-5.json") {
    errors.push("web-billing.stripeOps5Catalog mismatch");
  }

  if (!pkg.scripts?.["stripeops5:validate"]) errors.push("package.json missing stripeops5:validate");
  if (!ci.includes("stripeops5:validate")) errors.push("ci.yml missing stripeops5:validate");
  if (!ci.includes("stripeops4:validate")) errors.push("ci.yml missing soft stripeops4:validate");
  if (!apiEnv.includes("STRIPE_SECRET_KEY=")) errors.push(".env.example missing STRIPE_SECRET_KEY");
  if (/sk_live_|whsec_[^=\n]{8,}/.test(apiEnv)) errors.push(".env.example must not contain live secrets");
  if (!existsSync(resolve(root, "shared/tools/author_stripe_ops_5.py"))) {
    errors.push("missing author_stripe_ops_5.py");
  }
  if (fixture.expect?.skuFloor !== 25) errors.push("parity skuFloor must be 25");
  if (fixture.expect?.cosmeticSkuFloor !== 24) errors.push("parity cosmeticSkuFloor must be 24");
  if (fixture.expect?.stripeOps5Incomplete !== false) {
    errors.push("parity stripeOps5Incomplete must be false");
  }
  if (catalog.softStripeOps4Validate !== "npm run stripeops4:validate") {
    errors.push("catalog softStripeOps4Validate must pin stripeops4:validate");
  }

  for (const gate of catalog.preflightGates ?? []) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  void STRIPE_OPS_5;
  void STRIPE_OPS_5_OPS;
  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("stripeops5:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK stripeops5:validate — Stripe/checkout live-ready catalog ops 5 wired");
