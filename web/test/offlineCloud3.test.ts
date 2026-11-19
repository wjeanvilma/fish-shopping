import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { cloudOfflineQueueDiagnostics, enqueueCloudOfflineSnapshot } from "../src/cloud/cloudOfflineQueue";
import { cloudConflictOffer } from "../src/engine/cloudSync";
import {
  encodeSnapshot,
  GameState,
  loadContent,
  SCHEMA_VERSION,
} from "../src/engine";
import {
  REMOTE_DEAD_LETTER_AFTER_MAX_RETRIES,
  REMOTE_MAX_FLUSH_RETRIES,
  REMOTE_RETRY_JITTER_MS,
} from "../src/engine/remoteAnalytics";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import {
  measureOfflineCloud3,
  OFFLINE_CLOUD_3_MARKER,
  OFFLINE_CLOUD_3_PHASE,
} from "../src/ship/offlineCloud3";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("Offline/cloud/analytics hardening 3 (Finish 5.0 Phase 22)", () => {
  it("locks phase 22 catalog floors", () => {
    expect(OFFLINE_CLOUD_3_PHASE).toBe(22);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(26);
    expect(OFFLINE_CLOUD_3_MARKER).toBe("authored-finish-5.0-phase-22");
    expect((storeListing as { offlineCloud3Phase?: number }).offlineCloud3Phase).toBe(22);
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("offlineCloud3Incomplete");
    expect(REMOTE_MAX_FLUSH_RETRIES).toBeGreaterThanOrEqual(5);
    expect(REMOTE_RETRY_JITTER_MS).toBe(500);
    expect(REMOTE_DEAD_LETTER_AFTER_MAX_RETRIES).toBe(true);
  });

  it("measures offline-cloud-3 wiring", () => {
    const m = measureOfflineCloud3(root);
    expect(m.journalFieldsPresent).toBe(true);
    expect(m.conflictFieldsPresent).toBe(true);
    expect(m.syncDiagnosticsPresent).toBe(true);
    expect(m.analyticsRetryWired).toBe(true);
    expect(m.conflictUxPresent).toBe(true);
    expect(m.kickoffClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("conflict offer exposes severity + syncDiagnostics", () => {
    const olderState = GameState.newGame(content, "harbor.sunrise_pier", 22);
    olderState.coins = 10;
    const newerState = GameState.newGame(content, "harbor.moon_cove", 23);
    newerState.coins = 600;
    const offer = cloudConflictOffer(
      encodeSnapshot(content, olderState, 1_000),
      encodeSnapshot(content, newerState, 9_000),
    )!;
    expect(offer.severity).toBe("high");
    expect(offer.ageSkewMs).toBe(8_000);
    expect(offer.syncDiagnostics.some((l) => l.startsWith("severity "))).toBe(true);
  });

  it("cloud offline queue reports sync diagnostics", () => {
    const store = new Map<string, string>();
    (globalThis as { localStorage?: Storage }).localStorage = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => {
        store.set(k, v);
      },
      removeItem: (k) => {
        store.delete(k);
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage;
    enqueueCloudOfflineSnapshot("snap-a", "uid", 1_000);
    enqueueCloudOfflineSnapshot("snap-b", "uid", 4_000);
    const d = cloudOfflineQueueDiagnostics(5_000);
    expect(d.queuePending).toBe(true);
    expect(d.queueAgeMs).toBe(4_000);
    expect(d.attempts).toBe(2);
  });

  it("wires RELEASE_PIN + offlinecloud3:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { offlineCloud3?: string; fixtures?: string[] };
    expect(pin.offlineCloud3).toBe("shared/ship/offline-cloud-3.json");
    expect(pin.fixtures).toContain("parity-offline-cloud-3.json");
    const out = execFileSync("npm", ["run", "offlinecloud3:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK offlinecloud3:validate");
  });
});
