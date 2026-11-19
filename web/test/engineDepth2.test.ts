import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ContractState,
  ContractSystem,
  CustomerState,
  CustomerSystem,
  GameState,
  ProgressionSystem,
  SCHEMA_VERSION,
  Simulation,
  Stats,
  buildView,
  coachingObjective,
  emptyStateTip,
  loadContent,
} from "../src/engine";
import {
  ENGINE_DEPTH_2_MARKER,
  ENGINE_DEPTH_2_PHASE,
  measureEngineDepth2,
} from "../src/ship/engineDepth2";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

function newSim(seed = 42): Simulation {
  return new Simulation(content, GameState.newGame(content, "harbor.sunrise_pier", seed));
}

describe("Engine depth 2 (Finish 5.0 Phase 3)", () => {
  it("locks phase 3 catalog floors", () => {
    expect(ENGINE_DEPTH_2_PHASE).toBe(3);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(25);
    expect(ENGINE_DEPTH_2_MARKER).toBe("authored-finish-5.0-phase-3");
    expect((storeListing as { engineDepth2Phase?: number }).engineDepth2Phase).toBe(3);
  });

  it("measures customers/contracts/progression wiring", () => {
    const m = measureEngineDepth2(root);
    expect(m.viewFieldCount).toBeGreaterThanOrEqual(5);
    expect(m.viewFieldsPresent).toBe(true);
    expect(m.coachingContextsPresent).toBe(true);
    expect(m.helpersPresent).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("exposes service and contract pressure on the view", () => {
    const sim = newSim();
    sim.state.tutorialIndex = content.tutorial.length;
    const v0 = buildView(sim);
    expect(v0.serviceQueuePressurePermille).toBe(0);
    expect(v0.minPatienceTicksLeft).toBeNull();
    expect(v0.ticksUntilNearestContractDeadline).toBeNull();
    expect(v0.contractBoardPressurePermille).toBe(0);

    const harbor = content.harborsById.get("harbor.sunrise_pier")!;
    const counterId = harbor.counters[0]!.id;
    sim.state.customers.push(
      new CustomerState("c-pressure", content.customers[0]!.id, counterId, 1, 25, 0),
    );
    const pressure = CustomerSystem.serviceQueuePressurePermille(content, sim.state, harbor);
    expect(pressure).toBeGreaterThan(0);
    expect(CustomerSystem.minPatienceTicksLeft(sim.state)).toBe(25);

    sim.state.completedQuests.add("quest.first_ten_sales");
    sim.state.stats.set(Stats.CONTRACT_FAIL_STREAK, 3);
    expect(ContractSystem.contractBoardPressurePermille(content, sim.state)).toBeGreaterThanOrEqual(1000);

    const template = content.contracts.templates[0]!;
    sim.state.activeContracts.push(
      new ContractState("job-1", template.id, template.item, 1, 0, sim.state.tick + 50, 10, 5),
    );
    expect(ContractSystem.ticksUntilNearestDeadline(sim.state)).toBe(50);

    const questProgress = ProgressionSystem.nextQuestProgressPermille(content, sim.state);
    expect(questProgress === null || questProgress >= 0).toBe(true);

    const v = buildView(sim);
    expect(v.serviceQueuePressurePermille).toBe(pressure);
    expect(v.minPatienceTicksLeft).toBe(25);
    expect(v.ticksUntilNearestContractDeadline).toBe(50);
    expect(v.contractBoardPressurePermille).toBeGreaterThanOrEqual(1000);
  });

  it("coaches fail streak and impatient front", () => {
    const sim = newSim();
    sim.state.tutorialIndex = content.tutorial.length;
    for (const q of content.quests) sim.state.completedQuests.add(q.id);
    sim.state.completedQuests.add("quest.first_ten_sales");
    sim.state.bumpStat(Stats.FISH_CAUGHT, 5);
    sim.state.bumpStat(Stats.MACHINE_INPUTS, 1);
    sim.state.stats.set(Stats.CONTRACT_FAIL_STREAK, content.contracts.failStreakThreshold ?? 3);
    const tip = emptyStateTip(content, sim.state);
    expect(tip).toContain("Contract fail streak");

    const harbor = content.harborsById.get("harbor.sunrise_pier")!;
    sim.state.stats.set(Stats.CONTRACT_FAIL_STREAK, 0);
    // Stock the counter so the empty-counter tip does not win over impatient coaching.
    sim.state.counters[0]!.stock.add("product.basic_portion", 2);
    sim.state.customers.push(
      new CustomerState("c-imp", content.customers[0]!.id, harbor.counters[0]!.id, 1, 10, 0),
    );
    const tip2 = emptyStateTip(content, sim.state);
    expect(tip2).toBe("Front of the line is impatient — serve them before they walk out");
    expect(coachingObjective(content, sim.state)?.eyebrow).toBe("TIP");
  });

  it("enginedepth2:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-engine-depth-2.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK enginedepth2:validate");
  });
});
