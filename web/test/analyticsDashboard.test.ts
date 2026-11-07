import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  ANALYTICS_DASHBOARD_PHASE,
  ANALYTICS_DASHBOARD_SCHEMA,
  appendCrashFreeSample,
  buildAnalyticsDashboardSnapshot,
  computeCrashFreeRatePermille,
} from "../src/engine/analyticsDashboard";
import { Analytics, MemoryAnalyticsSink } from "../src/engine/analytics";
import { AnalyticsBus } from "../src/analytics/analyticsBus";
import { AnalyticsDashboardLedger } from "../src/analytics/analyticsDashboardLedger";

const root = resolve(__dirname, "../..");

const memory = new Map<string, string>();

beforeEach(() => {
  memory.clear();
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => { memory.set(k, v); },
    removeItem: (k) => { memory.delete(k); },
    clear: () => memory.clear(),
    key: () => null,
    get length() { return memory.size; },
  };
});

describe("Analytics dashboard (post-1.0 Phase 26)", () => {
  it("locks dashboard contracts and crash-free alert", () => {
    expect(ANALYTICS_DASHBOARD_PHASE).toBe(26);
    expect(ANALYTICS_DASHBOARD_SCHEMA).toBe("fish.ops.analytics_dashboard.v1");
    const empty = computeCrashFreeRatePermille([]);
    expect(empty.ratePermille).toBe(1000);
    let samples = appendCrashFreeSample([], true);
    samples = appendCrashFreeSample(samples, true);
    samples = appendCrashFreeSample(samples, false);
    samples = appendCrashFreeSample(samples, true);
    samples = appendCrashFreeSample(samples, true);
    const snap = buildAnalyticsDashboardSnapshot({
      consent: true,
      counters: { session_start: 5, crash_free_session: 5 },
      crashFreeSamples: samples,
    });
    expect(snap.metrics.find((m) => m.id === "crash_free_rate_permille")?.value).toBe(800);
    expect(snap.alerts[0]?.active).toBe(true);
    expect(snap.activeAlertCount).toBe(1);
  });

  it("session lifecycle emits start + crash-free and fills ledger", () => {
    const sink = new MemoryAnalyticsSink();
    const ledger = new AnalyticsDashboardLedger("web");
    const bus = new AnalyticsBus(sink, ledger);
    bus.setConsent(true);
    bus.onSessionStart();
    expect(sink.names()).toContain("session_start");
    bus.onSessionEndClean();
    expect(sink.names()).toContain("crash_free_session");
    const snap = JSON.parse(bus.exportDashboardJson());
    expect(snap.consent).toBe(true);
    expect(snap.counters.session_start).toBeGreaterThanOrEqual(1);
    expect(snap.counters.crash_free_session).toBeGreaterThanOrEqual(1);
    expect(Analytics.sessionStart("web").props).toEqual({ platform: "web" });
    expect(Analytics.crashFreeSession(true, "web").props).toEqual({ clean: true, platform: "web" });
  });

  it("marks unclean prior session on next start", () => {
    const sink = new MemoryAnalyticsSink();
    const ledger = new AnalyticsDashboardLedger("web");
    const bus = new AnalyticsBus(sink, ledger);
    bus.setConsent(true);
    bus.onSessionStart();
    // Unclean exit: leave dirty flag set without onSessionEndClean.
    const sink2 = new MemoryAnalyticsSink();
    const ledger2 = new AnalyticsDashboardLedger("web");
    const bus2 = new AnalyticsBus(sink2, ledger2);
    bus2.setConsent(true);
    bus2.onSessionStart();
    expect(sink2.events.some((e) => e.name === "crash_free_session" && e.props.clean === false)).toBe(true);
  });

  it("analytics:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-analytics-dashboard.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK analytics:validate");
  });
});
