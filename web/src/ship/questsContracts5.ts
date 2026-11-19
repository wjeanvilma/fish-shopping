/**
 * Finish 5.0 Phase 16 — quests/contracts expansion ship catalog
 * (mirrors shared/ship/quests-contracts-5.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/quests-contracts-5.json";
import { ContractSystem, loadContent } from "../engine";

export interface QuestsContracts5ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  questsContracts5Marker: string;
  questsMin: number;
  deliveryChainsMin: number;
  reputationGatedMin: number;
  contractTemplatesMin: number;
  newQuests: string[];
  newChains: string[];
  newChainHeads: string[];
  newReputationGated: string[];
  newBoardContracts: string[];
  extendsQuestsContracts4: string;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  simHzInvariant: number;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const QUESTS_CONTRACTS_5 = catalogJson as unknown as QuestsContracts5ShipCatalog;
export const QUESTS_CONTRACTS_5_PHASE = QUESTS_CONTRACTS_5.phase;
export const QUESTS_CONTRACTS_5_SCHEMA = QUESTS_CONTRACTS_5.schema;
export const QUESTS_CONTRACTS_5_MARKER = QUESTS_CONTRACTS_5.questsContracts5Marker;
export const QUESTS5_QUESTS_MIN = QUESTS_CONTRACTS_5.questsMin;
export const QUESTS5_CHAINS_MIN = QUESTS_CONTRACTS_5.deliveryChainsMin;
export const QUESTS5_REP_GATED_MIN = QUESTS_CONTRACTS_5.reputationGatedMin;
export const QUESTS5_TEMPLATES_MIN = QUESTS_CONTRACTS_5.contractTemplatesMin;

export interface QuestsContracts5Measure {
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

export function measureQuestsContracts5(repoRoot: string): QuestsContracts5Measure {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  const content = loadContent(pack);
  const kickoff = readJson(resolve(repoRoot, "shared/ship/finish-5.0-kickoff.json"));

  const chains = new Set(
    content.raw.contracts.templates.map((t) => t.chainId).filter((id): id is string => !!id),
  );
  const repGated = content.raw.contracts.templates.filter((t) => t.requiresReputationBand != null);

  const newQuestsPresent = QUESTS_CONTRACTS_5.newQuests.every((id) => content.questsById.has(id));
  const newChainsPresent = QUESTS_CONTRACTS_5.newChains.every((id) => chains.has(id));
  const newRepGatedPresent = QUESTS_CONTRACTS_5.newReputationGated.every((id) =>
    content.contractTemplatesById.has(id),
  );

  const missingGates: string[] = [];
  for (const gate of QUESTS_CONTRACTS_5.preflightGates) {
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
      (kickoff.baseline?.quests ?? 0) >= QUESTS5_QUESTS_MIN &&
      (kickoff.gaps?.questsRemaining ?? 1) === 0 &&
      (kickoff.baseline?.deliveryChains ?? 0) >= QUESTS5_CHAINS_MIN,
    missingGates,
  };
}

export function chainLengthsOk(repoRoot: string): boolean {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  const content = loadContent(pack);
  return QUESTS_CONTRACTS_5.newChains.every(
    (id) => ContractSystem.chainLength(content, id) === 3,
  );
}
