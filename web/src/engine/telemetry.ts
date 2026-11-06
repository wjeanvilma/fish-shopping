/**
 * Privacy-safe play counters for balancing / live-ops (Phase 27).
 * Mirrors game-core Telemetry.kt — aggregate Stats + derived rates only;
 * no bag, positions, or accounts.
 */
import type { ContentPack } from "./content";
import { SCHEMA_VERSION, compareStrings, sortedKeys } from "./foundations";
import { STAT_KEYS, Stats, type GameState } from "./state";

export const TELEMETRY_SCHEMA = "fish.telemetry.v2";

/** Keys that must never appear in a telemetry payload. */
export const TELEMETRY_FORBIDDEN_KEYS = new Set([
  "bag", "cloudAccountId", "cloud_account_id", "accountId", "email",
  "password", "token", "idToken", "x", "z", "facingX", "facingZ",
  "player", "workers", "customers", "machines", "counters",
]);

export interface TelemetryRates {
  abandonPermille: number;
  wageRatioPermille: number;
  speciesCatchSharePermille: Record<string, number>;
}

export interface TelemetryReport {
  schema: typeof TELEMETRY_SCHEMA;
  contentVersion: string;
  schemaVersion: number;
  tick: number;
  harborId: string;
  coins: number;
  workersOnDuty: number;
  stats: Record<string, number>;
  speciesCatches: Record<string, number>;
  rates: TelemetryRates;
}

/** Lost-customer share of (sales + lost), permille. */
export function abandonPermille(state: GameState): number {
  const served = state.stat(Stats.SALES);
  const lost = state.stat(Stats.LOST_CUSTOMERS);
  const total = served + lost;
  if (total <= 0) return 0;
  return Math.trunc((lost * 1000) / total);
}

/** Wage spend vs lifetime revenue, permille (wages_paid already includes overtime coins). */
export function wageRatioPermille(state: GameState): number {
  const revenue = state.stat(Stats.REVENUE);
  const wages = state.stat(Stats.WAGES_PAID);
  if (revenue <= 0) return wages > 0 ? 1000 : 0;
  return Math.trunc((wages * 1000) / revenue);
}

/** Per-species catch share of fish_caught, permille. */
export function speciesCatchSharePermille(state: GameState): Record<string, number> {
  const total = state.stat(Stats.FISH_CAUGHT);
  if (total <= 0 || state.speciesCatches.size === 0) return {};
  const out: Record<string, number> = {};
  for (const id of sortedKeys(state.speciesCatches)) {
    const count = state.speciesCatches.get(id) ?? 0;
    if (count <= 0) continue;
    out[id] = Math.trunc((count * 1000) / total);
  }
  return out;
}

export function buildTelemetry(content: ContentPack, state: GameState): TelemetryReport {
  const stats: Record<string, number> = {};
  for (const key of STAT_KEYS) stats[key] = state.stat(key);
  const speciesCatches: Record<string, number> = {};
  for (const id of sortedKeys(state.speciesCatches)) {
    const count = state.speciesCatches.get(id) ?? 0;
    if (count > 0) speciesCatches[id] = count;
  }
  return {
    schema: TELEMETRY_SCHEMA,
    contentVersion: content.contentVersion,
    schemaVersion: SCHEMA_VERSION,
    tick: state.tick,
    harborId: state.harborId,
    coins: state.coins,
    workersOnDuty: state.workers.length,
    stats,
    speciesCatches,
    rates: {
      abandonPermille: abandonPermille(state),
      wageRatioPermille: wageRatioPermille(state),
      speciesCatchSharePermille: speciesCatchSharePermille(state),
    },
  };
}

export function encodeTelemetry(content: ContentPack, state: GameState): string {
  return JSON.stringify(buildTelemetry(content, state));
}

/** Compact HUD / Settings strip: top species by catch share. */
export function topSpeciesCatchShare(
  state: GameState,
  limit = 3,
): Array<{ speciesId: string; sharePermille: number; catches: number }> {
  const shares = speciesCatchSharePermille(state);
  return Object.entries(shares)
    .map(([speciesId, sharePermille]) => ({
      speciesId,
      sharePermille,
      catches: state.speciesCatches.get(speciesId) ?? 0,
    }))
    .sort((a, b) => b.sharePermille - a.sharePermille || compareStrings(a.speciesId, b.speciesId))
    .slice(0, limit);
}
