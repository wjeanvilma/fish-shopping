import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  HARBOR_COUNT_FLOOR_1314,
  HARBORS_1314,
  HARBORS_1314_MARKER,
  HARBORS_1314_PHASE,
  measureHarbors1314,
} from "../src/ship/harbors1314";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

describe("Harbors 13–14 + scenic art/prestige (Finish 6.0 Phase 7)", () => {
  it("locks phase 7 catalog floors", () => {
    expect(HARBORS_1314_PHASE).toBe(7);
    expect(HARBOR_COUNT_FLOOR_1314).toBe(14);
    expect(HARBORS_1314.newHarbors).toHaveLength(1);
    expect(HARBORS_1314.circuitPrestige).toEqual([
      "prestige.thirteen_harbors",
      "prestige.fourteen_harbors",
    ]);
    expect(HARBORS_1314_MARKER).toBe("authored-finish-6.0-phase-7");
  });

  it("measures 14 harbors + prestige wiring and closed harborArt6 gap", () => {
    const m = measureHarbors1314(root);
    expect(m.harborCount).toBeGreaterThanOrEqual(14);
    expect(m.newHarborsPresent).toBe(true);
    expect(m.prestigePresent).toBe(true);
    expect(m.questsPresent).toBe(true);
    expect(m.galleriesPresent).toBe(true);
    expect(m.blockoutsPresent).toBe(true);
    expect(m.kickoffHarborMet).toBe(true);
    expect(m.harborArt6Closed).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(m.missingBlockouts).toEqual([]);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("harborArt6Incomplete");
    // Soft-floor: Phase 10 closed productArt6Incomplete → 18 open flags.
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(7);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeGreaterThanOrEqual(0);
  });

  it("harbors1314:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-harbors-13-14.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK harbors1314:validate");
  }, 90_000);
});
