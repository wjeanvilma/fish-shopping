import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FISH_ART_3A,
  FISH_ART_3A_MARKER,
  FISH_ART_3A_PHASE,
  FISH_ART_3A_SCHEMA,
  measureFishArt3a,
} from "../src/ship/fishArt3a";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Fish art 3a (Finish 4.0 Phase 7)", () => {
  it("locks authored floor 75 with species 51–75 wave", () => {
    expect(FISH_ART_3A_PHASE).toBe(7);
    expect(FISH_ART_3A_SCHEMA).toBe("fish.ship.fish_art_3a.v1");
    expect(FISH_ART_3A.plan).toBe("30_finish_4.0");
    expect(FISH_ART_3A_MARKER).toBe("authored-finish-4.0-phase-7");
    expect(FISH_ART_3A.newSpeciesIds).toHaveLength(25);
    expect(FISH_ART_3A.authoredSpeciesTarget).toBe(75);
    expect((storeListing as { fishArt3aPhase?: number }).fishArt3aPhase).toBe(7);
    expect(existsSync(resolve(root, FISH_ART_3A.parityFixture))).toBe(true);

    const m = measureFishArt3a(root);
    expect(m.authoredCount).toBeGreaterThanOrEqual(75);
    expect(m.newAuthoredCount).toBe(25);
    expect(m.wavePresent).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(m.licensesOk).toBe(true);
    expect(m.dodQuotaOk).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("fishart3a:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-fish-art-3a.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK fishart3a:validate");
  }, 60_000);
});
