import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  LOC_MIDCHECK_6,
  LOC_MIDCHECK_6_MARKER,
  LOC_MIDCHECK_6_PHASE,
  LOC_MIDCHECK_6_SCHEMA,
  measureLocMidcheck6,
} from "../src/ship/locMidcheck6";
import { storeListing } from "../src/store/listing";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

describe("locMidcheck6", () => {
  it("locks Finish 6.0 Phase 6 catalog mirrors", () => {
    expect(LOC_MIDCHECK_6_PHASE).toBe(6);
    expect(LOC_MIDCHECK_6_SCHEMA).toBe("fish.ship.loc_midcheck_6.v1");
    expect(LOC_MIDCHECK_6_MARKER).toBe("authored-finish-6.0-phase-6");
    expect(LOC_MIDCHECK_6.midcheck.productLoc).toBe(92746);
    expect(LOC_MIDCHECK_6.midcheck.productLocProgressPercent).toBe(7);
    expect(LOC_MIDCHECK_6.interimSoftFloors.productLoc).toBe(92496);
    expect(LOC_MIDCHECK_6.priorBaseline.productLoc).toBe(90597);
    expect((storeListing as { locMidcheck6Phase?: number }).locMidcheck6Phase).toBe(6);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(7);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeGreaterThanOrEqual(0);
  });

  it("measures live LOC against interim floors + midcheck lock", () => {
    const m = measureLocMidcheck6(root);
    expect(m.meetsInterimFloors).toBe(true);
    expect(m.meetsPriorBaseline).toBe(true);
    expect(m.midcheckAligned).toBe(true);
    expect(m.planTargetsIntact).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(m.live.productTotal).toBeGreaterThanOrEqual(92496);
  });

  it("wires RELEASE_PIN + locmidcheck6:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { locMidcheck6?: string; locMidcheck?: string; fixtures?: string[] };
    expect(pin.locMidcheck6).toBe("shared/ship/loc-midcheck-6.json");
    expect(pin.locMidcheck).toBe("shared/ship/loc-midcheck.json");
    expect(pin.fixtures).toContain("parity-loc-midcheck-6.json");
    const out = execFileSync("npm", ["run", "locmidcheck6:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK locmidcheck6:validate");
  });
});
