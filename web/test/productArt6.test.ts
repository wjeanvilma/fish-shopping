import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../src/engine";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  PRODUCT_ART_6,
  PRODUCT_ART_6_MARKER,
  PRODUCT_ART_6_PHASE,
  measureProductArt6,
} from "../src/ship/productArt6";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Product art 6 (Finish 6.0 Phase 10)", () => {
  it("locks phase 10 catalog floors", () => {
    expect(PRODUCT_ART_6_PHASE).toBe(10);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(26);
    expect(PRODUCT_ART_6_MARKER).toBe("authored-finish-6.0-phase-10");
    expect(PRODUCT_ART_6.authoredProductTarget).toBeGreaterThanOrEqual(52);
    expect(PRODUCT_ART_6.cosmeticBannerTarget).toBeGreaterThanOrEqual(24);
    expect((storeListing as { productArt6Phase?: number }).productArt6Phase).toBe(10);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("productArt6Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(7);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeGreaterThanOrEqual(0);
  });

  it("measures stamped products + banners with Finish 5 retained", () => {
    const m = measureProductArt6(root);
    expect(m.productCount).toBeGreaterThanOrEqual(52);
    expect(m.bannerCount).toBeGreaterThanOrEqual(24);
    expect(m.productsStamped).toBeGreaterThanOrEqual(52);
    expect(m.bannersStamped).toBeGreaterThanOrEqual(24);
    expect(m.finish5Retained).toBe(true);
    expect(m.minNodesMet).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(m.missingAssets).toEqual([]);
  });

  it("productart6:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-product-art-6.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK productart6:validate");
  }, 90_000);
});
