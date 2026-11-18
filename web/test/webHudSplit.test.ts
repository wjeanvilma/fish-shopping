import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  measureWebHudSplit,
  WEB_HUD_SPLIT,
  WEB_HUD_SPLIT_MARKER,
  WEB_HUD_SPLIT_PHASE,
  WEB_HUD_SPLIT_SCHEMA,
} from "../src/ship/webHudSplit";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Web HUD split (Finish 3.0 Phase 3)", () => {
  it("locks slim App.tsx + extracted panel modules", () => {
    expect(WEB_HUD_SPLIT_PHASE).toBe(3);
    expect(WEB_HUD_SPLIT_SCHEMA).toBe("fish.ship.web_hud_split.v1");
    expect(WEB_HUD_SPLIT.plan).toBe("30_finish_3.0");
    expect(WEB_HUD_SPLIT_MARKER).toBe("authored-finish-3.0-phase-3");
    expect(WEB_HUD_SPLIT.requiredFiles).toHaveLength(15);
    expect((storeListing as { webHudSplitPhase?: number }).webHudSplitPhase).toBe(3);
    expect(existsSync(resolve(root, WEB_HUD_SPLIT.parityFixture))).toBe(true);

    const m = measureWebHudSplit(root);
    expect(m.appSlim).toBe(true);
    expect(m.appLines).toBeLessThanOrEqual(900);
    expect(m.extractedEnough).toBe(true);
    expect(m.extractedUiFiles).toBeGreaterThanOrEqual(12);
    expect(m.missingFiles).toEqual([]);
    expect(m.missingSymbols).toEqual([]);
    expect(m.gapClosed).toBe(true);
  });

  it("webhud:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-web-hud-split.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK webhud:validate");
  }, 60_000);
});
