import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CHECKOUT_API_LOCAL_BASE,
  CHECKOUT_API_ROUTE_FLOOR,
  CHECKOUT_API_SKU_FLOOR,
  WEB_CHECKOUT_API_MARKER,
  WEB_CHECKOUT_API_PHASE,
} from "../src/ship/webCheckoutApi";
import { handleCheckout, handleEntitlements, handleFulfill } from "../../checkout-api/src/handlers";
import { CheckoutStore } from "../../checkout-api/src/store";

const root = resolve(__dirname, "../..");

describe("web checkout API (Finish 2.0 Phase 25)", () => {
  it("locks ship floors and listing pointers", () => {
    expect(WEB_CHECKOUT_API_PHASE).toBe(25);
    expect(WEB_CHECKOUT_API_MARKER).toBe("authored-finish-2.0-phase-25");
    expect(CHECKOUT_API_ROUTE_FLOOR).toBe(3);
    expect(CHECKOUT_API_SKU_FLOOR).toBe(4);
    expect(CHECKOUT_API_LOCAL_BASE).toBe("http://localhost:8787");
    const listing = JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
      webCheckoutApiPhase?: number;
      webCheckoutApiCatalog?: string;
    };
    expect(listing.webCheckoutApiPhase).toBe(25);
    expect(listing.webCheckoutApiCatalog).toBe("shared/ship/web-checkout-api.json");
  });

  it("stub handlers: completed → owned → entitlements", () => {
    const store = new CheckoutStore();
    const first = handleCheckout(
      { webProductId: "fish.full_harbor_unlock", cloudAccountId: "u1" },
      { store, instant: true },
    );
    expect(first).toMatchObject({ status: "completed", webProductId: "fish.full_harbor_unlock" });
    if ("purchaseToken" in first) {
      expect(first.purchaseToken.startsWith("stub-")).toBe(true);
    }
    const second = handleCheckout(
      { webProductId: "fish.full_harbor_unlock", cloudAccountId: "u1" },
      { store, instant: true },
    );
    expect(second).toMatchObject({ status: "owned" });
    const list = handleEntitlements("u1", store);
    expect(list.entitlements.map((e) => e.webProductId)).toContain("fish.full_harbor_unlock");
  });

  it("session checkout + fulfill grants product", () => {
    const store = new CheckoutStore();
    const checkout = handleCheckout(
      {
        webProductId: "fish.cosmetic.pearl_string",
        cloudAccountId: "u2",
        successUrl: "http://localhost/?billing=success",
        cancelUrl: "http://localhost/?billing=cancel",
      },
      { store, instant: false, publicBase: "http://localhost:8787" },
    );
    expect(checkout).toMatchObject({ status: "checkout" });
    if (!("url" in checkout)) throw new Error("expected url");
    const sessionId = new URL(checkout.url).searchParams.get("session_id");
    expect(sessionId).toBeTruthy();
    const fulfilled = handleFulfill({ sessionId: sessionId!, cloudAccountId: "u2" }, store);
    expect("entitlements" in fulfilled).toBe(true);
    if ("entitlements" in fulfilled) {
      expect(fulfilled.entitlements.map((e) => e.webProductId)).toContain("fish.cosmetic.pearl_string");
    }
  });

  it("checkoutapi:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-web-checkout-api.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK checkoutapi:validate");
  });
});
