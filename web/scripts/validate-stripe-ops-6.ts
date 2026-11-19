/**
 * Finish 6.0 Phase 25 — Stripe/checkout live-ready catalog ops 6 readiness.
 *
 * Usage:
 *   npm run stripeops6:validate
 */
import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyStripeCheckoutCompleted,
  loadStripePriceMap,
  stripeOpsReadiness,
  verifyStripeWebhook,
} from "../../checkout-api/src/stripeLive";
import { CheckoutStore } from "../../checkout-api/src/store";
import { SCHEMA_VERSION } from "../src/engine";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  measureStripeOps6,
  STRIPE_OPS_6,
  STRIPE_OPS_6_COSMETIC_FLOOR,
  STRIPE_OPS_6_MARKER,
  STRIPE_OPS_6_OPS,
  STRIPE_OPS_6_PHASE,
  STRIPE_OPS_6_PRICE_MAP_FLOOR,
  STRIPE_OPS_6_READINESS_PATH,
  STRIPE_OPS_6_SCHEMA,
  STRIPE_OPS_6_SKU_FLOOR,
} from "../src/ship/stripeOps6";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/stripe-ops-6.json"));
  const ops = readJson(resolve(root, "shared/ops/stripe-ops-6.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-stripe-ops-6.json"));
  const products = readJson(resolve(root, catalog.productsCatalog));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const billing = readJson(resolve(root, "shared/billing/web-billing.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const apiEnv = readFileSync(resolve(root, "checkout-api/.env.example"), "utf8");
  const finish6Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/StripeOps6.kt"),
    "utf8",
  );

  if (catalog.phase !== 25 || ops.phase !== 25) errors.push("phase expected 25");
  if (catalog.schema !== STRIPE_OPS_6_SCHEMA) errors.push("schema mismatch");
  if (catalog.plan !== "30_finish_6.0" || ops.plan !== "30_finish_6.0") {
    errors.push("plan must be 30_finish_6.0");
  }
  if (STRIPE_OPS_6_PHASE !== 25) errors.push("phase mirror mismatch");
  if (catalog.stripeOps6Marker !== STRIPE_OPS_6_MARKER) errors.push("marker mismatch");
  if (fixture.stripeOps6Marker !== STRIPE_OPS_6_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "5.0.0" || ops.contentVersion !== "5.0.0") {
    errors.push("contentVersion must stay 5.0.0");
  }
  if (catalog.schemaVersion !== 27 || ops.schemaVersion !== 27) {
    errors.push("schemaVersion must stay 27");
  }
  if (SCHEMA_VERSION < 27) errors.push("engine SCHEMA_VERSION must be >= 27");
  if (!["5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack must be 5.0.0 or 6.0.0");
  if (catalog.closesGap !== "stripeOps6Incomplete") errors.push("closesGap mismatch");
  if (catalog.skuFloor !== 31 || STRIPE_OPS_6_SKU_FLOOR !== 31) errors.push("skuFloor must be 31");
  if (catalog.cosmeticSkuFloor !== 30 || STRIPE_OPS_6_COSMETIC_FLOOR !== 30) {
    errors.push("cosmeticSkuFloor must be 30");
  }
  if (catalog.priceMapFloor !== 31 || STRIPE_OPS_6_PRICE_MAP_FLOOR !== 31) {
    errors.push("priceMapFloor must be 31");
  }
  if (catalog.readinessPath !== STRIPE_OPS_6_READINESS_PATH) errors.push("readinessPath mismatch");
  if ((ops.cutoverChecklist?.length ?? 0) < catalog.cutoverChecklistMin) {
    errors.push("cutoverChecklist short");
  }
  if ((ops.manualOps?.length ?? 0) < catalog.manualOpsMin) errors.push("manualOps short");
  if (!ops.webhookIdempotency?.required) errors.push("webhook idempotency must be required");
  if (!(ops.readinessFields ?? []).includes("finish6CatalogOk")) {
    errors.push("ops readinessFields must include finish6CatalogOk");
  }

  const measure = measureStripeOps6(root);
  if (!measure.skusEnough) errors.push(`active SKUs ${measure.skuCount} < ${STRIPE_OPS_6_SKU_FLOOR}`);
  if (!measure.cosmeticsEnough) {
    errors.push(`cosmetic SKUs ${measure.cosmeticSkuCount} < ${STRIPE_OPS_6_COSMETIC_FLOOR}`);
  }
  if (!measure.priceMapEnough) {
    errors.push(`price-mapped SKUs ${measure.priceMappedCount} < ${STRIPE_OPS_6_PRICE_MAP_FLOOR}`);
  }
  if (!measure.entitlementDriftOk) errors.push("entitlements→checkout SKU drift");
  if (!measure.webhookIdempotencyWired) errors.push("webhook idempotency not wired");
  if (!measure.readinessWired) errors.push("ops readiness endpoint not wired");
  if (!measure.finish6ReadinessWired) errors.push("finish6CatalogOk readiness not wired");
  if (!measure.gapClosed) errors.push("kickoff.gaps.stripeOps6Incomplete must be false");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 25 must set id=stripe-ops-6 validate=stripeops6:validate");
  }
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  const priceMap = loadStripePriceMap(resolve(root, catalog.productsCatalog));
  if (priceMap.size < STRIPE_OPS_6_PRICE_MAP_FLOOR) {
    errors.push(`runtime price map ${priceMap.size} < ${STRIPE_OPS_6_PRICE_MAP_FLOOR}`);
  }
  const readiness = stripeOpsReadiness({ CHECKOUT_API_MODE: "stub" }, priceMap);
  if (!readiness.ok || !readiness.catalogOk || !readiness.priceMapOk) {
    errors.push("stripeOpsReadiness stub must report catalogOk/priceMapOk");
  }
  if (!readiness.finish5CatalogOk) errors.push("stub readiness must report finish5CatalogOk");
  if (!readiness.finish6CatalogOk) errors.push("stub readiness must report finish6CatalogOk");
  if ((readiness.cosmeticSkuCount ?? 0) < 30) errors.push("readiness cosmeticSkuCount < 30");
  if (readiness.liveReady) errors.push("stub mode must not report liveReady");
  const liveReady = stripeOpsReadiness(
    {
      CHECKOUT_API_MODE: "live",
      STRIPE_SECRET_KEY: "sk_test_x",
      STRIPE_WEBHOOK_SECRET: "whsec_x",
    },
    priceMap,
  );
  if (!liveReady.liveReady) errors.push("live+secrets+finish6 floors must report liveReady");

  const store = new CheckoutStore();
  const secret = "whsec_test_ops6";
  const body = JSON.stringify({
    id: "evt_ops6_dup",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_ops6",
        client_reference_id: "",
        metadata: { webProductId: "fish.cosmetic.saffron_bunting", cloudAccountId: "acct_ops6" },
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
    const owned = store.getOwned("acct_ops6", "fish.cosmetic.saffron_bunting");
    if (!owned) errors.push("webhook must grant Finish 6 nest cosmetic once");
  }

  const active = (products.products as any[]).filter((p) => p.status === "active");
  if (active.length < 31) errors.push(`checkout products active ${active.length} < 31`);
  for (const p of active) {
    if (!(p.stripePriceId ?? "").trim()) errors.push(`missing stripePriceId for ${p.webProductId}`);
  }

  if (kickoff.gaps?.stripeOps6Incomplete !== false) {
    errors.push("kickoff.gaps.stripeOps6Incomplete must be false");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("stripeOps6Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must drop stripeOps6Incomplete after Phase 25");
  }
  // Soft-floor: Phase 26 closed loadtestBanksIncomplete → openFlags 4→3.
  if (FINISH6_OPEN_GAP_FLAGS.length > 3) {
    errors.push(`OPEN_GAP_FLAGS expected ≤3 after Phase 26, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
  }
  const openSlice = finish6Kt.slice(
    finish6Kt.indexOf("OPEN_GAP_FLAGS"),
    finish6Kt.indexOf("OPEN_GAP_FLAGS") + 900,
  );
  if (openSlice.includes("stripeOps6Incomplete")) {
    errors.push("Finish6Kickoff.OPEN_GAP_FLAGS must drop stripeOps6Incomplete");
  }
  const phase25 = (kickoff.phases as any[])?.find((p) => p.phase === 25);
  if (!phase25 || phase25.validate !== "stripeops6:validate") {
    errors.push("kickoff phase 25 validate must be stripeops6:validate");
  }
  if (phase25?.id !== "stripe-ops-6") errors.push("kickoff phase 25 id must be stripe-ops-6");
  if (!finish6Kt.includes("stripeops6:validate")) {
    errors.push("Finish6Kickoff.kt missing stripeops6:validate");
  }
  if (!kotlin.includes("SKU_FLOOR") || !kotlin.includes("READINESS_PATH")) {
    errors.push("StripeOps6.kt missing constants");
  }
  if (!kotlin.includes("COSMETIC_SKU_FLOOR")) errors.push("StripeOps6.kt missing COSMETIC_SKU_FLOOR");

  if (listing.stripeOps6Phase !== 25) errors.push("listing.stripeOps6Phase must be 25");
  if (listing.stripeOps6Catalog !== "shared/ship/stripe-ops-6.json") {
    errors.push("listing.stripeOps6Catalog mismatch");
  }
  if (pin.stripeOps6 !== "shared/ship/stripe-ops-6.json") errors.push("RELEASE_PIN.stripeOps6 missing");
  if (!pin.fixtures?.includes("parity-stripe-ops-6.json")) {
    errors.push("RELEASE_PIN missing parity-stripe-ops-6.json");
  }
  if (!dod.stripeOps6 || dod.stripeOps6.status !== "complete") errors.push("DoD stripeOps6 incomplete");
  if ((dod.quotas?.stripeOps6Skus ?? 0) < 31) errors.push("DoD quotas.stripeOps6Skus < 31");
  if ((dod.quotas?.stripeOps6Cosmetics ?? 0) < 30) errors.push("DoD quotas.stripeOps6Cosmetics < 30");
  if ((dod.quotas?.stripeOps6PriceMapped ?? 0) < 31) {
    errors.push("DoD quotas.stripeOps6PriceMapped < 31");
  }

  if (billing.finish6StripeOpsPhase !== 25) errors.push("web-billing.finish6StripeOpsPhase must be 25");
  if (billing.stripeOps6Catalog !== "shared/ship/stripe-ops-6.json") {
    errors.push("web-billing.stripeOps6Catalog mismatch");
  }

  if (!pkg.scripts?.["stripeops6:validate"]) errors.push("package.json missing stripeops6:validate");
  if (!ci.includes("stripeops6:validate")) errors.push("ci.yml missing stripeops6:validate");
  if (!ci.includes("stripeops5:validate")) errors.push("ci.yml missing soft stripeops5:validate");
  if (!apiEnv.includes("STRIPE_SECRET_KEY=")) errors.push(".env.example missing STRIPE_SECRET_KEY");
  if (!apiEnv.includes("finish6CatalogOk")) errors.push(".env.example missing finish6CatalogOk note");
  if (/sk_live_|whsec_[^=\n]{8,}/.test(apiEnv)) errors.push(".env.example must not contain live secrets");
  if (!existsSync(resolve(root, "shared/tools/author_stripe_ops_6.py"))) {
    errors.push("missing author_stripe_ops_6.py");
  }
  if (fixture.expect?.skuFloor !== 31) errors.push("parity skuFloor must be 31");
  if (fixture.expect?.cosmeticSkuFloor !== 30) errors.push("parity cosmeticSkuFloor must be 30");
  if (fixture.expect?.stripeOps6Incomplete !== false) {
    errors.push("parity stripeOps6Incomplete must be false");
  }
  // Soft-floor: later phases may lower openGapFlagMin further.
  if ((fixture.expect?.openGapFlagMin ?? 99) > 3) {
    errors.push("parity openGapFlagMin must be ≤3 after Phase 26");
  }
  if (catalog.softStripeOps5Validate !== "npm run stripeops5:validate") {
    errors.push("catalog softStripeOps5Validate must pin stripeops5:validate");
  }

  for (const gate of catalog.preflightGates ?? []) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  void STRIPE_OPS_6;
  void STRIPE_OPS_6_OPS;
  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("stripeops6:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK stripeops6:validate — Stripe/checkout live-ready catalog ops 6 wired");
