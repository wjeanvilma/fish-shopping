/**
 * Finish 3.0 Phase 18 — local daily-goal push reminders readiness.
 *
 * Usage:
 *   npm run localpush:validate
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_VERSION } from "../src/engine/foundations";
import {
  localDayId,
  nextFireEpochMs,
  shouldDeliverReminder,
  LOCAL_PUSH_POLICY,
} from "../src/push/localPushReminders";
import {
  LOCAL_PUSH_CLOSES_GAP,
  LOCAL_PUSH_REMINDERS,
  LOCAL_PUSH_REMINDERS_MARKER,
  LOCAL_PUSH_REMINDERS_PHASE,
  LOCAL_PUSH_REMINDERS_SCHEMA,
  measureLocalPushReminders,
} from "../src/ship/localPushReminders";
import { FINISH3_OPEN_GAP_FLAGS } from "../src/ship/finish3Kickoff";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

async function validate(): Promise<string[]> {
  const errors: string[] = [];
  const catalog = readJson(resolve(root, "shared/ship/local-push-reminders.json"));
  const fixture = readJson(resolve(root, "shared/fixtures/parity-local-push-reminders.json"));
  const policy = readJson(resolve(root, "shared/push/local-daily-goal-reminders.json"));
  const kickoff = readJson(resolve(root, "shared/ship/finish-3.0-kickoff.json"));
  const listing = readJson(resolve(root, "shared/store/listing.json"));
  const pin = readJson(resolve(root, "shared/fixtures/RELEASE_PIN.json"));
  const dod = readJson(resolve(root, "shared/ship/definition-of-done.json"));
  const ci = readFileSync(resolve(root, ".github/workflows/ci.yml"), "utf8");
  const pkg = readJson(resolve(root, "web/package.json"));
  const manifest = readFileSync(resolve(root, "app/src/main/AndroidManifest.xml"), "utf8");
  const kotlin = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/LocalPushReminders.kt"),
    "utf8",
  );
  const scheduleKt = readFileSync(
    resolve(root, "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/push/LocalPushSchedule.kt"),
    "utf8",
  );

  if (catalog.phase !== 18) errors.push(`phase expected 18, got ${catalog.phase}`);
  if (catalog.schema !== LOCAL_PUSH_REMINDERS_SCHEMA) errors.push("bad schema");
  if (catalog.plan !== "30_finish_3.0") errors.push("plan must be 30_finish_3.0");
  if (LOCAL_PUSH_REMINDERS_PHASE !== 18) errors.push("phase mirror mismatch");
  if (catalog.localPushRemindersMarker !== LOCAL_PUSH_REMINDERS_MARKER) errors.push("marker mismatch");
  if (fixture.localPushRemindersMarker !== LOCAL_PUSH_REMINDERS_MARKER) {
    errors.push("fixture marker mismatch");
  }
  if (catalog.contentVersion !== "2.0.0") errors.push("contentVersion must stay 2.0.0");
  if (catalog.schemaVersion !== 24) errors.push("catalog schemaVersion must stay 24");
  if (SCHEMA_VERSION < 24) errors.push("engine SCHEMA_VERSION must be >= 24");
  if (catalog.closesGap !== "pushRemindersMissing") errors.push("closesGap mismatch");
  if (LOCAL_PUSH_CLOSES_GAP !== "pushRemindersMissing") errors.push("closesGap mirror mismatch");

  if (policy.defaultLocalHour !== 18 || LOCAL_PUSH_POLICY.defaultLocalHour !== 18) {
    errors.push("defaultLocalHour must be 18");
  }
  if (policy.requiresUnclaimedGoals !== true) errors.push("requiresUnclaimedGoals must be true");
  if (policy.optInDefault !== false) errors.push("optInDefault must be false");

  const measure = measureLocalPushReminders(root);
  if (measure.schemaVersion < 24) errors.push("measure schemaVersion must be >= 24");
  if (!measure.scheduleOk) errors.push("schedule math vectors failed");
  if (!measure.gapClosed) errors.push("kickoff.gaps.pushRemindersMissing must be false");
  if (!measure.kickoffWired) {
    errors.push("kickoff phase 18 must set validate=localpush:validate, gap closed, measuredAtPhase≥18");
  }
  if (!measure.androidSymbols) errors.push("Android reminder scheduler/receiver symbols missing");
  if (!measure.webSymbols) errors.push("web localPushReminders symbols missing");
  for (const g of measure.missingGates) errors.push(`missing preflight ${g}`);

  // Fixture schedule vectors
  for (const v of fixture.expect.scheduleVectors as any[]) {
    if (v.expectSameDay != null) {
      const base = Date.UTC(2026, 0, 10, 0, 0, 0);
      const now = base + v.nowLocalHour * 3_600_000 + v.nowLocalMinute * 60_000;
      const fire = nextFireEpochMs(now, 18, 0, 0);
      const sameDay = localDayId(fire, 0) === localDayId(now, 0);
      if (sameDay !== v.expectSameDay) {
        errors.push(`vector ${v.id}: sameDay expected ${v.expectSameDay}`);
      }
    }
    if (v.expectDeliver != null) {
      const got = shouldDeliverReminder({
        enabled: v.enabled,
        unclaimedCount: v.unclaimed,
        lastShownDayId: v.lastDay,
        todayDayId: v.today,
      });
      if (got !== v.expectDeliver) {
        errors.push(`vector ${v.id}: deliver expected ${v.expectDeliver}`);
      }
    }
  }

  if (kickoff.gaps?.pushRemindersMissing !== false) {
    errors.push("kickoff gap pushRemindersMissing must be false");
  }
  if (FINISH3_OPEN_GAP_FLAGS.includes("pushRemindersMissing")) {
    errors.push("OPEN_GAP_FLAGS must not include closed pushRemindersMissing");
  }
  const phase18 = (kickoff.phases as any[])?.find((p) => p.phase === 18);
  if (!phase18 || phase18.validate !== "localpush:validate") {
    errors.push("kickoff phase 18 validate must be localpush:validate");
  }
  if ((kickoff.baseline?.measuredAtPhase ?? 0) < 18) {
    errors.push("kickoff.baseline.measuredAtPhase must be ≥ 18");
  }

  if (listing.localPushRemindersPhase !== 18) errors.push("listing.localPushRemindersPhase must be 18");
  if (listing.localPushRemindersCatalog !== "shared/ship/local-push-reminders.json") {
    errors.push("listing.localPushRemindersCatalog mismatch");
  }
  if (pin.localPushReminders !== "shared/ship/local-push-reminders.json") {
    errors.push("RELEASE_PIN.localPushReminders path missing");
  }
  if (!pin.fixtures?.includes("parity-local-push-reminders.json")) {
    errors.push("RELEASE_PIN missing parity-local-push-reminders.json");
  }

  const block = dod.localPushReminders;
  if (!block) errors.push("DoD missing localPushReminders block");
  else {
    if (block.phase !== 18) errors.push("DoD localPushReminders.phase must be 18");
    if (block.plan !== "30_finish_3.0") errors.push("DoD localPushReminders.plan mismatch");
    if (block.status !== "complete") errors.push("DoD localPushReminders.status must be complete");
    if (block.localPushRemindersMarker !== LOCAL_PUSH_REMINDERS_MARKER) {
      errors.push("DoD localPushReminders marker mismatch");
    }
  }

  if (!manifest.includes("POST_NOTIFICATIONS")) errors.push("manifest missing POST_NOTIFICATIONS");
  if (!manifest.includes("DailyGoalReminderReceiver")) errors.push("manifest missing reminder receiver");
  if (!manifest.includes("BOOT_COMPLETED")) errors.push("manifest missing BOOT_COMPLETED");
  if (!pkg.scripts?.["localpush:validate"]) errors.push("package.json missing localpush:validate");
  if (!ci.includes("localpush:validate")) errors.push("ci.yml missing localpush:validate");
  if (!kotlin.includes("CLOSES_GAP") || !scheduleKt.includes("shouldDeliver")) {
    errors.push("Kotlin LocalPush mirrors incomplete");
  }

  if (fixture.expect?.closesGap !== "pushRemindersMissing") {
    errors.push("parity expect.closesGap mismatch");
  }

  for (const gate of LOCAL_PUSH_REMINDERS.preflightGates) {
    if (!existsSync(resolve(root, gate))) errors.push(`missing preflight ${gate}`);
  }

  return errors;
}

const errors = await validate();
if (errors.length) {
  console.error("localpush:validate FAILED");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("OK localpush:validate — local daily-goal push reminders locked");
