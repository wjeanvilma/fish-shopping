import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../src/engine";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import {
  PRODUCT_ART_5,
  PRODUCT_ART_5_MARKER,
  PRODUCT_ART_5_PHASE,
  measureProductArt5,
} from "../src/ship/productArt5";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Product art 5 (Finish 5.0 Phase 10)", () => {
  it("locks phase 10 catalog floors", () => {
    expect(PRODUCT_ART_5_PHASE).toBe(10);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(25);
    expect(PRODUCT_ART_5_MARKER).toBe("authored-finish-5.0-phase-10");
    expect(PRODUCT_ART_5.authoredProductTarget).toBe(40);
    expect(PRODUCT_ART_5.cosmeticBannerTarget).toBe(18);
    expect((storeListing as { productArt5Phase?: number }).productArt5Phase).toBe(10);
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("productArt5Incomplete");
  });

  it("measures stamped products + banners", () => {
    const m = measureProductArt5(root);
    expect(m.productCount).toBeGreaterThanOrEqual(40);
    expect(m.bannerCount).toBeGreaterThanOrEqual(18);
    expect(m.productsStamped).toBeGreaterThanOrEqual(40);
    expect(m.bannersStamped).toBeGreaterThanOrEqual(18);
    expect(m.minNodesMet).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(m.missingAssets).toEqual([]);
  });

  it("productart5:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-product-art-5.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK productart5:validate");
  });
});
