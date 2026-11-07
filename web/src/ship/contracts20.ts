/**
 * Finish 2.0 Phase 17 — Contracts 2.0 catalog
 * (mirrors shared/ship/contracts-2.0.json).
 */
import contractsJson from "../../../shared/ship/contracts-2.0.json";

export interface Contracts20ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  deliveryChainCount: number;
  reputationGatedCount: number;
  chains: string[];
  chainHeads: string[];
  reputationGated: string[];
  parityFixture: string;
  validateScript: string;
}

export const CONTRACTS_20 = contractsJson as unknown as Contracts20ShipCatalog;
export const CONTRACTS_20_PHASE = CONTRACTS_20.phase;
export const CONTRACTS_20_SCHEMA = CONTRACTS_20.schema;
export const DELIVERY_CHAIN_FLOOR = CONTRACTS_20.deliveryChainCount;
export const REPUTATION_GATED_FLOOR = CONTRACTS_20.reputationGatedCount;
