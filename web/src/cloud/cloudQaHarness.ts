/**
 * Finish 2.0 Phase 26 — cloud QA harness (conflict + offline queue).
 * In-process MemoryCloudBackend scenarios; emulator steps live in the ship catalog.
 * Does not start a live Firebase emulator and does not deploy rules.
 */
import { cloudConflictOffer } from "../engine/cloudSync";
import { crc32Hex } from "../engine/snapshot";
import type { GameSettings } from "../game/settingsStore";
import { MemoryCloudBackend } from "./cloudBackend";
import {
  clearCloudOfflineQueue,
  cloudOfflineQueuePending,
  enqueueCloudOfflineSnapshot,
  loadCloudOfflineQueue,
} from "./cloudOfflineQueue";
import { CloudSyncCoordinator } from "./cloudSyncCoordinator";

export const CLOUD_QA_SCENARIO_IDS = [
  "conflict_dual_valid_differs",
  "conflict_identical_no_offer",
  "offline_enqueue_latest_wins",
  "offline_flush_uploads",
] as const;

export type CloudQaScenarioId = (typeof CLOUD_QA_SCENARIO_IDS)[number];

export interface CloudQaScenarioResult {
  id: CloudQaScenarioId;
  ok: boolean;
  detail: string;
}

/** Install in-memory localStorage when running under Node (vite-node / CI). */
export function ensureCloudQaLocalStorage(): void {
  const g = globalThis as { localStorage?: Storage };
  if (g.localStorage && typeof g.localStorage.getItem === "function") return;
  const memory = new Map<string, string>();
  g.localStorage = {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => {
      memory.set(k, v);
    },
    removeItem: (k) => {
      memory.delete(k);
    },
    clear: () => memory.clear(),
    key: () => null,
    get length() {
      return memory.size;
    },
  };
}

function baseSettings(over: Partial<GameSettings> = {}): GameSettings {
  return {
    muted: false,
    musicVolume: 0.7,
    sfxVolume: 1,
    hapticsEnabled: true,
    quality: "medium",
    joystickSide: "left",
    joystickScale: 1,
    tapToMove: false,
    cloudSyncEnabled: true,
    showBalanceStrip: false,
    reducedMotion: false,
    captionsEnabled: true,
    hudTextScale: 1,
    shapeCues: false,
    timingAssist: false,
    analyticsConsent: false,
    analyticsConsentDecided: false,
    cloudAccountId: "qa-user",
    cloudRefreshToken: null,
    equippedCosmeticId: null,
    locale: "en",
    ...over,
  };
}

/** Minimal checksum-valid snapshot envelope for conflict vectors. */
export function makeQaSnapshot(opts: {
  harborId: string;
  coins: number;
  tick: number;
  savedAtEpochMs: number;
  schemaVersion?: number;
}): string {
  const state = {
    harborId: opts.harborId,
    coins: opts.coins,
    tick: opts.tick,
  };
  return JSON.stringify({
    schemaVersion: opts.schemaVersion ?? 23,
    savedAtEpochMs: opts.savedAtEpochMs,
    checksum: crc32Hex(JSON.stringify(state)),
    state,
  });
}

async function runConflictDualValid(): Promise<CloudQaScenarioResult> {
  const local = makeQaSnapshot({
    harborId: "harbor.sunrise_pier",
    coins: 100,
    tick: 1000,
    savedAtEpochMs: 1_000,
  });
  const remote = makeQaSnapshot({
    harborId: "harbor.coral_bay",
    coins: 200,
    tick: 2000,
    savedAtEpochMs: 2_000,
  });
  const backend = new MemoryCloudBackend();
  await backend.put("qa-user", remote);
  const coord = new CloudSyncCoordinator(backend);
  const pull = await coord.pullMerge(baseSettings(), local);
  const offer = pull.conflict ?? cloudConflictOffer(local, remote);
  const ok =
    !!offer && offer.recommended === "remote" && offer.local.coins === 100 && offer.remote.coins === 200;
  return {
    id: "conflict_dual_valid_differs",
    ok,
    detail: ok ? "conflict offer recommends newer remote" : `unexpected offer=${JSON.stringify(offer)}`,
  };
}

async function runConflictIdentical(): Promise<CloudQaScenarioResult> {
  const snap = makeQaSnapshot({
    harborId: "harbor.sunrise_pier",
    coins: 50,
    tick: 500,
    savedAtEpochMs: 5_000,
  });
  const offer = cloudConflictOffer(snap, snap);
  const ok = offer === null;
  return {
    id: "conflict_identical_no_offer",
    ok,
    detail: ok ? "identical checksums → no conflict UI" : "expected null conflict offer",
  };
}

async function runOfflineEnqueue(): Promise<CloudQaScenarioResult> {
  ensureCloudQaLocalStorage();
  clearCloudOfflineQueue();
  enqueueCloudOfflineSnapshot("snap-a", "qa-user", 1000);
  enqueueCloudOfflineSnapshot("snap-b", "qa-user", 2000);
  const pending = loadCloudOfflineQueue();
  const ok = pending?.snapshot === "snap-b" && cloudOfflineQueuePending();
  clearCloudOfflineQueue();
  return {
    id: "offline_enqueue_latest_wins",
    ok: !!ok,
    detail: ok ? "latest snapshot retained" : `pending=${JSON.stringify(pending)}`,
  };
}

async function runOfflineFlush(): Promise<CloudQaScenarioResult> {
  ensureCloudQaLocalStorage();
  clearCloudOfflineQueue();
  const backend = new MemoryCloudBackend();
  const coord = new CloudSyncCoordinator(backend);
  enqueueCloudOfflineSnapshot("snap-flush", "qa-user", 3000);
  const flushed = await coord.flushOfflineQueue(baseSettings({ cloudAccountId: "qa-user" }));
  const stored = await backend.get("qa-user");
  const ok = flushed.uploaded && !flushed.queued && stored === "snap-flush" && !cloudOfflineQueuePending();
  clearCloudOfflineQueue();
  return {
    id: "offline_flush_uploads",
    ok,
    detail: ok ? "flush uploaded queued snapshot" : `flushed=${JSON.stringify(flushed)} stored=${stored}`,
  };
}

const RUNNERS: Record<CloudQaScenarioId, () => Promise<CloudQaScenarioResult>> = {
  conflict_dual_valid_differs: runConflictDualValid,
  conflict_identical_no_offer: runConflictIdentical,
  offline_enqueue_latest_wins: runOfflineEnqueue,
  offline_flush_uploads: runOfflineFlush,
};

export async function runCloudQaHarness(
  ids: readonly CloudQaScenarioId[] = CLOUD_QA_SCENARIO_IDS,
): Promise<CloudQaScenarioResult[]> {
  ensureCloudQaLocalStorage();
  const results: CloudQaScenarioResult[] = [];
  for (const id of ids) {
    results.push(await RUNNERS[id]());
  }
  return results;
}

export function cloudQaFailures(results: CloudQaScenarioResult[]): CloudQaScenarioResult[] {
  return results.filter((r) => !r.ok);
}
