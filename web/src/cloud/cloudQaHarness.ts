/**
 * Finish 2.0 Phase 26 — cloud QA harness (conflict + offline queue).
 * Finish 3.0 Phase 17 — production QA harness 2 (local-newer conflict, corrupt
 * remote, unavailable push queue, sync-disabled, empty-local pull, flush hold,
 * schema-24 roundtrip, guest uid stability).
 *
 * In-process MemoryCloudBackend / NullCloudBackend scenarios; emulator steps live
 * in the ship catalogs. Does not start a live Firebase emulator and does not
 * deploy rules.
 */
import { cloudConflictOffer, chooseCloudSnapshot } from "../engine/cloudSync";
import { crc32Hex } from "../engine/snapshot";
import type { GameSettings } from "../game/settingsStore";
import { MemoryCloudBackend, NullCloudBackend } from "./cloudBackend";
import {
  clearCloudOfflineQueue,
  cloudOfflineQueuePending,
  enqueueCloudOfflineSnapshot,
  loadCloudOfflineQueue,
} from "./cloudOfflineQueue";
import { CloudSyncCoordinator } from "./cloudSyncCoordinator";

/** Finish 2.0 Phase 26 baseline scenarios. */
export const CLOUD_QA_BASELINE_SCENARIO_IDS = [
  "conflict_dual_valid_differs",
  "conflict_identical_no_offer",
  "offline_enqueue_latest_wins",
  "offline_flush_uploads",
] as const;

/** Finish 3.0 Phase 17 production-path expansions. */
export const CLOUD_QA_2_SCENARIO_IDS = [
  "conflict_local_newer_recommends_local",
  "corrupt_remote_keeps_local",
  "push_unavailable_queues",
  "sync_disabled_skips_network",
  "pull_remote_fills_empty_local",
  "flush_stays_queued_when_unavailable",
  "schema24_snapshot_roundtrip",
  "guest_uid_preserved_on_ensure",
] as const;

export const CLOUD_QA_SCENARIO_IDS = [
  ...CLOUD_QA_BASELINE_SCENARIO_IDS,
  ...CLOUD_QA_2_SCENARIO_IDS,
] as const;

export type CloudQaScenarioId = (typeof CLOUD_QA_SCENARIO_IDS)[number];
export type CloudQa2ScenarioId = (typeof CLOUD_QA_2_SCENARIO_IDS)[number];

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
    themePreference: "system",
    dailyGoalRemindersEnabled: false,
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
    schemaVersion: opts.schemaVersion ?? 24,
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

async function runConflictLocalNewer(): Promise<CloudQaScenarioResult> {
  const local = makeQaSnapshot({
    harborId: "harbor.sunrise_pier",
    coins: 300,
    tick: 3000,
    savedAtEpochMs: 9_000,
  });
  const remote = makeQaSnapshot({
    harborId: "harbor.coral_bay",
    coins: 100,
    tick: 1000,
    savedAtEpochMs: 1_000,
  });
  const offer = cloudConflictOffer(local, remote);
  const ok = !!offer && offer.recommended === "local" && offer.local.coins === 300;
  return {
    id: "conflict_local_newer_recommends_local",
    ok,
    detail: ok ? "conflict offer recommends newer local" : `unexpected offer=${JSON.stringify(offer)}`,
  };
}

async function runCorruptRemoteKeepsLocal(): Promise<CloudQaScenarioResult> {
  const local = makeQaSnapshot({
    harborId: "harbor.sunrise_pier",
    coins: 80,
    tick: 800,
    savedAtEpochMs: 4_000,
  });
  const remote = `{"schemaVersion":24,"checksum":"deadbeef","state":{"harborId":"x","coins":1,"tick":1}}`;
  const decision = chooseCloudSnapshot(local, remote);
  const offer = cloudConflictOffer(local, remote);
  const ok = decision.source === "local" && offer === null;
  return {
    id: "corrupt_remote_keeps_local",
    ok,
    detail: ok ? "corrupt remote skipped; keep local" : `decision=${JSON.stringify(decision)} offer=${offer}`,
  };
}

async function runPushUnavailableQueues(): Promise<CloudQaScenarioResult> {
  ensureCloudQaLocalStorage();
  clearCloudOfflineQueue();
  const coord = new CloudSyncCoordinator(new NullCloudBackend());
  const snap = makeQaSnapshot({
    harborId: "harbor.sunrise_pier",
    coins: 10,
    tick: 10,
    savedAtEpochMs: 10,
  });
  const pushed = await coord.push(baseSettings(), snap);
  const ok = !pushed.uploaded && pushed.queued && cloudOfflineQueuePending();
  clearCloudOfflineQueue();
  return {
    id: "push_unavailable_queues",
    ok,
    detail: ok ? "unavailable backend enqueues push" : `pushed=${JSON.stringify(pushed)}`,
  };
}

async function runSyncDisabledSkipsNetwork(): Promise<CloudQaScenarioResult> {
  ensureCloudQaLocalStorage();
  clearCloudOfflineQueue();
  const backend = new MemoryCloudBackend();
  const coord = new CloudSyncCoordinator(backend);
  const snap = makeQaSnapshot({
    harborId: "harbor.sunrise_pier",
    coins: 11,
    tick: 11,
    savedAtEpochMs: 11,
  });
  const pushed = await coord.push(baseSettings({ cloudSyncEnabled: false }), snap);
  const stored = await backend.get("qa-user");
  const ok = !pushed.uploaded && !pushed.queued && stored === null && !cloudOfflineQueuePending();
  clearCloudOfflineQueue();
  return {
    id: "sync_disabled_skips_network",
    ok,
    detail: ok ? "sync off → no upload/queue" : `pushed=${JSON.stringify(pushed)} stored=${stored}`,
  };
}

async function runPullRemoteFillsEmptyLocal(): Promise<CloudQaScenarioResult> {
  const remote = makeQaSnapshot({
    harborId: "harbor.coral_bay",
    coins: 777,
    tick: 777,
    savedAtEpochMs: 7_777,
  });
  const backend = new MemoryCloudBackend();
  await backend.put("qa-user", remote);
  const coord = new CloudSyncCoordinator(backend);
  const pull = await coord.pullMerge(baseSettings(), null);
  const ok =
    pull.decision.source === "remote" &&
    pull.decision.text === remote &&
    pull.conflict === null;
  return {
    id: "pull_remote_fills_empty_local",
    ok,
    detail: ok ? "empty local adopts remote" : `decision=${JSON.stringify(pull.decision)}`,
  };
}

async function runFlushStaysQueuedWhenUnavailable(): Promise<CloudQaScenarioResult> {
  ensureCloudQaLocalStorage();
  clearCloudOfflineQueue();
  enqueueCloudOfflineSnapshot("snap-hold", "qa-user", 4000);
  const coord = new CloudSyncCoordinator(new NullCloudBackend());
  const flushed = await coord.flushOfflineQueue(baseSettings());
  const ok = !flushed.uploaded && flushed.queued && cloudOfflineQueuePending();
  clearCloudOfflineQueue();
  return {
    id: "flush_stays_queued_when_unavailable",
    ok,
    detail: ok ? "flush holds queue while offline" : `flushed=${JSON.stringify(flushed)}`,
  };
}

async function runSchema24Roundtrip(): Promise<CloudQaScenarioResult> {
  const snap = makeQaSnapshot({
    harborId: "harbor.sunrise_pier",
    coins: 24,
    tick: 2400,
    savedAtEpochMs: 24_000,
    schemaVersion: 24,
  });
  const backend = new MemoryCloudBackend();
  const coord = new CloudSyncCoordinator(backend);
  const pushed = await coord.push(baseSettings(), snap);
  const pull = await coord.pullMerge(baseSettings(), null);
  const ok =
    pushed.uploaded &&
    pull.decision.source === "remote" &&
    pull.decision.text === snap &&
    JSON.parse(snap).schemaVersion === 24;
  return {
    id: "schema24_snapshot_roundtrip",
    ok,
    detail: ok ? "schema 24 snapshot push/pull roundtrip" : `pushed=${JSON.stringify(pushed)}`,
  };
}

async function runGuestUidPreserved(): Promise<CloudQaScenarioResult> {
  const backend = new MemoryCloudBackend();
  const coord = new CloudSyncCoordinator(backend);
  const { settings, uid } = await coord.ensureAccount(
    baseSettings({ cloudAccountId: "guest-stable-uid", cloudRefreshToken: null }),
  );
  const ok = uid === "guest-stable-uid" && settings.cloudAccountId === "guest-stable-uid";
  return {
    id: "guest_uid_preserved_on_ensure",
    ok,
    detail: ok ? "guest uid preserved across ensureAccount" : `uid=${uid} settings=${settings.cloudAccountId}`,
  };
}

const RUNNERS: Record<CloudQaScenarioId, () => Promise<CloudQaScenarioResult>> = {
  conflict_dual_valid_differs: runConflictDualValid,
  conflict_identical_no_offer: runConflictIdentical,
  offline_enqueue_latest_wins: runOfflineEnqueue,
  offline_flush_uploads: runOfflineFlush,
  conflict_local_newer_recommends_local: runConflictLocalNewer,
  corrupt_remote_keeps_local: runCorruptRemoteKeepsLocal,
  push_unavailable_queues: runPushUnavailableQueues,
  sync_disabled_skips_network: runSyncDisabledSkipsNetwork,
  pull_remote_fills_empty_local: runPullRemoteFillsEmptyLocal,
  flush_stays_queued_when_unavailable: runFlushStaysQueuedWhenUnavailable,
  schema24_snapshot_roundtrip: runSchema24Roundtrip,
  guest_uid_preserved_on_ensure: runGuestUidPreserved,
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

export async function runCloudQa2Harness(): Promise<CloudQaScenarioResult[]> {
  return runCloudQaHarness(CLOUD_QA_2_SCENARIO_IDS);
}

export function cloudQaFailures(results: CloudQaScenarioResult[]): CloudQaScenarioResult[] {
  return results.filter((r) => !r.ok);
}
