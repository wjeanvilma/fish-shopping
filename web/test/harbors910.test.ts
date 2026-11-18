import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  HARBOR_COUNT_FLOOR_910,
  HARBORS_910,
  HARBORS_910_MARKER,
  HARBORS_910_PHASE,
  measureHarbors910,
} from "../src/ship/harbors910";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

describe("Harbors 9–10 + travel/prestige (Finish 4.0 Phase 12)", () => {
  it("locks phase 12 catalog floors", () => {
    expect(HARBORS_910_PHASE).toBe(12);
    expect(HARBOR_COUNT_FLOOR_910).toBe(10);
    expect(HARBORS_910.newHarbors).toHaveLength(2);
    expect(HARBORS_910.circuitPrestige).toEqual([
      "prestige.nine_harbors",
      "prestige.ten_harbors",
    ]);
    expect(HARBORS_910_MARKER).toBe("authored-finish-4.0-phase-12");
  });

  it("measures 10 harbors + prestige wiring", () => {
    const m = measureHarbors910(root);
    expect(m.harborCount).toBeGreaterThanOrEqual(10);
    expect(m.newHarborsPresent).toBe(true);
    expect(m.prestigePresent).toBe(true);
    expect(m.questsPresent).toBe(true);
    expect(m.galleriesPresent).toBe(true);
    expect(m.blockoutsPresent).toBe(true);
    expect(m.kickoffHarborMet).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(m.missingBlockouts).toEqual([]);
  });

  it("harbors910:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-harbors-9-10.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK harbors910:validate");
  }, 90_000);
});
