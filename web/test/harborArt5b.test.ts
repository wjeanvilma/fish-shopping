import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../src/engine";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import {
  HARBOR_ART_5B,
  HARBOR_ART_5B_MARKER,
  HARBOR_ART_5B_PHASE,
  measureHarborArt5b,
} from "../src/ship/harborArt5b";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Harbor art 5b (Finish 5.0 Phase 8)", () => {
  it("locks phase 8 catalog floors", () => {
    expect(HARBOR_ART_5B_PHASE).toBe(8);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(25);
    expect(HARBOR_ART_5B_MARKER).toBe("authored-finish-5.0-phase-8");
    expect(HARBOR_ART_5B.finish5Harbors).toHaveLength(4);
    expect(HARBOR_ART_5B.harborFinish5Marker).toBe("harbor-art-5b");
    expect((storeListing as { harborArt5bPhase?: number }).harborArt5bPhase).toBe(8);
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("harborArt5Incomplete");
  });

  it("measures stamped harbors 7–10 and closed gap", () => {
    const m = measureHarborArt5b(root);
    expect(m.finish5Present).toBe(true);
    expect(m.finish5Count).toBe(4);
    expect(m.minArtNodesMet).toBe(true);
    expect(m.authoredHarborsUnchanged).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(m.missingAssets).toEqual([]);
  });

  it("harborart5b:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-harbor-art-5b.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK harborart5b:validate");
  });
});
