import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  measureStripeOps4,
  STRIPE_OPS_4_PHASE,
  STRIPE_OPS_PRICE_MAP_FLOOR,
  STRIPE_OPS_READINESS_PATH,
  STRIPE_OPS_SKU_FLOOR,
} from "../src/ship/stripeOps4";
import { loadStripePriceMap, stripeOpsReadiness } from "../../checkout-api/src/stripeLive";
import { FINISH4_OPEN_GAP_FLAGS } from "../src/ship/finish4Kickoff";

const root = resolve(__dirname, "../..");

describe("stripe ops 4 (Finish 4.0 Phase 25)", () => {
  it("locks catalog floors and closes stripeOpsIncomplete", () => {
    expect(STRIPE_OPS_4_PHASE).toBe(25);
    expect(STRIPE_OPS_SKU_FLOOR).toBe(19);
    expect(STRIPE_OPS_PRICE_MAP_FLOOR).toBe(19);
    expect(STRIPE_OPS_READINESS_PATH).toBe("/v1/ops/readiness");
    const m = measureStripeOps4(root);
    expect(m.skusEnough).toBe(true);
    expect(m.cosmeticsEnough).toBe(true);
    expect(m.priceMapEnough).toBe(true);
    expect(m.webhookIdempotencyWired).toBe(true);
    expect(m.readinessWired).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(FINISH4_OPEN_GAP_FLAGS).not.toContain("stripeOpsIncomplete");
    const listing = JSON.parse(
      readFileSync(resolve(root, "shared/store/listing.json"), "utf8"),
    ) as { stripeOps4Phase?: number };
    expect(listing.stripeOps4Phase).toBe(25);
    const readiness = stripeOpsReadiness(
      { CHECKOUT_API_MODE: "stub" },
      loadStripePriceMap(resolve(root, "shared/billing/web-checkout-products.json")),
    );
    expect(readiness.catalogOk).toBe(true);
    expect(readiness.priceMapOk).toBe(true);
  });

  it("stripeops4:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-stripe-ops-4.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK stripeops4:validate");
  });
});
