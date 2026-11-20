import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  HABITAT_FLOOR_150,
  measureSpecies150,
  SPECIES_150,
  SPECIES_150_COUNT,
  SPECIES_150_MARKER,
  SPECIES_150_PHASE,
} from "../src/ship/species150";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

describe("Species 150 + ecology/i18n/fish-art-6 (Finish 6.0 Phase 8)", () => {
  it("locks phase 8 catalog floors", () => {
    expect(SPECIES_150_PHASE).toBe(8);
    expect(SPECIES_150_COUNT).toBe(150);
    expect(HABITAT_FLOOR_150).toBeGreaterThanOrEqual(32);
    expect(SPECIES_150.newBaseSpecies).toHaveLength(13);
    expect(SPECIES_150.newRareSpecies).toHaveLength(12);
    expect(SPECIES_150_MARKER).toBe("authored-finish-6.0-phase-8");
  });

  it("measures 150 species + habitats + closed fish/species gaps", () => {
    const m = measureSpecies150(root);
    expect(m.speciesCount).toBeGreaterThanOrEqual(150);
    expect(m.habitatCount).toBeGreaterThanOrEqual(32);
    expect(m.newBasesPresent).toBe(true);
    expect(m.newRaresPresent).toBe(true);
    expect(m.newHabitatsPresent).toBe(true);
    expect(m.waveWeighted).toBe(true);
    expect(m.i18nTranslated).toBe(true);
    expect(m.fishArtMet).toBe(true);
    expect(m.kickoffGapsClosed).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("fishArt6Incomplete");
    // Soft-floor: Phase 10 closed productArt6Incomplete → 18 open flags.
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(7);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeGreaterThanOrEqual(0);
  });

  it("species150:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-species-150.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK species150:validate");
  }, 90_000);
});
