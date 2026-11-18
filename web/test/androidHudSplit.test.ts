import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ANDROID_HUD_SPLIT,
  ANDROID_HUD_SPLIT_MARKER,
  ANDROID_HUD_SPLIT_PHASE,
  ANDROID_HUD_SPLIT_SCHEMA,
  measureAndroidHudSplit,
} from "../src/ship/androidHudSplit";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Android HUD split (Finish 3.0 Phase 2)", () => {
  it("locks slim GameScreen + extracted panel modules", () => {
    expect(ANDROID_HUD_SPLIT_PHASE).toBe(2);
    expect(ANDROID_HUD_SPLIT_SCHEMA).toBe("fish.ship.android_hud_split.v1");
    expect(ANDROID_HUD_SPLIT.plan).toBe("30_finish_3.0");
    expect(ANDROID_HUD_SPLIT_MARKER).toBe("authored-finish-3.0-phase-2");
    expect(ANDROID_HUD_SPLIT.requiredFiles).toHaveLength(16);
    expect((storeListing as { androidHudSplitPhase?: number }).androidHudSplitPhase).toBe(2);
    expect(existsSync(resolve(root, ANDROID_HUD_SPLIT.parityFixture))).toBe(true);

    const m = measureAndroidHudSplit(root);
    expect(m.gameScreenSlim).toBe(true);
    expect(m.gameScreenLines).toBeLessThanOrEqual(1000);
    expect(m.extractedEnough).toBe(true);
    expect(m.extractedKtFiles).toBeGreaterThanOrEqual(14);
    expect(m.missingFiles).toEqual([]);
    expect(m.missingSymbols).toEqual([]);
    expect(m.gapClosed).toBe(true);
  });

  it("androidhud:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-android-hud-split.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK androidhud:validate");
  }, 60_000);
});
