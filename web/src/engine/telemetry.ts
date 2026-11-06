/**
 * Privacy-safe play counters for balancing / live-ops (Phase 27).
 * Mirrors game-core Telemetry.kt — aggregate Stats only; no bag, positions, or accounts.
 */
import type { ContentPack } from "./content";
import { SCHEMA_VERSION } from "./foundations";
import { STAT_KEYS, type GameState } from "./state";

export const TELEMETRY_SCHEMA = "fish.telemetry.v1";

/** Keys that must never appear in a telemetry payload. */
export const TELEMETRY_FORBIDDEN_KEYS = new Set([
  "bag", "cloudAccountId", "cloud_account_id", "accountId", "email",
  "password", "token", "idToken", "x", "z", "facingX", "facingZ",
  "player", "workers", "customers", "machines", "counters",
]);

export interface TelemetryReport {
  schema: typeof TELEMETRY_SCHEMA;
  contentVersion: string;
  schemaVersion: number;
  tick: number;
  harborId: string;
  coins: number;
  workersOnDuty: number;
  stats: Record<string, number>;
}

export function buildTelemetry(content: ContentPack, state: GameState): TelemetryReport {
  const stats: Record<string, number> = {};
  for (const key of STAT_KEYS) stats[key] = state.stat(key);
  return {
    schema: TELEMETRY_SCHEMA,
    contentVersion: content.contentVersion,
    schemaVersion: SCHEMA_VERSION,
    tick: state.tick,
    harborId: state.harborId,
    coins: state.coins,
    workersOnDuty: state.workers.length,
    stats,
  };
}

export function encodeTelemetry(content: ContentPack, state: GameState): string {
  return JSON.stringify(buildTelemetry(content, state));
}
