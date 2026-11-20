import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../src/engine";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  measureUiParity6,
  UI_PARITY_6_MARKER,
  UI_PARITY_6_PHASE,
} from "../src/ship/uiParity6";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("UI parity 6 (Finish 6.0 Phase 20)", () => {
  it("locks phase 20 catalog floors", () => {
    expect(UI_PARITY_6_PHASE).toBe(20);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(27);
    expect(UI_PARITY_6_MARKER).toBe("authored-finish-6.0-phase-20");
    expect((storeListing as { uiParity6Phase?: number }).uiParity6Phase).toBe(20);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("uiParity6Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(7);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeGreaterThanOrEqual(0);
  });

  it("measures nest panel/feature wiring", () => {
    const m = measureUiParity6(root);
    expect(m.panelPairCount).toBeGreaterThanOrEqual(16);
    expect(m.featureFloorCount).toBeGreaterThanOrEqual(23);
    expect(m.pairsPresent).toBe(true);
    expect(m.featuresPresent).toBe(true);
    expect(m.missingFeatureMarkers).toEqual([]);
    expect(m.contentFloorsOk).toBe(true);
    expect(m.nestUxPresent).toBe(true);
    expect(m.kickoffClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("wires RELEASE_PIN + uiparity6:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { uiParity6?: string; fixtures?: string[] };
    expect(pin.uiParity6).toBe("shared/ship/ui-parity-6.json");
    expect(pin.fixtures).toContain("parity-ui-parity-6.json");
    const out = execFileSync("npm", ["run", "uiparity6:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK uiparity6:validate");
  });
});
