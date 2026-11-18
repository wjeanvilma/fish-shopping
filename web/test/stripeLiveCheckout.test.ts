import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { handleCheckout } from "../../checkout-api/src/handlers";
import { CheckoutStore } from "../../checkout-api/src/store";
import {
  applyStripeCheckoutCompleted,
  createLiveCheckoutUrl,
  loadStripePriceMap,
  verifyStripeWebhook,
} from "../../checkout-api/src/stripeLive";
import {
  measureStripeLiveCheckout,
  STRIPE_LIVE_CHECKOUT_MARKER,
  STRIPE_LIVE_CHECKOUT_PHASE,
  STRIPE_LIVE_WEBHOOK_PATH,
} from "../src/ship/stripeLiveCheckout";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Stripe live checkout (Finish 3.0 Phase 16)", () => {
  it("locks phase 16 catalog floors", () => {
    expect(STRIPE_LIVE_CHECKOUT_PHASE).toBe(16);
    expect(STRIPE_LIVE_CHECKOUT_MARKER).toBe("authored-finish-3.0-phase-16");
    expect(STRIPE_LIVE_WEBHOOK_PATH).toBe("/v1/stripe/webhook");
    expect((storeListing as { stripeLiveCheckoutPhase?: number }).stripeLiveCheckoutPhase).toBe(16);
  });

  it("measures live wiring + closed gap", () => {
    const m = measureStripeLiveCheckout(root);
    expect(m.schemaVersion).toBeGreaterThanOrEqual(24);
    expect(m.priceMapComplete).toBe(true);
    expect(m.liveSymbolsTs).toBe(true);
    expect(m.webhookRouteWired).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("live fails closed; injectable session returns Stripe URL; webhook grants", async () => {
    const priceMap = loadStripePriceMap(resolve(root, "shared/billing/web-checkout-products.json"));
    const denied = await createLiveCheckoutUrl({
      webProductId: "fish.full_harbor_unlock",
      cloudAccountId: null,
      successUrl: "http://localhost/?billing=success",
      cancelUrl: "http://localhost/?billing=cancel",
      clientReferenceId: "sess_x",
      env: { CHECKOUT_API_MODE: "live", STRIPE_SECRET_KEY: "" },
      priceMap,
    });
    expect(denied).toMatchObject({ status: 503 });

    const ok = await createLiveCheckoutUrl({
      webProductId: "fish.full_harbor_unlock",
      cloudAccountId: null,
      successUrl: "http://localhost/?billing=success",
      cancelUrl: "http://localhost/?billing=cancel",
      clientReferenceId: "sess_y",
      env: { CHECKOUT_API_MODE: "live", STRIPE_SECRET_KEY: "sk_test_placeholder_not_real" },
      priceMap,
      createSession: async () => ({
        id: "cs_test",
        url: "https://checkout.stripe.com/c/pay/cs_test",
      }),
    });
    expect(ok).toMatchObject({ url: expect.stringContaining("checkout.stripe.com") });

    const store = new CheckoutStore();
    const session = store.createSession(
      "fish.full_harbor_unlock",
      "acct",
      "http://localhost/?billing=success",
      "http://localhost/?billing=cancel",
    );
    const body = JSON.stringify({
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          client_reference_id: session.sessionId,
          metadata: { webProductId: "fish.full_harbor_unlock", cloudAccountId: "acct" },
        },
      },
    });
    const secret = "whsec_test_placeholder_not_real";
    const ts = Math.floor(Date.now() / 1000);
    const v1 = createHmac("sha256", secret).update(`${ts}.${body}`, "utf8").digest("hex");
    const event = verifyStripeWebhook(body, `t=${ts},v1=${v1}`, secret);
    expect("error" in event).toBe(false);
    if (!("error" in event)) {
      applyStripeCheckoutCompleted(event, store);
      expect(store.getOwned("acct", "fish.full_harbor_unlock")).toBeTruthy();
    }

    const stub = await handleCheckout(
      { webProductId: "fish.cosmetic.pearl_string" },
      { store: new CheckoutStore(), instant: true },
    );
    expect(stub).toMatchObject({ status: "completed" });
  });

  it("stripe:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-stripe-live-checkout.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK stripe:validate");
  });
});
