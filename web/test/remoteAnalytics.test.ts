import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Analytics } from "../src/engine/analytics";
import {
  enqueueRemoteEvent,
  REMOTE_BATCH_SCHEMA,
  REMOTE_MAX_EVENTS,
  REMOTE_REQUEUE_ON_FLUSH_FAILURE,
  requeueRemoteFlushSlice,
  takeRemoteFlushSlice,
  takeRemoteFlushSliceDetailed,
} from "../src/engine/remoteAnalytics";
import {
  REMOTE_ANALYTICS_MARKER,
  REMOTE_ANALYTICS_PHASE,
  REMOTE_BATCH_MAX_EVENTS_FLOOR,
} from "../src/ship/remoteAnalytics";
import { FanoutAnalyticsSink, RemoteAnalyticsSink } from "../src/analytics/remoteAnalyticsSink";
import { handleBatch, resetAnalyticsStore, storedEventCount } from "../../analytics-api/src/handlers";

const root = resolve(__dirname, "../..");

describe("remote analytics (Finish 3.0 Phase 26)", () => {
  it("locks catalog floors and batch policy", () => {
    expect(REMOTE_ANALYTICS_PHASE).toBe(26);
    expect(REMOTE_ANALYTICS_MARKER).toBe("authored-finish-3.0-phase-26");
    expect(REMOTE_MAX_EVENTS).toBeGreaterThanOrEqual(REMOTE_BATCH_MAX_EVENTS_FLOOR);
    expect(
      (JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
        remoteAnalyticsPhase?: number;
      }).remoteAnalyticsPhase,
    ).toBe(26);
  });

  it("queues, flushes, and accepts batches on the stub API", async () => {
    resetAnalyticsStore();
    const posted: unknown[] = [];
    const remote = new RemoteAnalyticsSink({
      baseUrl: "http://localhost:8788",
      platform: "web",
      autoFlush: false,
      nowMs: () => 1000,
      poster: async (_url, body) => {
        posted.push(body);
        const result = handleBatch(body as any);
        return { ok: !("error" in result), status: "error" in result ? result.status : 200 };
      },
    });
    remote.setConsent(true);
    remote.track(Analytics.sessionStart("web"));
    remote.track(Analytics.firstSale(25));
    expect(remote.stats().queued).toBe(2);
    const ok = await remote.flush();
    expect(ok).toBe(true);
    expect(posted).toHaveLength(1);
    expect((posted[0] as { schema: string }).schema).toBe(REMOTE_BATCH_SCHEMA);
    expect(storedEventCount()).toBe(2);
    remote.dispose();
  });

  it("fan-out delivers to every sink", () => {
    const a: string[] = [];
    const b: string[] = [];
    const fan = new FanoutAnalyticsSink([
      { track: (e) => { if (e) a.push(e.name); } },
      { track: (e) => { if (e) b.push(e.name); } },
    ]);
    fan.track(Analytics.harborUnlockedFull());
    expect(a).toEqual(["harbor_unlocked"]);
    expect(b).toEqual(["harbor_unlocked"]);
  });

  it("policy helpers build a flush envelope", () => {
    const queue: Parameters<typeof enqueueRemoteEvent>[0] = [];
    enqueueRemoteEvent(queue, Analytics.crashFreeSession(true, "web"), 5);
    const slice = takeRemoteFlushSlice(queue, 9, "web");
    expect(slice?.events[0]?.name).toBe("crash_free_session");
    expect(slice?.platform).toBe("web");
  });

  it("requeues failed flush slices (Finish 4.0 Phase 21)", async () => {
    expect(REMOTE_REQUEUE_ON_FLUSH_FAILURE).toBe(true);
    const queue: Parameters<typeof enqueueRemoteEvent>[0] = [];
    enqueueRemoteEvent(queue, Analytics.sessionStart("web"), 1);
    enqueueRemoteEvent(queue, Analytics.firstSale(12), 2);
    const detailed = takeRemoteFlushSliceDetailed(queue, 3, "web");
    expect(detailed?.taken).toHaveLength(2);
    expect(queue).toHaveLength(0);
    requeueRemoteFlushSlice(queue, detailed!.taken);
    expect(queue).toHaveLength(2);

    const remote = new RemoteAnalyticsSink({
      baseUrl: "http://localhost:8788",
      platform: "web",
      autoFlush: false,
      nowMs: () => 1000,
      poster: async () => ({ ok: false, status: 503 }),
    });
    remote.setConsent(true);
    remote.track(Analytics.sessionStart("web"));
    remote.track(Analytics.firstSale(9));
    expect(await remote.flush()).toBe(false);
    expect(remote.stats().queued).toBe(2);
    expect(remote.stats().lastFlushOk).toBe(false);
    remote.dispose();
  });

  it("remoteanalytics:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-remote-analytics.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK remoteanalytics:validate");
  });
});
