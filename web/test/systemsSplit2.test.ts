import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  measureSystemsSplit2,
  SYSTEMS_SPLIT_2,
  SYSTEMS_SPLIT_2_MARKER,
  SYSTEMS_SPLIT_2_PHASE,
  SYSTEMS_SPLIT_2_SCHEMA,
} from "../src/ship/systemsSplit2";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Systems split 2 (Finish 4.0 Phase 3)", () => {
  it("locks slim systems facade + customers/contracts/progression modules", () => {
    expect(SYSTEMS_SPLIT_2_PHASE).toBe(3);
    expect(SYSTEMS_SPLIT_2_SCHEMA).toBe("fish.ship.systems_split_2.v1");
    expect(SYSTEMS_SPLIT_2.plan).toBe("30_finish_4.0");
    expect(SYSTEMS_SPLIT_2_MARKER).toBe("authored-finish-4.0-phase-3");
    expect(SYSTEMS_SPLIT_2.requiredFiles).toHaveLength(3);
    expect((storeListing as { systemsSplit2Phase?: number }).systemsSplit2Phase).toBe(3);
    expect(existsSync(resolve(root, SYSTEMS_SPLIT_2.parityFixture))).toBe(true);

    const m = measureSystemsSplit2(root);
    expect(m.facadeSlim).toBe(true);
    expect(m.facadeLines).toBeLessThanOrEqual(3800);
    expect(m.facadeLines).toBeLessThan(4627); // Phase 2 facade size
    expect(m.extractedEnough).toBe(true);
    expect(m.extractedTsFiles).toBeGreaterThanOrEqual(8);
    expect(m.missingFiles).toEqual([]);
    expect(m.missingPriorFiles).toEqual([]);
    expect(m.missingSymbols).toEqual([]);
    expect(m.facadeStillDefines).toEqual([]);
    expect(m.facadeMissingReexports).toEqual([]);
    expect(m.circularImports).toEqual([]);
    expect(m.bridgeBound).toBe(true);
  });

  it("systemssplit2:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-systems-split-2.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK systemssplit2:validate");
  }, 60_000);
});
