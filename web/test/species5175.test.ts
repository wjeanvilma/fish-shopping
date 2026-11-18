import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  HABITAT_COUNT_FLOOR,
  measureSpecies5175,
  SPECIES_5175,
  SPECIES_5175_COUNT,
  SPECIES_5175_MARKER,
  SPECIES_5175_PHASE,
} from "../src/ship/species5175";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

describe("Species 51–75 + ecology (Finish 3.0 Phase 12)", () => {
  it("locks phase 12 catalog floors", () => {
    expect(SPECIES_5175_PHASE).toBe(12);
    expect(SPECIES_5175_COUNT).toBe(75);
    expect(HABITAT_COUNT_FLOOR).toBe(8);
    expect(SPECIES_5175.newBaseSpecies).toHaveLength(13);
    expect(SPECIES_5175.newRareSpecies).toHaveLength(12);
    expect(SPECIES_5175_MARKER).toBe("authored-finish-3.0-phase-12");
  });

  it("measures 75 species + habitats + wiring", () => {
    const m = measureSpecies5175(root);
    expect(m.speciesCount).toBeGreaterThanOrEqual(75);
    expect(m.habitatCount).toBe(8);
    expect(m.newBasesPresent).toBe(true);
    expect(m.newRaresPresent).toBe(true);
    expect(m.habitatsPresent).toBe(true);
    expect(m.spotsWired).toBe(true);
    expect(m.galleriesWired).toBe(true);
    expect(m.codexComplete).toBe(true);
    expect(m.assetsPresent).toBe(true);
    expect(m.kickoffSpeciesMet).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(m.missingAssets).toEqual([]);
  });

  it("species5175:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-species-51-75.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK species5175:validate");
  }, 90_000);
});
