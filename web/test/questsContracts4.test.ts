import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ContractSystem, loadContent } from "../src/engine";
import {
  QUESTS4_CHAINS_MIN,
  QUESTS4_QUESTS_MIN,
  QUESTS4_REP_GATED_MIN,
  QUESTS_CONTRACTS_4,
  QUESTS_CONTRACTS_4_MARKER,
  QUESTS_CONTRACTS_4_PHASE,
  measureQuestsContracts4,
} from "../src/ship/questsContracts4";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
/** Finish 4.0 Phase 29 parity-lock suite fixture. */
const PARITY_QUESTS_CONTRACTS_4 = "shared/fixtures/parity-quests-contracts-4.json";

describe("quests/contracts 4 (Finish 4.0 Phase 14)", () => {
  it("locks catalog floors and new content ids", () => {
    expect(PARITY_QUESTS_CONTRACTS_4).toContain("parity-quests-contracts-4.json");
    expect(QUESTS_CONTRACTS_4_PHASE).toBe(14);
    expect(QUESTS_CONTRACTS_4_MARKER).toBe("authored-finish-4.0-phase-14");
    expect(QUESTS_CONTRACTS_4.newQuests).toHaveLength(18);
    expect(QUESTS_CONTRACTS_4.newChains).toEqual(["chain.mist_runner", "chain.prism_relay"]);

    const pack = loadContent(
      JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
    );
    expect(pack.raw.quests.length).toBeGreaterThanOrEqual(QUESTS4_QUESTS_MIN);
    expect(pack.questsById.has("quest.market_legend")).toBe(true);
    const chains = new Set(
      pack.raw.contracts.templates.map((t) => t.chainId).filter((id): id is string => !!id),
    );
    expect(chains.size).toBeGreaterThanOrEqual(QUESTS4_CHAINS_MIN);
    expect(chains.has("chain.mist_runner")).toBe(true);
    expect(chains.has("chain.prism_relay")).toBe(true);
    expect(ContractSystem.chainLength(pack, "chain.mist_runner")).toBe(3);
    expect(ContractSystem.chainLength(pack, "chain.prism_relay")).toBe(3);
    const rep = pack.raw.contracts.templates.filter((t) => t.requiresReputationBand != null);
    expect(rep.length).toBeGreaterThanOrEqual(QUESTS4_REP_GATED_MIN);
    expect(
      (storeListing as { questsContracts4Phase?: number }).questsContracts4Phase,
    ).toBe(14);
  });

  it("measures kickoff quest floors closed", () => {
    const m = measureQuestsContracts4(root);
    expect(m.questCount).toBeGreaterThanOrEqual(50);
    expect(m.chainCount).toBeGreaterThanOrEqual(5);
    expect(m.repGatedCount).toBeGreaterThanOrEqual(6);
    expect(m.templateCount).toBeGreaterThanOrEqual(55);
    expect(m.newQuestsPresent).toBe(true);
    expect(m.newChainsPresent).toBe(true);
    expect(m.newRepGatedPresent).toBe(true);
    expect(m.kickoffQuestsMet).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("quests4:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-quests-contracts-4.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK quests4:validate");
  }, 90_000);
});
