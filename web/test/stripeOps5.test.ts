import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../src/engine";
import { loadStripePriceMap, stripeOpsReadiness } from "../../checkout-api/src/stripeLive";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import {
  measureStripeOps5,
  STRIPE_OPS_5_COSMETIC_FLOOR,
  STRIPE_OPS_5_MARKER,
  STRIPE_OPS_5_PHASE,
  STRIPE_OPS_5_SKU_FLOOR,
} from "../src/ship/stripeOps5";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Stripe ops 5 (Finish 5.0 Phase 25)", () => {
  it("locks phase 25 catalog floors", () => {
    expect(STRIPE_OPS_5_PHASE).toBe(25);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(26);
    expect(STRIPE_OPS_5_MARKER).toBe("authored-finish-5.0-phase-25");
    expect(STRIPE_OPS_5_SKU_FLOOR).toBe(25);
    expect(STRIPE_OPS_5_COSMETIC_FLOOR).toBe(24);
    expect((storeListing as { stripeOps5Phase?: number }).stripeOps5Phase).toBe(25);
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("stripeOps5Incomplete");
  });

  it("measures stripe-ops-5 wiring + finish5 readiness", () => {
    const m = measureStripeOps5(root);
    expect(m.skusEnough).toBe(true);
    expect(m.cosmeticsEnough).toBe(true);
    expect(m.priceMapEnough).toBe(true);
    expect(m.entitlementDriftOk).toBe(true);
    expect(m.webhookIdempotencyWired).toBe(true);
    expect(m.readinessWired).toBe(true);
    expect(m.finish5ReadinessWired).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);

    const priceMap = loadStripePriceMap(resolve(root, "shared/billing/web-checkout-products.json"));
    const readiness = stripeOpsReadiness({ CHECKOUT_API_MODE: "stub" }, priceMap);
    expect(readiness.finish5CatalogOk).toBe(true);
    expect(readiness.cosmeticSkuCount).toBeGreaterThanOrEqual(24);
    expect(readiness.priceMapSize).toBeGreaterThanOrEqual(25);
  });

  it("wires RELEASE_PIN + stripeops5:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { stripeOps5?: string; fixtures?: string[] };
    expect(pin.stripeOps5).toBe("shared/ship/stripe-ops-5.json");
    expect(pin.fixtures).toContain("parity-stripe-ops-5.json");
    const out = execFileSync("npm", ["run", "stripeops5:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK stripeops5:validate");
  });
});
