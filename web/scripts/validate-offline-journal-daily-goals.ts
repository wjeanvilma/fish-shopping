/**
 * Finish 2.0 Phase 18 — offline journal + daily goals readiness.
 *
 * Usage:
 *   npm run dailygoals:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadContent, SCHEMA_VERSION, DailyGoalsSystem } from "../src/engine";
import {
  DAILY_BOARD_SLOTS_FLOOR,
  DAILY_GOALS_PHASE,
  DAILY_GOALS_SCHEMA,
  DAILY_OBJECTIVE_FLOOR,
  OFFLINE_JOURNAL_DAILY_GOALS,
} from "../src/ship/offlineJournalDailyGoals";
import { SCHEMA_23_VERSION } from "../src/ship/schema23";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validate(): string[] {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/offline-journal-daily-goals.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-offline-journal-daily-goals.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const content = loadContent(
    JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
  );

  if (catalog.phase !== 18) errors.push(`phase expected 18, got ${catalog.phase}`);
  if (catalog.schema !== DAILY_GOALS_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_2.0") errors.push("plan must be 30_finish_2.0");
  if (DAILY_GOALS_PHASE !== 18) errors.push("phase mirror mismatch");
  if (catalog.schemaVersion !== 23) errors.push("catalog schemaVersion must be 23");
  if (SCHEMA_VERSION !== 23) errors.push("engine SCHEMA_VERSION must be 23");
  if (SCHEMA_23_VERSION !== 23) errors.push("SCHEMA_23_VERSION mismatch");
  if (catalog.dailyObjectiveCount !== 6 || DAILY_OBJECTIVE_FLOOR !== 6) {
    errors.push("dailyObjectiveCount must be 6");
  }
  if (catalog.boardSlots !== 3 || DAILY_BOARD_SLOTS_FLOOR !== 3) {
    errors.push("boardSlots must be 3");
  }
  if (dod.quotas?.dailyObjectives !== 6) errors.push("DoD quotas.dailyObjectives must be 6");
  if (content.dailyGoals.objectives.length < 6) {
    errors.push(`objectives ${content.dailyGoals.objectives.length} < 6`);
  }
  if (content.dailyGoals.boardSlots !== 3) errors.push("content boardSlots must be 3");

  if (listing.offlineJournalDailyGoalsPhase !== 18) {
    errors.push("listing.offlineJournalDailyGoalsPhase must be 18");
  }
  if (listing.offlineJournalDailyGoalsCatalog !== "shared/ship/offline-journal-daily-goals.json") {
    errors.push("listing.offlineJournalDailyGoalsCatalog mismatch");
  }
  if (!ci.includes("dailygoals:validate")) errors.push("ci.yml missing dailygoals:validate");
  if (!pin.fixtures?.includes("parity-offline-journal-daily-goals.json")) {
    errors.push("RELEASE_PIN.fixtures missing parity-offline-journal-daily-goals.json");
  }
  if (pin.offlineJournalDailyGoals !== "shared/ship/offline-journal-daily-goals.json") {
    errors.push("RELEASE_PIN.offlineJournalDailyGoals path mismatch");
  }
  if (pin.schemaVersion !== 23) errors.push("RELEASE_PIN.schemaVersion must be 23");

  for (const id of OFFLINE_JOURNAL_DAILY_GOALS.objectives) {
    if (!content.dailyObjectivesById.has(id)) errors.push(`missing objective ${id}`);
  }

  const expectedDay = Math.floor(fixture.epochMs / content.dailyGoals.dayLengthMs);
  if (expectedDay !== fixture.expect.dayId) {
    errors.push(`fixture dayId drift: content day ${expectedDay} vs fixture ${fixture.expect.dayId}`);
  }
  if (content.dailyGoals.dayLengthMs !== fixture.dayLengthMs) {
    errors.push("dayLengthMs mismatch vs fixture");
  }
  const obj = content.dailyObjectivesById.get(fixture.objectiveId);
  if (!obj) errors.push(`fixture objective ${fixture.objectiveId} missing`);
  else if (obj.goal.atLeast !== fixture.expect.target) {
    errors.push("fixture target mismatch");
  } else if (obj.rewardCoins !== fixture.expect.rewardCoinsBase) {
    errors.push("fixture rewardCoins mismatch");
  }
  if (content.dailyGoals.streakBonusCoinsPerDay !== fixture.expect.streakBonusCoinsPerDay) {
    errors.push("streakBonusCoinsPerDay mismatch");
  }

  if (typeof DailyGoalsSystem.syncClock !== "function") errors.push("DailyGoalsSystem.syncClock missing");
  if (typeof DailyGoalsSystem.claim !== "function") errors.push("DailyGoalsSystem.claim missing");
  if (typeof DailyGoalsSystem.journalLines !== "function") {
    errors.push("DailyGoalsSystem.journalLines missing");
  }

  const dailyKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/progression/DailyGoals.kt"),
    "utf8",
  );
  const systemsTs = readFileSync(resolve(root, "web/src/engine/systems.ts"), "utf8");
  const appTsx = readFileSync(resolve(root, "web/src/ui/App.tsx"), "utf8");
  const hostTs = readFileSync(resolve(root, "web/src/game/GameHost.ts"), "utf8");
  const screenKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt"),
    "utf8",
  );
  const vmKt = readFileSync(
    resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt"),
    "utf8",
  );
  if (!dailyKt.includes("object DailyGoalsSystem")) errors.push("Kotlin DailyGoalsSystem missing");
  if (!systemsTs.includes("export const DailyGoalsSystem")) errors.push("web DailyGoalsSystem missing");
  if (!appTsx.includes("claimDailyGoal") && !appTsx.includes("onClaimDaily")) {
    errors.push("web Goals panel missing daily claim UI");
  }
  if (!appTsx.includes("dailyLoginStreak")) errors.push("web missing dailyLoginStreak UI");
  if (!hostTs.includes("syncWallClock") && !hostTs.includes("sync_wall_clock")) {
    errors.push("GameHost missing wall-clock sync");
  }
  if (!screenKt.includes("dailyLoginStreak") && !screenKt.includes("Daily")) {
    errors.push("Android Goals/dashboard missing daily UI");
  }
  if (!vmKt.includes("ClaimDailyGoal") && !vmKt.includes("claimDailyGoal")) {
    errors.push("Android missing claimDailyGoal");
  }
  if (!vmKt.includes("SyncWallClock") && !vmKt.includes("syncWallClock")) {
    errors.push("Android missing SyncWallClock");
  }

  for (const gate of catalog.preflightGates as string[]) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = validate();
if (errors.length) {
  console.error("dailygoals:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK dailygoals:validate — offline journal + daily goals ready");
