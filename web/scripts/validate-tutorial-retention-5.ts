/**
 * Finish 5.0 Phase 19 — tutorial friction rewrite + retention hooks readiness.
 *
 * Usage:
 *   npm run tutorialretention5:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION, loadContent } from "../src/engine";
import { tutorialFriction } from "../src/engine/tutorialFriction";
import { WEEKLY_OBJECTIVES_MIN, weeklyRetention } from "../src/engine/weeklyGoals";
import {
  TUTORIAL_RETENTION_5,
  TUTORIAL_RETENTION_5_MARKER,
  TUTORIAL_RETENTION_5_PHASE,
  TUTORIAL_RETENTION_5_SCHEMA,
  measureTutorialRetention5,
} from "../src/ship/tutorialRetention5";
import { CONTENT_STRING_KEYS, contentStringKeyCount } from "../src/i18n/contentStrings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/tutorial-retention-5.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-tutorial-retention-5.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const content = loadContent(pack);
  const friction = readJson(resolve(root, "shared/content/tutorial-friction.json"));
  const weekly = readJson(resolve(root, "shared/content/weekly-retention.json"));
  const weeklyPush = readJson(resolve(root, "shared/push/local-weekly-goal-reminders.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-5.0-kickoff.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/TutorialRetention5.kt"),
    "utf8",
  );
  const weeklyKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/progression/WeeklyGoals.kt"),
    "utf8",
  );
  const frictionKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/TutorialFriction.kt"),
    "utf8",
  );
  const en = readJson(resolve(root, "shared/i18n/content-strings.en.json"));

  if (catalog.phase !== 19) errors.push(`phase expected 19, got ${catalog.phase}`);
  if (catalog.schema !== TUTORIAL_RETENTION_5_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_5.0") errors.push("plan must be 30_finish_5.0");
  if (TUTORIAL_RETENTION_5_PHASE !== 19) errors.push("phase mirror mismatch");
  if (catalog.tutorialRetention5Marker !== TUTORIAL_RETENTION_5_MARKER) errors.push("marker mismatch");
  if (fixture.tutorialRetention5Marker !== TUTORIAL_RETENTION_5_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "4.0.0") errors.push("contentVersion must stay 4.0.0");
  if (catalog.schemaVersion !== 26) errors.push("catalog schemaVersion must be 26");
  if (SCHEMA_VERSION < 26) errors.push("engine SCHEMA_VERSION must be >= 26");
  if (!["4.0.0", "5.0.0"].includes(pack.contentVersion)) errors.push("content-pack contentVersion must be 4.0.0 or 5.0.0");
  if (pack.saveSchemaVersion !== 26) errors.push("content-pack.saveSchemaVersion must be 26");

  const measure = measureTutorialRetention5(root);
  if (measure.tutorialSteps < TUTORIAL_RETENTION_5.tutorialStepsMin) {
    errors.push(`tutorial steps ${measure.tutorialSteps} < ${TUTORIAL_RETENTION_5.tutorialStepsMin}`);
  }
  if (measure.highFriction < TUTORIAL_RETENTION_5.highFrictionMin) {
    errors.push(`highFriction ${measure.highFriction} < ${TUTORIAL_RETENTION_5.highFrictionMin}`);
  }
  if (measure.nudges < TUTORIAL_RETENTION_5.nudgesMin) {
    errors.push(`nudges ${measure.nudges} < ${TUTORIAL_RETENTION_5.nudgesMin}`);
  }
  if (measure.dailyObjectives < TUTORIAL_RETENTION_5.dailyObjectivesMin) {
    errors.push(`daily ${measure.dailyObjectives} < ${TUTORIAL_RETENTION_5.dailyObjectivesMin}`);
  }
  if (measure.boardSlots < TUTORIAL_RETENTION_5.boardSlotsMin) {
    errors.push(`boardSlots ${measure.boardSlots} < ${TUTORIAL_RETENTION_5.boardSlotsMin}`);
  }
  if (measure.maxStreakBonusDays < TUTORIAL_RETENTION_5.maxStreakBonusDaysMin) {
    errors.push(`maxStreakBonusDays ${measure.maxStreakBonusDays} < ${TUTORIAL_RETENTION_5.maxStreakBonusDaysMin}`);
  }
  if (measure.weeklyObjectives < TUTORIAL_RETENTION_5.weeklyObjectivesMin) {
    errors.push(`weekly ${measure.weeklyObjectives} < ${TUTORIAL_RETENTION_5.weeklyObjectivesMin}`);
  }
  if (measure.weeklyBoardSlots < TUTORIAL_RETENTION_5.weeklyBoardSlotsMin) {
    errors.push(`weeklyBoardSlots ${measure.weeklyBoardSlots} < ${TUTORIAL_RETENTION_5.weeklyBoardSlotsMin}`);
  }
  if (!measure.midGameFrictionPresent) errors.push("mid-game friction grill_line/plot_marker missing");
  if (!measure.newDailiesPresent) errors.push("new daily objectives missing");
  if (!measure.newWeekliesPresent) errors.push("new weekly objectives missing");
  if (!measure.kickoffClosed) errors.push("kickoff.tutorialRetentionIncomplete must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if ((friction.funnel?.highFrictionStepIds ?? []).length < 7) {
    errors.push("tutorial-friction highFriction must be ≥7");
  }
  if ((friction.timing?.nudges ?? []).length < 7) {
    errors.push("tutorial-friction nudges must be ≥7");
  }
  for (const id of TUTORIAL_RETENTION_5.midGameFrictionIds) {
    if (!frictionKt.includes(id)) errors.push(`TutorialFriction.kt missing ${id}`);
    if (!tutorialFriction.funnel.highFrictionStepIds.includes(id)) {
      errors.push(`tutorialFriction missing highFriction ${id}`);
    }
  }

  if (weekly.objectives?.length < WEEKLY_OBJECTIVES_MIN) {
    errors.push("weekly-retention objectives below floor");
  }
  if (weeklyRetention.objectives.length < 4) errors.push("weeklyRetention mirror below floor");
  if (weeklyPush.channelId !== "weekly_goals") errors.push("weekly push channelId must be weekly_goals");
  if (weeklyPush.requiresUnclaimedGoals !== true) {
    errors.push("weekly push requiresUnclaimedGoals must be true");
  }
  if (!weeklyKt.includes("WEEKLY_OBJECTIVES") && !weeklyKt.includes("OBJECTIVES")) {
    errors.push("WeeklyGoals.kt missing objectives");
  }
  if (!weeklyKt.includes("weekly.rival_week")) errors.push("WeeklyGoals.kt missing rival week");

  for (const id of [
    ...TUTORIAL_RETENTION_5.newDailyObjectiveIds,
    ...TUTORIAL_RETENTION_5.newWeeklyObjectiveIds,
  ]) {
    if (!en.strings?.[id]) errors.push(`content-strings.en missing ${id}`);
  }
  const contentKeySet = new Set(CONTENT_STRING_KEYS);
  for (const id of [
    ...TUTORIAL_RETENTION_5.newDailyObjectiveIds,
    ...TUTORIAL_RETENTION_5.newWeeklyObjectiveIds,
  ]) {
    if (!contentKeySet.has(id)) errors.push(`missing content-string for ${id}`);
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("es")) {
    errors.push("en/es content string counts differ");
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("pt")) {
    errors.push("en/pt content string counts differ");
  }

  if (content.dailyGoals.objectives.length < 14) {
    errors.push("content daily objectives must be ≥14");
  }
  if (content.dailyGoals.boardSlots < 5) errors.push("content boardSlots must be ≥5");
  if (content.dailyGoals.maxStreakBonusDays < 14) {
    errors.push("content maxStreakBonusDays must be ≥14");
  }
  if ((content.dailyGoals.streakBonusCoinsPerDay ?? 0) < 8) {
    errors.push("content streakBonusCoinsPerDay must be ≥8");
  }

  if (kickoff.gaps?.tutorialRetentionIncomplete !== false) {
    errors.push("kickoff.gaps.tutorialRetentionIncomplete must be false");
  }
  const phase19 = (kickoff.phases as any[])?.find((p) => p.phase === 19);
  if (!phase19) errors.push("kickoff missing phase 19");
  else if (phase19.validate !== "tutorialretention5:validate") {
    errors.push("kickoff phase 19 validate must be tutorialretention5:validate");
  }
  if (phase19?.id !== "tutorial-retention-5") errors.push("kickoff phase 19 id mismatch");

  if (listing.tutorialRetention5Phase !== 19) {
    errors.push("listing.tutorialRetention5Phase must be 19");
  }
  if (listing.tutorialRetention5Catalog !== "shared/ship/tutorial-retention-5.json") {
    errors.push("listing.tutorialRetention5Catalog mismatch");
  }

  const block = dod.tutorialRetention5;
  if (!block) errors.push("DoD missing tutorialRetention5 block");
  else {
    if (block.phase !== 19) errors.push("DoD tutorialRetention5.phase must be 19");
    if (block.status !== "complete") errors.push("DoD tutorialRetention5.status must be complete");
    if (block.tutorialRetention5Marker !== TUTORIAL_RETENTION_5_MARKER) {
      errors.push("DoD tutorialRetention5 marker mismatch");
    }
  }
  if ((dod.quotas?.dailyObjectives ?? 0) < 14) {
    errors.push("DoD quotas.dailyObjectives must be ≥14");
  }
  if ((dod.quotas?.weeklyObjectives ?? 0) < 4) {
    errors.push("DoD quotas.weeklyObjectives must be ≥4");
  }

  if (!pkg.scripts?.["tutorialretention5:validate"]) {
    errors.push("package.json missing tutorialretention5:validate");
  }
  if (!ci.includes("tutorialretention5:validate")) {
    errors.push("ci.yml missing tutorialretention5:validate");
  }
  if (!ci.includes("tutorial:validate")) errors.push("ci.yml missing baseline tutorial:validate");
  if (!ci.includes("dailygoals:validate")) errors.push("ci.yml missing baseline dailygoals:validate");
  if (!ci.includes("localpush:validate")) errors.push("ci.yml missing baseline localpush:validate");
  if (!kotlin.includes("NEW_DAILY_OBJECTIVE_IDS")) {
    errors.push("Kotlin TutorialRetention5 missing NEW_DAILY_OBJECTIVE_IDS");
  }
  if (!existsSync(resolve(root, "shared/tools/author_tutorial_retention_5.py"))) {
    errors.push("missing author_tutorial_retention_5.py");
  }
  if (pin.tutorialRetention5 !== "shared/ship/tutorial-retention-5.json") {
    errors.push("RELEASE_PIN.tutorialRetention5 path mismatch");
  }
  if (!pin.fixtures?.includes("parity-tutorial-retention-5.json")) {
    errors.push("RELEASE_PIN missing parity-tutorial-retention-5.json");
  }
  if (fixture.expect?.dailyObjectivesMin !== 14) errors.push("parity dailyObjectivesMin must be 14");
  if (fixture.expect?.weeklyObjectivesMin !== 4) errors.push("parity weeklyObjectivesMin must be 4");
  if (fixture.expect?.tutorialRetentionIncomplete !== false) {
    errors.push("parity tutorialRetentionIncomplete must be false");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("FAIL tutorialretention5:validate\n" + errors.map((e) => ` - ${e}`).join("\n"));
  process.exit(1);
}
console.log("OK tutorialretention5:validate — tutorial friction + daily/weekly retention locked");
