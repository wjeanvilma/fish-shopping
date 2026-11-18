/**
 * Finish 3.0 Phase 16 — live Stripe web checkout readiness.
 *
 * Usage:
 *   npm run stripe:validate
 */
import { createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import { handleCheckout } from "../../checkout-api/src/handlers";
import { CheckoutStore } from "../../checkout-api/src/store";
import {
  applyStripeCheckoutCompleted,
  createLiveCheckoutUrl,
  isLiveMode,
  loadStripePriceMap,
  STRIPE_WEBHOOK_PATH,
  verifyStripeWebhook,
} from "../../checkout-api/src/stripeLive";
import {
  measureStripeLiveCheckout,
  STRIPE_LIVE_CHECKOUT,
  STRIPE_LIVE_CHECKOUT_MARKER,
  STRIPE_LIVE_CHECKOUT_PHASE,
  STRIPE_LIVE_CHECKOUT_SCHEMA,
  STRIPE_LIVE_WEBHOOK_PATH,
} from "../src/ship/stripeLiveCheckout";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function validate(): Promise<string[]> {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/stripe-live-checkout.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-stripe-live-checkout.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const billing = readJson(resolve(root, "shared/billing/web-billing.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const apiEnv = readFileSync(resolve(root, "checkout-api/.env.example"), "utf8");
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/StripeLiveCheckout.kt"),
    "utf8",
  );

  if (catalog.phase !== 16) errors.push(`phase expected 16, got ${catalog.phase}`);
  if (catalog.schema !== STRIPE_LIVE_CHECKOUT_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (STRIPE_LIVE_CHECKOUT_PHASE !== 16) errors.push("phase mirror mismatch");
  if (catalog.stripeLiveCheckoutMarker !== STRIPE_LIVE_CHECKOUT_MARKER) {
    errors.push("marker mismatch");
  }
  if (fixture.stripeLiveCheckoutMarker !== STRIPE_LIVE_CHECKOUT_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (catalog.schemaVersion !== 24) errors.push("catalog schemaVersion must stay 24");
  if (SCHEMA_VERSION !== 24) errors.push("engine SCHEMA_VERSION must stay 24");
  if (catalog.webhookPath !== STRIPE_WEBHOOK_PATH || STRIPE_LIVE_WEBHOOK_PATH !== STRIPE_WEBHOOK_PATH) {
    errors.push("webhookPath mismatch");
  }
  if (catalog.closesGap !== "stripeLiveCheckoutPartial") errors.push("closesGap mismatch");

  const measure = measureStripeLiveCheckout(root);
  if (measure.schemaVersion !== 24) errors.push("measure schemaVersion must be 24");
  if (!measure.priceMapComplete) {
    errors.push(`missing stripePriceId: ${measure.missingPriceProducts.join(", ")}`);
  }
  if (!measure.liveSymbolsTs) errors.push("live Stripe symbols missing in checkout-api");
  if (!measure.webhookRouteWired) errors.push("server missing webhook route wiring");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 16 must set validate=stripe:validate, gap closed, measuredAtPhase≥16");
  }
  if (!measure.gapClosed) errors.push("kickoff.gaps.stripeLiveCheckoutPartial must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  const priceMap = loadStripePriceMap(resolve(root, catalog.productsCatalog));
  if (priceMap.size < 4) errors.push("stripe price map must cover ≥ 4 products");

  // Stub path still green
  const stub = await handleCheckout(
    { webProductId: "fish.full_harbor_unlock" },
    { store: new CheckoutStore(), instant: true },
  );
  if ("error" in stub || stub.status !== "completed") {
    errors.push("stub instant checkout must still complete");
  }

  // Live without secret fails closed
  if (isLiveMode({ CHECKOUT_API_MODE: "live" }) !== true) {
    errors.push("isLiveMode(live) must be true");
  }
  const liveNoKey = await createLiveCheckoutUrl({
    webProductId: "fish.full_harbor_unlock",
    cloudAccountId: null,
    successUrl: "http://localhost/?billing=success",
    cancelUrl: "http://localhost/?billing=cancel",
    clientReferenceId: "sess_test",
    env: { CHECKOUT_API_MODE: "live", STRIPE_SECRET_KEY: "" },
    priceMap,
  });
  if (!("error" in liveNoKey) || liveNoKey.status !== 503) {
    errors.push("live without STRIPE_SECRET_KEY must 503");
  }

  // Live with injectable client returns Stripe-hosted URL (no network)
  const liveOk = await createLiveCheckoutUrl({
    webProductId: "fish.full_harbor_unlock",
    cloudAccountId: "acct_1",
    successUrl: "http://localhost/?billing=success",
    cancelUrl: "http://localhost/?billing=cancel",
    clientReferenceId: "sess_live_test",
    env: { CHECKOUT_API_MODE: "live", STRIPE_SECRET_KEY: "sk_test_placeholder_not_real" },
    priceMap,
    createSession: async () => ({
      id: "cs_test_injected",
      url: "https://checkout.stripe.com/c/pay/cs_test_injected",
    }),
  });
  if ("error" in liveOk) {
    errors.push(`live injectable failed: ${liveOk.error}`);
  } else if (!liveOk.url.includes("checkout.stripe.com")) {
    errors.push("live injectable must return checkout.stripe.com URL");
  }

  // Webhook signature + grant
  const store = new CheckoutStore();
  const session = store.createSession(
    "fish.cosmetic.sunset_bunting",
    "acct_wh",
    "http://localhost/?billing=success",
    "http://localhost/?billing=cancel",
  );
  const payload = JSON.stringify({
    id: "evt_test",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_wh",
        client_reference_id: session.sessionId,
        metadata: { webProductId: "fish.cosmetic.sunset_bunting", cloudAccountId: "acct_wh" },
      },
    },
  });
  const secret = "whsec_test_placeholder_not_real";
  const ts = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", secret).update(`${ts}.${payload}`, "utf8").digest("hex");
  const verified = verifyStripeWebhook(payload, `t=${ts},v1=${sig}`, secret);
  if ("error" in verified) {
    errors.push(`webhook verify failed: ${verified.error}`);
  } else {
    const applied = applyStripeCheckoutCompleted(verified, store);
    if ("error" in applied) errors.push(`webhook apply failed: ${applied.error}`);
    else if (!store.getOwned("acct_wh", "fish.cosmetic.sunset_bunting")) {
      errors.push("webhook must grant product");
    }
  }

  if (kickoff.gaps?.stripeLiveCheckoutPartial !== false) {
    errors.push("kickoff gap stripeLiveCheckoutPartial must be false");
  }
  const phase16 = (kickoff.phases as any[])?.find((p) => p.phase === 16);
  if (!phase16 || phase16.validate !== "stripe:validate") {
    errors.push("kickoff phase 16 validate must be stripe:validate");
  }
  if ((kickoff.baseline?.measuredAtPhase ?? 0) < 16) {
    errors.push("kickoff.baseline.measuredAtPhase must be ≥ 16");
  }

  if (listing.stripeLiveCheckoutPhase !== 16) {
    errors.push("listing.stripeLiveCheckoutPhase must be 16");
  }
  if (listing.stripeLiveCheckoutCatalog !== "shared/ship/stripe-live-checkout.json") {
    errors.push("listing.stripeLiveCheckoutCatalog mismatch");
  }
  if (pin.stripeLiveCheckout !== "shared/ship/stripe-live-checkout.json") {
    errors.push("RELEASE_PIN.stripeLiveCheckout path missing");
  }
  if (!pin.fixtures?.includes("parity-stripe-live-checkout.json")) {
    errors.push("RELEASE_PIN missing parity-stripe-live-checkout.json");
  }

  const block = dod.stripeLiveCheckout;
  if (!block) errors.push("DoD missing stripeLiveCheckout block");
  else {
    if (block.phase !== 16) errors.push("DoD stripeLiveCheckout.phase must be 16");
    if (block.plan !== "30_finish_3.0") errors.push("DoD stripeLiveCheckout.plan mismatch");
    if (block.status !== "complete") errors.push("DoD stripeLiveCheckout.status must be complete");
    if (block.stripeLiveCheckoutMarker !== STRIPE_LIVE_CHECKOUT_MARKER) {
      errors.push("DoD stripeLiveCheckout marker mismatch");
    }
  }

  if (billing.finish3StripeLivePhase !== 16) {
    errors.push("web-billing.finish3StripeLivePhase must be 16");
  }
  if (billing.stripeLive?.webhookPath !== STRIPE_WEBHOOK_PATH) {
    errors.push("web-billing.stripeLive.webhookPath mismatch");
  }

  if (!apiEnv.includes("STRIPE_SECRET_KEY=") || !apiEnv.includes("STRIPE_WEBHOOK_SECRET=")) {
    errors.push("checkout-api/.env.example missing Stripe placeholders");
  }
  if (/sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]{8,}|whsec_[A-Za-z0-9]{8,}/.test(apiEnv)) {
    errors.push("checkout-api/.env.example must not contain real-looking Stripe secrets");
  }

  if (!pkg.scripts?.["stripe:validate"]) errors.push("package.json missing stripe:validate");
  if (!ci.includes("stripe:validate")) errors.push("ci.yml missing stripe:validate");
  if (!kotlin.includes("WEBHOOK_PATH")) errors.push("Kotlin StripeLiveCheckout missing WEBHOOK_PATH");

  if (fixture.expect?.webhookPath !== STRIPE_WEBHOOK_PATH) {
    errors.push("parity expect.webhookPath mismatch");
  }
  if (fixture.expect?.closesGap !== "stripeLiveCheckoutPartial") {
    errors.push("parity expect.closesGap mismatch");
  }

  for (const gate of STRIPE_LIVE_CHECKOUT.preflightGates) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = await validate();
if (errors.length) {
  console.error("stripe:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK stripe:validate — live Stripe checkout path locked (stub default)");
