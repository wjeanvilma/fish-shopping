import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HARBOR_ART_3,
  HARBOR_ART_3_MARKER,
  HARBOR_ART_3_PHASE,
  HARBOR_ART_3_SCHEMA,
  measureHarborArt3,
} from "../src/ship/harborArt3";
import { HARBOR_ART_MARKER } from "../src/ship/harborArtPass";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Harbor art 3 (Finish 4.0 Phase 9)", () => {
  it("locks scenic floor for all 8 harbors beyond blockout", () => {
    expect(HARBOR_ART_3_PHASE).toBe(9);
    expect(HARBOR_ART_3_SCHEMA).toBe("fish.ship.harbor_art_3.v1");
    expect(HARBOR_ART_3.plan).toBe("30_finish_4.0");
    expect(HARBOR_ART_3_MARKER).toBe("authored-finish-4.0-phase-9");
    expect(HARBOR_ART_3.scenicHarbors).toHaveLength(8);
    expect(HARBOR_ART_3.minHarborArtNodes).toBe(10);
    expect(HARBOR_ART_MARKER).toBe(HARBOR_ART_3.harborArtMarker);
    expect((storeListing as { harborArt3Phase?: number }).harborArt3Phase).toBe(9);
    expect(existsSync(resolve(root, HARBOR_ART_3.parityFixture))).toBe(true);

    const m = measureHarborArt3(root);
    expect(m.authoredCount).toBeGreaterThanOrEqual(8);
    expect(m.scenicCount).toBe(8);
    expect(m.scenicPresent).toBe(true);
    expect(m.minArtNodesMet).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(m.licensesOk).toBe(true);
    expect(m.dodQuotaOk).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(m.missingAssets).toEqual([]);
    for (const count of Object.values(m.artNodeCounts)) {
      expect(count).toBeGreaterThanOrEqual(10);
    }
  });

  it("harborart3:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-harbor-art-3.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK harborart3:validate");
  }, 60_000);
});
