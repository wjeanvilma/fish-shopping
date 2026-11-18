/**
 * Finish 3.0 Phase 18 — local daily-goal push reminders
 * (mirrors shared/ship/local-push-reminders.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/local-push-reminders.json";
import { SCHEMA_VERSION } from "../engine";
import {
  LOCAL_PUSH_POLICY,
  nextFireEpochMs,
  shouldDeliverReminder,
} from "../push/localPushReminders";

export interface LocalPushRemindersCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  localPushRemindersMarker: string;
  closesGap: string;
  policyCatalog: string;
  priorDailyGoalsPhase: number;
  priorDailyGoalsPlan: string;
  kickoffCatalog: string;
  parityFixture: string;
  validateScript: string;
  checklist: string[];
  preflightGates: string[];
}

export const LOCAL_PUSH_REMINDERS = catalogJson as unknown as LocalPushRemindersCatalog;
export const LOCAL_PUSH_REMINDERS_PHASE = LOCAL_PUSH_REMINDERS.phase;
export const LOCAL_PUSH_REMINDERS_SCHEMA = LOCAL_PUSH_REMINDERS.schema;
export const LOCAL_PUSH_REMINDERS_MARKER = LOCAL_PUSH_REMINDERS.localPushRemindersMarker;
export const LOCAL_PUSH_CLOSES_GAP = LOCAL_PUSH_REMINDERS.closesGap;

export interface LocalPushMeasure {
  schemaVersion: number;
  scheduleOk: boolean;
  gapClosed: boolean;
  kickoffWired: boolean;
  measuredAtPhase: number;
  androidSymbols: boolean;
  webSymbols: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureLocalPushReminders(repoRoot: string): LocalPushMeasure {
  const now = Date.UTC(2026, 10, 18, 15, 0, 0); // 15:00 UTC
  const offset = 0;
  const before = nextFireEpochMs(now, 18, 0, offset);
  const after = nextFireEpochMs(Date.UTC(2026, 10, 18, 19, 0, 0), 18, 0, offset);
  const scheduleOk =
    before > now &&
    before - now < 4 * 3_600_000 &&
    after > Date.UTC(2026, 10, 18, 19, 0, 0) &&
    shouldDeliverReminder({
      enabled: true,
      unclaimedCount: 2,
      lastShownDayId: 100,
      todayDayId: 101,
    }) &&
    !shouldDeliverReminder({
      enabled: false,
      unclaimedCount: 2,
      lastShownDayId: 100,
      todayDayId: 101,
    }) &&
    LOCAL_PUSH_POLICY.defaultLocalHour === 18;

  let measuredAtPhase = -1;
  let kickoffWired = false;
  let gapClosed = false;
  try {
    const kickoff = readJson(resolve(repoRoot, LOCAL_PUSH_REMINDERS.kickoffCatalog));
    measuredAtPhase = kickoff?.baseline?.measuredAtPhase ?? -1;
    gapClosed = kickoff.gaps?.pushRemindersMissing === false;
    const phase18 = (kickoff.phases as any[])?.find((p) => p.phase === 18);
    kickoffWired =
      measuredAtPhase >= 18 &&
      phase18?.id === "local-push" &&
      phase18?.validate === "localpush:validate" &&
      gapClosed;
  } catch {
    kickoffWired = false;
  }

  const scheduler = existsSync(
    resolve(repoRoot, "app/src/main/java/com/willio/jeanvilma/fishshopping/push/DailyGoalReminderScheduler.kt"),
  )
    ? readFileSync(
      resolve(repoRoot, "app/src/main/java/com/willio/jeanvilma/fishshopping/push/DailyGoalReminderScheduler.kt"),
      "utf8",
    )
    : "";
  const receiver = existsSync(
    resolve(repoRoot, "app/src/main/java/com/willio/jeanvilma/fishshopping/push/DailyGoalReminderReceiver.kt"),
  )
    ? readFileSync(
      resolve(repoRoot, "app/src/main/java/com/willio/jeanvilma/fishshopping/push/DailyGoalReminderReceiver.kt"),
      "utf8",
    )
    : "";
  const webPush = existsSync(resolve(repoRoot, "web/src/push/localPushReminders.ts"))
    ? readFileSync(resolve(repoRoot, "web/src/push/localPushReminders.ts"), "utf8")
    : "";
  const androidSymbols =
    scheduler.includes("nextFireEpochMs") ||
    (scheduler.includes("scheduleNext") && receiver.includes("ACTION_FIRE") && scheduler.includes("BOOT"));
  const androidOk =
    scheduler.includes("setAndAllowWhileIdle") &&
    receiver.includes("ACTION_BOOT_COMPLETED") &&
    receiver.includes("shouldDeliverNow");
  const webSymbols =
    webPush.includes("syncLocalDailyGoalReminders") &&
    webPush.includes("shouldDeliverReminder") &&
    webPush.includes("nextFireEpochMs");

  const missingGates = LOCAL_PUSH_REMINDERS.preflightGates.filter(
    (g) => !existsSync(resolve(repoRoot, g)),
  );

  return {
    schemaVersion: SCHEMA_VERSION,
    scheduleOk,
    gapClosed,
    kickoffWired,
    measuredAtPhase,
    androidSymbols: androidOk,
    webSymbols,
    missingGates,
  };
}
