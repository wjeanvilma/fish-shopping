import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GAMEHOST_SPLIT,
  GAMEHOST_SPLIT_MARKER,
  GAMEHOST_SPLIT_PHASE,
  GAMEHOST_SPLIT_SCHEMA,
  measureGameHostSplit,
} from "../src/ship/gameHostSplit";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("GameHost split (Finish 4.0 Phase 6)", () => {
  it("locks slim GameHost + host/presenter/renderer modules", () => {
    expect(GAMEHOST_SPLIT_PHASE).toBe(6);
    expect(GAMEHOST_SPLIT_SCHEMA).toBe("fish.ship.gamehost_split.v1");
    expect(GAMEHOST_SPLIT.plan).toBe("30_finish_4.0");
    expect(GAMEHOST_SPLIT_MARKER).toBe("authored-finish-4.0-phase-6");
    expect(GAMEHOST_SPLIT.requiredFiles).toHaveLength(16);
    expect((storeListing as { gameHostSplitPhase?: number }).gameHostSplitPhase).toBe(6);
    expect(existsSync(resolve(root, GAMEHOST_SPLIT.parityFixture))).toBe(true);

    const m = measureGameHostSplit(root);
    expect(m.gameHostSlim).toBe(true);
    expect(m.gameHostLines).toBeLessThanOrEqual(1400);
    expect(m.gameHostLines).toBeLessThan(1664);
    expect(m.harborRendererSlim).toBe(true);
    expect(m.harborRendererLines).toBeLessThanOrEqual(780);
    expect(m.extractedEnough).toBe(true);
    expect(m.extractedFiles).toBeGreaterThanOrEqual(12);
    expect(m.missingFiles).toEqual([]);
    expect(m.missingSymbols).toEqual([]);
    expect(m.stillDefines).toEqual([]);
    expect(m.gapClosed).toBe(true);
  });

  it("gamehostsplit:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-gamehost-split.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK gamehostsplit:validate");
  }, 60_000);
});
