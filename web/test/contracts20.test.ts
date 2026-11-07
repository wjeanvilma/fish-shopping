import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ContractSystem,
  GameState,
  ReputationSystem,
  Simulation,
  Stats,
  buildView,
  loadContent,
} from "../src/engine";
import {
  CONTRACTS_20,
  CONTRACTS_20_PHASE,
  DELIVERY_CHAIN_FLOOR,
  REPUTATION_GATED_FLOOR,
} from "../src/ship/contracts20";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("Contracts 2.0 (Finish 2.0 Phase 17)", () => {
  it("locks catalog floors", () => {
    expect(CONTRACTS_20_PHASE).toBe(17);
    expect(DELIVERY_CHAIN_FLOOR).toBe(2);
    expect(REPUTATION_GATED_FLOOR).toBe(2);
    expect((JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
      contracts2Phase?: number;
    }).contracts2Phase).toBe(17);
    for (const id of CONTRACTS_20.chainHeads) {
      expect(content.contractTemplatesById.has(id)).toBe(true);
    }
  });

  it("advances morning chain, fail streak, and rep gate", () => {
    const fx = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/parity-contracts-2.0.json"), "utf8"),
    );
    expect(ContractSystem.chainLength(content, fx.chainId)).toBe(fx.chainLength);

    const sim = new Simulation(content, GameState.newGame(content, fx.harborId, fx.seed));
    for (const req of content.contracts.requires) sim.state.completedQuests.add(req);
    sim.state.contractBoardRefreshAt = 0;
    sim.step([]);

    const head = content.contractTemplatesById.get(fx.chainHeadId)!;
    sim.state.contractOffers.length = 0;
    sim.state.contractOffers.push({
      id: "offer-chain",
      templateId: head.id,
      itemId: head.item,
      quantity: head.quantity,
      durationTicks: head.durationTicks,
      payout: head.payout,
      penalty: head.penalty,
    });
    sim.step([{ type: "accept_contract", offerId: "offer-chain", requestId: "accept-chain" }]);
    const job = sim.state.activeContracts[0]!;
    expect(job.templateId).toBe(fx.chainHeadId);

    sim.state.player.bag.add(head.item, head.quantity);
    sim.step([{ type: "deliver_contract", contractId: job.id, requestId: "deliver-1" }]);
    expect(sim.state.activeContracts).toHaveLength(1);
    expect(sim.state.activeContracts[0]!.templateId).toBe(fx.chainStep2Id);
    expect(ContractSystem.failStreak(sim.state)).toBe(0);
    const view = buildView(sim);
    expect(view.activeContracts[0]!.chainId).toBe(fx.chainId);
    expect(view.activeContracts[0]!.chainStep).toBe(2);

    sim.state.stats.set(Stats.CONTRACT_FAIL_STREAK, content.contracts.failStreakThreshold ?? 3);
    expect(ContractSystem.effectiveBoardSlots(content, sim.state)).toBeLessThan(content.contracts.boardSlots);

    const vip = content.contractTemplatesById.get(fx.repGatedId)!;
    expect(ContractSystem.templateEligibleForBoard(content, sim.state, vip)).toBe(false);
    sim.state.stats.set(Stats.SALES, 100);
    sim.state.stats.set(Stats.LOST_CUSTOMERS, 0);
    expect(ReputationSystem.band(content, sim.state)).toBeGreaterThanOrEqual(fx.repGatedBand);
    expect(ContractSystem.templateEligibleForBoard(content, sim.state, vip)).toBe(true);
  });

  it("contracts:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-contracts-2-0.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK contracts:validate");
  });
});
