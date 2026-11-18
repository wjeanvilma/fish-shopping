import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FISH_ART_3B,
  FISH_ART_3B_MARKER,
  FISH_ART_3B_PHASE,
  FISH_ART_3B_SCHEMA,
  measureFishArt3b,
} from "../src/ship/fishArt3b";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Fish art 3b (Finish 4.0 Phase 8)", () => {
  it("locks authored floor 100 with species 76–100 wave", () => {
    expect(FISH_ART_3B_PHASE).toBe(8);
    expect(FISH_ART_3B_SCHEMA).toBe("fish.ship.fish_art_3b.v1");
    expect(FISH_ART_3B.plan).toBe("30_finish_4.0");
    expect(FISH_ART_3B_MARKER).toBe("authored-finish-4.0-phase-8");
    expect(FISH_ART_3B.newSpeciesIds).toHaveLength(25);
    expect(FISH_ART_3B.authoredSpeciesTarget).toBe(100);
    expect((storeListing as { fishArt3bPhase?: number }).fishArt3bPhase).toBe(8);
    expect(existsSync(resolve(root, FISH_ART_3B.parityFixture))).toBe(true);

    const m = measureFishArt3b(root);
    expect(m.authoredCount).toBe(100);
    expect(m.speciesCount).toBe(100);
    expect(m.newAuthoredCount).toBe(25);
    expect(m.wavePresent).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(m.speciesGapClosed).toBe(true);
    expect(m.licensesOk).toBe(true);
    expect(m.dodQuotaOk).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(m.missingAssets).toEqual([]);
  });

  it("fishart3b:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-fish-art-3b.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK fishart3b:validate");
  }, 60_000);
});
