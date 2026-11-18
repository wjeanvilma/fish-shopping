/**
 * Finish 4.0 Phase 14 — quests/contracts expansion ship catalog
 * (mirrors shared/ship/quests-contracts-4.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/quests-contracts-4.json";
import { ContractSystem, loadContent } from "../engine";

export interface QuestsContracts4ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  questsContracts4Marker: string;
  questsMin: number;
  deliveryChainsMin: number;
  reputationGatedMin: number;
  contractTemplatesMin: number;
  newQuests: string[];
  newChains: string[];
  newChainHeads: string[];
  newReputationGated: string[];
  newBoardContracts: string[];
  extendsQuestsContracts3: string;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  simHzInvariant: number;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const QUESTS_CONTRACTS_4 = catalogJson as unknown as QuestsContracts4ShipCatalog;
export const QUESTS_CONTRACTS_4_PHASE = QUESTS_CONTRACTS_4.phase;
export const QUESTS_CONTRACTS_4_SCHEMA = QUESTS_CONTRACTS_4.schema;
export const QUESTS_CONTRACTS_4_MARKER = QUESTS_CONTRACTS_4.questsContracts4Marker;
export const QUESTS4_QUESTS_MIN = QUESTS_CONTRACTS_4.questsMin;
export const QUESTS4_CHAINS_MIN = QUESTS_CONTRACTS_4.deliveryChainsMin;
export const QUESTS4_REP_GATED_MIN = QUESTS_CONTRACTS_4.reputationGatedMin;
export const QUESTS4_TEMPLATES_MIN = QUESTS_CONTRACTS_4.contractTemplatesMin;

export interface QuestsContracts4Measure {
  questCount: number;
  chainCount: number;
  repGatedCount: number;
  templateCount: number;
  newQuestsPresent: boolean;
  newChainsPresent: boolean;
  newRepGatedPresent: boolean;
  kickoffQuestsMet: boolean;
  missingGates: string[];
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function measureQuestsContracts4(repoRoot: string): QuestsContracts4Measure {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  const content = loadContent(pack);
  const kickoff = readJson(resolve(repoRoot, "shared/ship/finish-4.0-kickoff.json"));

  const chains = new Set(
    content.raw.contracts.templates.map((t) => t.chainId).filter((id): id is string => !!id),
  );
  const repGated = content.raw.contracts.templates.filter((t) => t.requiresReputationBand != null);

  const newQuestsPresent = QUESTS_CONTRACTS_4.newQuests.every((id) => content.questsById.has(id));
  const newChainsPresent = QUESTS_CONTRACTS_4.newChains.every((id) => chains.has(id));
  const newRepGatedPresent = QUESTS_CONTRACTS_4.newReputationGated.every((id) =>
    content.contractTemplatesById.has(id),
  );

  const missingGates: string[] = [];
  for (const gate of QUESTS_CONTRACTS_4.preflightGates) {
    if (!existsSync(resolve(repoRoot, gate))) missingGates.push(gate);
  }

  return {
    questCount: content.raw.quests.length,
    chainCount: chains.size,
    repGatedCount: repGated.length,
    templateCount: content.raw.contracts.templates.length,
    newQuestsPresent,
    newChainsPresent,
    newRepGatedPresent,
    kickoffQuestsMet:
      (kickoff.baseline?.quests ?? 0) >= QUESTS4_QUESTS_MIN &&
      (kickoff.gaps?.questsRemaining ?? 1) === 0 &&
      (kickoff.baseline?.deliveryChains ?? 0) >= QUESTS4_CHAINS_MIN,
    missingGates,
  };
}

export function chainLengthsOk(repoRoot: string): boolean {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  const content = loadContent(pack);
  return QUESTS_CONTRACTS_4.newChains.every(
    (id) => ContractSystem.chainLength(content, id) === 3,
  );
}
