import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadContent } from "../src/engine";
import {
  UI_PARITY,
  UI_PARITY_MARKER,
  UI_PARITY_PHASE,
  measureUiParity,
} from "../src/ship/uiParity";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("ui parity depth (Finish 4.0 Phase 22)", () => {
  it("locks catalog floors", () => {
    expect(UI_PARITY_PHASE).toBe(22);
    expect(UI_PARITY_MARKER).toBe("authored-finish-4.0-phase-22");
    expect(content.bank.loanProducts.length).toBeGreaterThanOrEqual(UI_PARITY.loanProductMin);
    expect(content.bank.goalPresets.length).toBeGreaterThanOrEqual(UI_PARITY.goalPresetMin);
    expect(content.dailyGoals.objectives.length).toBeGreaterThanOrEqual(UI_PARITY.dailyObjectiveMin);
    const measure = measureUiParity(root);
    expect(measure.pairsPresent).toBe(true);
    expect(measure.featuresPresent).toBe(true);
    expect(measure.missingFeatureMarkers).toEqual([]);
    expect(measure.kickoffWired).toBe(true);
  });

  it("uiparity:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-ui-parity-depth.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK uiparity:validate");
  });
});
