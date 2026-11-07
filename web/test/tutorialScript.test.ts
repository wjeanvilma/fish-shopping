import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  advanceAllTutorialsViaStateEvents,
  BLUEPRINT_SCRIPT_IDS,
  coachingObjective,
  CORE_LOOP_MILESTONE_IDS,
  currentTutorialStep,
  GameState,
  loadContent,
  ProgressionSystem,
  satisfyCurrentTutorialStep,
  StepContext,
  tutorialAcceptanceErrors,
} from "../src/engine";

const content = loadContent(
  JSON.parse(readFileSync(resolve(__dirname, "../../shared/content/content-pack.json"), "utf8")),
);

describe("tutorialScript (Phase 21)", () => {
  it("passes blueprint acceptance contract", () => {
    expect(tutorialAcceptanceErrors(content)).toEqual([]);
    expect(BLUEPRINT_SCRIPT_IDS).toHaveLength(8);
    expect(content.tutorial.length).toBeGreaterThanOrEqual(8);
  });

  it("uses only state-event triggers", () => {
    for (const step of content.tutorial) {
      const t = step.advanceOn;
      if (t.kind === "enter_zone") expect(t.zone.length).toBeGreaterThan(0);
      else {
        expect(t.kind).toBe("stat");
        expect(t.stat.length).toBeGreaterThan(0);
        expect(t.atLeast).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("orders catch → cut → stock → sell → upgrade → hire", () => {
    const ids = content.tutorial.map((s) => s.id);
    const catchIdx = ids.indexOf("tutorial.catch_three");
    const cut = ids.indexOf("tutorial.deliver_cutter");
    const stock = ids.indexOf("tutorial.stock_counter");
    const sell = ids.indexOf("tutorial.serve_customer");
    const upgrade = ids.indexOf("tutorial.buy_upgrade");
    const hire = ids.indexOf("tutorial.hire_staff");
    expect(catchIdx).toBeGreaterThanOrEqual(0);
    expect(catchIdx).toBeLessThan(cut);
    expect(cut).toBeLessThan(stock);
    expect(stock).toBeLessThan(sell);
    expect(sell).toBeLessThan(upgrade);
    expect(upgrade).toBeLessThan(hire);
  });

  it("coaching advances core loop via state events only", () => {
    const state = GameState.newGame(content, "harbor.sunrise_pier", 1);
    const seen: string[] = [];

    while (state.tutorialIndex < content.tutorial.length) {
      const step = currentTutorialStep(content, state)!;
      const obj = coachingObjective(content, state);
      expect(obj?.eyebrow).toBe("NEXT");
      expect(obj?.text).toBe(step.text);
      expect(obj?.tutorialStepId).toBe(step.id);
      expect(obj?.detail).toBe(`${state.tutorialIndex + 1}/${content.tutorial.length}`);

      if ((CORE_LOOP_MILESTONE_IDS as readonly string[]).includes(step.id)) seen.push(step.id);

      satisfyCurrentTutorialStep(content, state);
      const before = state.tutorialIndex;
      ProgressionSystem.step(new StepContext(content, state));
      expect(state.tutorialIndex, `step ${step.id}`).toBe(before + 1);
    }

    expect(seen).toEqual([...CORE_LOOP_MILESTONE_IDS]);
    expect(state.tutorialIndex).toBe(content.tutorial.length);
    const after = coachingObjective(content, state);
    expect(after == null || after.eyebrow !== "NEXT").toBe(true);
  });

  it("advanceAll helper completes the full script", () => {
    const state = GameState.newGame(content, "harbor.sunrise_pier", 42);
    const completed = advanceAllTutorialsViaStateEvents(content, state);
    expect(completed).toEqual(content.tutorial.map((s) => s.id));
    for (const id of BLUEPRINT_SCRIPT_IDS) expect(completed).toContain(id);
    expect(state.tutorialIndex).toBe(content.tutorial.length);
  });
});
