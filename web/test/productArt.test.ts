import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  measureProductArt,
  PRODUCT_ART,
  PRODUCT_ART_MARKER,
  PRODUCT_ART_PHASE,
  PRODUCT_ART_SCHEMA,
} from "../src/ship/productArt";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Product art (Finish 4.0 Phase 10)", () => {
  it("locks 34 products + 12 cosmetic banners beyond Phase 13 stubs", () => {
    expect(PRODUCT_ART_PHASE).toBe(10);
    expect(PRODUCT_ART_SCHEMA).toBe("fish.ship.product_art.v1");
    expect(PRODUCT_ART.plan).toBe("30_finish_4.0");
    expect(PRODUCT_ART_MARKER).toBe("authored-finish-4.0-phase-10");
    expect(PRODUCT_ART.authoredProducts.length).toBeGreaterThanOrEqual(34);
    expect(PRODUCT_ART.cosmeticBanners.length).toBeGreaterThanOrEqual(12);
    expect(PRODUCT_ART.minProductArtNodes).toBe(4);
    expect((storeListing as { productArtPhase?: number }).productArtPhase).toBe(10);
    expect(existsSync(resolve(root, PRODUCT_ART.parityFixture))).toBe(true);

    const m = measureProductArt(root);
    expect(m.productCount).toBeGreaterThanOrEqual(34);
    expect(m.bannerCount).toBeGreaterThanOrEqual(12);
    expect(m.productsPresent).toBe(true);
    expect(m.bannersPresent).toBe(true);
    expect(m.minProductNodesMet).toBe(true);
    expect(m.minBannerNodesMet).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(m.licensesOk).toBe(true);
    expect(m.presentationOk).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(m.missingAssets).toEqual([]);
  });

  it("productart:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-product-art.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK productart:validate");
  }, 60_000);
});
