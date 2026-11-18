import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  measureSystemsSplit1,
  SYSTEMS_SPLIT_1,
  SYSTEMS_SPLIT_1_MARKER,
  SYSTEMS_SPLIT_1_PHASE,
  SYSTEMS_SPLIT_1_SCHEMA,
} from "../src/ship/systemsSplit1";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Systems split 1 (Finish 4.0 Phase 2)", () => {
  it("locks slim systems facade + extracted fishing/production/movement modules", () => {
    expect(SYSTEMS_SPLIT_1_PHASE).toBe(2);
    expect(SYSTEMS_SPLIT_1_SCHEMA).toBe("fish.ship.systems_split_1.v1");
    expect(SYSTEMS_SPLIT_1.plan).toBe("30_finish_4.0");
    expect(SYSTEMS_SPLIT_1_MARKER).toBe("authored-finish-4.0-phase-2");
    expect(SYSTEMS_SPLIT_1.requiredFiles).toHaveLength(5);
    expect((storeListing as { systemsSplit1Phase?: number }).systemsSplit1Phase).toBe(2);
    expect(existsSync(resolve(root, SYSTEMS_SPLIT_1.parityFixture))).toBe(true);

    const m = measureSystemsSplit1(root);
    expect(m.facadeSlim).toBe(true);
    expect(m.facadeLines).toBeLessThanOrEqual(4700);
    expect(m.facadeLines).toBeLessThan(5306); // pre-split god-file size
    expect(m.extractedEnough).toBe(true);
    expect(m.extractedTsFiles).toBeGreaterThanOrEqual(5);
    expect(m.missingFiles).toEqual([]);
    expect(m.missingSymbols).toEqual([]);
    expect(m.facadeStillDefines).toEqual([]);
    expect(m.facadeMissingReexports).toEqual([]);
    expect(m.bridgeBound).toBe(true);
    expect(m.gapClosed).toBe(true);
  });

  it("systemssplit1:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-systems-split-1.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK systemssplit1:validate");
  }, 60_000);
});
