/**
 * Finish 3.0 Phase 27 — quests/contracts expansion ship catalog
 * (mirrors shared/ship/quests-contracts-3.json).
 */
import catalogJson from "../../../shared/ship/quests-contracts-3.json";

export interface QuestsContracts3ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  questsContracts3Marker: string;
  questsMin: number;
  deliveryChainsMin: number;
  reputationGatedMin: number;
  contractTemplatesMin: number;
  newQuests: string[];
  newChain: string;
  newChainHead: string;
  newReputationGated: string[];
  extendsContracts20: string;
  parityFixture: string;
  validateScript: string;
  simHzInvariant: number;
}

export const QUESTS_CONTRACTS_3 = catalogJson as unknown as QuestsContracts3ShipCatalog;
export const QUESTS_CONTRACTS_3_PHASE = QUESTS_CONTRACTS_3.phase;
export const QUESTS_CONTRACTS_3_SCHEMA = QUESTS_CONTRACTS_3.schema;
export const QUESTS_CONTRACTS_3_MARKER = QUESTS_CONTRACTS_3.questsContracts3Marker;
export const QUESTS3_QUESTS_MIN = QUESTS_CONTRACTS_3.questsMin;
export const QUESTS3_CHAINS_MIN = QUESTS_CONTRACTS_3.deliveryChainsMin;
export const QUESTS3_REP_GATED_MIN = QUESTS_CONTRACTS_3.reputationGatedMin;
export const QUESTS3_TEMPLATES_MIN = QUESTS_CONTRACTS_3.contractTemplatesMin;
