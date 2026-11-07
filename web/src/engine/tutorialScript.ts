/**
 * Phase 21 — blueprint tutorial script acceptance.
 * Advances are driven only by enter_zone / stat triggers (state events),
 * never by animation timing or wall-clock waits. Mirrors game-core TutorialScript.kt.
 */
import type { ContentPack, TutorialStepDef, TutorialTrigger } from "./content";
import { ProgressionSystem, StepContext } from "./systems";
import type { GameState } from "./state";

/** Blueprint first-session teaching beats (8 steps). */
export const BLUEPRINT_SCRIPT_IDS: readonly string[] = [
  "tutorial.walk_to_pier",
  "tutorial.catch_three",
  "tutorial.deliver_cutter",
  "tutorial.collect_output",
  "tutorial.stock_counter",
  "tutorial.serve_customer",
  "tutorial.buy_upgrade",
  "tutorial.hire_staff",
] as const;

/** Core loop milestones from the finish plan. */
export const CORE_LOOP_MILESTONE_IDS: readonly string[] = [
  "tutorial.catch_three",
  "tutorial.deliver_cutter",
  "tutorial.stock_counter",
  "tutorial.serve_customer",
  "tutorial.buy_upgrade",
  "tutorial.hire_staff",
] as const;

export function tutorialIndexOf(content: ContentPack, id: string): number {
  return content.tutorial.findIndex((s) => s.id === id);
}

export function assertTutorialOrdered(content: ContentPack, ids: readonly string[]): string[] {
  const errors: string[] = [];
  let last = -1;
  for (const id of ids) {
    const idx = tutorialIndexOf(content, id);
    if (idx < 0) {
      errors.push(`missing tutorial step '${id}'`);
      continue;
    }
    if (idx <= last) {
      errors.push(`tutorial step '${id}' at ${idx} must follow previous milestone (last=${last})`);
    }
    last = idx;
  }
  return errors;
}

export function assertStateEventTriggers(content: ContentPack): string[] {
  const errors: string[] = [];
  for (const step of content.tutorial) {
    const t = step.advanceOn;
    if (t.kind === "enter_zone") {
      if (!t.zone) errors.push(`${step.id}: empty enter_zone`);
    } else if (t.kind === "stat") {
      if (t.atLeast < 1) errors.push(`${step.id}: stat threshold must be >= 1`);
      if (!t.stat) errors.push(`${step.id}: empty stat id`);
    } else {
      errors.push(`${step.id}: unsupported trigger kind`);
    }
  }
  return errors;
}

export function tutorialAcceptanceErrors(content: ContentPack): string[] {
  return [
    ...assertStateEventTriggers(content),
    ...assertTutorialOrdered(content, BLUEPRINT_SCRIPT_IDS),
    ...assertTutorialOrdered(content, CORE_LOOP_MILESTONE_IDS),
  ];
}

/** Satisfy the current step without locomotion / animation. */
export function satisfyCurrentTutorialStep(content: ContentPack, state: GameState): void {
  const step = content.tutorial[state.tutorialIndex];
  if (!step) return;
  const t: TutorialTrigger = step.advanceOn;
  if (t.kind === "enter_zone") {
    state.player.zoneId = t.zone;
  } else {
    const have = state.stat(t.stat);
    if (have < t.atLeast) state.bumpStat(t.stat, t.atLeast - have);
  }
}

/** Advance every scripted step via state events; returns completed step ids. */
export function advanceAllTutorialsViaStateEvents(content: ContentPack, state: GameState): string[] {
  const completed: string[] = [];
  let guard = 0;
  while (state.tutorialIndex < content.tutorial.length && guard < content.tutorial.length + 2) {
    guard++;
    const before = state.tutorialIndex;
    const step = content.tutorial[before]!;
    satisfyCurrentTutorialStep(content, state);
    const ctx = new StepContext(content, state);
    ProgressionSystem.step(ctx);
    if (state.tutorialIndex !== before + 1) {
      throw new Error(
        `expected '${step.id}' to advance on state event (index ${before} → ${state.tutorialIndex})`,
      );
    }
    if (!ctx.events.some((e) => e.type === "tutorial_advanced")) {
      throw new Error(`expected tutorial_advanced for '${step.id}'`);
    }
    completed.push(step.id);
  }
  return completed;
}

export function currentTutorialStep(content: ContentPack, state: GameState): TutorialStepDef | null {
  return content.tutorial[state.tutorialIndex] ?? null;
}
