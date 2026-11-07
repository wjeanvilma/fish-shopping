import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  A11Y_DEPTH_PHASE,
  CONTRAST_PAIR_FLOOR,
  SCREEN_SURFACE_FLOOR,
} from "../src/ship/a11yDepth";
import {
  A11Y_DEPTH_SCREEN_IDS,
  depthContrastFailures,
  accessibilityDepth,
} from "../src/presenters/accessibilityDepth";
import { contrastFailures } from "../src/presenters/accessibilitySweep";

const root = resolve(__dirname, "../..");

describe("a11y depth (Finish 2.0 Phase 24)", () => {
  it("locks floors and keeps Phase 16 sweep green", () => {
    expect(A11Y_DEPTH_PHASE).toBe(24);
    expect(SCREEN_SURFACE_FLOOR).toBe(9);
    expect(CONTRAST_PAIR_FLOOR).toBe(4);
    expect(A11Y_DEPTH_SCREEN_IDS).toHaveLength(9);
    expect(accessibilityDepth.contrastPairs.length).toBeGreaterThanOrEqual(4);
    expect(depthContrastFailures()).toEqual([]);
    expect(contrastFailures()).toEqual([]);
    expect(
      (JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
        a11yDepthPhase?: number;
      }).a11yDepthPhase,
    ).toBe(24);
  });

  it("a11y2:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-a11y-depth.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK a11y2:validate");
  });
});
