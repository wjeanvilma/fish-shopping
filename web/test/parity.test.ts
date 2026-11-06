/**
 * Cross-platform parity: the TypeScript engine must reproduce the shared fixtures that
 * the Kotlin game-core tests also check (blueprint "Fixtures" and "Android/web same fixture").
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type Command, GameState, Prng, Simulation, decodeSnapshot, encodeSnapshot, loadContent,
} from "../src/engine";

const shared = (p: string) => readFileSync(resolve(__dirname, "../../shared", p), "utf8");
const content = loadContent(JSON.parse(shared("content/content-pack.json")));

interface Fixture {
  seed: number;
  ticks: number;
  contentVersion: string;
  harborId: string;
  commands: ({ tick: number } & Command)[];
  expect: Record<string, unknown>;
}
const fixture: Fixture = JSON.parse(shared("fixtures/starter-line.json"));

function replay(untilTick: number): Simulation {
  const sim = new Simulation(content, GameState.newGame(content, fixture.harborId, fixture.seed));
  const byTick = new Map<number, Command[]>();
  for (const { tick, ...cmd } of fixture.commands) {
    byTick.set(tick, [...(byTick.get(tick) ?? []), cmd as Command]);
  }
  while (sim.state.tick < untilTick) {
    sim.step(byTick.get(sim.state.tick + 1) ?? []);
    const problems = sim.invariantProblems();
    if (problems.length) throw new Error(`Invariants at tick ${sim.state.tick}: ${problems.join("; ")}`);
  }
  return sim;
}

/** Same fields and ordering as StarterLineFixture.expectedState in Kotlin. */
function expectedState(s: GameState) {
  const rec = (entries: [string, number][]) => Object.fromEntries(entries);
  const m = s.machines.find((mm) => mm.stationId === "station.cutter_1")!;
  return {
    tick: s.tick,
    coins: s.coins,
    rngState: s.rng.state,
    playerX: s.player.x,
    playerZ: s.player.z,
    bag: rec(s.player.bag.contents()),
    bagCapacityUnits: s.player.bag.capacityUnits,
    machineInput: rec(m.input.contents()),
    machineOutput: rec(m.output.contents()),
    activeBatchRemaining: m.activeBatch?.remainingTicks ?? -1,
    counterStock: rec(s.counters[0]!.stock.contents()),
    customers: s.customers.length,
    fishingStock: s.fishingSpots[0]!.stock,
    ownedUpgrades: [...s.ownedUpgrades].sort(),
    completedQuests: [...s.completedQuests].sort(),
    tutorialIndex: s.tutorialIndex,
    stats: Object.fromEntries([...s.stats].sort(([a], [b]) => (a < b ? -1 : 1))),
  };
}

describe("shared fixtures", () => {
  it("PRNG matches the shared Mulberry32 vectors", () => {
    const vectors = JSON.parse(shared("fixtures/prng-vectors.json"));
    for (const c of vectors.cases) {
      const r = new Prng(c.seed);
      expect(c.u32.map(() => r.nextU32())).toEqual(c.u32);
      const r2 = new Prng(c.seed);
      expect(c.below100.map(() => r2.nextBelow(100))).toEqual(c.below100);
    }
  });

  it("content version matches the fixture", () => {
    expect(content.contentVersion).toBe(fixture.contentVersion);
  });

  it("replaying the starter line reproduces the Kotlin end state", () => {
    const sim = replay(fixture.ticks);
    expect(expectedState(sim.state)).toEqual(fixture.expect);
  });

  it("mid-run save snapshot is byte-identical to the Kotlin one", () => {
    const kotlin = shared("fixtures/snapshot-starter-line-t2500.json").trimEnd();
    const sim = replay(2500);
    expect(encodeSnapshot(content, sim.state)).toBe(kotlin);
  });

  it("loads the Kotlin save and continues identically", () => {
    const kotlin = shared("fixtures/snapshot-starter-line-t2500.json").trimEnd();
    const loaded = new Simulation(content, decodeSnapshot(content, kotlin));
    expect(encodeSnapshot(content, loaded.state)).toBe(kotlin);
    const direct = replay(2500);
    // Held joystick input is transient (not saved): a reloaded player starts standing still.
    // Give both runs the same input, then continue.
    const move: Command = { type: "move", x: 0, z: -1000 };
    loaded.step([move]);
    direct.step([move]);
    loaded.run(200);
    direct.run(200);
    expect(encodeSnapshot(content, loaded.state)).toBe(encodeSnapshot(content, direct.state));
  });

  it("migrates the legacy schema-1 save exactly like Kotlin", () => {
    const v1 = shared("fixtures/legacy/snapshot-v1-starter-line-t2500.json").trimEnd();
    const s = decodeSnapshot(content, v1);
    expect(s.customers.length).toBeGreaterThan(0);
    expect(s.customers.every((c) => c.arrived && c.walkTicksTotal === 0)).toBe(true);
    expect(encodeSnapshot(content, s).startsWith('{"schemaVersion":4,')).toBe(true);
  });
});
