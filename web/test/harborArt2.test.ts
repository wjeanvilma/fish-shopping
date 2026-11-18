import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  HARBOR_ART_2,
  HARBOR_ART_2_MARKER,
  HARBOR_ART_2_PHASE,
  measureHarborArt2,
} from "../src/ship/harborArt2";
import { AUTHORED_HARBOR_FLOOR, HARBOR_ART_PASS } from "../src/ship/harborArtPass";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

describe("Harbor art 2 (Finish 3.0 Phase 8)", () => {
  it("locks phase 8 catalog floors", () => {
    expect(HARBOR_ART_2_PHASE).toBe(8);
    expect(HARBOR_ART_2.authoredHarborTarget).toBe(8);
    expect(HARBOR_ART_2.newAuthoredHarbors).toHaveLength(5);
    expect(HARBOR_ART_2_MARKER).toBe("authored-finish-3.0-phase-8");
    expect(AUTHORED_HARBOR_FLOOR).toBeGreaterThanOrEqual(8);
    expect(HARBOR_ART_PASS.authoredHarbors.length).toBeGreaterThanOrEqual(8);
  });

  it("measures eight authored harbors and closed kickoff gap", () => {
    const m = measureHarborArt2(root);
    expect(m.authoredCount).toBeGreaterThanOrEqual(8);
    expect(m.newAuthoredPresent).toBe(true);
    expect(m.newThemeCount).toBe(5);
    expect(m.gapClosed).toBe(true);
    expect(m.licensesOk).toBe(true);
    expect(m.dodQuotaOk).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("harborart2:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-harbor-art-2.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK harborart2:validate");
  }, 60_000);
});
