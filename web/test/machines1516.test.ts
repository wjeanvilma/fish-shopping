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
  MACHINE_COUNT_1516,
  MACHINES_1516,
  MACHINES_1516_MARKER,
  MACHINES_1516_PHASE,
  measureMachines1516,
} from "../src/ship/machines1516";
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

describe("Machines 15–16 (Finish 6.0 Phase 9)", () => {
  it("locks phase 9 catalog floors", () => {
    expect(MACHINES_1516_PHASE).toBe(9);
    expect(MACHINE_COUNT_1516).toBe(16);
    expect(MACHINES_1516.newMachines).toHaveLength(2);
    expect(MACHINES_1516_MARKER).toBe("authored-finish-6.0-phase-9");
    expect((storeListing as { machines1516Phase?: number }).machines1516Phase).toBe(9);
  });

  it("measures 16 machines + wiring", () => {
    const m = measureMachines1516(root);
    expect(m.machineCount).toBeGreaterThanOrEqual(16);
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

  it("unlocks roaster and cooks roasted_fillet", () => {
    const fx = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/parity-machines-15-16.json"), "utf8"),
    );
    const sim = new Simulation(
      content,
      GameState.newGame(content, fx.harborId, fx.seed),
    );
    sim.state.coins = fx.setup.coins;
    for (const q of fx.setup.completedQuests) sim.state.completedQuests.add(q);
    for (const u of fx.setup.ownedUpgrades ?? []) sim.state.ownedUpgrades.add(u);

    const roaster = sim.state.machines.find((m) => m.stationId === fx.build.stationId)!;
    checkedStep(sim);
    expect(roaster.status).toBe("LOCKED");

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
    roaster.preferredRecipeId = fx.process.preferredRecipeId;
    for (let i = 0; i < 180; i++) checkedStep(sim);
    expect(roaster.output.quantity(fx.process.expectOutput.item)).toBe(
      fx.process.expectOutput.quantity,
    );

    expect(content.machines.length).toBeGreaterThanOrEqual(fx.expectFinal.machineCount);
    expect(sim.state.ownedUpgrades.has(fx.expectFinal.ownedUpgrade)).toBe(true);
  });

  it("machines1516:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-machines-15-16.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK machines1516:validate");
  }, 90_000);
});
