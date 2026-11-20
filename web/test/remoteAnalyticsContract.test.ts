/**
 * Finish 4.0 Phase 27 — remote analytics sink contract tests.
 * Consent fail-closed, batch schema envelope, retry backoff policy.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Analytics } from "../src/engine/analytics";
import {
  REMOTE_BATCH_SCHEMA,
  REMOTE_MAX_FLUSH_RETRIES,
  REMOTE_REQUEUE_ON_FLUSH_FAILURE,
  REMOTE_RETRY_BACKOFF_MS,
  enqueueRemoteEvent,
  takeRemoteFlushSlice,
} from "../src/engine/remoteAnalytics";
import { RemoteAnalyticsSink } from "../src/analytics/remoteAnalyticsSink";

const root = resolve(__dirname, "../..");

describe("remote analytics sink contracts (Finish 4.0 Phase 27)", () => {
  it("consent fail-closed without consent or base URL", async () => {
    const posted: unknown[] = [];
    const noBase = new RemoteAnalyticsSink({
      baseUrl: "",
      platform: "web",
      autoFlush: false,
      poster: async (_url, body) => {
        posted.push(body);
        return { ok: true, status: 200 };
      },
    });
    noBase.setConsent(true);
    noBase.track(Analytics.sessionStart("web"));
    expect(noBase.enabled()).toBe(false);
    expect(noBase.stats().queued).toBe(0);
    expect(await noBase.flush()).toBe(true); // empty queue short-circuits; never posts
    expect(posted).toHaveLength(0);
    noBase.dispose();

    const noConsent = new RemoteAnalyticsSink({
      baseUrl: "http://localhost:8788",
      platform: "web",
      autoFlush: false,
      poster: async (_url, body) => {
        posted.push(body);
        return { ok: true, status: 200 };
      },
    });
    noConsent.setConsent(false);
    noConsent.track(Analytics.sessionStart("web"));
    expect(noConsent.stats().queued).toBe(0);
    expect(await noConsent.flush()).toBe(true);
    expect(posted).toHaveLength(0);
    noConsent.dispose();
  });

  it("batch schema envelope matches policy", () => {
    const policy = JSON.parse(
      readFileSync(resolve(root, "shared/ops/remote-analytics-sink.json"), "utf8"),
    ) as {
      batchSchema: string;
      envelope: { requiredFields: string[]; platforms: string[] };
      batch: { maxFlushRetries: number; retryBackoffMs: number };
    };
    expect(REMOTE_BATCH_SCHEMA).toBe(policy.batchSchema);
    expect(REMOTE_BATCH_SCHEMA).toBe("fish.analytics.batch.v1");
    const queue: Parameters<typeof enqueueRemoteEvent>[0] = [];
    enqueueRemoteEvent(queue, Analytics.sessionStart("android"), 1);
    const slice = takeRemoteFlushSlice(queue, 2, "android");
    expect(slice).not.toBeNull();
    for (const field of policy.envelope.requiredFields) {
      expect(slice).toHaveProperty(field);
    }
    expect(policy.envelope.platforms).toEqual(expect.arrayContaining(["web", "android"]));
    expect(slice!.schema).toBe(REMOTE_BATCH_SCHEMA);
    expect(slice!.platform).toBe("android");
    expect(Array.isArray(slice!.events)).toBe(true);
  });

  it("retry backoff policy is locked for failed flush recovery", () => {
    expect(REMOTE_REQUEUE_ON_FLUSH_FAILURE).toBe(true);
    expect(REMOTE_MAX_FLUSH_RETRIES).toBeGreaterThanOrEqual(3);
    expect(REMOTE_RETRY_BACKOFF_MS).toBeGreaterThanOrEqual(2000);
    const policy = JSON.parse(
      readFileSync(resolve(root, "shared/ops/remote-analytics-sink.json"), "utf8"),
    ) as { batch: { maxFlushRetries: number; retryBackoffMs: number; requeueOnFlushFailure: boolean } };
    expect(policy.batch.requeueOnFlushFailure).toBe(true);
    expect(policy.batch.maxFlushRetries).toBe(REMOTE_MAX_FLUSH_RETRIES);
    expect(policy.batch.retryBackoffMs).toBe(REMOTE_RETRY_BACKOFF_MS);
  });

  it("flush slice empty queue short-circuits without posting", () => {
    const queue: Parameters<typeof enqueueRemoteEvent>[0] = [];
    const slice = takeRemoteFlushSlice(queue, 4, "web");
    expect(slice).toBeNull();
  });

  it("nest loadtest probe event sanitizes without PII", () => {
    const event = Analytics.loadtestBankProbed("dual", true, "web");
    expect(event.name).toBe("loadtest_bank_probed");
    expect(event.props.bank).toBe("dual");
    expect(event.props.floorsMet).toBe(true);
    expect(event.props.platform).toBe("web");
    expect(event.props).not.toHaveProperty("uid");
    expect(event.props).not.toHaveProperty("save");
    const queue: Parameters<typeof enqueueRemoteEvent>[0] = [];
    enqueueRemoteEvent(queue, event, 10);
    const slice = takeRemoteFlushSlice(queue, 11, "web");
    expect(slice?.events).toHaveLength(1);
    expect(slice?.events[0]?.name).toBe("loadtest_bank_probed");
  });
});
