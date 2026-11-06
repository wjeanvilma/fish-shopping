/**
 * Deterministic foundations. Mirrors game-core sim/Foundations.kt; every rule here is
 * part of the cross-platform contract and is checked by the shared fixtures.
 *
 * Integer conventions: all values are integers within +/-(2^53 - 1). Integer division
 * truncates toward zero (Kotlin semantics) via `idiv`.
 */

export const TICKS_PER_SECOND = 20;
export const NANOS_PER_TICK = 1_000_000_000 / TICKS_PER_SECOND;
export const MS_PER_TICK = 1000 / TICKS_PER_SECOND;
export const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER; // 2^53 - 1, same as Kotlin SimConstants
export const INPUT_SCALE = 1000;
export const OFFLINE_CAP_TICKS = 4 * 60 * 60 * TICKS_PER_SECOND;
export const CHECKPOINT_INTERVAL_TICKS = 30 * TICKS_PER_SECOND;
/**
 * 2: customers carry walking state.
 * 3: customers store reservedItems (multi-SKU baskets); counters accept product lists.
 * 4: player stores fishingCatchTicks + reelAttemptedThisCast for mid-cast resume.
 * 5: machines store preferredRecipeId for multi-recipe selection.
 * 6: customers store preferredProductId for product demand.
 * 7: workers list (hired staff + bags + task state).
 */
export const SCHEMA_VERSION = 7;

/** Kotlin-style integer division (truncates toward zero). */
export function idiv(a: number, b: number): number {
  if (b === 0) throw new Error("Division by zero");
  return Math.trunc(a / b);
}

function checkSafe(r: number): number {
  if (!Number.isSafeInteger(r)) throw new RangeError(`Value ${r} outside safe range`);
  return r;
}

export const SafeMath = {
  add: (a: number, b: number) => checkSafe(a + b),
  multiply: (a: number, b: number) => checkSafe(a * b),
  creditCoins(balance: number, amount: number): number {
    if (amount < 0) throw new RangeError("Credit must be non-negative");
    return balance > MAX_SAFE_INTEGER - amount ? MAX_SAFE_INTEGER : balance + amount;
  },
  isqrt(n: number): number {
    if (n < 0) throw new RangeError("isqrt of negative");
    if (n < 2) return n;
    let x = Math.floor(Math.sqrt(n));
    while (x * x > n) x--;
    while ((x + 1) * (x + 1) <= n) x++;
    return x;
  },
};

/** Mulberry32. `state` is a signed 32-bit integer, like Kotlin's Int. */
export class Prng {
  constructor(public state: number) {
    this.state = state | 0;
  }

  nextU32(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  }

  /** floor(u32 * bound / 2^32), computed exactly without exceeding 2^53. */
  nextBelow(bound: number): number {
    if (!(bound > 0)) throw new RangeError("bound must be positive");
    const u = this.nextU32();
    const hi = (u >>> 16) * bound; // < 2^47
    const lo = (u & 0xffff) * bound; // < 2^47
    return Math.floor((hi + Math.floor(lo / 65536)) / 65536);
  }

  nextInRange(min: number, max: number): number {
    return min + this.nextBelow(max - min + 1);
  }

  pickWeighted(weights: readonly number[]): number {
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) throw new RangeError("weights must sum to > 0");
    let roll = this.nextBelow(total);
    for (let i = 0; i < weights.length; i++) {
      const w = weights[i]!;
      if (roll < w) return i;
      roll -= w;
    }
    return weights.length - 1;
  }
}

/** Real time -> whole fixed ticks, with capped catch-up after stalls. Time in milliseconds. */
export class FixedStepClock {
  private accumulatorMs = 0;
  private lastMs = -1;

  constructor(private readonly maxCatchUpTicks = 5) {}

  reset(): void {
    this.accumulatorMs = 0;
    this.lastMs = -1;
  }

  advance(nowMs: number): number {
    if (this.lastMs < 0) {
      this.lastMs = nowMs;
      return 0;
    }
    const elapsed = Math.max(0, nowMs - this.lastMs);
    this.lastMs = nowMs;
    this.accumulatorMs += elapsed;
    let ticks = Math.floor(this.accumulatorMs / MS_PER_TICK);
    this.accumulatorMs -= ticks * MS_PER_TICK;
    if (ticks > this.maxCatchUpTicks) {
      ticks = this.maxCatchUpTicks;
      this.accumulatorMs = 0;
    }
    return ticks;
  }

  alpha(): number {
    return this.accumulatorMs / MS_PER_TICK;
  }
}

export interface OfflineReport {
  elapsedMillis: number;
  ticksCredited: number;
  capped: boolean;
  coinsDelta: number;
  fishCaught: number;
  sales: number;
  itemsSold: number;
  workerFishCaught: number;
  workerItemsMoved: number;
  hadActivity: boolean;
}

export const OfflinePolicy = {
  capTicks(content: { offline: { capHours: number } }): number {
    return content.offline.capHours * 60 * 60 * TICKS_PER_SECOND;
  },

  creditedTicks(elapsedMillis: number, capTicks: number = OFFLINE_CAP_TICKS): number {
    if (elapsedMillis <= 0) return 0;
    return Math.min(Math.floor(elapsedMillis / MS_PER_TICK), capTicks);
  },

  shouldShowSummary(content: { offline: { summaryMinSeconds: number } }, report: OfflineReport): boolean {
    const minTicks = content.offline.summaryMinSeconds * TICKS_PER_SECOND;
    return report.ticksCredited >= minTicks;
  },
};

/** Ordinal string comparison (UTF-16 code units), identical to Kotlin String.compareTo. */
export function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function sortedKeys<V>(m: ReadonlyMap<string, V>): string[] {
  return [...m.keys()].sort(compareStrings);
}
