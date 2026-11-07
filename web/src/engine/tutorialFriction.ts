/**
 * Phase 22 (post-1.0) — tutorial friction catalog: copy patches + dwell nudges.
 * Presentation timing only; advanceOn / schema stay frozen.
 */
import frictionJson from "../../../shared/content/tutorial-friction.json";

export interface TutorialFrictionNudge {
  stepId: string;
  hintAfterMs: number;
  nudge: string;
}

export interface TutorialFrictionCatalog {
  phase: number;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  funnel: { highFrictionStepIds: string[] };
  copyPatches: Array<{ stepId: string; text: string }>;
  timing: {
    defaultHintAfterMs: number;
    nudges: TutorialFrictionNudge[];
  };
  frozenAdvanceOn: Record<string, Record<string, unknown>>;
  constraints: {
    noSchemaBreak: boolean;
    noAdvanceOnChanges: boolean;
    noStepIdChanges: boolean;
    noContentVersionBump: boolean;
  };
}

export const tutorialFriction = frictionJson as unknown as TutorialFrictionCatalog;
export const TUTORIAL_FRICTION_PHASE = tutorialFriction.phase;
export const TUTORIAL_FRICTION_SCHEMA = tutorialFriction.schema;

export function frictionNudgeForStep(stepId: string): TutorialFrictionNudge | null {
  return tutorialFriction.timing.nudges.find((n) => n.stepId === stepId) ?? null;
}

/** Return nudge text when dwell on [stepId] exceeds the step's hint delay. */
export function frictionNudgeText(stepId: string | null | undefined, dwellMs: number): string | null {
  if (!stepId) return null;
  const n = frictionNudgeForStep(stepId);
  if (!n) return null;
  if (dwellMs < n.hintAfterMs) return null;
  return n.nudge;
}

export function patchedTutorialText(stepId: string): string | null {
  return tutorialFriction.copyPatches.find((p) => p.stepId === stepId)?.text ?? null;
}

export function isHighFrictionStep(stepId: string): boolean {
  return tutorialFriction.funnel.highFrictionStepIds.includes(stepId);
}
