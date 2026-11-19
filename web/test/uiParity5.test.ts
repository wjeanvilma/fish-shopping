import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadContent, SCHEMA_VERSION } from "../src/engine";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import {
  measureUiParity5,
  UI_PARITY_5,
  UI_PARITY_5_MARKER,
  UI_PARITY_5_PHASE,
} from "../src/ship/uiParity5";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("UI parity depth 5 (Finish 5.0 Phase 23)", () => {
  it("locks phase 23 catalog floors", () => {
    expect(UI_PARITY_5_PHASE).toBe(23);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(26);
    expect(UI_PARITY_5_MARKER).toBe("authored-finish-5.0-phase-23");
    expect((storeListing as { uiParity5Phase?: number }).uiParity5Phase).toBe(23);
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("uiParity5Incomplete");
    expect(content.bank.loanProducts.length).toBeGreaterThanOrEqual(UI_PARITY_5.loanProductMin);
    expect(content.bank.goalPresets.length).toBeGreaterThanOrEqual(UI_PARITY_5.goalPresetMin);
    expect(content.dailyGoals.objectives.length).toBeGreaterThanOrEqual(
      UI_PARITY_5.dailyObjectiveMin,
    );
  });

  it("measures ui-parity-5 wiring", () => {
    const m = measureUiParity5(root);
    expect(m.panelPairCount).toBeGreaterThanOrEqual(14);
    expect(m.featureFloorCount).toBeGreaterThanOrEqual(18);
    expect(m.pairsPresent).toBe(true);
    expect(m.featuresPresent).toBe(true);
    expect(m.missingFeatureMarkers).toEqual([]);
    expect(m.contentFloorsOk).toBe(true);
    expect(m.weeklyEndgameUxPresent).toBe(true);
    expect(m.kickoffClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("wires RELEASE_PIN + uiparity5:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { uiParity5?: string; fixtures?: string[] };
    expect(pin.uiParity5).toBe("shared/ship/ui-parity-5.json");
    expect(pin.fixtures).toContain("parity-ui-parity-5.json");
    const out = execFileSync("npm", ["run", "uiparity5:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK uiparity5:validate");
  });
});
