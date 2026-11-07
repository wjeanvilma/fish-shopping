/**
 * Cross-platform parity: the TypeScript engine must reproduce the shared fixtures that
 * the Kotlin game-core tests also check (blueprint "Fixtures" and "Android/web same fixture").
 * Phase 27 expands economy / unlock / tutorial / entitlement expect fields.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { type Command, GameState, Prng, Simulation, decodeSnapshot, encodeSnapshot, loadContent, SCHEMA_VERSION } from "../src/engine";
import { parityExpectedState } from "../src/engine/parityLock";

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

function replayFixture(fx: Fixture, untilTick: number): Simulation {
  const sim = new Simulation(content, GameState.newGame(content, fx.harborId, fx.seed));
  const byTick = new Map<number, Command[]>();
  for (const { tick, ...cmd } of fx.commands) {
    byTick.set(tick, [...(byTick.get(tick) ?? []), cmd as Command]);
  }
  while (sim.state.tick < untilTick) {
    sim.step(byTick.get(sim.state.tick + 1) ?? []);
    const problems = sim.invariantProblems();
    if (problems.length) throw new Error(`Invariants at tick ${sim.state.tick}: ${problems.join("; ")}`);
  }
  return sim;
}

function replay(untilTick: number): Simulation {
  return replayFixture(fixture, untilTick);
}

/** Same fields and ordering as StarterLineFixture.expectedState in Kotlin. */
function expectedState(s: GameState) {
  return parityExpectedState(s);
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
    expect(sim.state.tutorialIndex).toBeGreaterThanOrEqual(content.tutorial.length);
    expect(expectedState(sim.state).workers).toBeGreaterThanOrEqual(1);
    expect(expectedState(sim.state).fullHarborUnlock).toBe(false);
  });

  it("replaying the entitlements unlock fixture matches Kotlin", () => {
    const entitlements: Fixture = JSON.parse(shared("fixtures/parity-entitlements.json"));
    const sim = replayFixture(entitlements, entitlements.ticks);
    expect(expectedState(sim.state)).toEqual(entitlements.expect);
    expect(sim.state.fullHarborUnlock).toBe(true);
    expect([...sim.state.unlockedCosmetics]).toContain("banner.iap_sunset_bunting");
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
    expect(encodeSnapshot(content, s).startsWith(`{"schemaVersion":${SCHEMA_VERSION},`)).toBe(true);
  });

  it("migrates the legacy schema-12 save with worker progression defaults", () => {
    const v12 = shared("fixtures/legacy/snapshot-v12-starter-line-t2500.json").trimEnd();
    const s = decodeSnapshot(content, v12);
    expect(s.tick).toBe(2500);
    expect(s.workers.every((w) => w.xp === 0 && w.level === 1 && w.traits.length === 0 && w.onShift)).toBe(true);
    expect(encodeSnapshot(content, s).startsWith(`{"schemaVersion":${SCHEMA_VERSION},`)).toBe(true);
  });

  it("migrates the legacy schema-13 save with onShift default", () => {
    const v13 = shared("fixtures/legacy/snapshot-v13-starter-line-t2500.json").trimEnd();
    const s = decodeSnapshot(content, v13);
    expect(s.tick).toBe(2500);
    expect(s.workers.every((w) => w.onShift)).toBe(true);
    expect(encodeSnapshot(content, s).startsWith(`{"schemaVersion":${SCHEMA_VERSION},`)).toBe(true);
  });

  it("migrates the legacy schema-14 save with empty equipment", () => {
    const v14 = shared("fixtures/legacy/snapshot-v14-starter-line-t2500.json").trimEnd();
    const s = decodeSnapshot(content, v14);
    expect(s.tick).toBe(2500);
    expect(s.workers.every((w) => w.onShift)).toBe(true);
    expect(s.workers.every((w) => Object.keys(w.equipment).length === 0)).toBe(true);
    expect(encodeSnapshot(content, s).startsWith(`{"schemaVersion":${SCHEMA_VERSION},`)).toBe(true);
  });

  it("migrates the legacy schema-16 save with wear defaults", () => {
    const v16 = shared("fixtures/legacy/snapshot-v16-starter-line-t2500.json").trimEnd();
    const s = decodeSnapshot(content, v16);
    expect(s.tick).toBe(2500);
    expect(s.machines.every((m) => !m.broken && m.slowUntilTick === 0)).toBe(true);
    const encoded = encodeSnapshot(content, s);
    expect(encoded.startsWith(`{"schemaVersion":${SCHEMA_VERSION},`)).toBe(true);
    expect(encoded).toContain('"broken":false');
    expect(encoded).toContain('"slowUntilTick":0');
  });

  it("migrates the legacy schema-17 save with bank defaults", () => {
    const v17 = shared("fixtures/legacy/snapshot-v17-starter-line-t2500.json").trimEnd();
    const s = decodeSnapshot(content, v17);
    expect(s.tick).toBe(2500);
    expect(s.loanOwed).toBe(0);
    expect(s.loanDueTick).toBe(0);
    expect(s.coinGoal).toBe(0);
    expect(s.coinGoalCelebrated).toBe(false);
    const encoded = encodeSnapshot(content, s);
    expect(encoded.startsWith(`{"schemaVersion":${SCHEMA_VERSION},`)).toBe(true);
    expect(encoded).toContain('"loanOwed":0');
    expect(encoded).toContain('"coinGoal":0');
  });

  it("migrates the legacy schema-18 save with empty species catches", () => {
    const v18 = shared("fixtures/legacy/snapshot-v18-starter-line-t2500.json").trimEnd();
    const s = decodeSnapshot(content, v18);
    expect(s.tick).toBe(2500);
    expect(s.speciesCatches.size).toBe(0);
    s.recordSpeciesCatch("species.silver_sprat", 4);
    const encoded = encodeSnapshot(content, s);
    expect(encoded.startsWith(`{"schemaVersion":${SCHEMA_VERSION},`)).toBe(true);
    expect(encoded).toContain('"species.silver_sprat":4');
    const restored = decodeSnapshot(content, encoded);
    expect(restored.speciesCatches.get("species.silver_sprat")).toBe(4);
  });

  it("migrates the legacy schema-15 save with ownedDecor default", () => {
    const v15 = shared("fixtures/legacy/snapshot-v15-starter-line-t2500.json").trimEnd();
    const s = decodeSnapshot(content, v15);
    expect(s.tick).toBe(2500);
    expect(s.ownedDecor.size).toBe(0);
    expect(s.fullHarborUnlock).toBe(false);
    expect(encodeSnapshot(content, s).startsWith(`{"schemaVersion":${SCHEMA_VERSION},`)).toBe(true);
  });

  it("migrates the legacy schema-19 save with fullHarborUnlock default", () => {
    const v19 = shared("fixtures/legacy/snapshot-v19-starter-line-t2500.json").trimEnd();
    const s = decodeSnapshot(content, v19);
    expect(s.tick).toBe(2500);
    expect(s.speciesCatches.size).toBeGreaterThan(0);
    expect(s.fullHarborUnlock).toBe(false);
    const encoded = encodeSnapshot(content, s);
    expect(encoded.startsWith(`{"schemaVersion":${SCHEMA_VERSION},`)).toBe(true);
    expect(encoded).toContain('"fullHarborUnlock":false');
    const restored = decodeSnapshot(content, encoded);
    expect(restored.fullHarborUnlock).toBe(false);
    expect(restored.speciesCatches.get("species.silver_sprat")).toBe(3);
  });
});
