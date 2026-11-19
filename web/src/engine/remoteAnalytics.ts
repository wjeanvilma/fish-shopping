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
    requeueOnFlushFailure?: boolean;
    maxFlushRetries?: number;
    retryBackoffMs?: number;
    retryJitterMs?: number;
    deadLetterAfterMaxRetries?: boolean;
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
export const REMOTE_REQUEUE_ON_FLUSH_FAILURE =
  REMOTE_ANALYTICS_POLICY.batch.requeueOnFlushFailure !== false;
export const REMOTE_MAX_FLUSH_RETRIES = REMOTE_ANALYTICS_POLICY.batch.maxFlushRetries ?? 3;
export const REMOTE_RETRY_BACKOFF_MS = REMOTE_ANALYTICS_POLICY.batch.retryBackoffMs ?? 2000;
export const REMOTE_RETRY_JITTER_MS = REMOTE_ANALYTICS_POLICY.batch.retryJitterMs ?? 0;
export const REMOTE_DEAD_LETTER_AFTER_MAX_RETRIES =
  REMOTE_ANALYTICS_POLICY.batch.deadLetterAfterMaxRetries === true;
export const REMOTE_WEB_ENV_KEY = REMOTE_ANALYTICS_POLICY.client.webEnvKey;
export const REMOTE_LOCAL_DEFAULT_BASE = REMOTE_ANALYTICS_POLICY.client.localEmulatorDefaultBase;

/** Finish 5.0 Phase 22 — backoff with optional jitter. */
export function remoteRetryDelayMs(flushFailures: number, jitterMs = 0): number {
  const base = REMOTE_RETRY_BACKOFF_MS * Math.max(1, flushFailures);
  const jitter = Math.max(0, Math.min(REMOTE_RETRY_JITTER_MS, jitterMs));
  return base + jitter;
}

export function shouldDeadLetterRemoteFlush(flushFailures: number): boolean {
  return REMOTE_DEAD_LETTER_AFTER_MAX_RETRIES && flushFailures >= REMOTE_MAX_FLUSH_RETRIES;
}

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

export interface RemoteFlushSlice {
  envelope: RemoteBatchEnvelope;
  taken: QueuedRemoteEvent[];
}

/** Finish 4.0 Phase 21 — take with retained queue items for failed-flush requeue. */
export function takeRemoteFlushSliceDetailed(
  queue: QueuedRemoteEvent[],
  nowMs: number,
  platform: string,
  maxEvents: number = REMOTE_MAX_EVENTS,
): RemoteFlushSlice | null {
  if (queue.length === 0) return null;
  const events: RemoteBatchEnvelope["events"] = [];
  const takenEvents: QueuedRemoteEvent[] = [];
  let taken = 0;
  while (queue.length > 0 && taken < maxEvents) {
    const head = queue.shift()!;
    const clean = REMOTE_ANALYTICS_POLICY.batch.resyncSanitizeOnFlush
      ? sanitizeAnalytics(head.event.name, head.event.props)
      : head.event;
    if (!clean) continue;
    takenEvents.push(head);
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
    envelope: {
      schema: REMOTE_BATCH_SCHEMA,
      platform,
      sentAtMs: nowMs,
      events,
    },
    taken: takenEvents,
  };
}

export function takeRemoteFlushSlice(
  queue: QueuedRemoteEvent[],
  nowMs: number,
  platform: string,
  maxEvents: number = REMOTE_MAX_EVENTS,
): RemoteBatchEnvelope | null {
  return takeRemoteFlushSliceDetailed(queue, nowMs, platform, maxEvents)?.envelope ?? null;
}

/** Finish 4.0 Phase 21 — prepend failed flush items back onto the queue. */
export function requeueRemoteFlushSlice(
  queue: QueuedRemoteEvent[],
  taken: QueuedRemoteEvent[],
  maxQueue: number = REMOTE_MAX_QUEUE,
  dropOldest: boolean = REMOTE_ANALYTICS_POLICY.batch.dropOldestOnOverflow,
): void {
  if (taken.length === 0) return;
  queue.unshift(...taken);
  while (queue.length > maxQueue) {
    if (dropOldest) queue.shift();
    else queue.pop();
  }
}
