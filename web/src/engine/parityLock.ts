/**
 * Phase 27 (post-1.0) — expanded Kotlin↔web parity lock catalog + expected-state helper.
 */
import parityLockJson from "../../../shared/fixtures/parity-lock.json";
import type { GameState } from "./state";

export interface ParityLockSuite {
  id: string;
  title: string;
  fixture?: string;
  snapshot?: string;
  snapshotTick?: number;
  fixtures?: string[];
  covers: string[];
}

export interface ParityLockCatalog {
  phase: number;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  suites: ParityLockSuite[];
  expandedExpectFields: string[];
  gates: {
    tutorialFinishedInStarterLine: boolean;
    entitlementGrantsIdempotent: boolean;
    midRunSnapshotByteIdentical: boolean;
  };
}

export const PARITY_LOCK = parityLockJson as unknown as ParityLockCatalog;
export const PARITY_LOCK_PHASE = PARITY_LOCK.phase;
export const PARITY_LOCK_SCHEMA = PARITY_LOCK.schema;

/** Canonical economy/unlock/tutorial/entitlement state both clients must match. */
export function parityExpectedState(s: GameState) {
  const rec = (entries: [string, number][]) => Object.fromEntries(entries);
  const m = s.machines.find((mm) => mm.stationId === "station.cutter_1")!;
  return {
    tick: s.tick,
    coins: s.coins,
    rngState: s.rng.state,
    harborId: s.harborId,
    playerX: s.player.x,
    playerZ: s.player.z,
    bag: rec(s.player.bag.contents()),
    bagCapacityUnits: s.player.bag.capacityUnits,
    machineInput: rec(m.input.contents()),
    machineOutput: rec(m.output.contents()),
    activeBatchRemaining: m.activeBatch?.remainingTicks ?? -1,
    counterStock: rec(s.counters[0]!.stock.contents()),
    customers: s.customers.length,
    fishingStock: Object.fromEntries(s.fishingSpots.map((f) => [f.zoneId, f.stock])),
    ownedUpgrades: [...s.ownedUpgrades].sort(),
    completedQuests: [...s.completedQuests].sort(),
    tutorialIndex: s.tutorialIndex,
    fullHarborUnlock: s.fullHarborUnlock,
    unlockedCosmetics: [...s.unlockedCosmetics].sort(),
    ownedDecor: [...s.ownedDecor].sort(),
    loanOwed: s.loanOwed,
    coinGoal: s.coinGoal,
    workers: s.workers.length,
    stats: Object.fromEntries([...s.stats].sort(([a], [b]) => (a < b ? -1 : 1))),
  };
}
