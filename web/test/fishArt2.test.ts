import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  FISH_ART_2,
  FISH_ART_2_MARKER,
  FISH_ART_2_PHASE,
  measureFishArt2,
} from "../src/ship/fishArt2";
import { AUTHORED_FISH_FLOOR, FISH_ART_PASS } from "../src/ship/fishArtPass";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

describe("Fish art 2 (Finish 3.0 Phase 9)", () => {
  it("locks phase 9 catalog floors", () => {
    expect(FISH_ART_2_PHASE).toBe(9);
    expect(FISH_ART_2.authoredSpeciesTarget).toBe(50);
    expect(FISH_ART_2.newAuthoredCount).toBe(40);
    expect(FISH_ART_2_MARKER).toBe("authored-finish-3.0-phase-9");
    expect(AUTHORED_FISH_FLOOR).toBeGreaterThanOrEqual(50);
    expect(FISH_ART_PASS.authoredSpecies.length).toBeGreaterThanOrEqual(50);
  });

  it("measures fifty authored species and closed kickoff gap", () => {
    const m = measureFishArt2(root);
    expect(m.authoredCount).toBeGreaterThanOrEqual(50);
    expect(m.newAuthoredCount).toBeGreaterThanOrEqual(40);
    expect(m.gapClosed).toBe(true);
    expect(m.licensesOk).toBe(true);
    expect(m.dodQuotaOk).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("fishart2:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-fish-art-2.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK fishart2:validate");
  }, 60_000);
});
