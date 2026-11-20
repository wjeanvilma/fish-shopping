/**
 * Finish 6.0 Phase 19 — tutorial friction + retention hooks 6 readiness.
 *
 * Usage:
 *   npm run tutorialretention6:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION, loadContent } from "../src/engine";
import { tutorialFriction } from "../src/engine/tutorialFriction";
import { weeklyRetention } from "../src/engine/weeklyGoals";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  TUTORIAL_RETENTION_6,
  TUTORIAL_RETENTION_6_MARKER,
  TUTORIAL_RETENTION_6_PHASE,
  TUTORIAL_RETENTION_6_SCHEMA,
  measureTutorialRetention6,
} from "../src/ship/tutorialRetention6";
import { CONTENT_STRING_KEYS, contentStringKeyCount } from "../src/i18n/contentStrings";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/tutorial-retention-6.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-tutorial-retention-6.json"));
  const pack = readJson(resolve(root, "shared/content/content-pack.json"));
  const content = loadContent(pack);
  const friction = readJson(resolve(root, "shared/content/tutorial-friction.json"));
  const weekly = readJson(resolve(root, "shared/content/weekly-retention.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-6.0-kickoff.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const pkg = readJson(resolve(root, "web/package.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/TutorialRetention6.kt"),
    "utf8",
  );
  const finish6Kt = readFileSync(
    resolve(
      root,
      "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Finish6Kickoff.kt",
    ),
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
  if (catalog.schema !== TUTORIAL_RETENTION_6_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_6.0") errors.push("plan must be 30_finish_6.0");
  if (TUTORIAL_RETENTION_6_PHASE !== 19) errors.push("phase mirror mismatch");
  if (catalog.tutorialRetention6Marker !== TUTORIAL_RETENTION_6_MARKER) errors.push("marker mismatch");
  if (fixture.tutorialRetention6Marker !== TUTORIAL_RETENTION_6_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "5.0.0") errors.push("contentVersion must stay 5.0.0");
  if (catalog.schemaVersion !== 27) errors.push("catalog schemaVersion must be 27");
  if (SCHEMA_VERSION < 27) errors.push("engine SCHEMA_VERSION must be >= 27");
  if (!["5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack contentVersion must be 5.0.0 or 6.0.0");
  if (pack.saveSchemaVersion < 27) errors.push("content-pack.saveSchemaVersion must be >= 27");

  const measure = measureTutorialRetention6(root);
  if (measure.tutorialSteps < TUTORIAL_RETENTION_6.tutorialStepsMin) {
    errors.push(`tutorial steps ${measure.tutorialSteps} < ${TUTORIAL_RETENTION_6.tutorialStepsMin}`);
  }
  if (measure.highFriction < TUTORIAL_RETENTION_6.highFrictionMin) {
    errors.push(`highFriction ${measure.highFriction} < ${TUTORIAL_RETENTION_6.highFrictionMin}`);
  }
  if (measure.nudges < TUTORIAL_RETENTION_6.nudgesMin) {
    errors.push(`nudges ${measure.nudges} < ${TUTORIAL_RETENTION_6.nudgesMin}`);
  }
  if (measure.dailyObjectives < TUTORIAL_RETENTION_6.dailyObjectivesMin) {
    errors.push(`daily ${measure.dailyObjectives} < ${TUTORIAL_RETENTION_6.dailyObjectivesMin}`);
  }
  if (measure.boardSlots < TUTORIAL_RETENTION_6.boardSlotsMin) {
    errors.push(`boardSlots ${measure.boardSlots} < ${TUTORIAL_RETENTION_6.boardSlotsMin}`);
  }
  if (measure.maxStreakBonusDays < TUTORIAL_RETENTION_6.maxStreakBonusDaysMin) {
    errors.push(
      `maxStreakBonusDays ${measure.maxStreakBonusDays} < ${TUTORIAL_RETENTION_6.maxStreakBonusDaysMin}`,
    );
  }
  if (measure.weeklyObjectives < TUTORIAL_RETENTION_6.weeklyObjectivesMin) {
    errors.push(`weekly ${measure.weeklyObjectives} < ${TUTORIAL_RETENTION_6.weeklyObjectivesMin}`);
  }
  if (measure.weeklyBoardSlots < TUTORIAL_RETENTION_6.weeklyBoardSlotsMin) {
    errors.push(
      `weeklyBoardSlots ${measure.weeklyBoardSlots} < ${TUTORIAL_RETENTION_6.weeklyBoardSlotsMin}`,
    );
  }
  if (!measure.midGameFrictionPresent) errors.push("nest friction roast_nest/ferment_line missing");
  if (!measure.newDailiesPresent) errors.push("new nest daily objectives missing");
  if (!measure.newWeekliesPresent) errors.push("new nest weekly objectives missing");
  if (!measure.newTutorialStepsPresent) errors.push("new nest tutorial steps missing");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 19 must set id=tutorial-retention-6 validate=tutorialretention6:validate");
  }
  if (!measure.kickoffClosed) errors.push("kickoff.tutorialRetention6Incomplete must be false");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  if (friction.funnel?.highFrictionStepIds?.length < 9) {
    errors.push("tutorial-friction highFriction must be ≥9");
  }
  if ((friction.timing?.nudges ?? []).length < 9) errors.push("tutorial-friction nudges must be ≥9");
  if (weekly.boardSlots < 3) errors.push("weekly-retention boardSlots must be ≥3");
  if ((weekly.objectives ?? []).length < 6) errors.push("weekly-retention objectives must be ≥6");
  if (weeklyRetention.objectives.length < 6) errors.push("weeklyRetention mirror below floor");
  if (weeklyRetention.boardSlots < 3) errors.push("weeklyRetention boardSlots must be ≥3");

  if (content.dailyGoals.objectives.length < 18) {
    errors.push("content daily objectives must be ≥18");
  }
  if (content.dailyGoals.boardSlots < 6) errors.push("content boardSlots must be ≥6");
  if (content.raw.tutorial.length < 13) errors.push("content tutorial steps must be ≥13");

  for (const id of [
    ...TUTORIAL_RETENTION_6.newDailyObjectiveIds,
    ...TUTORIAL_RETENTION_6.newWeeklyObjectiveIds,
    ...TUTORIAL_RETENTION_6.newTutorialStepIds,
  ]) {
    if (!en.strings?.[id]) errors.push(`content-strings.en missing ${id}`);
  }
  const contentKeySet = new Set(CONTENT_STRING_KEYS);
  for (const id of [
    ...TUTORIAL_RETENTION_6.newDailyObjectiveIds,
    ...TUTORIAL_RETENTION_6.newWeeklyObjectiveIds,
  ]) {
    if (!contentKeySet.has(id)) errors.push(`missing content-string for ${id}`);
  }
  if (contentStringKeyCount("en") !== contentStringKeyCount("es")) {
    errors.push("en/es content string counts differ");
  }

  if (kickoff.gaps?.tutorialRetention6Incomplete !== false) {
    errors.push("kickoff.gaps.tutorialRetention6Incomplete must be false");
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("tutorialRetention6Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must drop tutorialRetention6Incomplete after Phase 19");
  }
  // Soft-floor: later phases may close more flags; Phase 19 closed tutorialRetention6.
  if (FINISH6_OPEN_GAP_FLAGS.length > 10) {
    errors.push(`OPEN_GAP_FLAGS expected ≤10 after Phase 19, got ${FINISH6_OPEN_GAP_FLAGS.length}`);
  }
  if (FINISH6_OPEN_GAP_FLAGS.includes("tutorialRetention6Incomplete")) {
    errors.push("OPEN_GAP_FLAGS must drop tutorialRetention6Incomplete after Phase 19");
  }
  const openSlice = finish6Kt.slice(
    finish6Kt.indexOf("OPEN_GAP_FLAGS"),
    finish6Kt.indexOf("OPEN_GAP_FLAGS") + 900,
  );
  if (openSlice.includes("tutorialRetention6Incomplete")) {
    errors.push("Finish6Kickoff OPEN_GAP_FLAGS must drop tutorialRetention6Incomplete");
  }
  const phase19 = (kickoff.phases as any[])?.find((p) => p.phase === 19);
  if (!phase19) errors.push("kickoff missing phase 19");
  else if (phase19.validate !== "tutorialretention6:validate") {
    errors.push("kickoff phase 19 validate must be tutorialretention6:validate");
  }
  if (phase19?.id !== "tutorial-retention-6") errors.push("kickoff phase 19 id mismatch");

  if (listing.tutorialRetention6Phase !== 19) {
    errors.push("listing.tutorialRetention6Phase must be 19");
  }
  if (listing.tutorialRetention6Catalog !== "shared/ship/tutorial-retention-6.json") {
    errors.push("listing.tutorialRetention6Catalog mismatch");
  }

  const block = dod.tutorialRetention6;
  if (!block) errors.push("DoD missing tutorialRetention6 block");
  else {
    if (block.phase !== 19) errors.push("DoD tutorialRetention6.phase must be 19");
    if (block.status !== "complete") errors.push("DoD tutorialRetention6.status must be complete");
    if (block.tutorialRetention6Marker !== TUTORIAL_RETENTION_6_MARKER) {
      errors.push("DoD tutorialRetention6 marker mismatch");
    }
  }
  if ((dod.quotas?.dailyObjectives ?? 0) < 18) {
    errors.push("DoD quotas.dailyObjectives must be ≥18");
  }
  if ((dod.quotas?.weeklyObjectives ?? 0) < 6) {
    errors.push("DoD quotas.weeklyObjectives must be ≥6");
  }

  if (!pkg.scripts?.["tutorialretention6:validate"]) {
    errors.push("package.json missing tutorialretention6:validate");
  }
  if (!ci.includes("tutorialretention6:validate")) {
    errors.push("ci.yml missing tutorialretention6:validate");
  }
  if (!ci.includes("tutorialretention5:validate")) {
    errors.push("ci.yml missing soft tutorialretention5:validate");
  }
  if (!kotlin.includes("NEW_DAILY_OBJECTIVE_IDS")) {
    errors.push("Kotlin TutorialRetention6 missing NEW_DAILY_OBJECTIVE_IDS");
  }
  if (!kotlin.includes("MID_GAME_FRICTION_IDS")) {
    errors.push("Kotlin TutorialRetention6 missing MID_GAME_FRICTION_IDS");
  }
  if (!weeklyKt.includes("weekly.nest_ember")) {
    errors.push("WeeklyGoals.kt missing weekly.nest_ember");
  }
  if (!weeklyKt.includes("BOARD_SLOTS = 3")) {
    errors.push("WeeklyGoals.kt BOARD_SLOTS must be 3");
  }
  if (!frictionKt.includes("tutorial.roast_nest")) {
    errors.push("TutorialFriction.kt missing tutorial.roast_nest");
  }
  if (!existsSync(resolve(root, "shared/tools/author_tutorial_retention_6.py"))) {
    errors.push("missing author_tutorial_retention_6.py");
  }
  if (pin.tutorialRetention6 !== "shared/ship/tutorial-retention-6.json") {
    errors.push("RELEASE_PIN.tutorialRetention6 path mismatch");
  }
  if (!pin.fixtures?.includes("parity-tutorial-retention-6.json")) {
    errors.push("RELEASE_PIN missing parity-tutorial-retention-6.json");
  }
  if (fixture.expect?.dailyObjectivesMin !== 18) {
    errors.push("parity dailyObjectivesMin must be 18");
  }
  if (fixture.expect?.weeklyObjectivesMin !== 6) {
    errors.push("parity weeklyObjectivesMin must be 6");
  }
  if (fixture.expect?.tutorialRetention6Incomplete !== false) {
    errors.push("parity tutorialRetention6Incomplete must be false");
  }
  // Soft-floor: later phases may lower openGapFlagMin further; Phase 19 closed to ≤10.
  if ((fixture.expect?.openGapFlagMin ?? 99) > 10) {
    errors.push("parity openGapFlagMin must be ≤10 after Phase 19");
  }
  if (tutorialFriction.funnel.highFrictionStepIds.length < 9) {
    errors.push("tutorialFriction mirror highFriction below floor");
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("FAIL tutorialretention6:validate\n" + errors.map((e) => ` - ${e}`).join("\n"));
  process.exit(1);
}
console.log("OK tutorialretention6:validate — tutorial friction + daily/weekly nest retention locked");
