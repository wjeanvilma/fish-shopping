import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { EcologySystem, SCHEMA_VERSION, loadContent } from "../src/engine";
import {
  HABITAT_FLOOR_125,
  measureSpecies125,
  SPECIES_125,
  SPECIES_125_COUNT,
  SPECIES_125_MARKER,
  SPECIES_125_PHASE,
  waveSpeciesIds,
} from "../src/ship/species125";
import { storeListing } from "../src/store/listing";
import { readFileSync } from "node:fs";

const root = resolve(__dirname, "../..");

describe("Species 125 (Finish 5.0 Phase 13)", () => {
  it("locks phase 13 catalog floors", () => {
    expect(SPECIES_125_PHASE).toBe(13);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(25);
    expect(SPECIES_125_MARKER).toBe("authored-finish-5.0-phase-13");
    expect(SPECIES_125_COUNT).toBe(125);
    expect(HABITAT_FLOOR_125).toBe(24);
    expect(SPECIES_125.newBaseSpecies).toHaveLength(13);
    expect(SPECIES_125.newRareSpecies).toHaveLength(12);
    expect(waveSpeciesIds()).toHaveLength(25);
    expect((storeListing as { species125Phase?: number }).species125Phase).toBe(13);
  });

  it("measures content + ecology + i18n coverage", () => {
    const m = measureSpecies125(root);
    expect(m.speciesCount).toBeGreaterThanOrEqual(125);
    expect(m.habitatCount).toBeGreaterThanOrEqual(24);
    expect(m.newBasesPresent).toBe(true);
    expect(m.newRaresPresent).toBe(true);
    expect(m.newHabitatsPresent).toBe(true);
    expect(m.waveWeighted).toBe(true);
    expect(m.i18nTranslated).toBe(true);
    expect(m.kickoffSpeciesMet).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(m.missingGates).toEqual([]);

    const pack = JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8"));
    const content = loadContent(pack);
    expect(EcologySystem.meetsPhase13Floor(content)).toBe(true);
    expect(EcologySystem.coversSpecies(content, waveSpeciesIds())).toBe(true);
    expect(content.codex.entries.length).toBeGreaterThanOrEqual(125);
  });

  it("species125:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-species-125.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK species125:validate");
  });
});
