import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  nextFireEpochMs,
  shouldDeliverReminder,
  localDayId,
  formatDailyGoalReminderBody,
  LOCAL_PUSH_POLICY,
} from "../src/push/localPushReminders";
import {
  LOCAL_PUSH_REMINDERS_MARKER,
  LOCAL_PUSH_REMINDERS_PHASE,
  measureLocalPushReminders,
} from "../src/ship/localPushReminders";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Local push reminders (Finish 3.0 Phase 18)", () => {
  it("locks phase 18 catalog floors", () => {
    expect(LOCAL_PUSH_REMINDERS_PHASE).toBe(18);
    expect(LOCAL_PUSH_REMINDERS_MARKER).toBe("authored-finish-3.0-phase-18");
    expect(LOCAL_PUSH_POLICY.defaultLocalHour).toBe(18);
    expect((storeListing as { localPushRemindersPhase?: number }).localPushRemindersPhase).toBe(18);
  });

  it("schedule + deliver gates", () => {
    const dayStart = 10 * 86_400_000;
    const morning = dayStart + 10 * 3_600_000;
    const fire = nextFireEpochMs(morning, 18, 0, 0);
    expect(localDayId(fire, 0)).toBe(localDayId(morning, 0));
    expect(shouldDeliverReminder({
      enabled: true,
      unclaimedCount: 2,
      lastShownDayId: 100,
      todayDayId: 101,
    })).toBe(true);
    expect(shouldDeliverReminder({
      enabled: true,
      unclaimedCount: 0,
      lastShownDayId: 100,
      todayDayId: 101,
    })).toBe(false);
    expect(formatDailyGoalReminderBody(3, "You still have {count} left")).toBe("You still have 3 left");
  });

  it("measures wiring + closed gap", () => {
    const m = measureLocalPushReminders(root);
    expect(m.schemaVersion).toBe(24);
    expect(m.scheduleOk).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.androidSymbols).toBe(true);
    expect(m.webSymbols).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("localpush:validate exits 0", () => {
    const out = execFileSync("npm", ["run", "localpush:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK localpush:validate");
  });
});
