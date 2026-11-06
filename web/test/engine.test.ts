/** Behaviour tests ported from game-core SimulationTest / ContentAndInventoryTest. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type Command, ContentError, FixedStepClock, FishingSystem, GameState, Inventory, NewerSaveError, OfflinePolicy,
  OFFLINE_CAP_TICKS, SafeMath, Simulation, SnapshotError, Transfers, buildView, decodeSnapshot,
  encodeSnapshot, loadContent, MS_PER_TICK,
} from "../src/engine";

const raw = readFileSync(resolve(__dirname, "../../shared/content/content-pack.json"), "utf8");
const content = loadContent(JSON.parse(raw));
const HARBOR = "harbor.sunrise_pier";
const SPRAT = "species.silver_sprat";
const PORTION = "product.basic_portion";

const newSim = (seed = 1234) => new Simulation(content, GameState.newGame(content, HARBOR, seed));

function checkedStep(sim: Simulation, cmds: Command[] = []) {
  const events = sim.step(cmds);
  expect(sim.invariantProblems()).toEqual([]);
  return events;
}

function walkTo(sim: Simulation, x: number, z: number) {
  for (let i = 0; i < 2000; i++) {
    const p = sim.state.player;
    const dx = x - p.x, dz = z - p.z;
    const dist = SafeMath.isqrt(dx * dx + dz * dz);
    if (dist <= 50) { checkedStep(sim, [{ type: "move", x: 0, z: 0 }]); return; }
    const speed = content.player.moveSpeedMmPerTick;
    const scale = dist < speed ? Math.trunc((1000 * dist) / speed) : 1000;
    checkedStep(sim, [{ type: "move", x: Math.trunc((dx * scale) / dist), z: Math.trunc((dz * scale) / dist) }]);
  }
  throw new Error("did not arrive");
}

describe("foundations", () => {
  it("safe math and isqrt", () => {
    expect(SafeMath.creditCoins(Number.MAX_SAFE_INTEGER - 1, 10)).toBe(Number.MAX_SAFE_INTEGER);
    expect(() => SafeMath.multiply(Number.MAX_SAFE_INTEGER, 2)).toThrow();
    expect(SafeMath.isqrt(999)).toBe(31);
    expect(SafeMath.isqrt(1_000_000)).toBe(1000);
  });
  it("clock caps catch-up and ignores backwards time", () => {
    const c = new FixedStepClock(5);
    expect(c.advance(0)).toBe(0);
    expect(c.advance(MS_PER_TICK)).toBe(1);
    expect(c.advance(MS_PER_TICK * 100)).toBe(5);
    expect(c.advance(MS_PER_TICK * 99)).toBe(0);
  });
  it("offline credit is clamped", () => {
    expect(OfflinePolicy.creditedTicks(-60_000)).toBe(0);
    expect(OfflinePolicy.creditedTicks(1000)).toBe(20);
    expect(OfflinePolicy.creditedTicks(48 * 3600 * 1000)).toBe(OFFLINE_CAP_TICKS);
  });
});

describe("content", () => {
  const expectError = (mutate: (s: string) => string, fragment: string) => {
    expect(() => loadContent(JSON.parse(mutate(raw)))).toThrow(ContentError);
    try { loadContent(JSON.parse(mutate(raw))); } catch (e) { expect((e as Error).message).toContain(fragment); }
  };
  it("reports broken references, cycles, types and duplicates", () => {
    expectError((s) => s.replace('"machine": "machine.basic_cutter",\n      "inputs"', '"machine": "machine.nope",\n      "inputs"'), "unknown machine 'machine.nope'");
    expectError((s) => s.replace('"requires": [],', '"requires": ["upgrade.bag_capacity_3"],'), "cycle");
    expectError((s) => s.replace('"catchTicks": 80', '"catchTicks": "80"'), "$.species.0.catchTicks");
    expectError((s) => s.replace('"id": "species.blue_mackerel"', '"id": "species.silver_sprat"'), "Duplicate id 'species.silver_sprat'");
  });
});

describe("inventory", () => {
  const units = (i: string) => (i === "big" ? 3 : 1);
  it("transfer moves min(available, room, requested)", () => {
    const a = new Inventory("a", 10, units); a.add("fish", 6);
    const b = new Inventory("b", 4, units); b.add("fish", 1);
    expect(Transfers.move(a, b, "fish", 5)).toBe(3);
    expect(Transfers.move(a, b, "fish", 5)).toBe(0);
  });
  it("reserved stock cannot be taken twice", () => {
    const c = new Inventory("c", 10, units); c.add("portion", 3);
    expect(c.reserve("portion", 2)).toBe(true);
    expect(c.reserve("portion", 2)).toBe(false);
    c.takeReserved("portion", 2);
    expect(c.quantity("portion")).toBe(1);
    expect(c.invariantProblems()).toEqual([]);
  });
});

describe("simulation", () => {
  it("fills the bag from the pier catch table then stops", () => {
    const sim = newSim();
    walkTo(sim, -14250, 0);
    const catches: { tick: number; speciesId: string }[] = [];
    for (let i = 0; i < 800; i++) {
      checkedStep(sim).forEach((e) => {
        if (e.type === "fish_caught") catches.push({ tick: e.tick, speciesId: e.speciesId });
      });
      if (sim.state.player.bag.freeUnits() === 0) break;
    }
    expect(catches.length).toBeGreaterThan(0);
    expect(sim.state.player.bag.freeUnits()).toBe(0);
    for (let i = 1; i < catches.length; i++) {
      const expected = content.speciesById.get(catches[i]!.speciesId)!.catchTicks;
      expect(catches[i]!.tick - catches[i - 1]!.tick).toBe(expected);
    }
    expect(buildView(sim).context?.lines[0]).toBe("Bag full - deliver your catch");
    const more = Array.from({ length: 200 }, () => checkedStep(sim)).flat()
      .filter((e) => e.type === "fish_caught");
    expect(more).toHaveLength(0);
  });

  it("pier catch table produces multiple species", () => {
    const sim = newSim(42);
    sim.state.player.bag.capacityUnits = 40;
    walkTo(sim, -14250, 0);
    const species = new Set<string>();
    for (let i = 0; i < 4000; i++) {
      checkedStep(sim).forEach((e) => { if (e.type === "fish_caught") species.add(e.speciesId); });
      if (species.size >= 3) break;
    }
    expect(species.size).toBeGreaterThanOrEqual(3);
    const pier = content.harborsById.get(HARBOR)!.fishingSpots[0]!.species;
    for (const id of species) expect(pier).toContain(id);
  });

  it("fishing only rolls species that fit the bag", () => {
    const sim = newSim(7);
    sim.state.player.bag.capacityUnits = 5;
    sim.state.player.bag.add(SPRAT, 4);
    expect(sim.state.player.bag.freeUnits()).toBe(1);
    walkTo(sim, -14250, 0);
    const catches: string[] = [];
    for (let i = 0; i < 600; i++) {
      checkedStep(sim).forEach((e) => { if (e.type === "fish_caught") catches.push(e.speciesId); });
      if (sim.state.player.bag.freeUnits() === 0) break;
    }
    expect(catches).toHaveLength(1);
    expect(content.speciesById.get(catches[0]!)!.carryUnits).toBe(1);
    expect(sim.state.player.bag.freeUnits()).toBe(0);
    expect(sim.state.player.bag.roomFor("species.copper_mullet")).toBe(0);
    expect(sim.state.player.bag.roomFor("species.king_grouper")).toBe(0);
  });

  it("batch outputs exactly once after its duration", () => {
    const sim = newSim();
    const m = sim.state.machines.find((mm) => mm.stationId === "station.cutter_1")!;
    m.input.add(SPRAT, 1);
    const events = Array.from({ length: 150 }, () => checkedStep(sim)).flat();
    const started = events.filter((e) => e.type === "batch_started");
    const done = events.filter((e) => e.type === "batch_completed");
    expect(started).toHaveLength(1);
    expect(done).toHaveLength(1);
    expect(done[0]!.tick - started[0]!.tick).toBe(100);
    expect(m.output.quantity(PORTION)).toBe(2);
  });

  it("purchase is validated and retry-safe", () => {
    const sim = newSim();
    sim.state.coins = 100;
    const first = checkedStep(sim, [{ type: "purchase_upgrade", upgradeId: "upgrade.bag_capacity_2", requestId: "r1" }]);
    const retry = checkedStep(sim, [{ type: "purchase_upgrade", upgradeId: "upgrade.bag_capacity_2", requestId: "r1" }]);
    expect(first.find((e) => e.type === "upgrade_purchased")).toMatchObject({ replayed: false });
    expect(retry.find((e) => e.type === "upgrade_purchased")).toMatchObject({ replayed: true });
    expect(sim.state.coins).toBe(60);
    expect(sim.state.player.bag.capacityUnits).toBe(8);
  });

  it("refuses corrupt and newer saves", () => {
    const sim = newSim();
    sim.run(5);
    const saved = encodeSnapshot(content, sim.state);
    expect(() => decodeSnapshot(content, saved.replace('"tick":5', '"tick":6'))).toThrow(/Checksum/);
    expect(() => decodeSnapshot(content, saved.replace('"schemaVersion":4', '"schemaVersion":99'))).toThrow(NewerSaveError);
    expect(() => decodeSnapshot(content, "{")).toThrow(SnapshotError);
  });

  it("customers walk in before they can be served", () => {
    const sim = newSim();
    sim.state.counters[0]!.stock.add(PORTION, 5);
    sim.run(160);
    const c = sim.state.customers[0]!;
    expect(c.walkTicksLeft).toBeGreaterThan(0);
    const patience = c.patienceLeft;
    sim.run(c.walkTicksLeft - 1);
    expect(c.patienceLeft).toBe(patience);
    expect(sim.state.counters[0]!.stock.reservedQuantity(PORTION)).toBe(0);
    sim.run(2);
    expect(c.arrived).toBe(true);
    expect(sim.state.counters[0]!.stock.reservedQuantity(PORTION)).toBeGreaterThan(0);
    expect(buildView(sim).customers[0]).toMatchObject({ arrived: true, xMm: 3000, zMm: 5200 });
  });

  it("product ladder produces fillet and premium and sells mixed stock", () => {
    const sim = newSim();
    const m = sim.state.machines.find((mm) => mm.stationId === "station.cutter_1")!;
    const counter = sim.state.counters[0]!;
    const fillet = "product.fillet";
    const premium = "product.premium_portion";
    m.input.add("species.blue_mackerel", 1);
    m.input.add("species.amber_snapper", 1);
    sim.run(300);
    expect(m.output.quantity(fillet)).toBe(2);
    expect(m.output.quantity(premium)).toBe(2);
    counter.stock.add(PORTION, 1);
    counter.stock.add(fillet, 1);
    counter.stock.add(premium, 1);
    walkTo(sim, 3000, 2750);
    const sales = Array.from({ length: 800 }, () => checkedStep(sim)).flat()
      .filter((e) => e.type === "sale_committed");
    expect(sales.length).toBeGreaterThan(0);
    expect(sales.some((e) => e.type === "sale_committed" && e.coins >= 12)).toBe(true);
    expect(counter.stock.usedUnits()).toBe(0);
  });

  it("smoker turns fillets into smoked fillets", () => {
    const sim = newSim();
    expect(sim.state.machines).toHaveLength(2);
    const s = sim.state.machines.find((mm) => mm.stationId === "station.smoker_1")!;
    s.input.add("product.fillet", 1);
    const events = Array.from({ length: 200 }, () => checkedStep(sim)).flat();
    const started = events.filter((e) => e.type === "batch_started");
    const done = events.filter((e) => e.type === "batch_completed");
    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({ recipeId: "recipe.smoke_fillet", stationId: "station.smoker_1" });
    expect(done[0]!.tick - started[0]!.tick).toBe(150);
    expect(s.output.quantity("product.smoked_fillet")).toBe(1);
  });

  it("catch speed upgrade shortens cast duration", () => {
    const sim = newSim();
    sim.state.player.catchSpeedPermille = 2000;
    walkTo(sim, -14250, 0);
    for (let i = 0; i < 5; i++) checkedStep(sim);
    expect(sim.state.player.fishingSpecies).not.toBeNull();
    const rolled = content.speciesById.get(sim.state.player.fishingSpecies!)!;
    const expected = FishingSystem.catchTicksFor(2000, rolled.catchTicks);
    expect(sim.state.player.fishingCatchTicks).toBe(expected);
    expect(expected).toBeLessThan(rolled.catchTicks);
  });

  it("perfect reel finishes cast early and pays timing bonus", () => {
    const sim = newSim(99);
    walkTo(sim, -14250, 0);
    for (let i = 0; i < 5; i++) checkedStep(sim);
    expect(sim.state.player.fishingSpecies).not.toBeNull();
    const duration = sim.state.player.fishingCatchTicks;
    const windowStart = Math.trunc((duration * 650) / 1000);
    while (sim.state.player.fishingProgress < windowStart) checkedStep(sim);
    expect(buildView(sim).fishingTimingWindow).toBe(true);
    expect(buildView(sim).fishingCanReel).toBe(true);
    const beforeCoins = sim.state.coins;
    const events = checkedStep(sim, [{ type: "reel" }]);
    const caught = events.filter((e) => e.type === "fish_caught");
    expect(caught).toHaveLength(1);
    expect(caught[0]).toMatchObject({ timingBonus: true });
    expect(sim.state.stat("stat.timing_bonuses")).toBeGreaterThanOrEqual(1);
    expect(sim.state.coins).toBeGreaterThan(beforeCoins);
    expect(sim.state.player.fishingSpecies).toBeNull();
  });

  it("smoker pads transfer fillet in and smoked out", () => {
    const sim = newSim();
    const smoker = () => sim.state.machines.find((mm) => mm.stationId === "station.smoker_1")!;
    sim.state.player.bag.add("product.fillet", 1);
    walkTo(sim, 6300, -4000);
    expect(sim.state.player.zoneId).toBe("zone.smoker_in");
    // Transfer then production can consume the fillet on the same tick.
    for (let i = 0; i < 40; i++) {
      checkedStep(sim);
      if (sim.state.player.bag.isEmpty() &&
        (smoker().input.quantity("product.fillet") === 1 || smoker().activeBatch !== null)) break;
    }
    expect(sim.state.player.bag.quantity("product.fillet")).toBe(0);
    for (let i = 0; i < 200 && smoker().output.quantity("product.smoked_fillet") < 1; i++) checkedStep(sim);
    expect(smoker().output.quantity("product.smoked_fillet")).toBe(1);
    // Walk around the smoker footprint to the output pad.
    walkTo(sim, 6300, -2000);
    walkTo(sim, 9300, -2000);
    walkTo(sim, 9300, -4000);
    expect(sim.state.player.zoneId).toBe("zone.smoker_out");
    for (let i = 0; i < 40 && sim.state.player.bag.quantity("product.smoked_fillet") < 1; i++) checkedStep(sim);
    expect(sim.state.player.bag.quantity("product.smoked_fillet")).toBe(1);
    expect(smoker().output.isEmpty()).toBe(true);
  });
});
