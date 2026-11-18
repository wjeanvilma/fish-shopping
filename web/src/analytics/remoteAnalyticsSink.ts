/**
 * Finish 3.0 Phase 26 — consent-gated remote analytics sink (web).
 * Queues sanitized events and POSTs batches when a base URL is configured.
 */
import type { AnalyticsEvent } from "../engine/analytics";
import {
  enqueueRemoteEvent,
  normalizeAnalyticsBaseUrl,
  remoteBatchUrl,
  REMOTE_FLUSH_INTERVAL_MS,
  REMOTE_ANALYTICS_POLICY,
  takeRemoteFlushSlice,
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
    try {
      const envelope = takeRemoteFlushSlice(this.queue, this.nowMs(), this.platform);
      if (!envelope) return true;
      const result = await this.poster(remoteBatchUrl(this.baseUrl), envelope);
      this.lastFlushOk = result.ok;
      if (result.ok) {
        this.batchesSent += 1;
        return true;
      }
      // Fail closed: drop the attempted slice (already removed); do not crash.
      return false;
    } catch {
      this.lastFlushOk = false;
      return false;
    } finally {
      this.flushing = false;
    }
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
  }

  stats(): { queued: number; batchesSent: number; eventsAccepted: number; lastFlushOk: boolean } {
    return {
      queued: this.queue.length,
      batchesSent: this.batchesSent,
      eventsAccepted: this.eventsAccepted,
      lastFlushOk: this.lastFlushOk,
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
