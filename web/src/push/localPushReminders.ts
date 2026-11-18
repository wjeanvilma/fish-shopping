/**
 * Finish 3.0 Phase 18 — local daily-goal push reminders (web).
 * Opt-in Notification API scheduler; mirrors game-core LocalPushSchedule.
 * Background delivery while the tab is closed deepens with PWA (Phase 19).
 */
import policyJson from "../../../shared/push/local-daily-goal-reminders.json";

export const LOCAL_PUSH_POLICY = policyJson as {
  schema: string;
  defaultLocalHour: number;
  defaultLocalMinute: number;
  channelId: string;
  notificationId: number;
  requestCode: number;
  titleKey: string;
  bodyKey: string;
  optInDefault: boolean;
  requiresUnclaimedGoals: boolean;
  webStorageLastDayKey: string;
};

export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;

export function localTimezoneOffsetMinutes(now: Date = new Date()): number {
  return -now.getTimezoneOffset();
}

export function localDayId(epochMs: number, offsetMinutes: number): number {
  const local = epochMs + offsetMinutes * MS_PER_MINUTE;
  return Math.floor(local / MS_PER_DAY);
}

export function nextFireEpochMs(
  nowMs: number,
  hour: number = LOCAL_PUSH_POLICY.defaultLocalHour,
  minute: number = LOCAL_PUSH_POLICY.defaultLocalMinute,
  offsetMinutes: number = 0,
): number {
  if (hour < 0 || hour > 23) throw new Error("hour out of range");
  if (minute < 0 || minute > 59) throw new Error("minute out of range");
  const localNow = nowMs + offsetMinutes * MS_PER_MINUTE;
  const dayStart = Math.floor(localNow / MS_PER_DAY) * MS_PER_DAY;
  const candidateLocal = dayStart + hour * MS_PER_HOUR + minute * MS_PER_MINUTE;
  const fireLocal = candidateLocal > localNow ? candidateLocal : candidateLocal + MS_PER_DAY;
  return fireLocal - offsetMinutes * MS_PER_MINUTE;
}

export function shouldDeliverReminder(opts: {
  enabled: boolean;
  unclaimedCount: number;
  lastShownDayId: number;
  todayDayId: number;
  requiresUnclaimedGoals?: boolean;
}): boolean {
  const requires = opts.requiresUnclaimedGoals ?? LOCAL_PUSH_POLICY.requiresUnclaimedGoals;
  if (!opts.enabled) return false;
  if (requires && opts.unclaimedCount <= 0) return false;
  if (opts.lastShownDayId === opts.todayDayId) return false;
  return true;
}

export function loadLastShownDayId(storage: Storage | null = typeof localStorage !== "undefined" ? localStorage : null): number {
  if (!storage) return -1;
  try {
    const raw = storage.getItem(LOCAL_PUSH_POLICY.webStorageLastDayKey);
    if (raw == null) return -1;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : -1;
  } catch {
    return -1;
  }
}

export function saveLastShownDayId(
  dayId: number,
  storage: Storage | null = typeof localStorage !== "undefined" ? localStorage : null,
): void {
  if (!storage) return;
  try {
    storage.setItem(LOCAL_PUSH_POLICY.webStorageLastDayKey, String(dayId));
  } catch {
    // private mode / quota
  }
}

export function clearLastShownDayId(
  storage: Storage | null = typeof localStorage !== "undefined" ? localStorage : null,
): void {
  if (!storage) return;
  try {
    storage.removeItem(LOCAL_PUSH_POLICY.webStorageLastDayKey);
  } catch {
    // ignore
  }
}

export type NotificationPermissionState = "unsupported" | "default" | "granted" | "denied";

export function notificationPermissionState(
  notif: { permission: NotificationPermission } | null =
    typeof Notification !== "undefined" ? Notification : null,
): NotificationPermissionState {
  if (!notif) return "unsupported";
  return notif.permission;
}

export async function requestNotificationPermission(
  notif: { permission: NotificationPermission; requestPermission: () => Promise<NotificationPermission> } | null =
    typeof Notification !== "undefined" ? Notification : null,
): Promise<NotificationPermissionState> {
  if (!notif) return "unsupported";
  if (notif.permission === "granted" || notif.permission === "denied") return notif.permission;
  try {
    const next = await notif.requestPermission();
    return next;
  } catch {
    return notif.permission;
  }
}

export function formatDailyGoalReminderBody(unclaimedCount: number, template: string): string {
  return template.replace(/\{count\}/g, String(Math.max(0, unclaimedCount)));
}

export interface ShowReminderOpts {
  title: string;
  body: string;
  tag?: string;
  NotificationCtor?: typeof Notification | null;
}

export function showDailyGoalReminder(opts: ShowReminderOpts): boolean {
  const Ctor = opts.NotificationCtor ?? (typeof Notification !== "undefined" ? Notification : null);
  if (!Ctor || Ctor.permission !== "granted") return false;
  const tag = opts.tag ?? LOCAL_PUSH_POLICY.channelId;
  const pageNotify = (): boolean => {
    try {
      // eslint-disable-next-line no-new
      new Ctor(opts.title, { body: opts.body, tag, silent: false });
      return true;
    } catch {
      return false;
    }
  };
  // Injected ctor (tests) stays synchronous page-path only.
  if (opts.NotificationCtor) return pageNotify();
  // Finish 3.0 Phase 19 — prefer SW showNotification; fall back to page Notification.
  void import("../pwa/registerServiceWorker")
    .then(async ({ showPwaNotification }) => {
      const viaSw = await showPwaNotification(opts.title, { body: opts.body, tag, silent: false });
      if (!viaSw) pageNotify();
    })
    .catch(() => {
      pageNotify();
    });
  return true;
}

let scheduledTimer: ReturnType<typeof setTimeout> | null = null;

export function cancelScheduledDailyGoalReminder(): void {
  if (scheduledTimer != null) {
    clearTimeout(scheduledTimer);
    scheduledTimer = null;
  }
}

export interface SyncLocalPushOpts {
  enabled: boolean;
  unclaimedCount: number;
  title: string;
  bodyTemplate: string;
  nowMs?: number;
  offsetMinutes?: number;
  hour?: number;
  minute?: number;
  storage?: Storage | null;
  NotificationCtor?: typeof Notification | null;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}

/**
 * Cancel any pending timer; when enabled + permission granted, schedule the next local fire.
 * On fire: deliver if shouldDeliver, stamp last day, reschedule.
 */
export function syncLocalDailyGoalReminders(opts: SyncLocalPushOpts): { scheduledForMs: number | null } {
  const clear = opts.clearTimeoutFn ?? clearTimeout;
  const schedule = opts.setTimeoutFn ?? setTimeout;
  if (scheduledTimer != null) {
    clear(scheduledTimer);
    scheduledTimer = null;
  }
  if (!opts.enabled) return { scheduledForMs: null };

  const nowMs = opts.nowMs ?? Date.now();
  const offset = opts.offsetMinutes ?? localTimezoneOffsetMinutes(new Date(nowMs));
  const fireAt = nextFireEpochMs(
    nowMs,
    opts.hour ?? LOCAL_PUSH_POLICY.defaultLocalHour,
    opts.minute ?? LOCAL_PUSH_POLICY.defaultLocalMinute,
    offset,
  );
  const delay = Math.max(0, fireAt - nowMs);

  scheduledTimer = schedule(() => {
    scheduledTimer = null;
    const today = localDayId(Date.now(), offset);
    const last = loadLastShownDayId(opts.storage);
    if (
      shouldDeliverReminder({
        enabled: opts.enabled,
        unclaimedCount: opts.unclaimedCount,
        lastShownDayId: last,
        todayDayId: today,
      })
    ) {
      const shown = showDailyGoalReminder({
        title: opts.title,
        body: formatDailyGoalReminderBody(opts.unclaimedCount, opts.bodyTemplate),
        NotificationCtor: opts.NotificationCtor,
      });
      if (shown) saveLastShownDayId(today, opts.storage);
    }
    syncLocalDailyGoalReminders(opts);
  }, delay) as ReturnType<typeof setTimeout>;

  return { scheduledForMs: fireAt };
}
