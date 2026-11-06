import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GameState, Simulation, buildView, loadContent } from "../src/engine";
import { CustomerCrowd, stackVisibility } from "../src/render/presenters";

const content = loadContent(JSON.parse(readFileSync(resolve(__dirname, "../../shared/content/content-pack.json"), "utf8")));
const newSim = () => new Simulation(content, GameState.newGame(content, "harbor.sunrise_pier", 7));

describe("stackVisibility", () => {
  it("shows one slot per unit, with the right kind, in bag order", () => {
    const sim = newSim();
    sim.state.player.bag.add("product.basic_portion", 2);
    sim.state.player.bag.add("species.silver_sprat", 1);
    sim.state.machines[0]!.input.add("species.silver_sprat", 3);
    sim.state.counters[0]!.stock.add("product.basic_portion", 1);
    const names = ["Bag_0_portion", "Bag_1_portion", "Bag_2_fish", "Bag_2_portion", "Bag_3_fish",
      "In_cutter_1_2", "In_cutter_1_3", "Out_cutter_1_0", "Stock_portions_1_0", "Stock_portions_1_1"];
    const shown = Object.fromEntries(stackVisibility(buildView(sim), names));
    expect(shown).toEqual({
      Bag_0_portion: true, Bag_1_portion: true, Bag_2_fish: true, Bag_2_portion: false, Bag_3_fish: false,
      In_cutter_1_2: true, In_cutter_1_3: false, Out_cutter_1_0: false,
      Stock_portions_1_0: true, Stock_portions_1_1: false,
    });
  });
});

describe("CustomerCrowd", () => {
  it("walks departing customers back to the entry, then frees the model", () => {
    const sim = newSim();
    sim.run(160 + 120); // one customer spawned and arrived
    const crowd = new CustomerCrowd(3);
    let frame = crowd.update(buildView(sim), 0.016);
    expect(frame.filter(Boolean)).toHaveLength(1);
    sim.state.customers.splice(0); // customer leaves the simulation
    const v = buildView(sim);
    frame = crowd.update(v, 0.016);
    expect(frame.filter(Boolean)).toHaveLength(1); // still visible, walking out
    for (let i = 0; i < 800 && frame.some(Boolean); i++) frame = crowd.update(v, 0.05);
    expect(frame.every((m) => m === null)).toBe(true);
  });
});
