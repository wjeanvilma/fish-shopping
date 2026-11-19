import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ContractSystem, loadContent } from "../src/engine";
import {
  QUESTS5_CHAINS_MIN,
  QUESTS5_QUESTS_MIN,
  QUESTS5_REP_GATED_MIN,
  QUESTS_CONTRACTS_5,
  QUESTS_CONTRACTS_5_MARKER,
  QUESTS_CONTRACTS_5_PHASE,
  measureQuestsContracts5,
} from "../src/ship/questsContracts5";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const PARITY_QUESTS_CONTRACTS_5 = "shared/fixtures/parity-quests-contracts-5.json";

describe("quests/contracts 5 (Finish 5.0 Phase 16)", () => {
  it("locks catalog floors and new content ids", () => {
    expect(PARITY_QUESTS_CONTRACTS_5).toContain("parity-quests-contracts-5.json");
    expect(QUESTS_CONTRACTS_5_PHASE).toBe(16);
    expect(QUESTS_CONTRACTS_5_MARKER).toBe("authored-finish-5.0-phase-16");
    expect(QUESTS_CONTRACTS_5.newQuests).toHaveLength(23);
    expect(QUESTS_CONTRACTS_5.newChains).toEqual(["chain.aurora_run", "chain.tideglass_ferry"]);

    const pack = loadContent(
      JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
    );
    expect(pack.raw.quests.length).toBeGreaterThanOrEqual(QUESTS5_QUESTS_MIN);
    expect(pack.questsById.has("quest.legend_circuit")).toBe(true);
    const chains = new Set(
      pack.raw.contracts.templates.map((t) => t.chainId).filter((id): id is string => !!id),
    );
    expect(chains.size).toBeGreaterThanOrEqual(QUESTS5_CHAINS_MIN);
    expect(chains.has("chain.aurora_run")).toBe(true);
    expect(chains.has("chain.tideglass_ferry")).toBe(true);
    expect(ContractSystem.chainLength(pack, "chain.aurora_run")).toBe(3);
    expect(ContractSystem.chainLength(pack, "chain.tideglass_ferry")).toBe(3);
    const rep = pack.raw.contracts.templates.filter((t) => t.requiresReputationBand != null);
    expect(rep.length).toBeGreaterThanOrEqual(QUESTS5_REP_GATED_MIN);
    expect(
      (storeListing as { questsContracts5Phase?: number }).questsContracts5Phase,
    ).toBe(16);
  });

  it("measures kickoff quest floors closed", () => {
    const m = measureQuestsContracts5(root);
    expect(m.questCount).toBeGreaterThanOrEqual(75);
    expect(m.chainCount).toBeGreaterThanOrEqual(7);
    expect(m.repGatedCount).toBeGreaterThanOrEqual(9);
    expect(m.templateCount).toBeGreaterThanOrEqual(70);
    expect(m.newQuestsPresent).toBe(true);
    expect(m.newChainsPresent).toBe(true);
    expect(m.newRepGatedPresent).toBe(true);
    expect(m.kickoffQuestsMet).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("quests5:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-quests-contracts-5.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK quests5:validate");
  }, 90_000);
});
