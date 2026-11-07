import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GameState, Simulation, loadContent } from "../src/engine";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);
const fx = JSON.parse(
  readFileSync(resolve(root, "shared/fixtures/parity-machines-7-8.json"), "utf8"),
);
const sim = new Simulation(content, GameState.newGame(content, fx.harborId, fx.seed));
sim.state.coins = fx.setup.coins;
for (const q of fx.setup.completedQuests) sim.state.completedQuests.add(q);
sim.state.player.bag.add("product.fillet", 1);

function step(cmds: any[] = []) {
  const e = sim.step(cmds);
  const p = sim.invariantProblems();
  if (p.length) throw new Error(p.join("; "));
  return e;
}
function walkTo(x: number, z: number) {
  for (let i = 0; i < 2000; i++) {
    const p = sim.state.player;
    const dx = x - p.x;
    const dz = z - p.z;
    const dist = Math.trunc(Math.sqrt(dx * dx + dz * dz));
    if (dist <= 50) {
      step([{ type: "move", x: 0, z: 0 }]);
      return;
    }
    const speed = content.player.moveSpeedMmPerTick;
    const scale = dist < speed ? Math.trunc((1000 * dist) / speed) : 1000;
    step([
      {
        type: "move",
        x: Math.trunc((dx * scale) / dist),
        z: Math.trunc((dz * scale) / dist),
      },
    ]);
  }
  throw new Error("no arrive");
}

const steamer = sim.state.machines.find((m) => m.stationId === "station.steamer_1")!;
step();
console.log("locked", steamer.status);
const plot = sim.harbor.plots.find((p) => p.id === "plot.sunrise_steamer")!;
const zone = sim.harbor.zones.find((z) => z.id === plot.zone)!;
walkTo(Math.trunc((zone.minX + zone.maxX) / 2), Math.trunc((zone.minZ + zone.maxZ) / 2));
console.log("on plot", sim.state.player.zoneId, "coins", sim.state.coins, "upgrade cost", content.upgradesById.get("upgrade.harbor_steamer")!.cost);
const bought = step([{ type: "build_plot", plotId: "plot.sunrise_steamer", requestId: "p10" }]);
console.log(
  "events",
  bought.map((e) => e.type + ("reason" in e ? `:${(e as any).reason}` : "")),
  "owned",
  [...sim.state.ownedUpgrades],
  "status",
  steamer.status,
  "coins",
  sim.state.coins,
);
console.log("before walk bag", sim.state.player.bag.quantity("product.fillet"));
walkTo(10700, -7500);
console.log(
  "arrived zone",
  sim.state.player.zoneId,
  "bag",
  sim.state.player.bag.quantity("product.fillet"),
  "steam in/out",
  steamer.input.quantity("product.fillet"),
  steamer.output.quantity("product.steamed_fillet"),
  "status",
  steamer.status,
  "batch",
  steamer.activeBatch,
);
for (const m of sim.state.machines) {
  const inn = [...m.input.quantities.entries()].filter(([, n]) => n > 0);
  const out = [...m.output.quantities.entries()].filter(([, n]) => n > 0);
  if (inn.length || out.length) console.log("machine", m.stationId, "in", inn, "out", out, m.status, m.activeBatch);
}
