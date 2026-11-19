import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../src/engine";
import {
  PRESENTER_CPU_STAGES,
  PresenterCpuHarness,
  presenterCpuSnapshotFrom,
} from "../src/render/presenterCpuSnapshot";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  measurePresenterHarness,
  PRESENTER_HARNESS_MARKER,
  PRESENTER_HARNESS_PHASE,
} from "../src/ship/presenterHarness";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Presenter harness (Finish 6.0 Phase 21)", () => {
  it("locks phase 21 catalog floors", () => {
    expect(PRESENTER_HARNESS_PHASE).toBe(21);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(27);
    expect(PRESENTER_HARNESS_MARKER).toBe("authored-finish-6.0-phase-21");
    expect((storeListing as { presenterHarnessPhase?: number }).presenterHarnessPhase).toBe(21);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("presenterHarnessMissing");
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(7);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeGreaterThanOrEqual(0);
    expect(PRESENTER_CPU_STAGES).toContain("nestHud");
  });

  it("samples nestHud stage into a CPU snapshot", () => {
    let t = 0;
    const harness = new PresenterCpuHarness({ nowMs: () => ++t });
    harness.beginStage("crowd");
    harness.endStage("crowd");
    harness.recordStageMs("nestHud", 0.5);
    harness.setNestHudPressurePermille(400);
    expect(harness.sampleFrame(0.016, "medium")).toBe("hold");
    const snap = harness.snapshot();
    expect(snap.sampleCount).toBe(1);
    expect(snap.stageMs.nestHud).toBeGreaterThanOrEqual(0.5);
    expect(snap.nestHudPressurePermille).toBe(400);
    expect(snap.caps.crowd).toBeGreaterThanOrEqual(1);

    const pure = presenterCpuSnapshotFrom({
      lastFrameMs: 10,
      emaFrameMs: 10,
      targetMs: 16.7,
      budgetAction: "hold",
      quality: "low",
      sampleCount: 1,
      nestHudPressurePermille: 50,
    });
    expect(pure.overBudget).toBe(false);
    expect(pure.nestHudPressurePermille).toBe(50);
  });

  it("measures wiring + presenterharness:validate exits 0", () => {
    const m = measurePresenterHarness(root);
    expect(m.stageCount).toBeGreaterThanOrEqual(6);
    expect(m.snapshotFieldCount).toBeGreaterThanOrEqual(11);
    expect(m.requiredFilesPresent).toBe(true);
    expect(m.symbolsPresent).toBe(true);
    expect(m.missingSymbols).toEqual([]);
    expect(m.nestStagePresent).toBe(true);
    expect(m.kickoffClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);

    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { presenterHarness?: string; fixtures?: string[] };
    expect(pin.presenterHarness).toBe("shared/ship/presenter-harness.json");
    expect(pin.fixtures).toContain("parity-presenter-harness.json");
    const out = execFileSync("npm", ["run", "presenterharness:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK presenterharness:validate");
  });
});
