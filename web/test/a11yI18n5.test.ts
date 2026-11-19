import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../src/engine";
import { UI_STRING_KEYS } from "../src/i18n/strings";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import {
  A11Y_DEPTH_4_MARKER,
  A11Y_DEPTH_4_PHASE,
  CONTRAST_PAIR_FLOOR_4,
  LIVE_REGION_FLOOR_4,
  SCREEN_SURFACE_FLOOR_4,
  UI_A11Y_STRING_FLOOR_4,
} from "../src/ship/a11yDepth4";
import {
  A11Y_STRING_KEY_FLOOR_5,
  I18N_GROWTH_5_MARKER,
  I18N_GROWTH_5_PHASE,
  UI_STRING_KEY_FLOOR_5,
} from "../src/ship/i18nGrowth5";
import {
  A11Y_DEPTH_4_LIVE_REGIONS,
  A11Y_DEPTH_4_SCREEN_IDS,
  depth4ContrastFailures,
} from "../src/presenters/accessibilityDepth4";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("a11y + i18n pack 5 (Finish 5.0 Phase 24)", () => {
  it("locks catalog floors and key growth", () => {
    expect(A11Y_DEPTH_4_PHASE).toBe(24);
    expect(I18N_GROWTH_5_PHASE).toBe(24);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(26);
    expect(A11Y_DEPTH_4_MARKER).toBe("authored-finish-5.0-phase-24");
    expect(I18N_GROWTH_5_MARKER).toBe("authored-finish-5.0-phase-24");
    expect(SCREEN_SURFACE_FLOOR_4).toBe(5);
    expect(CONTRAST_PAIR_FLOOR_4).toBe(2);
    expect(LIVE_REGION_FLOOR_4).toBe(2);
    expect(UI_A11Y_STRING_FLOOR_4).toBe(30);
    expect(UI_STRING_KEY_FLOOR_5).toBe(360);
    expect(A11Y_STRING_KEY_FLOOR_5).toBe(30);
    expect(A11Y_DEPTH_4_SCREEN_IDS).toHaveLength(5);
    expect(A11Y_DEPTH_4_LIVE_REGIONS).toEqual(["tutorial_friction", "goals_weekly"]);
    expect(depth4ContrastFailures()).toEqual([]);
    expect(UI_STRING_KEYS.length).toBeGreaterThanOrEqual(360);
    expect(UI_STRING_KEYS.filter((k) => k.startsWith("a11y.")).length).toBeGreaterThanOrEqual(30);
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("a11yI18n5Incomplete");
    expect((storeListing as { a11yDepth4Phase?: number }).a11yDepth4Phase).toBe(24);
    expect((storeListing as { i18nGrowth5Phase?: number }).i18nGrowth5Phase).toBe(24);
  });

  it("wires RELEASE_PIN + a11yi18n5:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { a11yDepth4?: string; i18nGrowth5?: string; fixtures?: string[] };
    expect(pin.a11yDepth4).toBe("shared/ship/a11y-depth-4.json");
    expect(pin.i18nGrowth5).toBe("shared/ship/i18n-growth-5.json");
    expect(pin.fixtures).toContain("parity-a11y-depth-4.json");
    expect(pin.fixtures).toContain("parity-i18n-growth-5.json");
    const out = execFileSync("npm", ["run", "a11yi18n5:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK a11yi18n5:validate");
  });
});
