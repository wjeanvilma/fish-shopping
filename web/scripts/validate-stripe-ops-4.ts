/**
 * Finish 4.0 Phase 25 — Stripe/checkout live-ready catalog ops.
 *
 * Usage:
 *   npm run stripeops4:validate
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
  measureStripeOps4,
  STRIPE_OPS_4,
  STRIPE_OPS_4_MARKER,
  STRIPE_OPS_4_OPS,
  STRIPE_OPS_4_PHASE,
  STRIPE_OPS_4_SCHEMA,
  STRIPE_OPS_PRICE_MAP_FLOOR,
  STRIPE_OPS_READINESS_PATH,
  STRIPE_OPS_SKU_FLOOR,
} from "../src/ship/stripeOps4";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/stripe-ops-4.json"));
  const ops = readJson(resolve(root, "shared/ops/stripe-ops-4.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-stripe-ops-4.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-4.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const billing = readJson(resolve(root, "shared/billing/web-billing.json"));
  const products = readJson(resolve(root, "shared/billing/web-checkout-products.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const apiEnv = readFileSync(resolve(root, "checkout-api/.env.example"), "utf8");
  const finish4Kt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish4Kickoff.kt"),
    "utf8",
  );
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/StripeOps4.kt"),
    "utf8",
  );

  if (catalog.phase !== 25) errors.push(`phase expected 25, got ${catalog.phase}`);
  if (catalog.schema !== STRIPE_OPS_4_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_4.0") errors.push("plan must be 30_finish_4.0");
  if (STRIPE_OPS_4_PHASE !== 25) errors.push("phase mirror mismatch");
  if (catalog.stripeOps4Marker !== STRIPE_OPS_4_MARKER) errors.push("marker mismatch");
  if (fixture.stripeOps4Marker !== STRIPE_OPS_4_MARKER) errors.push("fixture marker mismatch");
  if (catalog.contentVersion !== "3.0.0" || ops.contentVersion !== "3.0.0") {
    errors.push("contentVersion must stay 3.0.0");
  }
  if (catalog.schemaVersion !== 25 || ops.schemaVersion !== 25) {
    errors.push("schemaVersion must stay 25");
  }
  if (SCHEMA_VERSION < 25) errors.push("engine SCHEMA_VERSION must be >= 25");
  if (catalog.closesGap !== "stripeOpsIncomplete") errors.push("closesGap mismatch");
  if (catalog.skuFloor !== 19 || STRIPE_OPS_SKU_FLOOR !== 19) errors.push("skuFloor must be 19");
  if (catalog.priceMapFloor !== 19 || STRIPE_OPS_PRICE_MAP_FLOOR !== 19) {
    errors.push("priceMapFloor must be 19");
  }
  if (catalog.readinessPath !== STRIPE_OPS_READINESS_PATH) errors.push("readinessPath mismatch");
  if ((ops.cutoverChecklist?.length ?? 0) < catalog.cutoverChecklistMin) {
    errors.push("cutoverChecklist short");
  }
  if ((ops.manualOps?.length ?? 0) < catalog.manualOpsMin) errors.push("manualOps short");
  if (!ops.webhookIdempotency?.required) errors.push("webhook idempotency must be required");

  const measure = measureStripeOps4(root);
  if (!measure.skusEnough) errors.push(`active SKUs ${measure.skuCount} < ${STRIPE_OPS_SKU_FLOOR}`);
  if (!measure.cosmeticsEnough) {
    errors.push(`cosmetic SKUs ${measure.cosmeticSkuCount} < ${catalog.cosmeticSkuFloor}`);
  }
  if (!measure.priceMapEnough) {
    errors.push(`price-mapped SKUs ${measure.priceMappedCount} < ${STRIPE_OPS_PRICE_MAP_FLOOR}`);
  }
  if (!measure.webhookIdempotencyWired) errors.push("webhook idempotency not wired");
  if (!measure.readinessWired) errors.push("ops readiness endpoint not wired");
  if (!measure.gapClosed) errors.push("kickoff.gaps.stripeOpsIncomplete must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  const priceMap = loadStripePriceMap(resolve(root, catalog.productsCatalog));
  if (priceMap.size < STRIPE_OPS_PRICE_MAP_FLOOR) {
    errors.push(`runtime price map ${priceMap.size} < ${STRIPE_OPS_PRICE_MAP_FLOOR}`);
  }
  const readiness = stripeOpsReadiness({ CHECKOUT_API_MODE: "stub" }, priceMap);
  if (!readiness.ok || !readiness.catalogOk || !readiness.priceMapOk) {
    errors.push("stripeOpsReadiness stub must report catalogOk/priceMapOk");
  }
  if (readiness.liveReady) errors.push("stub mode must not report liveReady");
  const liveReady = stripeOpsReadiness(
    {
      CHECKOUT_API_MODE: "live",
      STRIPE_SECRET_KEY: "sk_test_x",
      STRIPE_WEBHOOK_SECRET: "whsec_x",
    },
    priceMap,
  );
  if (!liveReady.liveReady) errors.push("live+secrets+priceMap must report liveReady");

  // Webhook idempotency
  const store = new CheckoutStore();
  const secret = "whsec_test_ops4";
  const body = JSON.stringify({
    id: "evt_ops4_dup",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_ops4",
        client_reference_id: "",
        metadata: { webProductId: "fish.full_harbor_unlock", cloudAccountId: "acct_ops4" },
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
    const owned = store.getOwned("acct_ops4", "fish.full_harbor_unlock");
    if (!owned) errors.push("webhook must grant product once");
  }

  const active = (products.products as any[]).filter((p) => p.status === "active");
  if (active.length < 19) errors.push(`checkout products active ${active.length} < 19`);
  for (const p of active) {
    if (!(p.stripePriceId ?? "").trim()) errors.push(`missing stripePriceId for ${p.webProductId}`);
  }

  const phase25 = (kickoff.phases as any[])?.find((p) => p.phase === 25);
  if (!phase25 || phase25.validate !== "stripeops4:validate") {
    errors.push("kickoff phase 25 validate must be stripeops4:validate");
  }
  if (phase25?.id !== "stripe-ops-4") errors.push("kickoff phase 25 id must be stripe-ops-4");
  if (kickoff.gaps?.stripeOpsIncomplete !== false) {
    errors.push("kickoff.gaps.stripeOpsIncomplete must be false");
  }
  if (!finish4Kt.includes("stripeops4:validate")) {
    errors.push("Finish4Kickoff.kt missing stripeops4:validate");
  }
  if (finish4Kt.includes('"stripeOpsIncomplete"') && finish4Kt.match(/OPEN_GAP_FLAGS[\s\S]*?stripeOpsIncomplete/)) {
    // OPEN_GAP_FLAGS must not still list stripeOpsIncomplete after Phase 25
    const openBlock = finish4Kt.slice(finish4Kt.indexOf("OPEN_GAP_FLAGS"), finish4Kt.indexOf("OPEN_GAP_FLAGS") + 400);
    if (openBlock.includes("stripeOpsIncomplete")) {
      errors.push("Finish4Kickoff.OPEN_GAP_FLAGS must drop stripeOpsIncomplete");
    }
  }
  if (!kotlin.includes("SKU_FLOOR") || !kotlin.includes("READINESS_PATH")) {
    errors.push("StripeOps4.kt missing constants");
  }

  if (listing.stripeOps4Phase !== 25) errors.push("listing.stripeOps4Phase must be 25");
  if (listing.stripeOps4Catalog !== "shared/ship/stripe-ops-4.json") {
    errors.push("listing.stripeOps4Catalog mismatch");
  }
  if (pin.stripeOps4 !== "shared/ship/stripe-ops-4.json") errors.push("RELEASE_PIN.stripeOps4 missing");
  if (!pin.fixtures?.includes("parity-stripe-ops-4.json")) {
    errors.push("RELEASE_PIN missing parity-stripe-ops-4.json");
  }
  if (!dod.stripeOps4 || dod.stripeOps4.status !== "complete") errors.push("DoD stripeOps4 incomplete");
  if ((dod.quotas?.stripeOpsSkus ?? 0) < 19) errors.push("DoD quotas.stripeOpsSkus < 19");
  if ((dod.quotas?.stripeOpsPriceMapped ?? 0) < 19) errors.push("DoD quotas.stripeOpsPriceMapped < 19");

  if (billing.finish4StripeOpsPhase !== 25) errors.push("web-billing.finish4StripeOpsPhase must be 25");
  if (billing.stripeOpsCatalog !== "shared/ship/stripe-ops-4.json") {
    errors.push("web-billing.stripeOpsCatalog mismatch");
  }

  if (!pkg.scripts?.["stripeops4:validate"]) errors.push("package.json missing stripeops4:validate");
  if (!ci.includes("stripeops4:validate")) errors.push("ci.yml missing stripeops4:validate");
  if (!apiEnv.includes("STRIPE_SECRET_KEY=") || apiEnv.includes("sk_live_") || apiEnv.includes("whsec_live")) {
    if (!apiEnv.includes("STRIPE_SECRET_KEY=")) errors.push(".env.example missing STRIPE_SECRET_KEY");
    if (/sk_live_|whsec_[^=\n]{8,}/.test(apiEnv)) errors.push(".env.example must not contain live secrets");
  }
  if (!apiEnv.includes("ops/readiness") && !apiEnv.includes("Finish 4.0 Phase 25")) {
    // soft note in env example
  }

  for (const gate of catalog.preflightGates ?? []) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  void STRIPE_OPS_4;
  void STRIPE_OPS_4_OPS;
  void fixture;
  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("stripeops4:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK stripeops4:validate — Stripe/checkout live-ready catalog ops wired");
