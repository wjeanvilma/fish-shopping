/** Behaviour tests ported from game-core SimulationTest / ContentAndInventoryTest. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type Command, ContentError, CustomerState, CustomerSystem, FixedStepClock, FishingSystem, GameState, Inventory, NewerSaveError,
  OfflinePolicy, OFFLINE_CAP_TICKS, ProductionSystem, SafeMath, Simulation, SnapshotError, Transfers, applyOffline,
  buildView, decodeSnapshot, decodeSnapshotEnvelope, encodeSnapshot, loadContent, MS_PER_TICK,
} from "../src/engine";

const raw = readFileSync(resolve(__dirname, "../../shared/content/content-pack.json"), "utf8");
const content = loadContent(JSON.parse(raw));
const HARBOR = "harbor.sunrise_pier";
const SPRAT = "species.silver_sprat";
const PORTION = "product.basic_portion";

const newSim = (seed = 1234) => new Simulation(content, GameState.newGame(content, HARBOR, seed));
const cutter = (sim: Simulation) => sim.state.machines.find((m) => m.stationId === "station.cutter_1")!;
const smoker = (sim: Simulation) => sim.state.machines.find((m) => m.stationId === "station.smoker_1")!;
const unlockStaffHiring = (sim: Simulation) => { sim.state.completedQuests.add("quest.first_ten_sales"); };
const unlockSupervisorHiring = (sim: Simulation) => {
  unlockStaffHiring(sim);
  sim.state.ownedUpgrades.add("upgrade.staff_boots");
};

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
    expect(OfflinePolicy.capTicks(content)).toBe(OFFLINE_CAP_TICKS);
  });

  it("offline apply runs workers without player zone actions", () => {
    const sim = newSim();
    unlockStaffHiring(sim);
    sim.state.coins = 500;
    checkedStep(sim, [{ type: "hire_worker", roleId: "worker.porter", requestId: "hp-off" }]);
    cutter(sim).output.add(PORTION, 3);
    // Park the player on the pier — offline must clear the zone so they do not fish.
    sim.state.player.zoneId = "zone.pier_end";
    const beforeTick = sim.state.tick;
    const report = applyOffline(sim, 60_000); // 60s → 1200 ticks
    expect(report.ticksCredited).toBe(1200);
    expect(sim.state.tick).toBe(beforeTick + 1200);
    expect(sim.state.player.zoneId).toBe("zone.pier_end"); // restored
    expect(sim.state.stat("stat.worker_items_moved")).toBeGreaterThan(0);
    expect(OfflinePolicy.shouldShowSummary(content, report)).toBe(true);
  });

  it("snapshot envelope carries savedAtEpochMs without breaking checksum", () => {
    const sim = newSim();
    sim.run(5);
    const withAt = encodeSnapshot(content, sim.state, 1_700_000_000_000);
    const decoded = decodeSnapshotEnvelope(content, withAt);
    expect(decoded.savedAtEpochMs).toBe(1_700_000_000_000);
    expect(decoded.state.tick).toBe(5);
    // Round-trip without savedAt stays fixture-compatible.
    expect(encodeSnapshot(content, decoded.state)).toBe(encodeSnapshot(content, sim.state));
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
    const allowed = new Set([
      ...pier,
      ...pier.map((id) => content.speciesById.get(id)!.rareUpgrade?.to).filter((x): x is string => !!x),
    ]);
    for (const id of species) expect(allowed.has(id)).toBe(true);
  });

  it("species roster is harbor-gated with rare upgrade chains", () => {
    expect(content.contentVersion).toBe("0.26.0");
    expect(content.raw.species.length).toBe(24);
    const sunrise = content.harborsById.get("harbor.sunrise_pier")!.fishingSpots
      .flatMap((s) => s.species);
    const moon = content.harborsById.get("harbor.moon_cove")!.fishingSpots
      .flatMap((s) => s.species);
    for (const id of ["species.dawn_anchovy", "species.sail_needlefish", "species.tide_bass", "species.reef_perch"]) {
      expect(sunrise).toContain(id);
      expect(moon).not.toContain(id);
    }
    for (const id of ["species.moon_flounder", "species.ink_squid", "species.lava_eel", "species.ghost_lanternfish"]) {
      expect(moon).toContain(id);
      expect(sunrise).not.toContain(id);
    }
    expect(content.speciesById.get("species.copper_mullet")!.rareUpgrade?.to).toBe("species.bronze_mullet");
    expect(content.speciesById.get("species.amber_snapper")!.rareUpgrade?.to).toBe("species.ruby_snapper");
    expect(content.speciesById.get("species.dawn_anchovy")!.rareUpgrade?.to).toBe("species.silver_dawn_anchovy");
    expect(content.speciesById.get("species.ghost_lanternfish")!.rareUpgrade?.to).toBe("species.prism_lanternfish");
    for (const sp of content.raw.species) {
      expect(sp.asset).toMatch(/^models\/fish_.+\.glb$/);
    }
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
    expect(() => decodeSnapshot(content, saved.replace('"schemaVersion":10', '"schemaVersion":99'))).toThrow(NewerSaveError);
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

  it("premium visitor pays tip multiplier", () => {
    const sim = newSim();
    const counter = sim.state.counters[0]!;
    counter.stock.add(PORTION, 1);
    const type = content.customersById.get("customer.premium_visitor")!;
    sim.state.customers.push(new CustomerState("customer.test_premium", type.id, counter.counterId, 1, 9999, 0));
    walkTo(sim, 3000, 2750);
    const events = Array.from({ length: 80 }, () => checkedStep(sim)).flat();
    const sales = events.filter((e) => e.type === "sale_committed");
    expect(sales).toHaveLength(1);
    expect(sales[0]).toMatchObject({ priceMultPermille: type.priceMultPermille, coins: 7 });
    expect(sim.state.stat("stat.premium_sales")).toBe(1);
  });

  it("restaurant buyer uses bulk basket and counter shows kind", () => {
    const sim = newSim();
    const type = content.customersById.get("customer.restaurant_buyer")!;
    expect(type.kind).toBe("bulk");
    expect(type.basketMin).toBeGreaterThanOrEqual(6);
    const counter = sim.state.counters[0]!;
    counter.stock.add(PORTION, 10);
    sim.state.customers.push(new CustomerState("customer.test_bulk", type.id, counter.counterId, 8, 9999, 0));
    walkTo(sim, 3000, 2750);
    checkedStep(sim);
    expect(buildView(sim).context!.lines.some((l) => /Restaurant/.test(l) && /bulk/.test(l))).toBe(true);
    const events = Array.from({ length: 80 }, () => checkedStep(sim)).flat();
    const sales = events.filter((e) => e.type === "sale_committed");
    expect(sales).toHaveLength(1);
    expect(sales[0]!.type === "sale_committed" && sales[0].items.reduce((n, i) => n + i.quantity, 0)).toBe(8);
    expect(sim.state.stat("stat.bulk_sales")).toBe(1);
  });

  it("customer roster includes premium and bulk kinds", () => {
    expect(content.customers.some((c) => c.kind === "premium" && c.priceMultPermille > 1000)).toBe(true);
    expect(content.customers.some((c) => c.kind === "bulk" && c.basketMin >= 6)).toBe(true);
  });

  it("preferred product is reserved first and pays full price", () => {
    const sim = newSim();
    const counter = sim.state.counters[0]!;
    const fillet = "product.fillet";
    counter.stock.add(PORTION, 2);
    counter.stock.add(fillet, 1);
    const type = content.customersById.get("customer.local_shopper")!;
    sim.state.customers.push(new CustomerState(
      "customer.test_pref_met", type.id, counter.counterId, 1, 9999, 0, fillet,
    ));
    walkTo(sim, 3000, 2750);
    checkedStep(sim);
    const front = sim.state.customers[0]!;
    expect(front.reservedItems.get(fillet)).toBe(1);
    expect(front.preferenceMet()).toBe(true);
    expect(buildView(sim).context!.lines.some((l) => /Fillet/.test(l) && !/substituting/.test(l))).toBe(true);
    const events = Array.from({ length: 80 }, () => checkedStep(sim)).flat();
    const sales = events.filter((e) => e.type === "sale_committed");
    expect(sales).toHaveLength(1);
    expect(sales[0]).toMatchObject({
      preferenceMet: true, preferredProductId: fillet,
      priceMultPermille: type.priceMultPermille, coins: 12,
    });
    expect(sim.state.stat("stat.unmet_preference_sales")).toBe(0);
  });

  it("unmet preference lowers pay and shows substituting", () => {
    const sim = newSim();
    const counter = sim.state.counters[0]!;
    counter.stock.add(PORTION, 1);
    const type = content.customersById.get("customer.premium_visitor")!;
    const preferred = "product.premium_portion";
    sim.state.customers.push(new CustomerState(
      "customer.test_pref_unmet", type.id, counter.counterId, 1, 9999, 0, preferred,
    ));
    walkTo(sim, 3000, 2750);
    checkedStep(sim);
    expect(sim.state.customers[0]!.preferenceMet()).toBe(false);
    expect(buildView(sim).context!.lines.some((l) => /substituting/.test(l) && /Premium portion/.test(l))).toBe(true);
    const events = Array.from({ length: 80 }, () => checkedStep(sim)).flat();
    const sales = events.filter((e) => e.type === "sale_committed");
    expect(sales).toHaveLength(1);
    expect(sales[0]).toMatchObject({
      preferenceMet: false, preferredProductId: preferred,
      priceMultPermille: 900, coins: 4,
    });
    expect(sim.state.stat("stat.unmet_preference_sales")).toBe(1);
  });

  it("unmet preference drains patience faster while preferred is out", () => {
    const sim = newSim();
    const counter = sim.state.counters[0]!;
    const type = content.customersById.get("customer.local_shopper")!;
    sim.state.customers.push(new CustomerState(
      "customer.test_pref_drain", type.id, counter.counterId, 1, 100, 0, "product.fillet",
    ));
    sim.run(10);
    expect(sim.state.customers[0]!.patienceLeft).toBe(80);
  });

  it("customer roster defines product preferences", () => {
    expect(content.customers.every((c) => c.preferredProducts.length > 0)).toBe(true);
    expect(content.customers.every((c) => c.unmetPriceMultPermille >= 1 && c.unmetPriceMultPermille <= 1000)).toBe(true);
    expect(content.customers.every((c) => c.unmetPatienceDrainPermille >= 1000)).toBe(true);
  });

  it("rush windows spike spawn rate and show banner", () => {
    const sim = newSim();
    const harbor = sim.harbor;
    expect(harbor.rushes.length).toBeGreaterThan(0);
    const lunch = harbor.rushes.find((r) => r.id === "rush.lunch")!;
    sim.state.tick = lunch.startTick - 1;
    expect(CustomerSystem.activeRush(harbor, sim.state.tick)).toBeNull();
    expect(CustomerSystem.spawnIntervalTicks(harbor, sim.state.tick)).toBe(harbor.customerSpawnTicks);
    expect(buildView(sim).rush).toBeNull();

    const events = checkedStep(sim);
    const started = events.filter((e) => e.type === "rush_started");
    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({ rushId: lunch.id, name: lunch.name });
    expect(CustomerSystem.activeRush(harbor, sim.state.tick)?.id).toBe(lunch.id);
    const expectedInterval = Math.trunc((harbor.customerSpawnTicks * 1000) / lunch.spawnSpeedPermille);
    expect(CustomerSystem.spawnIntervalTicks(harbor, sim.state.tick)).toBe(expectedInterval);
    expect(buildView(sim).rush).toMatchObject({ name: lunch.name, ticksRemaining: lunch.durationTicks });

    sim.state.customers = [];
    sim.state.customerSpawnProgress = 0;
    const arrivals = Array.from({ length: expectedInterval }, () => checkedStep(sim)).flat()
      .filter((e) => e.type === "customer_arrived");
    expect(arrivals.length).toBeGreaterThan(0);
    expect(CustomerSystem.effectiveMaxQueue(harbor.counters[0]!, lunch))
      .toBe(harbor.counters[0]!.maxQueue + lunch.queueBonus);
  });

  it("rush end emits event and clears banner", () => {
    const sim = newSim();
    const lunch = sim.harbor.rushes.find((r) => r.id === "rush.lunch")!;
    sim.state.tick = lunch.startTick + lunch.durationTicks - 1;
    expect(CustomerSystem.activeRush(sim.harbor, sim.state.tick)).not.toBeNull();
    const events = checkedStep(sim);
    expect(events.filter((e) => e.type === "rush_ended")).toHaveLength(1);
    expect(CustomerSystem.activeRush(sim.harbor, sim.state.tick)).toBeNull();
    expect(buildView(sim).rush).toBeNull();
  });

  it("customer approach follows waypoints around obstacles", () => {
    const sim = newSim();
    const h = sim.harbor;
    expect(h.customerPathWaypoints.length).toBeGreaterThan(0);
    expect(content.contentVersion).toBe("0.26.0");
    const slot = { x: h.counters[0]!.queueAnchor.x, z: h.counters[0]!.queueAnchor.z };
    const path = CustomerSystem.approachPath(h, slot);
    const routed = CustomerSystem.pathWalkTicks(path, h.customerWalkMmPerTick);
    const straight = CustomerSystem.walkTicks(h.customerEntry, slot, h.customerWalkMmPerTick);
    expect(routed).toBeGreaterThan(straight);

    sim.state.counters[0]!.stock.add(PORTION, 1);
    sim.run(h.customerSpawnTicks);
    const c = sim.state.customers[0]!;
    expect(c.walkTicksTotal).toBe(routed);
    sim.run(Math.trunc(c.walkTicksTotal / 2));
    const view = buildView(sim).customers[0]!;
    const sx = h.customerEntry.x + (slot.x - h.customerEntry.x) * 0.5;
    const sz = h.customerEntry.z + (slot.z - h.customerEntry.z) * 0.5;
    const chordDist = Math.hypot(view.xMm - sx, view.zMm - sz);
    expect(chordDist).toBeGreaterThan(200);
    expect(buildView(sim).customerPathWaypoints).toHaveLength(h.customerPathWaypoints.length);
  });

  it("smoker turns fillets into smoked fillets", () => {
    const sim = newSim();
    expect(sim.state.machines).toHaveLength(3);
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

  it("harbor grill unlocks as a second production line", () => {
    expect(content.contentVersion).toBe("0.26.0");
    expect(content.machinesById.has("machine.harbor_grill")).toBe(true);
    expect(content.upgradesById.get("upgrade.harbor_grill")!.effect).toEqual({
      kind: "unlock_machine", machine: "machine.harbor_grill",
    });
    for (const harborId of ["harbor.sunrise_pier", "harbor.moon_cove"]) {
      const grill = content.harborsById.get(harborId)!.stations.find((s) => s.machine === "machine.harbor_grill")!;
      expect(grill.requiresUpgrade).toBe("upgrade.harbor_grill");
    }

    const sim = newSim();
    const grill = sim.state.machines.find((m) => m.stationId === "station.grill_1")!;
    expect(grill).toBeTruthy();
    checkedStep(sim);
    expect(grill.status).toBe("LOCKED");
    walkTo(sim, 10700, -4000);
    expect(sim.state.player.zoneId).toBe("zone.grill_in");
    sim.state.player.bag.add("species.copper_mullet", 1);
    for (let i = 0; i < 20; i++) checkedStep(sim);
    expect(grill.input.isEmpty()).toBe(true);
    expect(sim.state.player.bag.quantity("species.copper_mullet")).toBe(1);

    sim.state.completedQuests.add("quest.fill_the_hold");
    sim.state.coins = 200;
    const bought = checkedStep(sim, [{ type: "purchase_upgrade", upgradeId: "upgrade.harbor_grill", requestId: "grill-1" }]);
    expect(bought.some((e) => e.type === "upgrade_purchased" && !(e as { replayed?: boolean }).replayed)).toBe(true);

    for (let i = 0; i < 30; i++) checkedStep(sim);
    expect(sim.state.player.bag.quantity("species.copper_mullet")).toBe(0);
    grill.preferredRecipeId = "recipe.grill_mullet";
    for (let i = 0; i < 150; i++) checkedStep(sim);
    expect(grill.output.quantity("product.grilled_fillet")).toBe(2);
  });

  it("product recipe tree supports multi-input and intermediate crafts", () => {
    expect(content.contentVersion).toBe("0.26.0");
    expect(content.raw.products.map((p) => p.id)).toEqual(expect.arrayContaining([
      "product.diced_fish", "product.skewer", "product.soup_stock", "product.ice_packed_crate",
    ]));
    for (const harbor of content.raw.harbors) {
      for (const counter of harbor.counters) {
        expect(counter.products).toEqual(expect.arrayContaining([
          "product.skewer", "product.soup_stock", "product.ice_packed_crate", "product.diced_fish",
        ]));
      }
    }

    const sim = newSim();
    const cutter = sim.state.machines.find((mm) => mm.stationId === "station.cutter_1")!;
    cutter.preferredRecipeId = "recipe.dice_sprat";
    cutter.input.add("species.silver_sprat", 1);
    for (let i = 0; i < 90; i++) checkedStep(sim);
    expect(cutter.output.quantity("product.diced_fish")).toBe(2);

    cutter.preferredRecipeId = "recipe.harbor_skewers";
    // Move diced into input for the next craft.
    cutter.input.add("product.diced_fish", cutter.output.quantity("product.diced_fish"));
    cutter.output.remove("product.diced_fish", cutter.output.quantity("product.diced_fish"));
    for (let i = 0; i < 120; i++) checkedStep(sim);
    expect(cutter.output.quantity("product.skewer")).toBe(2);
    expect(cutter.input.isEmpty()).toBe(true);

    cutter.preferredRecipeId = "recipe.mixed_grill_skewers";
    cutter.input.add("species.blue_mackerel", 1);
    cutter.input.add("species.harbor_herring", 1);
    for (let i = 0; i < 140; i++) checkedStep(sim);
    expect(cutter.output.quantity("product.skewer")).toBe(4);

    cutter.preferredRecipeId = "recipe.diced_soup";
    cutter.input.add("product.diced_fish", 2);
    for (let i = 0; i < 100; i++) checkedStep(sim);
    expect(cutter.output.quantity("product.soup_stock")).toBe(1);

    const smoker = sim.state.machines.find((mm) => mm.stationId === "station.smoker_1")!;
    smoker.preferredRecipeId = "recipe.ice_pack_catch";
    smoker.input.add("species.amber_snapper", 1);
    smoker.input.add("species.blue_mackerel", 1);
    for (let i = 0; i < 170; i++) checkedStep(sim);
    expect(smoker.output.quantity("product.ice_packed_crate")).toBe(1);
    expect(smoker.input.isEmpty()).toBe(true);

    smoker.preferredRecipeId = "recipe.ice_pack_diced";
    smoker.input.add("product.diced_fish", 3);
    for (let i = 0; i < 150; i++) checkedStep(sim);
    expect(smoker.output.quantity("product.ice_packed_crate")).toBe(2);
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

  it("preferred recipe locks out other ready inputs", () => {
    const sim = newSim();
    const m = cutter(sim);
    m.input.add(SPRAT, 1);
    m.input.add("species.harbor_herring", 1);
    const events = [
      ...checkedStep(sim, [{ type: "select_machine_recipe", stationId: "station.cutter_1", recipeId: "recipe.herring_portions" }]),
      ...Array.from({ length: 100 }, () => checkedStep(sim)).flat(),
    ];
    expect(m.preferredRecipeId).toBe("recipe.herring_portions");
    const started = events.filter((e) => e.type === "batch_started");
    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({ recipeId: "recipe.herring_portions" });
    expect(m.input.quantity("species.harbor_herring")).toBe(0);
    expect(m.input.quantity(SPRAT)).toBe(1);
  });

  it("output full status names blocked products", () => {
    const sim = newSim();
    const m = cutter(sim);
    m.output.add(PORTION, 19);
    m.input.add(SPRAT, 1);
    for (let i = 0; i < 5; i++) checkedStep(sim);
    expect(m.status).toBe("OUTPUT_FULL");
    const text = ProductionSystem.statusText(m, content);
    expect(text).toMatch(/Output full/);
    expect(text).toMatch(/Basic portion/);
    expect(buildView(sim).stations.find((s) => s.stationId === "station.cutter_1")!.statusText).toMatch(/collect/);
  });

  it("fillet and smoker duration upgrades apply to next batch", () => {
    const sim = newSim();
    sim.state.completedQuests.add("quest.first_ten_sales");
    sim.state.coins = 10_000;
    checkedStep(sim, [{ type: "purchase_upgrade", upgradeId: "upgrade.cutter_speed_2", requestId: "r1" }]);
    checkedStep(sim, [{ type: "purchase_upgrade", upgradeId: "upgrade.cutter_fillet_speed", requestId: "r2" }]);
    checkedStep(sim, [{ type: "purchase_upgrade", upgradeId: "upgrade.smoker_speed_2", requestId: "r3" }]);
    const c = cutter(sim);
    c.input.add("species.blue_mackerel", 1);
    const cutterEvents = Array.from({ length: 150 }, () => checkedStep(sim)).flat();
    const started = cutterEvents.filter((e) => e.type === "batch_started");
    const done = cutterEvents.filter((e) => e.type === "batch_completed");
    expect(started[0]).toMatchObject({ recipeId: "recipe.mackerel_fillets" });
    expect(done[0]!.tick - started[0]!.tick).toBe(100);

    const sm = smoker(sim);
    sm.input.add("product.fillet", 1);
    const smokeEvents = Array.from({ length: 150 }, () => checkedStep(sim)).flat();
    const smokeStarted = smokeEvents.filter((e) => e.type === "batch_started");
    const smokeDone = smokeEvents.filter((e) => e.type === "batch_completed");
    expect(smokeStarted[0]).toMatchObject({ recipeId: "recipe.smoke_fillet" });
    expect(smokeDone[0]!.tick - smokeStarted[0]!.tick).toBe(120);
  });

  it("cycle preferred recipe rotates auto and recipes", () => {
    const sim = newSim();
    const m = cutter(sim);
    expect(m.preferredRecipeId).toBeNull();
    expect(ProductionSystem.cyclePreferredRecipe(content, m)).toBe("recipe.basic_portions");
    expect(ProductionSystem.cyclePreferredRecipe(content, m)).toBe("recipe.herring_portions");
    let guard = 0;
    const recipeCount = content.machinesById.get(m.machineId)!.recipes.length;
    while (ProductionSystem.cyclePreferredRecipe(content, m) !== null) {
      expect(++guard).toBeLessThan(recipeCount + 2);
    }
    expect(m.preferredRecipeId).toBeNull();
  });

  it("empty spot regen uses slower curve than near-full", () => {
    const sim = newSim();
    const def = content.harborsById.get(HARBOR)!.fishingSpots.find((f) => f.zone === "zone.pier_end")!;
    const empty = FishingSystem.regenTicksFor(def, 0, 1000);
    const nearlyFull = FishingSystem.regenTicksFor(def, def.stockMax - 1, 1000);
    expect(empty).toBeGreaterThan(nearlyFull);
    const spot = sim.state.fishingSpots.find((f) => f.zoneId === "zone.pier_end")!;
    spot.stock = 0;
    spot.regenProgress = 0;
    for (let i = 0; i < empty - 1; i++) checkedStep(sim);
    expect(spot.stock).toBe(0);
    checkedStep(sim);
    expect(spot.stock).toBe(1);
  });

  it("fish regen upgrade shortens restock wait", () => {
    const sim = newSim();
    const def = content.harborsById.get(HARBOR)!.fishingSpots.find((f) => f.zone === "zone.pier_end")!;
    expect(FishingSystem.regenTicksFor(def, 0, 1250)).toBeLessThan(FishingSystem.regenTicksFor(def, 0, 1000));
    sim.state.player.fishRegenPermille = 1250;
    const needed = FishingSystem.regenTicksFor(def, 0, 1250);
    const spot = sim.state.fishingSpots.find((f) => f.zoneId === "zone.pier_end")!;
    spot.stock = 0;
    spot.regenProgress = 0;
    for (let i = 0; i < needed - 1; i++) checkedStep(sim);
    expect(spot.stock).toBe(0);
    checkedStep(sim);
    expect(spot.stock).toBe(1);
  });

  it("side pier locked until upgrade then fishes", () => {
    const sim = newSim();
    // Onto the pier, then north onto the spur (no diagonal shortcut over water).
    walkTo(sim, -12750, 0);
    walkTo(sim, -12750, 3000);
    expect(sim.state.player.zoneId).toBe("zone.pier_spur");
    expect(buildView(sim).context!.lines[0]).toMatch(/^Locked/);
    for (let i = 0; i < 40; i++) checkedStep(sim);
    expect(sim.state.player.fishingSpecies).toBeNull();
    expect(sim.state.stat("stat.fish_caught")).toBe(0);
    sim.state.coins = 10_000;
    const buy = checkedStep(sim, [
      { type: "purchase_upgrade", upgradeId: "upgrade.bag_capacity_2", requestId: "req-bag" },
      { type: "purchase_upgrade", upgradeId: "upgrade.tide_chart", requestId: "req-tide" },
      { type: "purchase_upgrade", upgradeId: "upgrade.side_pier", requestId: "req-spur" },
    ]);
    expect(buy.some((e) => e.type === "upgrade_purchased" && e.upgradeId === "upgrade.side_pier")).toBe(true);
    for (let i = 0; i < 400 && sim.state.stat("stat.fish_caught") < 1; i++) checkedStep(sim);
    expect(sim.state.stat("stat.fish_caught")).toBeGreaterThanOrEqual(1);
  });

  it("empty pier shows soft feedback in view", () => {
    const sim = newSim();
    walkTo(sim, -14250, 0);
    const spot = sim.state.fishingSpots.find((f) => f.zoneId === "zone.pier_end")!;
    spot.stock = 0;
    spot.regenProgress = 0;
    checkedStep(sim);
    const v = buildView(sim);
    expect(v.fishingSpotEmpty).toBe(true);
    expect(v.fishingRegenProgress).not.toBeNull();
    expect(v.context!.lines.some((l) => /empty/i.test(l))).toBe(true);
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

  it("hire fisher and porter is idempotent and shows staff", () => {
    const sim = newSim();
    expect(content.contentVersion).toBe("0.26.0");
    expect(buildView(sim).staff.some((row) => row.roleId === "worker.fisher")).toBe(true);
    expect(buildView(sim).staff.some((row) => row.roleId === "worker.operator")).toBe(true);
    expect(buildView(sim).staff.some((row) => row.roleId === "worker.cashier")).toBe(true);
    expect(buildView(sim).staff.some((row) => row.roleId === "worker.supervisor")).toBe(true);
    expect(buildView(sim).staff.filter((row) => row.roleId !== "worker.supervisor")
      .every((row) => row.reason?.startsWith("Requires:"))).toBe(true);
    unlockStaffHiring(sim);
    sim.state.coins = 500;
    const hire1 = checkedStep(sim, [{ type: "hire_worker", roleId: "worker.fisher", requestId: "hire-f1" }]);
    expect(hire1.some((e) => e.type === "worker_hired" && !e.replayed)).toBe(true);
    expect(sim.state.workers).toHaveLength(1);
    expect(sim.state.stat("stat.workers_hired")).toBe(1);
    const coinsAfter = sim.state.coins;
    const hireReplay = checkedStep(sim, [{ type: "hire_worker", roleId: "worker.fisher", requestId: "hire-f1" }]);
    const replayed = hireReplay.filter((e) => e.type === "worker_hired");
    expect(replayed).toHaveLength(1);
    expect(replayed[0]).toMatchObject({ replayed: true });
    expect(sim.state.workers).toHaveLength(1);
    expect(sim.state.coins).toBe(coinsAfter);
    checkedStep(sim, [{ type: "hire_worker", roleId: "worker.porter", requestId: "hire-p1" }]);
    expect(sim.state.workers).toHaveLength(2);
    const view = buildView(sim);
    expect(view.workers.some((w) => w.roleKind === "fisher")).toBe(true);
    expect(view.workers.some((w) => w.roleKind === "porter")).toBe(true);
    expect(view.staff.every((row) => row.reason !== "Coming soon")).toBe(true);
    expect(view.staff.filter((row) => row.roleId === "worker.operator" || row.roleId === "worker.cashier")
      .every((row) => row.purchasable || row.reason?.startsWith("Need"))).toBe(true);
    expect(view.staff.find((row) => row.roleId === "worker.supervisor")!.reason!.startsWith("Requires:")).toBe(true);
  });

  it("fisher catches fish and delivers to cutter", () => {
    const sim = newSim();
    unlockStaffHiring(sim);
    sim.state.coins = 200;
    checkedStep(sim, [{ type: "hire_worker", roleId: "worker.fisher", requestId: "hf" }]);
    const events = Array.from({ length: 8000 }, () => checkedStep(sim)).flat();
    expect(events.some((e) => e.type === "fish_caught")).toBe(true);
    expect(sim.state.stat("stat.worker_fish_caught")).toBeGreaterThan(0);
    const m = cutter(sim);
    expect(m.input.usedUnits() > 0 || m.output.usedUnits() > 0 || m.activeBatch !== null).toBe(true);
  });

  it("porter hauls machine output to counter", () => {
    const sim = newSim();
    unlockStaffHiring(sim);
    sim.state.coins = 200;
    checkedStep(sim, [{ type: "hire_worker", roleId: "worker.porter", requestId: "hp" }]);
    cutter(sim).output.add(PORTION, 3);
    const events = Array.from({ length: 4000 }, () => checkedStep(sim)).flat();
    expect(events.some((e) => e.type === "items_transferred" && e.to === sim.state.counters[0]!.stock.id)).toBe(true);
    expect(sim.state.counters[0]!.stock.quantity(PORTION)).toBeGreaterThan(0);
    expect(sim.state.stat("stat.worker_items_moved")).toBeGreaterThan(0);
  });

  it("operator hauls fillet from cutter to smoker", () => {
    const sim = newSim();
    unlockStaffHiring(sim);
    sim.state.coins = 200;
    checkedStep(sim, [{ type: "hire_worker", roleId: "worker.operator", requestId: "ho" }]);
    const fillet = "product.fillet";
    cutter(sim).output.add(fillet, 2);
    const events = Array.from({ length: 4000 }, () => checkedStep(sim)).flat();
    expect(events.some((e) =>
      e.type === "items_transferred" &&
      (e.from === cutter(sim).output.id || e.to === smoker(sim).input.id),
    )).toBe(true);
    const s = smoker(sim);
    expect(
      s.input.quantity(fillet) > 0 || s.activeBatch !== null || s.output.quantity("product.smoked_fillet") > 0,
    ).toBe(true);
    expect(sim.state.stat("stat.worker_items_moved")).toBeGreaterThan(0);
  });

  it("cashier serves customers without player at counter", () => {
    const sim = newSim();
    unlockStaffHiring(sim);
    sim.state.coins = 200;
    checkedStep(sim, [{ type: "hire_worker", roleId: "worker.cashier", requestId: "hc" }]);
    let onDuty = false;
    for (let i = 0; i < 4000; i++) {
      checkedStep(sim);
      const w = sim.state.workers[0]!;
      if (!w.busyWalking && w.phase === "WORK" && w.taskZoneId === "zone.counter_1") {
        onDuty = true;
        break;
      }
    }
    expect(onDuty).toBe(true);
    expect(sim.state.player.zoneId).not.toBe("zone.counter_1");

    const counter = sim.state.counters[0]!;
    counter.stock.add(PORTION, 2);
    const type = content.customers[0]!;
    sim.state.customers.push(new CustomerState(
      "customer.test_cashier", type.id, counter.counterId, 1, 9999, 0, null,
    ));
    const events = Array.from({ length: 80 }, () => checkedStep(sim)).flat();
    expect(events.some((e) => e.type === "sale_committed")).toBe(true);
    expect(sim.state.player.zoneId).not.toBe("zone.counter_1");
    expect(sim.state.stat("stat.sales")).toBeGreaterThan(0);
  });

  it("operator takes intermediates before porter without supervisor", () => {
    const sim = newSim();
    unlockStaffHiring(sim);
    sim.state.coins = 500;
    checkedStep(sim, [{ type: "hire_worker", roleId: "worker.porter", requestId: "hp" }]);
    checkedStep(sim, [{ type: "hire_worker", roleId: "worker.operator", requestId: "ho" }]);
    expect(sim.state.workers).toHaveLength(2);
    const fillet = "product.fillet";
    cutter(sim).output.add(fillet, 1);
    for (let i = 0; i < 4000; i++) checkedStep(sim);
    // Porter must not stock raw fillet; operator routes it through the smoker.
    expect(sim.state.counters[0]!.stock.quantity(fillet)).toBe(0);
    expect(cutter(sim).output.available(fillet)).toBe(0);
    expect(sim.state.stat("stat.worker_items_moved")).toBeGreaterThan(0);
  });

  it("supervisor lets porter haul intermediates when counter demands", () => {
    const sim = newSim();
    unlockSupervisorHiring(sim);
    sim.state.coins = 500;
    checkedStep(sim, [{ type: "hire_worker", roleId: "worker.supervisor", requestId: "hs" }]);
    let onDuty = false;
    for (let i = 0; i < 4000; i++) {
      checkedStep(sim);
      if (buildView(sim).supervisorOnDuty) { onDuty = true; break; }
    }
    expect(onDuty).toBe(true);
    checkedStep(sim, [{ type: "hire_worker", roleId: "worker.porter", requestId: "hp" }]);
    const fillet = "product.fillet";
    const counter = sim.state.counters[0]!;
    const type = content.customers[0]!;
    sim.state.customers.push(new CustomerState(
      "customer.test_sup", type.id, counter.counterId, 1, 9999, 0, fillet,
    ));
    cutter(sim).output.add(fillet, 1);
    for (let i = 0; i < 4000; i++) checkedStep(sim);
    expect(counter.stock.quantity(fillet) > 0 || sim.state.stat("stat.worker_items_moved") > 0).toBe(true);
    expect(buildView(sim).supervisorOnDuty).toBe(true);
  });

  it("haul lease expiry releases reservation", () => {
    const sim = newSim();
    unlockStaffHiring(sim);
    sim.state.coins = 200;
    checkedStep(sim, [{ type: "hire_worker", roleId: "worker.porter", requestId: "hp" }]);
    cutter(sim).output.add(PORTION, 1);
    let claimed = false;
    for (let i = 0; i < 200; i++) {
      checkedStep(sim);
      const w = sim.state.workers[0]!;
      if (w.phase === "WALK_TO_WORK" || w.phase === "PICKUP") {
        expect(cutter(sim).output.reservedQuantity(PORTION)).toBeGreaterThanOrEqual(1);
        w.leaseExpiresAt = sim.state.tick;
        const events = checkedStep(sim);
        expect(events.some((e) => e.type === "lease_expired")).toBe(true);
        expect(cutter(sim).output.reservedQuantity(PORTION)).toBe(0);
        expect(sim.state.stat("stat.leases_expired")).toBe(1);
        claimed = true;
        break;
      }
    }
    expect(claimed).toBe(true);
  });

  it("destination capacity blocks overclaim", () => {
    const sim = newSim();
    unlockStaffHiring(sim);
    sim.state.coins = 500;
    checkedStep(sim, [
      { type: "hire_worker", roleId: "worker.porter", requestId: "hp1" },
      { type: "hire_worker", roleId: "worker.porter", requestId: "hp2" },
    ]);
    const counter = sim.state.counters[0]!;
    while (counter.stock.roomFor(PORTION) > 1) counter.stock.add(PORTION, 1);
    cutter(sim).output.add(PORTION, 5);
    for (let i = 0; i < 2000; i++) checkedStep(sim);
    expect(counter.stock.usedUnits()).toBeLessThanOrEqual(counter.stock.capacityUnits);
    expect(counter.stock.quantity(PORTION)).toBeGreaterThanOrEqual(1);
  });

  it("worker upgrades boost carry catch and charge wages", () => {
    const sim = newSim();
    unlockStaffHiring(sim);
    sim.state.coins = 10_000;
    checkedStep(sim, [{ type: "purchase_upgrade", upgradeId: "upgrade.staff_boots", requestId: "ub" }]);
    checkedStep(sim, [{ type: "purchase_upgrade", upgradeId: "upgrade.staff_satchels", requestId: "us" }]);
    checkedStep(sim, [{ type: "purchase_upgrade", upgradeId: "upgrade.staff_tackle", requestId: "ut" }]);
    checkedStep(sim, [{ type: "purchase_upgrade", upgradeId: "upgrade.shift_lead", requestId: "uw" }]);
    expect(sim.state.workerMoveSpeedPermille).toBe(1250);
    expect(sim.state.workerCarryCapacityFloor).toBe(5);
    expect(sim.state.workerCatchSpeedPermille).toBe(1000);
    expect(sim.state.workerWagePerWorkerPerHour).toBe(3);
    expect(buildView(sim).workerWagePerWorkerPerHour).toBe(3);
    checkedStep(sim, [{ type: "hire_worker", roleId: "worker.porter", requestId: "hp-wage" }]);
    expect(sim.state.workers[0]!.bag.capacityUnits).toBe(5);
    sim.state.workerWageAccrualTicks = 3600 * 20 - 1;
    const coinsBefore = sim.state.coins;
    const events = checkedStep(sim);
    expect(events.some((e) => e.type === "wages_paid" && e.workers === 1 && e.coins === 3)).toBe(true);
    expect(sim.state.coins).toBe(coinsBefore - 3);
    expect(sim.state.stat("stat.wages_paid")).toBe(3);
  });

  it("quest chain locks rewards and shows log", () => {
    const sim = newSim();
    const log = buildView(sim).quests;
    expect(log).toHaveLength(4);
    expect(log.find((q) => q.id === "quest.first_ten_sales")!.status).toBe("active");
    expect(log.filter((q) => q.id !== "quest.first_ten_sales").every((q) => q.status === "locked")).toBe(true);

    sim.state.bumpStat("stat.sales", 10);
    const coinsBefore = sim.state.coins;
    const events = checkedStep(sim);
    const done = events.filter((e) => e.type === "quest_completed");
    expect(done).toHaveLength(1);
    expect(done[0]).toMatchObject({ questId: "quest.first_ten_sales", coinsRewarded: 50 });
    expect(sim.state.coins).toBe(coinsBefore + 50);
    expect(sim.state.stat("stat.quests_completed")).toBe(1);
    expect(sim.state.completedQuests.has("quest.first_ten_sales")).toBe(true);

    const after = buildView(sim).quests;
    expect(after.find((q) => q.id === "quest.first_ten_sales")!.status).toBe("completed");
    expect(after.find((q) => q.id === "quest.fill_the_hold")!.status).toBe("active");
    expect(after.find((q) => q.id === "quest.first_hire")!.status).toBe("active");
    expect(after.find((q) => q.id === "quest.busy_harbor")!.status).toBe("locked");

    sim.state.bumpStat("stat.fish_caught", 25);
    sim.state.bumpStat("stat.workers_hired", 1);
    checkedStep(sim);
    expect(sim.state.completedQuests.has("quest.fill_the_hold")).toBe(true);
    expect(sim.state.completedQuests.has("quest.first_hire")).toBe(true);

    sim.state.bumpStat("stat.revenue", 250);
    const finale = checkedStep(sim).filter((e) => e.type === "quest_completed");
    expect(finale).toHaveLength(1);
    expect(finale[0]).toMatchObject({ questId: "quest.busy_harbor", unlockUpgrades: ["upgrade.tide_chart"] });
    expect(sim.state.ownedUpgrades.has("upgrade.tide_chart")).toBe(true);
    expect(sim.state.player.fishRegenPermille).toBe(1250);
    expect(buildView(sim).quests.find((q) => q.id === "quest.busy_harbor")!.status).toBe("completed");
  });

  it("contracts stay locked until first ten sales, then pay out or penalize", () => {
    const sim = newSim();
    const locked = buildView(sim);
    expect(locked.contractsUnlocked).toBe(false);
    expect(locked.contractsLockedReason).toBe("Requires: Make 10 sales");
    expect(locked.contractOffers).toEqual([]);
    expect(sim.state.contractOffers).toEqual([]);
    checkedStep(sim);
    expect(sim.state.contractOffers).toEqual([]);
    expect(buildView(sim).contractsUnlocked).toBe(false);

    sim.state.completedQuests.add("quest.first_ten_sales");
    const opened = checkedStep(sim);
    expect(opened.some((e) => e.type === "contract_board_refreshed")).toBe(true);
    expect(buildView(sim).contractsUnlocked).toBe(true);
    expect(buildView(sim).contractsLockedReason).toBeNull();
    expect(sim.state.contractOffers).toHaveLength(content.contracts.boardSlots);
    expect(buildView(sim).contractRefreshTicksLeft).toBe(content.contracts.refreshPeriodTicks);
    expect(buildView(sim).contractOffers.every((o) => o.acceptEnabled)).toBe(true);

    const offer = sim.state.contractOffers[0]!;
    const accepted = checkedStep(sim, [{ type: "accept_contract", offerId: offer.id, requestId: "acc-1" }]);
    expect(accepted.some((e) => e.type === "contract_accepted" && !e.replayed)).toBe(true);
    expect(sim.state.contractOffers.some((o) => o.id === offer.id)).toBe(false);
    expect(sim.state.activeContracts).toHaveLength(1);
    const job = sim.state.activeContracts[0]!;
    expect(job.templateId).toBe(offer.templateId);
    expect(job.itemId).toBe(offer.itemId);
    expect(job.deadlineTick).toBe(sim.state.tick + offer.durationTicks);
    const replay = checkedStep(sim, [{ type: "accept_contract", offerId: offer.id, requestId: "acc-1" }]);
    expect(replay.find((e) => e.type === "contract_accepted")).toMatchObject({ replayed: true, contractId: job.id });
    expect(sim.state.activeContracts).toHaveLength(1);

    sim.state.player.bag.capacityUnits = 100;
    sim.state.player.bag.add(job.itemId, job.quantity);
    const coinsBefore = sim.state.coins;
    const delivered = checkedStep(sim, [{ type: "deliver_contract", contractId: job.id, requestId: "del-1" }]);
    expect(delivered.find((e) => e.type === "contract_completed")).toMatchObject({
      contractId: job.id, templateId: job.templateId, payout: job.payout,
    });
    expect(sim.state.coins).toBe(coinsBefore + job.payout);
    expect(sim.state.activeContracts).toHaveLength(0);
    expect(sim.state.player.bag.quantity(job.itemId)).toBe(0);
    expect(sim.state.stat("stat.contracts_completed")).toBe(1);
    expect(sim.state.stat("stat.contract_revenue")).toBe(job.payout);
    expect(sim.state.stat("stat.contract_items_delivered")).toBe(job.quantity);
    const deliverReplay = checkedStep(sim, [{ type: "deliver_contract", contractId: job.id, requestId: "del-1" }]);
    expect(deliverReplay.find((e) => e.type === "contract_delivered")).toMatchObject({ replayed: true, completed: true });
    expect(sim.state.coins).toBe(coinsBefore + job.payout);

    const offer2 = sim.state.contractOffers[0]!;
    checkedStep(sim, [{ type: "accept_contract", offerId: offer2.id, requestId: "acc-fail" }]);
    const job2 = sim.state.activeContracts[0]!;
    expect(job2.penalty).toBeGreaterThan(0);
    sim.state.coins = 100;
    sim.state.tick = job2.deadlineTick - 1;
    const failed = checkedStep(sim);
    expect(failed.find((e) => e.type === "contract_failed")).toMatchObject({
      contractId: job2.id, templateId: job2.templateId, penaltyPaid: job2.penalty,
    });
    expect(sim.state.coins).toBe(100 - job2.penalty);
    expect(sim.state.activeContracts).toHaveLength(0);
    expect(sim.state.stat("stat.contracts_failed")).toBe(1);
  });

  it("moon cove unlocks after busy harbor and travel stashes world", () => {
    const sim = newSim();
    const map = buildView(sim).harbors;
    expect(map).toHaveLength(2);
    expect(map[0]).toMatchObject({ harborId: HARBOR, current: true, unlocked: true, travelEnabled: false });
    expect(map[1]).toMatchObject({
      harborId: "harbor.moon_cove", unlocked: false, reason: "Requires: Busy harbor",
      blockoutAsset: "moon_cove_blockout.glb",
    });

    const rejected = checkedStep(sim, [{ type: "travel_to_harbor", harborId: "harbor.moon_cove", requestId: "go-1" }]);
    expect(rejected.some((e) => e.type === "travel_rejected" && e.reason.includes("Busy harbor"))).toBe(true);
    expect(sim.state.harborId).toBe(HARBOR);

    sim.state.completedQuests.add("quest.busy_harbor");
    expect(buildView(sim).harbors.find((h) => h.harborId === "harbor.moon_cove")!.travelEnabled).toBe(true);

    const spot = sim.state.fishingSpots.find((f) => f.zoneId === "zone.pier_end")!;
    spot.stock = 3;
    sim.state.coins = 777;
    sim.state.player.bag.capacityUnits = 20;
    sim.state.player.bag.add(SPRAT, 2);

    const traveled = checkedStep(sim, [{ type: "travel_to_harbor", harborId: "harbor.moon_cove", requestId: "go-2" }]);
    expect(traveled.some((e) => e.type === "harbor_traveled" && !e.replayed && e.toHarborId === "harbor.moon_cove")).toBe(true);
    expect(sim.state.harborId).toBe("harbor.moon_cove");
    expect(buildView(sim).harborName).toBe("Moon Cove");
    expect(buildView(sim).blockoutAsset).toBe("moon_cove_blockout.glb");
    expect(sim.state.coins).toBe(777);
    expect(sim.state.player.bag.quantity(SPRAT)).toBe(2);
    expect(sim.state.player.x).toBe(sim.harbor.playerSpawn.x);
    expect(sim.state.player.z).toBe(sim.harbor.playerSpawn.z);
    expect(sim.state.fishingSpots.some((f) => f.zoneId === "zone.cove_end")).toBe(true);
    expect(sim.state.harborStashes.has(HARBOR)).toBe(true);
    expect(sim.state.harborStashes.get(HARBOR)!.fishingSpots.find((f) => f.zoneId === "zone.pier_end")!.stock).toBe(3);
    expect(sim.state.stat("stat.harbors_traveled")).toBe(1);

    const replay = checkedStep(sim, [{ type: "travel_to_harbor", harborId: "harbor.moon_cove", requestId: "go-2" }]);
    expect(replay.find((e) => e.type === "harbor_traveled")).toMatchObject({ replayed: true });
    expect(sim.state.stat("stat.harbors_traveled")).toBe(1);

    const back = checkedStep(sim, [{ type: "travel_to_harbor", harborId: HARBOR, requestId: "go-back" }]);
    expect(back.some((e) => e.type === "harbor_traveled" && e.toHarborId === HARBOR)).toBe(true);
    expect(sim.state.harborId).toBe(HARBOR);
    expect(sim.state.fishingSpots.find((f) => f.zoneId === "zone.pier_end")!.stock).toBe(3);
    expect(sim.state.player.bag.quantity(SPRAT)).toBe(2);
    expect(sim.state.harborStashes.has("harbor.moon_cove")).toBe(true);
    expect(sim.state.stat("stat.harbors_traveled")).toBe(2);

    const saved = encodeSnapshot(content, sim.state);
    expect(saved.startsWith('{"schemaVersion":10,')).toBe(true);
    const restored = decodeSnapshot(content, saved);
    expect(restored.harborId).toBe(HARBOR);
    expect(restored.harborStashes.has("harbor.moon_cove")).toBe(true);
    expect(restored.fishingSpots.find((f) => f.zoneId === "zone.pier_end")!.stock).toBe(3);
  });

  it("economy sinks unlock after first ten sales and charge or spoil", () => {
    const sim = newSim();
    const locked = buildView(sim);
    expect(locked.economyUnlocked).toBe(false);
    expect(locked.economyLockedReason).toBe("Requires: Make 10 sales");
    expect(locked.maintenanceCoinsPerStation).toBe(0);
    expect(locked.bagFishSpoilActive).toBe(false);

    for (let i = 0; i < content.economy.maintenancePeriodTicks; i++) checkedStep(sim);
    expect(sim.state.stat("stat.maintenance_paid")).toBe(0);
    expect(sim.state.stat("stat.items_spoiled")).toBe(0);

    sim.state.completedQuests.add("quest.first_ten_sales");
    const unlocked = buildView(sim);
    expect(unlocked.economyUnlocked).toBe(true);
    expect(unlocked.economyLockedReason).toBeNull();
    expect(unlocked.maintenanceCoinsPerStation).toBe(2);
    expect(unlocked.bagFishSpoilActive).toBe(true);

    sim.state.coins = 50;
    sim.state.maintenanceAccrualTicks = content.economy.maintenancePeriodTicks - 1;
    const maint = checkedStep(sim);
    // Locked grill stations are not billed until unlock_machine is owned.
    const stations = sim.harbor.stations.filter((st) => ProductionSystem.isUnlocked(st, sim.state)).length;
    expect(stations).toBe(2);
    expect(maint.some((e) => e.type === "maintenance_paid" && e.stations === stations && e.coins === 2 * stations)).toBe(true);
    expect(sim.state.coins).toBe(50 - 2 * stations);
    expect(sim.state.stat("stat.maintenance_paid")).toBe(2 * stations);

    sim.state.coins = 200;
    checkedStep(sim, [{ type: "purchase_upgrade", upgradeId: "upgrade.machine_oil", requestId: "oil-1" }]);
    expect(sim.state.maintenanceDiscountPerStation).toBe(1);
    expect(buildView(sim).maintenanceCoinsPerStation).toBe(1);
    sim.state.maintenanceAccrualTicks = content.economy.maintenancePeriodTicks - 1;
    const cheaper = checkedStep(sim);
    expect(cheaper.some((e) => e.type === "maintenance_paid" && e.coins === 1 * stations)).toBe(true);

    const counter = sim.state.counters[0]!;
    sim.state.customers.length = 0;
    counter.stock.restore({}, {});
    counter.stock.add(PORTION, 3);
    sim.state.counterSpoilAccrualTicks = content.economy.counterSpoilPeriodTicks - 1;
    const spoiled = checkedStep(sim);
    const spoilEvt = spoiled.find((e) => e.type === "items_spoiled" && e.location === "counter")!;
    expect(spoilEvt).toMatchObject({ items: [{ item: PORTION, quantity: 1 }] });
    expect(counter.stock.quantity(PORTION)).toBe(2);
    expect(sim.state.stat("stat.items_spoiled")).toBe(1);

    sim.state.customers.length = 0;
    sim.state.player.bag.capacityUnits = 10;
    sim.state.player.bag.add(SPRAT, 2);
    sim.state.bagSpoilAccrualTicks = content.economy.bagFishSpoilPeriodTicks - 1;
    const bagSpoil = checkedStep(sim);
    expect(bagSpoil.some((e) => e.type === "items_spoiled" && e.location === "bag")).toBe(true);
    expect(sim.state.player.bag.quantity(SPRAT)).toBe(1);
    sim.state.coins = 200;
    checkedStep(sim, [{ type: "purchase_upgrade", upgradeId: "upgrade.ice_box", requestId: "ice-1" }]);
    expect(sim.state.bagSpoilPeriodMultPermille).toBe(2000);
    sim.state.bagSpoilAccrualTicks = 0;
    for (let i = 0; i < content.economy.bagFishSpoilPeriodTicks; i++) checkedStep(sim);
    expect(sim.state.player.bag.quantity(SPRAT)).toBe(1);
    sim.state.bagSpoilAccrualTicks = content.economy.bagFishSpoilPeriodTicks * 2 - 1;
    checkedStep(sim);
    expect(sim.state.player.bag.quantity(SPRAT)).toBe(0);
  });

  it("spoil tiers prefer fragile counter stock and separate case ice", () => {
    expect(content.contentVersion).toBe("0.26.0");
    expect(content.productsById.get("product.basic_portion")!.spoilTier).toBe(3);
    expect(content.productsById.get("product.smoked_fillet")!.spoilTier).toBe(1);
    expect(content.speciesById.get(SPRAT)!.spoilTier).toBe(3);

    const sim = newSim();
    sim.state.completedQuests.add("quest.first_ten_sales");
    const counter = sim.state.counters[0]!;
    sim.state.customers.length = 0;
    counter.stock.restore({}, {});
    counter.stock.add("product.smoked_fillet", 2);
    counter.stock.add(PORTION, 2);
    sim.state.counterSpoilAccrualTicks = content.economy.counterSpoilPeriodTicks - 1;
    const spoiled = checkedStep(sim);
    const spoilEvt = spoiled.find((e) => e.type === "items_spoiled" && e.location === "counter")!;
    expect(spoilEvt).toMatchObject({ items: [{ item: PORTION, quantity: 1 }] });
    expect(counter.stock.quantity(PORTION)).toBe(1);
    expect(counter.stock.quantity("product.smoked_fillet")).toBe(2);

    sim.state.coins = 200;
    checkedStep(sim, [{ type: "purchase_upgrade", upgradeId: "upgrade.display_case_ice", requestId: "case-1" }]);
    expect(sim.state.counterSpoilPeriodMultPermille).toBe(2000);
    expect(sim.state.bagSpoilPeriodMultPermille).toBe(1000);
    counter.stock.add(PORTION, 1);
    sim.state.counterSpoilAccrualTicks = 0;
    for (let i = 0; i < content.economy.counterSpoilPeriodTicks; i++) checkedStep(sim);
    expect(counter.stock.quantity(PORTION)).toBe(2);
    sim.state.counterSpoilAccrualTicks = content.economy.counterSpoilPeriodTicks * 2 - 1;
    checkedStep(sim);
    expect(counter.stock.quantity(PORTION)).toBe(1);
  });

  it("prestige stays locked until busy harbor, then grants bonuses and cosmetics", () => {
    const sim = newSim();
    expect(content.contentVersion).toBe("0.26.0");
    const locked = buildView(sim);
    expect(locked.prestigeUnlocked).toBe(false);
    expect(locked.prestigeLockedReason).toBe("Requires: Busy harbor");
    expect(locked.harborRating).toBe(1);
    expect(locked.prestige).toHaveLength(3);
    expect(locked.prestige.every((p) => p.status === "locked")).toBe(true);

    sim.state.bumpStat("stat.revenue", 1000);
    checkedStep(sim);
    expect(sim.state.completedPrestige.size).toBe(0);
    expect(sim.state.prestigeCatchSpeedPermille).toBe(1000);
    expect(sim.state.prestigePriceBonusPermille).toBe(1000);

    sim.state.completedQuests.add("quest.busy_harbor");
    const board = buildView(sim);
    expect(board.prestigeUnlocked).toBe(true);
    expect(board.prestigeLockedReason).toBeNull();
    expect(board.prestige).toHaveLength(3);
    expect(board.prestige.find((p) => p.id === "prestige.rising_tide")!.status).toBe("active");
    expect(board.prestige.find((p) => p.id === "prestige.harbor_star")!.status).toBe("locked");
    expect(board.prestige.find((p) => p.id === "prestige.twin_harbors")!.status).toBe("active");
    expect(board.harborRating).toBe(3);

    const coinsBefore = sim.state.coins;
    const rising = checkedStep(sim).filter((e) => e.type === "prestige_unlocked");
    expect(rising).toHaveLength(1);
    expect(rising[0]).toMatchObject({
      prestigeId: "prestige.rising_tide",
      coinsRewarded: 100,
      cosmetic: "banner.rising_tide",
      catchSpeedPermille: 1050,
    });
    expect(sim.state.coins).toBe(coinsBefore + 100);
    expect(sim.state.prestigeCatchSpeedPermille).toBe(1050);
    expect(sim.state.unlockedCosmetics.has("banner.rising_tide")).toBe(true);
    expect(sim.state.stat("stat.prestige_completed")).toBe(1);
    expect(buildView(sim).prestige.find((p) => p.id === "prestige.rising_tide")!.status).toBe("completed");
    expect(buildView(sim).prestige.find((p) => p.id === "prestige.harbor_star")!.status).toBe("active");

    sim.state.bumpStat("stat.sales", 100);
    const star = checkedStep(sim).filter((e) => e.type === "prestige_unlocked");
    expect(star).toHaveLength(1);
    expect(star[0]).toMatchObject({ prestigeId: "prestige.harbor_star" });
    expect(sim.state.prestigePriceBonusPermille).toBe(1050);
    expect(sim.state.unlockedCosmetics.has("banner.harbor_star")).toBe(true);

    sim.state.bumpStat("stat.harbors_traveled", 2);
    const twin = checkedStep(sim).filter((e) => e.type === "prestige_unlocked");
    expect(twin).toHaveLength(1);
    expect(twin[0]).toMatchObject({ prestigeId: "prestige.twin_harbors" });
    expect(sim.state.unlockedCosmetics.has("banner.twin_harbors")).toBe(true);
    expect(sim.state.stat("stat.prestige_completed")).toBe(3);
    expect(buildView(sim).unlockedCosmetics).toEqual([
      "banner.harbor_star",
      "banner.rising_tide",
      "banner.twin_harbors",
    ]);

    const saved = encodeSnapshot(content, sim.state);
    expect(saved.startsWith('{"schemaVersion":10,')).toBe(true);
    const restored = decodeSnapshot(content, saved);
    expect([...restored.completedPrestige].sort()).toEqual([
      "prestige.harbor_star",
      "prestige.rising_tide",
      "prestige.twin_harbors",
    ]);
    expect(restored.prestigeCatchSpeedPermille).toBe(1050);
    expect(restored.prestigePriceBonusPermille).toBe(1050);
    expect([...restored.unlockedCosmetics].sort()).toEqual([
      "banner.harbor_star",
      "banner.rising_tide",
      "banner.twin_harbors",
    ]);
  });
});
