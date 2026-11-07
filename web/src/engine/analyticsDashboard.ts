/**
 * Phase 26 (post-1.0) — consent-gated analytics dashboard + crash-free alert catalog
 * (mirrors shared/ops/analytics-dashboard.json).
 */
import dashboardJson from "../../../shared/ops/analytics-dashboard.json";
import type { AnalyticsEvent, AnalyticsEventName } from "./analytics";
import { ANALYTICS_EVENT_NAMES, ANALYTICS_SCHEMA } from "./analytics";

export interface AnalyticsDashboardMetricDef {
  id: string;
  event: AnalyticsEventName | string;
  aggregation: "count" | "clean_rate_permille" | string;
}

export interface AnalyticsDashboardPanelDef {
  id: string;
  title: string;
  metrics: AnalyticsDashboardMetricDef[];
}

export interface AnalyticsDashboardAlertDef {
  id: string;
  metricId: string;
  comparator: "lt" | "gt" | string;
  thresholdPermille: number;
  minSamples: number;
  severity: string;
  message: string;
}

export interface AnalyticsDashboardCatalog {
  phase: number;
  schema: string;
  analyticsSchema: string;
  consentRequired: boolean;
  schemaVersion: number;
  session: {
    startEvent: string;
    crashFreeEvent: string;
    webDirtyKey: string;
    androidPrefsName: string;
    androidDirtyKey: string;
    startProps: string[];
    crashFreeProps: string[];
  };
  storage: {
    webKey: string;
    androidPrefsName: string;
    maxCrashFreeSamples: number;
  };
  panels: AnalyticsDashboardPanelDef[];
  alerts: AnalyticsDashboardAlertDef[];
  ui: {
    exportLabel: string;
    alertActiveLabel: string;
    consentOffNote: string;
  };
}

export const ANALYTICS_DASHBOARD = dashboardJson as unknown as AnalyticsDashboardCatalog;
export const ANALYTICS_DASHBOARD_PHASE = ANALYTICS_DASHBOARD.phase;
export const ANALYTICS_DASHBOARD_SCHEMA = ANALYTICS_DASHBOARD.schema;

export interface AnalyticsDashboardMetricValue {
  id: string;
  value: number;
  samples?: number;
}

export interface AnalyticsDashboardAlertState {
  id: string;
  active: boolean;
  severity: string;
  message: string;
  metricValue: number;
  samples: number;
}

export interface AnalyticsDashboardSnapshot {
  schema: typeof ANALYTICS_DASHBOARD_SCHEMA;
  analyticsSchema: typeof ANALYTICS_SCHEMA;
  consent: boolean;
  counters: Record<string, number>;
  metrics: AnalyticsDashboardMetricValue[];
  alerts: AnalyticsDashboardAlertState[];
  activeAlertCount: number;
}

export interface CrashFreeSample {
  clean: boolean;
}

/** Pure dashboard math — shared by web ledger + tests. */
export function computeCrashFreeRatePermille(samples: readonly CrashFreeSample[]): {
  ratePermille: number;
  samples: number;
} {
  if (samples.length === 0) return { ratePermille: 1000, samples: 0 };
  const clean = samples.reduce((n, s) => n + (s.clean ? 1 : 0), 0);
  return {
    ratePermille: Math.round((clean * 1000) / samples.length),
    samples: samples.length,
  };
}

export function buildAnalyticsDashboardSnapshot(input: {
  consent: boolean;
  counters: Record<string, number>;
  crashFreeSamples: readonly CrashFreeSample[];
}): AnalyticsDashboardSnapshot {
  const { ratePermille, samples } = computeCrashFreeRatePermille(input.crashFreeSamples);
  const metrics: AnalyticsDashboardMetricValue[] = [];
  for (const panel of ANALYTICS_DASHBOARD.panels) {
    for (const metric of panel.metrics) {
      if (metric.aggregation === "clean_rate_permille") {
        metrics.push({ id: metric.id, value: ratePermille, samples });
      } else {
        metrics.push({ id: metric.id, value: input.counters[metric.event] ?? 0 });
      }
    }
  }

  const alerts: AnalyticsDashboardAlertState[] = ANALYTICS_DASHBOARD.alerts.map((alert) => {
    const metric = metrics.find((m) => m.id === alert.metricId);
    const metricValue = metric?.value ?? 0;
    const metricSamples = metric?.samples ?? 0;
    let active = false;
    if (metricSamples >= alert.minSamples) {
      if (alert.comparator === "lt") active = metricValue < alert.thresholdPermille;
      else if (alert.comparator === "gt") active = metricValue > alert.thresholdPermille;
    }
    return {
      id: alert.id,
      active,
      severity: alert.severity,
      message: alert.message,
      metricValue,
      samples: metricSamples,
    };
  });

  return {
    schema: ANALYTICS_DASHBOARD_SCHEMA,
    analyticsSchema: ANALYTICS_SCHEMA,
    consent: input.consent,
    counters: { ...input.counters },
    metrics,
    alerts,
    activeAlertCount: alerts.filter((a) => a.active).length,
  };
}

export function recordAnalyticsEventCounters(
  counters: Record<string, number>,
  event: AnalyticsEvent,
): Record<string, number> {
  if (!(ANALYTICS_EVENT_NAMES as readonly string[]).includes(event.name)) return counters;
  const next = { ...counters };
  next[event.name] = (next[event.name] ?? 0) + 1;
  return next;
}

export function appendCrashFreeSample(
  samples: readonly CrashFreeSample[],
  clean: boolean,
  maxSamples = ANALYTICS_DASHBOARD.storage.maxCrashFreeSamples,
): CrashFreeSample[] {
  const next = [...samples, { clean }];
  if (next.length <= maxSamples) return next;
  return next.slice(next.length - maxSamples);
}

export function encodeAnalyticsDashboardSnapshot(snapshot: AnalyticsDashboardSnapshot): string {
  return JSON.stringify(snapshot);
}
