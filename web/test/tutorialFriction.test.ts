import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { coachingObjective, GameState, loadContent } from "../src/engine";
import {
  frictionNudgeText,
  isHighFrictionStep,
  patchedTutorialText,
  TUTORIAL_FRICTION_PHASE,
  TUTORIAL_FRICTION_SCHEMA,
  tutorialFriction,
} from "../src/engine/tutorialFriction";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("Tutorial friction (post-1.0 Phase 22)", () => {
  it("locks copy patches + dwell nudges without schema/version bump", () => {
    expect(TUTORIAL_FRICTION_PHASE).toBe(22);
    expect(TUTORIAL_FRICTION_SCHEMA).toBe("fish.content.tutorial_friction.v1");
    expect(tutorialFriction.contentVersion).toBe("1.0.0"); // Phase 22 freeze record
    expect(tutorialFriction.schemaVersion).toBe(21);
    expect(tutorialFriction.constraints.noAdvanceOnChanges).toBe(true);
    expect(tutorialFriction.constraints.noContentVersionBump).toBe(true);
    expect(tutorialFriction.funnel.highFrictionStepIds).toEqual([
      "tutorial.catch_three",
      "tutorial.deliver_cutter",
      "tutorial.buy_upgrade",
      "tutorial.first_contract",
      "tutorial.hire_staff",
    ]);
  });

  it("content-pack texts match copyPatches and advanceOn stays frozen", () => {
    for (const patch of tutorialFriction.copyPatches) {
      const step = content.tutorial.find((s) => s.id === patch.stepId);
      expect(step, patch.stepId).toBeTruthy();
      expect(step!.text).toBe(patch.text);
      expect(patchedTutorialText(patch.stepId)).toBe(patch.text);
      const frozen = tutorialFriction.frozenAdvanceOn[patch.stepId];
      expect(frozen).toEqual(step!.advanceOn);
    }
  });

  it("dwell nudges gate on hintAfterMs for high-friction steps", () => {
    expect(frictionNudgeText(null, 99_000)).toBeNull();
    expect(frictionNudgeText("tutorial.walk_to_pier", 99_000)).toBeNull();
    expect(frictionNudgeText("tutorial.catch_three", 7_999)).toBeNull();
    expect(frictionNudgeText("tutorial.catch_three", 8_000)).toMatch(/^Tip:/);
    expect(isHighFrictionStep("tutorial.hire_staff")).toBe(true);
    expect(isHighFrictionStep("tutorial.walk_to_pier")).toBe(false);
  });

  it("coaching exposes tutorialStepId while NEXT is active", () => {
    const state = GameState.newGame(content, "harbor.sunrise_pier", 1);
    const step = content.tutorial[state.tutorialIndex]!;
    const obj = coachingObjective(content, state);
    expect(obj?.eyebrow).toBe("NEXT");
    expect(obj?.tutorialStepId).toBe(step.id);
    expect(obj?.text).toBe(step.text);
  });

  it("tutorial:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-tutorial-friction.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK tutorial:validate");
  });
});
