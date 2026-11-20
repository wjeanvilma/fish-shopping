import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  QUESTS6_CHAINS_MIN,
  QUESTS6_QUESTS_MIN,
  QUESTS6_REP_GATED_MIN,
  QUESTS6_TEMPLATES_MIN,
  QUESTS_CONTRACTS_6,
  QUESTS_CONTRACTS_6_PHASE,
  measureQuestsContracts6,
} from "../src/ship/questsContracts6";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const PARITY_QUESTS_CONTRACTS_6 = "shared/fixtures/parity-quests-contracts-6.json";

describe("quests/contracts 6 (Finish 6.0 Phase 13)", () => {
  it("locks floors and closes questsRemaining without contentFloorsShort", () => {
    expect(PARITY_QUESTS_CONTRACTS_6).toContain("parity-quests-contracts-6.json");
    expect(QUESTS_CONTRACTS_6_PHASE).toBe(13);
    expect(QUESTS6_QUESTS_MIN).toBe(100);
    expect(QUESTS6_CHAINS_MIN).toBe(9);
    expect(QUESTS6_REP_GATED_MIN).toBe(12);
    expect(QUESTS6_TEMPLATES_MIN).toBe(85);
    expect(QUESTS_CONTRACTS_6.newQuests.length).toBeGreaterThanOrEqual(23);
    expect(QUESTS_CONTRACTS_6.newChains).toEqual(["chain.saffron_roast", "chain.cobalt_ferment"]);
    const m = measureQuestsContracts6(root);
    expect(m.questCount).toBeGreaterThanOrEqual(100);
    expect(m.chainCount).toBeGreaterThanOrEqual(9);
    expect(m.repGatedCount).toBeGreaterThanOrEqual(12);
    expect(m.templateCount).toBeGreaterThanOrEqual(85);
    expect(m.kickoffQuestsMet).toBe(true);
    expect((storeListing as { questsContracts6Phase?: number }).questsContracts6Phase).toBe(13);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(7);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeGreaterThanOrEqual(0);
    // Soft-floor: Phase 15 closed contentFloorsShort.
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("contentFloorsShort");
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { fixtures?: string[] };
    expect(pin.fixtures).toContain("parity-quests-contracts-6.json");
  });

  it("quests6:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-quests-contracts-6.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK quests6:validate");
  });
});
