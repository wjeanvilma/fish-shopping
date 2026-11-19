/**
 * Finish 6.0 Phase 19 — tutorial friction + retention hooks 6
 * (mirrors shared/ship/tutorial-retention-6.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/tutorial-retention-6.json";
import { loadContent } from "../engine";
import { tutorialFriction } from "../engine/tutorialFriction";
import { weeklyRetention } from "../engine/weeklyGoals";

export interface TutorialRetention6Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  tutorialRetention6Marker: string;
  tutorialStepsMin: number;
  highFrictionMin: number;
  nudgesMin: number;
  dailyObjectivesMin: number;
  boardSlotsMin: number;
  weeklyObjectivesMin: number;
  weeklyBoardSlotsMin: number;
  maxStreakBonusDaysMin: number;
  newDailyObjectiveIds: string[];
  newWeeklyObjectiveIds: string[];
  newTutorialStepIds: string[];
  midGameFrictionIds: string[];
  extendsTutorialFriction: string;
  extendsTutorialRetention5: string;
  weeklyRetentionCatalog: string;
  weeklyPushCatalog: string;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  softTutorialRetention5Validate: string;
  simHzInvariant: number;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const TUTORIAL_RETENTION_6 = catalogJson as unknown as TutorialRetention6Catalog;
export const TUTORIAL_RETENTION_6_PHASE = TUTORIAL_RETENTION_6.phase;
export const TUTORIAL_RETENTION_6_SCHEMA = TUTORIAL_RETENTION_6.schema;
export const TUTORIAL_RETENTION_6_MARKER = TUTORIAL_RETENTION_6.tutorialRetention6Marker;

export interface TutorialRetention6Measure {
  tutorialSteps: number;
  highFriction: number;
  nudges: number;
  dailyObjectives: number;
  boardSlots: number;
  maxStreakBonusDays: number;
  weeklyObjectives: number;
  weeklyBoardSlots: number;
  midGameFrictionPresent: boolean;
  newDailiesPresent: boolean;
  newWeekliesPresent: boolean;
  newTutorialStepsPresent: boolean;
  kickoffClosed: boolean;
  kickoffWired: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureTutorialRetention6(repoRoot: string): TutorialRetention6Measure {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  const content = loadContent(pack);
  const kickoff = readJson(resolve(repoRoot, TUTORIAL_RETENTION_6.kickoffCatalog));
  const phase19 = (kickoff.phases as any[])?.find((p: any) => p.phase === 19);

  const missingGates: string[] = [];
  for (const gate of TUTORIAL_RETENTION_6.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  const midGameFrictionPresent = TUTORIAL_RETENTION_6.midGameFrictionIds.every(
    (id) =>
      tutorialFriction.funnel.highFrictionStepIds.includes(id) &&
      tutorialFriction.timing.nudges.some((n) => n.stepId === id),
  );
  const newDailiesPresent = TUTORIAL_RETENTION_6.newDailyObjectiveIds.every((id) =>
    content.dailyGoals.objectives.some((o) => o.id === id),
  );
  const newWeekliesPresent = TUTORIAL_RETENTION_6.newWeeklyObjectiveIds.every((id) =>
    weeklyRetention.objectives.some((o) => o.id === id),
  );
  const newTutorialStepsPresent = TUTORIAL_RETENTION_6.newTutorialStepIds.every((id) =>
    content.raw.tutorial.some((s: { id: string }) => s.id === id),
  );

  return {
    tutorialSteps: content.raw.tutorial.length,
    highFriction: tutorialFriction.funnel.highFrictionStepIds.length,
    nudges: tutorialFriction.timing.nudges.length,
    dailyObjectives: content.dailyGoals.objectives.length,
    boardSlots: content.dailyGoals.boardSlots,
    maxStreakBonusDays: content.dailyGoals.maxStreakBonusDays,
    weeklyObjectives: weeklyRetention.objectives.length,
    weeklyBoardSlots: weeklyRetention.boardSlots,
    midGameFrictionPresent,
    newDailiesPresent,
    newWeekliesPresent,
    newTutorialStepsPresent,
    kickoffClosed: kickoff.gaps?.tutorialRetention6Incomplete === false,
    kickoffWired:
      phase19?.id === "tutorial-retention-6" && phase19?.validate === "tutorialretention6:validate",
    missingGates,
  };
}
