import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../src/engine";
import { loadStripePriceMap, stripeOpsReadiness } from "../../checkout-api/src/stripeLive";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  measureStripeOps6,
  STRIPE_OPS_6_COSMETIC_FLOOR,
  STRIPE_OPS_6_MARKER,
  STRIPE_OPS_6_PHASE,
  STRIPE_OPS_6_SKU_FLOOR,
} from "../src/ship/stripeOps6";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Stripe ops 6 (Finish 6.0 Phase 25)", () => {
  it("locks phase 25 catalog floors", () => {
    expect(STRIPE_OPS_6_PHASE).toBe(25);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(27);
    expect(STRIPE_OPS_6_MARKER).toBe("authored-finish-6.0-phase-25");
    expect(STRIPE_OPS_6_SKU_FLOOR).toBe(31);
    expect(STRIPE_OPS_6_COSMETIC_FLOOR).toBe(30);
    expect((storeListing as { stripeOps6Phase?: number }).stripeOps6Phase).toBe(25);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("stripeOps6Incomplete");
    // Soft-floor: Phase 29 closed parityLock6Missing → 0 open flags.
    expect(FINISH6_OPEN_GAP_FLAGS).toHaveLength(0);
  });

  it("measures stripe-ops-6 wiring + finish6 readiness", () => {
    const m = measureStripeOps6(root);
    expect(m.skusEnough).toBe(true);
    expect(m.cosmeticsEnough).toBe(true);
    expect(m.priceMapEnough).toBe(true);
    expect(m.entitlementDriftOk).toBe(true);
    expect(m.webhookIdempotencyWired).toBe(true);
    expect(m.readinessWired).toBe(true);
    expect(m.finish6ReadinessWired).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);

    const priceMap = loadStripePriceMap(resolve(root, "shared/billing/web-checkout-products.json"));
    const readiness = stripeOpsReadiness({ CHECKOUT_API_MODE: "stub" }, priceMap);
    expect(readiness.finish5CatalogOk).toBe(true);
    expect(readiness.finish6CatalogOk).toBe(true);
    expect(readiness.cosmeticSkuCount).toBeGreaterThanOrEqual(30);
    expect(readiness.priceMapSize).toBeGreaterThanOrEqual(31);
  });

  it("wires RELEASE_PIN + stripeops6:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { stripeOps6?: string; fixtures?: string[] };
    expect(pin.stripeOps6).toBe("shared/ship/stripe-ops-6.json");
    expect(pin.fixtures).toContain("parity-stripe-ops-6.json");
    const out = execFileSync("npm", ["run", "stripeops6:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK stripeops6:validate");
  });
});
