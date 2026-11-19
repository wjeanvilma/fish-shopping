import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  HARBOR_COUNT_FLOOR_1112,
  HARBORS_1112,
  HARBORS_1112_MARKER,
  HARBORS_1112_PHASE,
  measureHarbors1112,
} from "../src/ship/harbors1112";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

describe("Harbors 11–12 + travel/prestige (Finish 5.0 Phase 14)", () => {
  it("locks phase 14 catalog floors", () => {
    expect(HARBORS_1112_PHASE).toBe(14);
    expect(HARBOR_COUNT_FLOOR_1112).toBe(12);
    expect(HARBORS_1112.newHarbors).toHaveLength(2);
    expect(HARBORS_1112.circuitPrestige).toEqual([
      "prestige.eleven_harbors",
      "prestige.twelve_harbors",
    ]);
    expect(HARBORS_1112_MARKER).toBe("authored-finish-5.0-phase-14");
  });

  it("measures 12 harbors + prestige wiring", () => {
    const m = measureHarbors1112(root);
    expect(m.harborCount).toBeGreaterThanOrEqual(12);
    expect(m.newHarborsPresent).toBe(true);
    expect(m.prestigePresent).toBe(true);
    expect(m.questsPresent).toBe(true);
    expect(m.galleriesPresent).toBe(true);
    expect(m.blockoutsPresent).toBe(true);
    expect(m.kickoffHarborMet).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(m.missingBlockouts).toEqual([]);
  });

  it("harbors1112:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-harbors-11-12.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK harbors1112:validate");
  }, 90_000);
});
