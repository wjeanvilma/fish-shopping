import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../src/engine";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import {
  FISH_ART_5,
  FISH_ART_5_MARKER,
  FISH_ART_5_PHASE,
  measureFishArt5,
} from "../src/ship/fishArt5";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Fish art 5 (Finish 5.0 Phase 9)", () => {
  it("locks phase 9 catalog floors", () => {
    expect(FISH_ART_5_PHASE).toBe(9);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(25);
    expect(FISH_ART_5_MARKER).toBe("authored-finish-5.0-phase-9");
    expect(FISH_ART_5.newSpeciesIds).toHaveLength(25);
    expect(FISH_ART_5.authoredSpeciesTarget).toBe(125);
    expect((storeListing as { fishArt5Phase?: number }).fishArt5Phase).toBe(9);
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("fishArt5Incomplete");
  });

  it("measures stamped art-ahead meshes 101–125", () => {
    const m = measureFishArt5(root);
    expect(m.authoredCount).toBeGreaterThanOrEqual(125);
    expect(m.newStampedCount).toBe(25);
    expect(m.minArtNodesMet).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(m.authoredFishRemainingClosed).toBe(true);
    expect(m.speciesRemainingOpen).toBe(true); // 25 pre-Phase-13 or 0 after
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(m.missingAssets).toEqual([]);
  });

  it("fishart5:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-fish-art-5.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK fishart5:validate");
  });
});
