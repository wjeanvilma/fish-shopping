import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type Command,
  GameState,
  Simulation,
  loadContent,
} from "../src/engine";
import {
  MACHINE_COUNT_910,
  MACHINES_910,
  MACHINES_910_MARKER,
  MACHINES_910_PHASE,
  measureMachines910,
} from "../src/ship/machines910";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

function checkedStep(sim: Simulation, cmds: Command[] = []) {
  const events = sim.step(cmds);
  const problems = sim.invariantProblems();
  if (problems.length) throw new Error(problems.join("; "));
  return events;
}

function walkTo(sim: Simulation, x: number, z: number) {
  for (let i = 0; i < 2000; i++) {
    const p = sim.state.player;
    const dx = x - p.x;
    const dz = z - p.z;
    const dist = Math.trunc(Math.sqrt(dx * dx + dz * dz));
    if (dist <= 50) {
      checkedStep(sim, [{ type: "move", x: 0, z: 0 }]);
      return;
    }
    const speed = content.player.moveSpeedMmPerTick;
    const scale = dist < speed ? Math.trunc((1000 * dist) / speed) : 1000;
    checkedStep(sim, [
      {
        type: "move",
        x: Math.trunc((dx * scale) / dist),
        z: Math.trunc((dz * scale) / dist),
      },
    ]);
  }
  throw new Error("did not arrive");
}

function walkToPlot(sim: Simulation, plotId: string) {
  const plot = sim.harbor.plots.find((p) => p.id === plotId)!;
  const zone = sim.harbor.zones.find((z) => z.id === plot.zone)!;
  walkTo(
    sim,
    Math.trunc((zone.minX + zone.maxX) / 2),
    Math.trunc((zone.minZ + zone.maxZ) / 2),
  );
  expect(sim.state.player.zoneId).toBe(plot.zone);
}

describe("Machines 9–10 (Finish 3.0 Phase 13)", () => {
  it("locks phase 13 catalog floors", () => {
    expect(MACHINES_910_PHASE).toBe(13);
    expect(MACHINE_COUNT_910).toBe(10);
    expect(MACHINES_910.newMachines).toHaveLength(2);
    expect(MACHINES_910_MARKER).toBe("authored-finish-3.0-phase-13");
    expect((storeListing as { machines910Phase?: number }).machines910Phase).toBe(13);
  });

  it("measures 10 machines + wiring", () => {
    const m = measureMachines910(root);
    expect(m.machineCount).toBeGreaterThanOrEqual(10);
    expect(m.newMachinesPresent).toBe(true);
    expect(m.recipesWired).toBe(true);
    expect(m.productsPresent).toBe(true);
    expect(m.upgradesWired).toBe(true);
    expect(m.plotsWired).toBe(true);
    expect(m.stationsWired).toBe(true);
    expect(m.assetsPresent).toBe(true);
    expect(m.kickoffMachinesMet).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(m.missingAssets).toEqual([]);
  });

  it("unlocks press and cooks pressed_fillet", () => {
    const fx = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/parity-machines-9-10.json"), "utf8"),
    );
    const sim = new Simulation(
      content,
      GameState.newGame(content, fx.harborId, fx.seed),
    );
    sim.state.coins = fx.setup.coins;
    for (const q of fx.setup.completedQuests) sim.state.completedQuests.add(q);
    for (const u of fx.setup.ownedUpgrades ?? []) sim.state.ownedUpgrades.add(u);

    const press = sim.state.machines.find((m) => m.stationId === fx.build.stationId)!;
    checkedStep(sim);
    expect(press.status).toBe("LOCKED");

    walkToPlot(sim, fx.build.plotId);
    const bought = checkedStep(sim, [
      { type: "build_plot", plotId: fx.build.plotId, requestId: fx.build.requestId },
    ]);
    expect(bought.some((e) => e.type === "plot_built" && !(e as { replayed?: boolean }).replayed)).toBe(true);
    expect(sim.state.ownedUpgrades.has(fx.build.expectUpgrade)).toBe(true);

    walkTo(sim, fx.process.walkTo.x, fx.process.walkTo.z);
    expect(sim.state.player.zoneId).toBe(fx.process.walkTo.expectZone);
    for (const [item, qty] of Object.entries(fx.process.bagAfterUnlock as Record<string, number>)) {
      sim.state.player.bag.add(item, qty);
    }
    for (let i = 0; i < 40; i++) checkedStep(sim);
    expect(sim.state.player.bag.quantity("product.fillet")).toBe(0);
    press.preferredRecipeId = fx.process.preferredRecipeId;
    for (let i = 0; i < 150; i++) checkedStep(sim);
    expect(press.output.quantity(fx.process.expectOutput.item)).toBe(
      fx.process.expectOutput.quantity,
    );

    expect(content.machines.length).toBeGreaterThanOrEqual(fx.expectFinal.machineCount);
    expect(sim.state.ownedUpgrades.has(fx.expectFinal.ownedUpgrade)).toBe(true);
  });

  it("machines910:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-machines-9-10.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK machines910:validate");
  }, 90_000);
});
