import { beforeEach, describe, expect, it } from "vitest";
import {
  ANALYTICS_FORBIDDEN_KEYS,
  ANALYTICS_SCHEMA,
  Analytics,
  MemoryAnalyticsSink,
  sanitizeAnalytics,
} from "../src/engine/analytics";
import { AnalyticsBus } from "../src/analytics/analyticsBus";
import { GameState, loadContent } from "../src/engine";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const content = loadContent(
  JSON.parse(readFileSync(resolve(__dirname, "../../shared/content/content-pack.json"), "utf8")),
);

describe("analytics (Phase 25)", () => {
  it("documents blueprint events and strips forbidden keys", () => {
    expect(ANALYTICS_SCHEMA).toBe("fish.analytics.v1");
    expect(ANALYTICS_FORBIDDEN_KEYS.has("cloudAccountId")).toBe(true);
    expect(ANALYTICS_FORBIDDEN_KEYS.has("snapshot")).toBe(true);
    expect(sanitizeAnalytics("unknown_event", { coins: 1 })).toBeNull();
    const cleaned = sanitizeAnalytics("first_sale", {
      coins: 12,
      email: "a@b.c",
      bag: "nope",
    })!;
    expect(cleaned.props).toEqual({ coins: 12 });
    expect(Analytics.tutorialStepCompleted(2).props).toEqual({ stepIndex: 2 });
    expect(Analytics.harborUnlockedFull().props).toEqual({ mode: "full" });
  });

  it("consent gate drops events until opt-in", () => {
    const sink = new MemoryAnalyticsSink();
    const bus = new AnalyticsBus(sink);
    const state = GameState.newGame(content, "harbor.sunrise_pier", 1);
    bus.onGameEvents([{ type: "tutorial_advanced", tick: 1, stepIndex: 0 }], state);
    expect(sink.events).toHaveLength(0);
    bus.setConsent(true);
    bus.onGameEvents([{ type: "tutorial_advanced", tick: 2, stepIndex: 1 }], state);
    expect(sink.names()).toEqual(["tutorial_step_completed"]);
  });

  it("tracks blueprint events without PII", () => {
    const sink = new MemoryAnalyticsSink();
    const bus = new AnalyticsBus(sink);
    bus.setConsent(true);
    const state = GameState.newGame(content, "harbor.sunrise_pier", 2);
    state.bumpStat("stat.sales", 1);
    bus.onGameEvents(
      [
        {
          type: "sale_committed",
          tick: 1,
          saleId: "s1",
          customerId: "c1",
          items: [],
          coins: 25,
        },
        {
          type: "harbor_traveled",
          tick: 2,
          fromHarborId: "harbor.sunrise_pier",
          toHarborId: "harbor.moon_cove",
          receipt: { id: "t1", type: "travel", coinDelta: 0, tick: 2, reference: "harbor.sunrise_pier" },
          replayed: false,
        },
        {
          type: "full_harbor_unlock_granted",
          tick: 3,
          receipt: {
            id: "u1",
            type: "full_harbor_unlock",
            coinDelta: 0,
            tick: 3,
            reference: "entitlement.full_harbor_unlock",
          },
          replayed: false,
        },
      ],
      state,
    );
    bus.onOfflineClaimed({
      elapsedMillis: 60_000,
      ticksCredited: 1_200,
      capped: false,
      coinsDelta: 40,
      fishCaught: 2,
      sales: 1,
      itemsSold: 1,
      workerFishCaught: 0,
      workerItemsMoved: 0,
      hadActivity: true,
    });
    bus.onSaveRecovery("local_previous");
    for (let i = 0; i < 600; i++) bus.onFrameSample(16.7, "medium");
    expect(sink.names()).toEqual([
      "first_sale",
      "harbor_unlocked",
      "harbor_unlocked",
      "offline_claimed",
      "save_recovery",
      "frame_time_summary",
    ]);
    expect(sink.events.every((e) => !("bag" in e.props) && !("cloudAccountId" in e.props))).toBe(true);
  });
});

describe("settings analytics consent defaults", () => {
  beforeEach(() => {
    const memory = new Map<string, string>();
    (globalThis as { localStorage?: Storage }).localStorage = {
      getItem: (k) => memory.get(k) ?? null,
      setItem: (k, v) => { memory.set(k, v); },
      removeItem: (k) => { memory.delete(k); },
      clear: () => memory.clear(),
      key: () => null,
      get length() { return memory.size; },
    };
  });

  it("defaults consent off and undecided", async () => {
    const { loadSettings, saveSettings } = await import("../src/game/settingsStore");
    const s = loadSettings();
    expect(s.analyticsConsent).toBe(false);
    expect(s.analyticsConsentDecided).toBe(false);
    saveSettings({ ...s, analyticsConsent: true, analyticsConsentDecided: true });
    const again = loadSettings();
    expect(again.analyticsConsent).toBe(true);
    expect(again.analyticsConsentDecided).toBe(true);
  });
});
