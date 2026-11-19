import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../src/engine";
import {
  HARBOR_ART_5A,
  HARBOR_ART_5A_MARKER,
  HARBOR_ART_5A_PHASE,
  measureHarborArt5a,
} from "../src/ship/harborArt5a";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Harbor art 5a (Finish 5.0 Phase 7)", () => {
  it("locks phase 7 catalog floors", () => {
    expect(HARBOR_ART_5A_PHASE).toBe(7);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(25);
    expect(HARBOR_ART_5A_MARKER).toBe("authored-finish-5.0-phase-7");
    expect(HARBOR_ART_5A.finish5Harbors).toHaveLength(6);
    expect(HARBOR_ART_5A.harborFinish5Marker).toBe("harbor-art-5a");
    expect((storeListing as { harborArt5aPhase?: number }).harborArt5aPhase).toBe(7);
  });

  it("measures stamped harbors 1–6", () => {
    const m = measureHarborArt5a(root);
    expect(m.finish5Present).toBe(true);
    expect(m.finish5Count).toBe(6);
    expect(m.minArtNodesMet).toBe(true);
    expect(m.authoredHarborsUnchanged).toBe(true);
    expect(m.harborArt5IncompleteOpen).toBe(true); // key present (closed false after Phase 8)
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(m.missingAssets).toEqual([]);
  });

  it("harborart5a:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-harbor-art-5a.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK harborart5a:validate");
  });
});
