import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  A11Y_DEPTH_3_PHASE,
  CONTRAST_PAIR_FLOOR_3,
  LIVE_REGION_FLOOR_3,
  SCREEN_SURFACE_FLOOR_3,
  UI_A11Y_STRING_FLOOR_3,
} from "../src/ship/a11yDepth3";
import {
  A11Y_STRING_KEY_FLOOR_4,
  I18N_GROWTH_4_PHASE,
  UI_STRING_KEY_FLOOR_4,
} from "../src/ship/i18nGrowth4";
import {
  A11Y_DEPTH_3_LIVE_REGIONS,
  A11Y_DEPTH_3_SCREEN_IDS,
  depth3ContrastFailures,
} from "../src/presenters/accessibilityDepth3";
import { UI_STRING_KEYS } from "../src/i18n/strings";

const root = resolve(__dirname, "../..");

describe("a11y + i18n pack 4 (Finish 4.0 Phase 24)", () => {
  it("locks catalog floors and key growth", () => {
    expect(A11Y_DEPTH_3_PHASE).toBe(24);
    expect(I18N_GROWTH_4_PHASE).toBe(24);
    expect(SCREEN_SURFACE_FLOOR_3).toBe(5);
    expect(CONTRAST_PAIR_FLOOR_3).toBe(2);
    expect(LIVE_REGION_FLOOR_3).toBe(2);
    expect(UI_A11Y_STRING_FLOOR_3).toBe(20);
    expect(UI_STRING_KEY_FLOOR_4).toBe(280);
    expect(A11Y_STRING_KEY_FLOOR_4).toBe(20);
    expect(A11Y_DEPTH_3_SCREEN_IDS).toHaveLength(5);
    expect(A11Y_DEPTH_3_LIVE_REGIONS).toEqual(["offline_summary", "cloud_conflict"]);
    expect(depth3ContrastFailures()).toEqual([]);
    expect(UI_STRING_KEYS.length).toBeGreaterThanOrEqual(280);
    expect(UI_STRING_KEYS.filter((k) => k.startsWith("a11y.")).length).toBeGreaterThanOrEqual(20);
    const listing = JSON.parse(
      readFileSync(resolve(root, "shared/store/listing.json"), "utf8"),
    ) as { a11yDepth3Phase?: number; i18nGrowth4Phase?: number };
    expect(listing.a11yDepth3Phase).toBe(24);
    expect(listing.i18nGrowth4Phase).toBe(24);
  });

  it("a11yi18n4:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-a11y-i18n-4.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK a11yi18n4:validate");
  });
});
