import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../src/engine";
import { UI_STRING_KEYS } from "../src/i18n/strings";
import {
  A11Y_DEPTH_5_LIVE_REGIONS,
  A11Y_DEPTH_5_SCREEN_IDS,
  depth5ContrastFailures,
} from "../src/presenters/accessibilityDepth5";
import { A11Y_DEPTH_5_MARKER, A11Y_DEPTH_5_PHASE } from "../src/ship/a11yDepth5";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import { I18N_GROWTH_6_MARKER, UI_STRING_KEY_FLOOR_6 } from "../src/ship/i18nGrowth6";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("A11y + i18n 6 (Finish 6.0 Phase 22)", () => {
  it("locks phase 22 floors", () => {
    expect(A11Y_DEPTH_5_PHASE).toBe(22);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(27);
    expect(A11Y_DEPTH_5_MARKER).toBe("authored-finish-6.0-phase-22");
    expect(I18N_GROWTH_6_MARKER).toBe("authored-finish-6.0-phase-22");
    expect((storeListing as { a11yDepth5Phase?: number }).a11yDepth5Phase).toBe(22);
    expect((storeListing as { i18nGrowth6Phase?: number }).i18nGrowth6Phase).toBe(22);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("a11yI18n6Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(7);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeGreaterThanOrEqual(0);
    expect(A11Y_DEPTH_5_SCREEN_IDS).toContain("nest_treasury");
    expect(A11Y_DEPTH_5_LIVE_REGIONS).toContain("nest_conflict");
    expect(depth5ContrastFailures()).toEqual([]);
    expect(UI_STRING_KEYS.length).toBeGreaterThanOrEqual(UI_STRING_KEY_FLOOR_6);
  });

  it("wires RELEASE_PIN + a11yi18n6:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { a11yDepth5?: string; i18nGrowth6?: string; fixtures?: string[] };
    expect(pin.a11yDepth5).toBe("shared/ship/a11y-depth-5.json");
    expect(pin.i18nGrowth6).toBe("shared/ship/i18n-growth-6.json");
    expect(pin.fixtures).toContain("parity-a11y-depth-5.json");
    const out = execFileSync("npm", ["run", "a11yi18n6:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK a11yi18n6:validate");
  });
});
