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
  MACHINE_COUNT_1314,
  MACHINES_1314,
  MACHINES_1314_MARKER,
  MACHINES_1314_PHASE,
  measureMachines1314,
} from "../src/ship/machines1314";
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

describe("Machines 13–14 (Finish 5.0 Phase 15)", () => {
  it("locks phase 15 catalog floors", () => {
    expect(MACHINES_1314_PHASE).toBe(15);
    expect(MACHINE_COUNT_1314).toBe(14);
    expect(MACHINES_1314.newMachines).toHaveLength(2);
    expect(MACHINES_1314_MARKER).toBe("authored-finish-5.0-phase-15");
    expect((storeListing as { machines1314Phase?: number }).machines1314Phase).toBe(15);
  });

  it("measures 14 machines + wiring", () => {
    const m = measureMachines1314(root);
    expect(m.machineCount).toBeGreaterThanOrEqual(14);
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

  it("unlocks poacher and cooks poached_fillet", () => {
    const fx = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/parity-machines-13-14.json"), "utf8"),
    );
    const sim = new Simulation(
      content,
      GameState.newGame(content, fx.harborId, fx.seed),
    );
    sim.state.coins = fx.setup.coins;
    for (const q of fx.setup.completedQuests) sim.state.completedQuests.add(q);
    for (const u of fx.setup.ownedUpgrades ?? []) sim.state.ownedUpgrades.add(u);

    const poacher = sim.state.machines.find((m) => m.stationId === fx.build.stationId)!;
    checkedStep(sim);
    expect(poacher.status).toBe("LOCKED");

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
    poacher.preferredRecipeId = fx.process.preferredRecipeId;
    for (let i = 0; i < 180; i++) checkedStep(sim);
    expect(poacher.output.quantity(fx.process.expectOutput.item)).toBe(
      fx.process.expectOutput.quantity,
    );

    expect(content.machines.length).toBeGreaterThanOrEqual(fx.expectFinal.machineCount);
    expect(sim.state.ownedUpgrades.has(fx.expectFinal.ownedUpgrade)).toBe(true);
  });

  it("machines1314:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-machines-13-14.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK machines1314:validate");
  }, 90_000);
});
