import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../src/engine";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  measureTutorialRetention6,
  TUTORIAL_RETENTION_6_MARKER,
  TUTORIAL_RETENTION_6_PHASE,
} from "../src/ship/tutorialRetention6";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Tutorial friction + retention 6 (Finish 6.0 Phase 19)", () => {
  it("locks phase 19 catalog floors", () => {
    expect(TUTORIAL_RETENTION_6_PHASE).toBe(19);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(27);
    expect(TUTORIAL_RETENTION_6_MARKER).toBe("authored-finish-6.0-phase-19");
    expect((storeListing as { tutorialRetention6Phase?: number }).tutorialRetention6Phase).toBe(19);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("tutorialRetention6Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(10);
  });

  it("measures nest friction + retention wiring", () => {
    const m = measureTutorialRetention6(root);
    expect(m.tutorialSteps).toBeGreaterThanOrEqual(13);
    expect(m.highFriction).toBeGreaterThanOrEqual(9);
    expect(m.nudges).toBeGreaterThanOrEqual(9);
    expect(m.dailyObjectives).toBeGreaterThanOrEqual(18);
    expect(m.boardSlots).toBeGreaterThanOrEqual(6);
    expect(m.weeklyObjectives).toBeGreaterThanOrEqual(6);
    expect(m.weeklyBoardSlots).toBeGreaterThanOrEqual(1);
    expect(m.midGameFrictionPresent).toBe(true);
    expect(m.newDailiesPresent).toBe(true);
    expect(m.newWeekliesPresent).toBe(true);
    expect(m.newTutorialStepsPresent).toBe(true);
    expect(m.kickoffClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("wires RELEASE_PIN + tutorialretention6:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { tutorialRetention6?: string; fixtures?: string[] };
    expect(pin.tutorialRetention6).toBe("shared/ship/tutorial-retention-6.json");
    expect(pin.fixtures).toContain("parity-tutorial-retention-6.json");
    const out = execFileSync("npm", ["run", "tutorialretention6:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK tutorialretention6:validate");
  });
});
