import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  A11Y_DEPTH_2_PHASE,
  CONTRAST_PAIR_FLOOR_2,
  SCREEN_SURFACE_FLOOR_2,
} from "../src/ship/a11yDepth2";
import {
  A11Y_DEPTH_2_SCREEN_IDS,
  depth2ContrastFailures,
  accessibilityDepth2,
} from "../src/presenters/accessibilityDepth2";
import { depthContrastFailures } from "../src/presenters/accessibilityDepth";

const root = resolve(__dirname, "../..");

describe("a11y depth 2 (Finish 3.0 Phase 25)", () => {
  it("locks floors and keeps Finish 2.0 depth green", () => {
    expect(A11Y_DEPTH_2_PHASE).toBe(25);
    expect(SCREEN_SURFACE_FLOOR_2).toBe(7);
    expect(CONTRAST_PAIR_FLOOR_2).toBe(4);
    expect(A11Y_DEPTH_2_SCREEN_IDS).toHaveLength(7);
    expect(accessibilityDepth2.contrastPairs.length).toBeGreaterThanOrEqual(4);
    expect(depth2ContrastFailures()).toEqual([]);
    expect(depthContrastFailures()).toEqual([]);
    expect(
      (JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
        a11yDepth2Phase?: number;
      }).a11yDepth2Phase,
    ).toBe(25);
  });

  it("a11ydepth2:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-a11y-depth-2.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK a11ydepth2:validate");
  });
});
