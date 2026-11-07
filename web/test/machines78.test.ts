import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type Command,
  GameState,
  Simulation,
  buildView,
  loadContent,
} from "../src/engine";
import {
  MACHINE_COUNT_FLOOR,
  MACHINES_78,
  MACHINES_78_PHASE,
  MACHINES_78_SCHEMA,
} from "../src/ship/machines78";
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

describe("Machines 7–8 (Finish 2.0 Phase 10)", () => {
  it("locks catalog and eight machine-class floor", () => {
    expect(MACHINES_78_PHASE).toBe(10);
    expect(MACHINES_78_SCHEMA).toBe("fish.ship.machines_7_8.v1");
    expect(MACHINE_COUNT_FLOOR).toBe(8);
    expect(content.machines).toHaveLength(8);
    expect((storeListing as { machines78Phase?: number }).machines78Phase).toBe(10);
    for (const entry of MACHINES_78.newMachines) {
      expect(content.machinesById.has(entry.id)).toBe(true);
      expect(content.upgradesById.get(entry.unlockUpgrade)!.effect).toEqual({
        kind: "unlock_machine",
        machine: entry.id,
      });
      for (const harbor of content.harbors) {
        expect(harbor.stations.some((s) => s.machine === entry.id)).toBe(true);
      }
    }
  });

  it("unlocks steamer and cooks steamed_fillet with warehouse reconcile", () => {
    const fx = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/parity-machines-7-8.json"), "utf8"),
    );
    const sim = new Simulation(
      content,
      GameState.newGame(content, fx.harborId, fx.seed),
    );
    sim.state.coins = fx.setup.coins;
    for (const q of fx.setup.completedQuests) sim.state.completedQuests.add(q);

    const steamer = sim.state.machines.find((m) => m.stationId === fx.build.stationId)!;
    checkedStep(sim);
    expect(steamer.status).toBe("LOCKED");

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
    steamer.preferredRecipeId = fx.process.preferredRecipeId;
    for (let i = 0; i < 150; i++) checkedStep(sim);
    expect(steamer.output.quantity(fx.process.expectOutput.item)).toBe(
      fx.process.expectOutput.quantity,
    );

    expect(content.machines.length).toBe(fx.expectFinal.machineCount);
    expect(sim.state.ownedUpgrades.has(fx.expectFinal.ownedUpgrade)).toBe(true);
    expect(buildView(sim).warehouse.reconcileOk).toBe(fx.expectFinal.reconcileOk);
  });

  it("machines78:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-machines-7-8.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK machines78:validate");
  }, 60_000);
});
