/**
 * Phase 25 — privacy-safe analytics events (blueprint live-ops).
 * Mirrors game-core Analytics.kt. Consent is enforced by presentation clients.
 */
import { TELEMETRY_FORBIDDEN_KEYS } from "./telemetry";

export const ANALYTICS_SCHEMA = "fish.analytics.v1";

export const ANALYTICS_EVENT_NAMES = [
  "tutorial_step_completed",
  "first_sale",
  "harbor_unlocked",
  "offline_claimed",
  "save_recovery",
  "frame_time_summary",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export const ANALYTICS_FORBIDDEN_KEYS = new Set<string>([
  ...TELEMETRY_FORBIDDEN_KEYS,
  "snapshot", "save", "saveJson", "saveText", "payload", "bagContents",
  "uid", "userId", "displayName", "phone", "deviceId", "ip", "ipAddress",
]);

export const ANALYTICS_ALLOWED_PROPS: Record<AnalyticsEventName, ReadonlySet<string>> = {
  tutorial_step_completed: new Set(["stepIndex"]),
  first_sale: new Set(["coins"]),
  harbor_unlocked: new Set(["harborId", "mode"]),
  offline_claimed: new Set(["elapsedMillis", "ticksCredited", "coinsDelta", "capped"]),
  save_recovery: new Set(["source"]),
  frame_time_summary: new Set(["emaMs", "quality", "samples", "platform"]),
};

export type AnalyticsPropValue = boolean | number | string;

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  props: Record<string, AnalyticsPropValue>;
  schema: typeof ANALYTICS_SCHEMA;
}

export function sanitizeAnalytics(
  name: string,
  props: Record<string, unknown>,
): AnalyticsEvent | null {
  if (!(ANALYTICS_EVENT_NAMES as readonly string[]).includes(name)) return null;
  const eventName = name as AnalyticsEventName;
  const allowed = ANALYTICS_ALLOWED_PROPS[eventName];
  const clean: Record<string, AnalyticsPropValue> = {};
  for (const [k, v] of Object.entries(props)) {
    if (ANALYTICS_FORBIDDEN_KEYS.has(k)) continue;
    if (!allowed.has(k)) continue;
    if (typeof v === "boolean" || typeof v === "number" || typeof v === "string") {
      clean[k] = v;
    }
  }
  return { name: eventName, props: clean, schema: ANALYTICS_SCHEMA };
}

export const Analytics = {
  SCHEMA: ANALYTICS_SCHEMA,

  tutorialStepCompleted(stepIndex: number): AnalyticsEvent {
    return sanitizeAnalytics("tutorial_step_completed", { stepIndex })!;
  },

  firstSale(coins: number): AnalyticsEvent {
    return sanitizeAnalytics("first_sale", { coins })!;
  },

  harborUnlocked(harborId: string): AnalyticsEvent {
    return sanitizeAnalytics("harbor_unlocked", { harborId, mode: "travel" })!;
  },

  harborUnlockedFull(): AnalyticsEvent {
    return sanitizeAnalytics("harbor_unlocked", { mode: "full" })!;
  },

  offlineClaimed(input: {
    elapsedMillis: number;
    ticksCredited: number;
    coinsDelta: number;
    capped: boolean;
  }): AnalyticsEvent {
    return sanitizeAnalytics("offline_claimed", input)!;
  },

  saveRecovery(source: string): AnalyticsEvent {
    return sanitizeAnalytics("save_recovery", { source })!;
  },

  frameTimeSummary(emaMs: number, quality: string, samples: number, platform: string): AnalyticsEvent {
    return sanitizeAnalytics("frame_time_summary", {
      emaMs: Math.round(emaMs * 10) / 10,
      quality,
      samples,
      platform,
    })!;
  },
};

/** In-memory sink for unit tests / local inspection. */
export class MemoryAnalyticsSink {
  readonly events: AnalyticsEvent[] = [];

  track(event: AnalyticsEvent | null): void {
    if (event) this.events.push(event);
  }

  clear(): void {
    this.events.length = 0;
  }

  names(): string[] {
    return this.events.map((e) => e.name);
  }
}
