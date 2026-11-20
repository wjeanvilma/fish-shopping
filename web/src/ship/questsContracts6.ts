/**
 * Finish 6.0 Phase 13 — quests/contracts expansion ship catalog
 * (mirrors shared/ship/quests-contracts-6.json).
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import catalogJson from "../../../shared/ship/quests-contracts-6.json";
import { ContractSystem, loadContent } from "../engine";

export interface QuestsContracts6ShipCatalog {
  phase: number;
  plan: string;
  schema: string;
  contentVersion: string;
  schemaVersion: number;
  questsContracts6Marker: string;
  questsMin: number;
  deliveryChainsMin: number;
  reputationGatedMin: number;
  contractTemplatesMin: number;
  newQuests: string[];
  newChains: string[];
  newChainHeads: string[];
  newReputationGated: string[];
  newBoardContracts: string[];
  extendsQuestsContracts5: string;
  parityFixture: string;
  authorTool: string;
  validateScript: string;
  simHzInvariant: number;
  kickoffCatalog: string;
  checklist: string[];
  preflightGates: string[];
}

export const QUESTS_CONTRACTS_6 = catalogJson as unknown as QuestsContracts6ShipCatalog;
export const QUESTS_CONTRACTS_6_PHASE = QUESTS_CONTRACTS_6.phase;
export const QUESTS_CONTRACTS_6_SCHEMA = QUESTS_CONTRACTS_6.schema;
export const QUESTS_CONTRACTS_6_MARKER = QUESTS_CONTRACTS_6.questsContracts6Marker;
export const QUESTS6_QUESTS_MIN = QUESTS_CONTRACTS_6.questsMin;
export const QUESTS6_CHAINS_MIN = QUESTS_CONTRACTS_6.deliveryChainsMin;
export const QUESTS6_REP_GATED_MIN = QUESTS_CONTRACTS_6.reputationGatedMin;
export const QUESTS6_TEMPLATES_MIN = QUESTS_CONTRACTS_6.contractTemplatesMin;

export interface QuestsContracts6Measure {
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

export function measureQuestsContracts6(repoRoot: string): QuestsContracts6Measure {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  const content = loadContent(pack);
  const kickoff = readJson(resolve(repoRoot, "shared/ship/finish-6.0-kickoff.json"));

  const chains = new Set(
    content.raw.contracts.templates.map((t) => t.chainId).filter((id): id is string => !!id),
  );
  const repGated = content.raw.contracts.templates.filter((t) => t.requiresReputationBand != null);

  const newQuestsPresent = QUESTS_CONTRACTS_6.newQuests.every((id) => content.questsById.has(id));
  const newChainsPresent = QUESTS_CONTRACTS_6.newChains.every((id) => chains.has(id));
  const newRepGatedPresent = QUESTS_CONTRACTS_6.newReputationGated.every((id) =>
    content.contractTemplatesById.has(id),
  );

  const missingGates: string[] = [];
  for (const gate of QUESTS_CONTRACTS_6.preflightGates) {
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
      (kickoff.gapTargets?.questsMin ?? 0) >= QUESTS6_QUESTS_MIN &&
      (kickoff.gaps?.questsRemaining ?? 1) === 0 &&
      (kickoff.gapTargets?.chainsMin ?? 0) >= QUESTS6_CHAINS_MIN,
    missingGates,
  };
}

export function chainLengthsOk(repoRoot: string): boolean {
  const pack = readJson(resolve(repoRoot, "shared/content/content-pack.json"));
  const content = loadContent(pack);
  return QUESTS_CONTRACTS_6.newChains.every(
    (id) => ContractSystem.chainLength(content, id) === 3,
  );
}
