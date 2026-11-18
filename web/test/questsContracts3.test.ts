import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ContractSystem, loadContent } from "../src/engine";
import {
  QUESTS3_CHAINS_MIN,
  QUESTS3_QUESTS_MIN,
  QUESTS3_REP_GATED_MIN,
  QUESTS_CONTRACTS_3_MARKER,
  QUESTS_CONTRACTS_3_PHASE,
} from "../src/ship/questsContracts3";

const root = resolve(__dirname, "../..");

describe("quests/contracts 3 (Finish 3.0 Phase 27)", () => {
  it("locks catalog floors and new content ids", () => {
    expect(QUESTS_CONTRACTS_3_PHASE).toBe(27);
    expect(QUESTS_CONTRACTS_3_MARKER).toBe("authored-finish-3.0-phase-27");
    const pack = loadContent(
      JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
    );
    expect(pack.raw.quests.length).toBeGreaterThanOrEqual(QUESTS3_QUESTS_MIN);
    expect(pack.questsById.has("quest.endgame_beacon")).toBe(true);
    const chains = new Set(
      pack.raw.contracts.templates.map((t) => t.chainId).filter((id): id is string => !!id),
    );
    expect(chains.size).toBeGreaterThanOrEqual(QUESTS3_CHAINS_MIN);
    expect(chains.has("chain.dawn_express")).toBe(true);
    expect(ContractSystem.chainLength(pack, "chain.dawn_express")).toBe(3);
    const rep = pack.raw.contracts.templates.filter((t) => t.requiresReputationBand != null);
    expect(rep.length).toBeGreaterThanOrEqual(QUESTS3_REP_GATED_MIN);
    expect(
      (JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
        questsContracts3Phase?: number;
      }).questsContracts3Phase,
    ).toBe(27);
    expect(
      readFileSync(resolve(root, "shared/fixtures/parity-quests-contracts-3.json"), "utf8"),
    ).toContain("questsContracts3Marker");
  });

  it("quests3:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-quests-contracts-3.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK quests3:validate");
  }, 60_000);
});
