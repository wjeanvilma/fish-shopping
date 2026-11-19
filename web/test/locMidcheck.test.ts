import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../src/engine";
import {
  LOC_MIDCHECK,
  LOC_MIDCHECK_MARKER,
  LOC_MIDCHECK_PHASE,
  measureLocMidcheck,
} from "../src/ship/locMidcheck";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("LOC mid-check (Finish 5.0 Phase 6)", () => {
  it("locks phase 6 catalog floors", () => {
    expect(LOC_MIDCHECK_PHASE).toBe(6);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(25);
    expect(LOC_MIDCHECK_MARKER).toBe("authored-finish-5.0-phase-6");
    expect(LOC_MIDCHECK.midcheck.productLoc).toBe(82280);
    expect(LOC_MIDCHECK.interimSoftFloors.productLoc).toBe(82000);
    expect((storeListing as { locMidcheckPhase?: number }).locMidcheckPhase).toBe(6);
  });

  it("measures live LOC above interim floors + baseline", () => {
    const m = measureLocMidcheck(root);
    expect(m.meetsInterimFloors).toBe(true);
    expect(m.meetsPriorBaseline).toBe(true);
    expect(m.midcheckAligned).toBe(true);
    expect(m.planTargetsIntact).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(m.live.productTotal).toBeGreaterThanOrEqual(82000);
  });

  it("locmidcheck:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-loc-midcheck.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK locmidcheck:validate");
  });
});
