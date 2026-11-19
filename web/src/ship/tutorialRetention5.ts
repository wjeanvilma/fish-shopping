/**
 * Finish 5.0 Phase 19 — tutorial friction rewrite + retention hooks
 * (mirrors shared/ship/tutorial-retention-5.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/tutorial-retention-5.json";
import { loadContent } from "../engine";
import { tutorialFriction } from "../engine/tutorialFriction";
import { weeklyRetention } from "../engine/weeklyGoals";

export interface TutorialRetention5Catalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  tutorialRetention5Marker: string;
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
  midGameFrictionIds: string[];
  extendsTutorialFriction: string;
  weeklyRetentionCatalog: string;
  weeklyPushCatalog: string;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  simHzInvariant: number;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const TUTORIAL_RETENTION_5 = catalogJson as unknown as TutorialRetention5Catalog;
export const TUTORIAL_RETENTION_5_PHASE = TUTORIAL_RETENTION_5.phase;
export const TUTORIAL_RETENTION_5_SCHEMA = TUTORIAL_RETENTION_5.schema;
export const TUTORIAL_RETENTION_5_MARKER = TUTORIAL_RETENTION_5.tutorialRetention5Marker;

export interface TutorialRetention5Measure {
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
  kickoffClosed: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureTutorialRetention5(repoRoot: string): TutorialRetention5Measure {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  const content = loadContent(pack);
  const kickoff = readJson(resolve(repoRoot, "shared/ship/finish-5.0-kickoff.json"));
  const weeklyPush = resolve(repoRoot, TUTORIAL_RETENTION_5.weeklyPushCatalog);

  const missingGates: string[] = [];
  for (const gate of TUTORIAL_RETENTION_5.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }
  if (!existsSync(weeklyPush)) missingGates.push(TUTORIAL_RETENTION_5.weeklyPushCatalog);

  const midGameFrictionPresent = TUTORIAL_RETENTION_5.midGameFrictionIds.every(
    (id) =>
      tutorialFriction.funnel.highFrictionStepIds.includes(id) &&
      tutorialFriction.timing.nudges.some((n) => n.stepId === id),
  );
  const newDailiesPresent = TUTORIAL_RETENTION_5.newDailyObjectiveIds.every((id) =>
    content.dailyGoals.objectives.some((o) => o.id === id),
  );
  const newWeekliesPresent = TUTORIAL_RETENTION_5.newWeeklyObjectiveIds.every((id) =>
    weeklyRetention.objectives.some((o) => o.id === id),
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
    kickoffClosed: kickoff.gaps?.tutorialRetentionIncomplete === false,
    missingGates,
  };
}
