/**
 * Finish 3.0 Phase 26 — consent-gated remote analytics sink (web).
 * Queues sanitized events and POSTs batches when a base URL is configured.
 */
import type { AnalyticsEvent } from "../engine/analytics";
import {
  enqueueRemoteEvent,
  normalizeAnalyticsBaseUrl,
  remoteBatchUrl,
  requeueRemoteFlushSlice,
  REMOTE_FLUSH_INTERVAL_MS,
  REMOTE_MAX_FLUSH_RETRIES,
  REMOTE_REQUEUE_ON_FLUSH_FAILURE,
  REMOTE_RETRY_BACKOFF_MS,
  REMOTE_ANALYTICS_POLICY,
  takeRemoteFlushSliceDetailed,
  type QueuedRemoteEvent,
  type RemoteBatchEnvelope,
} from "../engine/remoteAnalytics";
import type { AnalyticsTrackSink } from "./analyticsBus";

export type RemoteBatchPoster = (
  url: string,
  body: RemoteBatchEnvelope,
) => Promise<{ ok: boolean; status: number }>;

async function defaultPoster(
  url: string,
  body: RemoteBatchEnvelope,
): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  });
  return { ok: res.ok, status: res.status };
}

export class RemoteAnalyticsSink implements AnalyticsTrackSink {
  private readonly queue: QueuedRemoteEvent[] = [];
  private readonly platform: string;
  private readonly baseUrl: string | null;
  private readonly poster: RemoteBatchPoster;
  private readonly nowMs: () => number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;
  private consent = false;
  private lastFlushOk = true;
  private batchesSent = 0;
  private eventsAccepted = 0;
  private flushFailures = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: {
    baseUrl?: string | null;
    platform?: string;
    poster?: RemoteBatchPoster;
    nowMs?: () => number;
    autoFlush?: boolean;
  } = {}) {
    this.baseUrl = normalizeAnalyticsBaseUrl(opts.baseUrl ?? null);
    this.platform = opts.platform ?? "web";
    this.poster = opts.poster ?? defaultPoster;
    this.nowMs = opts.nowMs ?? (() => Date.now());
    if (opts.autoFlush !== false && this.baseUrl) {
      this.timer = setInterval(() => {
        void this.flush();
      }, REMOTE_FLUSH_INTERVAL_MS);
    }
  }

  enabled(): boolean {
    return this.baseUrl != null;
  }

  setConsent(consent: boolean): void {
    this.consent = consent;
    if (!consent) this.queue.length = 0;
  }

  track(event: AnalyticsEvent | null): void {
    if (!this.consent || !this.baseUrl || !event) return;
    enqueueRemoteEvent(this.queue, event, this.nowMs());
    this.eventsAccepted += 1;
    if (this.queue.length >= REMOTE_ANALYTICS_POLICY.batch.maxEvents) {
      void this.flush();
    }
  }

  async flush(): Promise<boolean> {
    if (!this.baseUrl || this.flushing || this.queue.length === 0) return true;
    this.flushing = true;
    let taken: QueuedRemoteEvent[] = [];
    try {
      const slice = takeRemoteFlushSliceDetailed(this.queue, this.nowMs(), this.platform);
      if (!slice) return true;
      taken = slice.taken;
      const result = await this.poster(remoteBatchUrl(this.baseUrl), slice.envelope);
      this.lastFlushOk = result.ok;
      if (result.ok) {
        this.batchesSent += 1;
        this.flushFailures = 0;
        return true;
      }
      // Finish 4.0 Phase 21 — requeue failed slice and schedule retry.
      if (REMOTE_REQUEUE_ON_FLUSH_FAILURE) {
        requeueRemoteFlushSlice(this.queue, taken);
        this.scheduleRetry();
      }
      return false;
    } catch {
      this.lastFlushOk = false;
      if (REMOTE_REQUEUE_ON_FLUSH_FAILURE && taken.length > 0) {
        requeueRemoteFlushSlice(this.queue, taken);
        this.scheduleRetry();
      }
      return false;
    } finally {
      this.flushing = false;
    }
  }

  private scheduleRetry(): void {
    if (this.flushFailures >= REMOTE_MAX_FLUSH_RETRIES) return;
    if (this.retryTimer) return;
    this.flushFailures += 1;
    const delay = REMOTE_RETRY_BACKOFF_MS * this.flushFailures;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.flush();
    }, delay);
  }

  async onSessionEnd(): Promise<void> {
    if (REMOTE_ANALYTICS_POLICY.batch.flushOnSessionEnd) {
      await this.flush();
    }
    this.dispose();
  }

  dispose(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  stats(): {
    queued: number;
    batchesSent: number;
    eventsAccepted: number;
    lastFlushOk: boolean;
    flushFailures: number;
  } {
    return {
      queued: this.queue.length,
      batchesSent: this.batchesSent,
      eventsAccepted: this.eventsAccepted,
      lastFlushOk: this.lastFlushOk,
      flushFailures: this.flushFailures,
    };
  }
}

export class FanoutAnalyticsSink implements AnalyticsTrackSink {
  constructor(private readonly sinks: AnalyticsTrackSink[]) {}

  track(event: AnalyticsEvent | null): void {
    for (const sink of this.sinks) sink.track(event);
  }
}

/** Resolve VITE_ANALYTICS_API_BASE at runtime (empty → disabled). */
export function resolveAnalyticsApiBase(
  env: Record<string, string | undefined> = import.meta.env as Record<string, string | undefined>,
): string | null {
  return normalizeAnalyticsBaseUrl(env.VITE_ANALYTICS_API_BASE);
}
