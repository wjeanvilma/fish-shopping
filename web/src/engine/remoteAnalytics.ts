/**
 * Finish 3.0 Phase 26 — remote analytics batch policy
 * (mirrors shared/ops/remote-analytics-sink.json + RemoteAnalyticsPolicy.kt).
 */
import policyJson from "../../../shared/ops/remote-analytics-sink.json";
import {
  ANALYTICS_SCHEMA,
  sanitizeAnalytics,
  type AnalyticsEvent,
} from "./analytics";

export interface RemoteAnalyticsPolicyCatalog {
  phase: number;
  schema: string;
  analyticsSchema: string;
  batchSchema: string;
  consentRequired: boolean;
  endpoint: { method: string; path: string; healthPath: string };
  client: {
    webEnvKey: string;
    androidMetaKey: string;
    localEmulatorDefaultBase: string;
  };
  batch: {
    maxEvents: number;
    maxQueue: number;
    flushIntervalMs: number;
    flushOnSessionEnd: boolean;
    dropOldestOnOverflow: boolean;
    resyncSanitizeOnFlush: boolean;
  };
  envelope: {
    requiredFields: string[];
    eventFields: string[];
    platforms: string[];
  };
  eventNameMin: number;
}

export const REMOTE_ANALYTICS_POLICY = policyJson as unknown as RemoteAnalyticsPolicyCatalog;

export const REMOTE_BATCH_SCHEMA = REMOTE_ANALYTICS_POLICY.batchSchema;
export const REMOTE_ENDPOINT_PATH = REMOTE_ANALYTICS_POLICY.endpoint.path;
export const REMOTE_HEALTH_PATH = REMOTE_ANALYTICS_POLICY.endpoint.healthPath;
export const REMOTE_MAX_EVENTS = REMOTE_ANALYTICS_POLICY.batch.maxEvents;
export const REMOTE_MAX_QUEUE = REMOTE_ANALYTICS_POLICY.batch.maxQueue;
export const REMOTE_FLUSH_INTERVAL_MS = REMOTE_ANALYTICS_POLICY.batch.flushIntervalMs;
export const REMOTE_WEB_ENV_KEY = REMOTE_ANALYTICS_POLICY.client.webEnvKey;
export const REMOTE_LOCAL_DEFAULT_BASE = REMOTE_ANALYTICS_POLICY.client.localEmulatorDefaultBase;

export interface QueuedRemoteEvent {
  event: AnalyticsEvent;
  clientTsMs: number;
}

export interface RemoteBatchEnvelope {
  schema: string;
  platform: string;
  sentAtMs: number;
  events: Array<{
    name: string;
    props: Record<string, unknown>;
    schema: string;
    clientTsMs: number;
  }>;
}

export function normalizeAnalyticsBaseUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim().replace(/\/$/, "") ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function remoteBatchUrl(baseUrl: string): string {
  return `${normalizeAnalyticsBaseUrl(baseUrl)}${REMOTE_ENDPOINT_PATH}`;
}

export function remoteHealthUrl(baseUrl: string): string {
  return `${normalizeAnalyticsBaseUrl(baseUrl)}${REMOTE_HEALTH_PATH}`;
}

export function enqueueRemoteEvent(
  queue: QueuedRemoteEvent[],
  event: AnalyticsEvent,
  clientTsMs: number,
  maxQueue: number = REMOTE_MAX_QUEUE,
  dropOldest: boolean = REMOTE_ANALYTICS_POLICY.batch.dropOldestOnOverflow,
): void {
  const clean = sanitizeAnalytics(event.name, event.props);
  if (!clean) return;
  queue.push({ event: clean, clientTsMs });
  while (queue.length > maxQueue) {
    if (dropOldest) queue.shift();
    else queue.pop();
  }
}

export function takeRemoteFlushSlice(
  queue: QueuedRemoteEvent[],
  nowMs: number,
  platform: string,
  maxEvents: number = REMOTE_MAX_EVENTS,
): RemoteBatchEnvelope | null {
  if (queue.length === 0) return null;
  const events: RemoteBatchEnvelope["events"] = [];
  let taken = 0;
  while (queue.length > 0 && taken < maxEvents) {
    const head = queue.shift()!;
    const clean = REMOTE_ANALYTICS_POLICY.batch.resyncSanitizeOnFlush
      ? sanitizeAnalytics(head.event.name, head.event.props)
      : head.event;
    if (!clean) continue;
    events.push({
      name: clean.name,
      props: clean.props,
      schema: clean.schema ?? ANALYTICS_SCHEMA,
      clientTsMs: head.clientTsMs,
    });
    taken += 1;
  }
  if (events.length === 0) return null;
  return {
    schema: REMOTE_BATCH_SCHEMA,
    platform,
    sentAtMs: nowMs,
    events,
  };
}
