import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  HABITAT_FLOOR_76100,
  measureSpecies76100,
  SPECIES_76100,
  SPECIES_76100_COUNT,
  SPECIES_76100_MARKER,
  SPECIES_76100_PHASE,
} from "../src/ship/species76100";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

describe("Species 76–100 + ecology + i18n (Finish 4.0 Phase 11)", () => {
  it("locks phase 11 catalog floors", () => {
    expect(SPECIES_76100_PHASE).toBe(11);
    expect(SPECIES_76100_COUNT).toBe(100);
    expect(HABITAT_FLOOR_76100).toBe(16);
    expect(SPECIES_76100.newBaseSpecies).toHaveLength(13);
    expect(SPECIES_76100.newRareSpecies).toHaveLength(12);
    expect(SPECIES_76100.habitatIds).toHaveLength(8);
    expect(SPECIES_76100_MARKER).toBe("authored-finish-4.0-phase-11");
  });

  it("measures 100 species + 16 habitats + i18n + schema prep", () => {
    const m = measureSpecies76100(root);
    expect(m.speciesCount).toBeGreaterThanOrEqual(100);
    expect(m.habitatCount).toBeGreaterThanOrEqual(16);
    expect(m.newBasesPresent).toBe(true);
    expect(m.newRaresPresent).toBe(true);
    expect(m.newHabitatsPresent).toBe(true);
    expect(m.waveWeighted).toBe(true);
    expect(m.i18nTranslated).toBe(true);
    expect(m.schemaPrepOk).toBe(true);
    expect(m.kickoffSpeciesMet).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("species76100:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-species-76-100.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK species76100:validate");
  }, 90_000);
});
