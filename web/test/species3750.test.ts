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
  BAIT_COUNT_FLOOR,
  SPECIES_3750,
  SPECIES_3750_PHASE,
  SPECIES_3750_SCHEMA,
  SPECIES_COUNT_FLOOR,
} from "../src/ship/species3750";
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

describe("Species 37–50 + baits (Finish 2.0 Phase 9)", () => {
  it("locks catalog and fifty-species / eight-bait floors", () => {
    expect(SPECIES_3750_PHASE).toBe(9);
    expect(SPECIES_3750_SCHEMA).toBe("fish.ship.species_37_50.v1");
    expect(SPECIES_COUNT_FLOOR).toBe(50);
    expect(BAIT_COUNT_FLOOR).toBe(8);
    expect(content.species).toHaveLength(50);
    expect(content.bait.length).toBeGreaterThanOrEqual(8);
    expect((storeListing as { species3750Phase?: number }).species3750Phase).toBe(9);
    for (const entry of SPECIES_3750.newBaseSpecies) {
      expect(content.speciesById.has(entry.id)).toBe(true);
      expect(content.speciesById.get(entry.id)!.rareUpgrade?.to).toBe(entry.rareUpgrade);
    }
    for (const id of SPECIES_3750.newBaits.map((b) => b.id)) {
      expect(content.baitById.has(id)).toBe(true);
    }
  });

  it("buys brine_paste at the sunrise pier bait kiosk", () => {
    const fx = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/parity-species-37-50.json"), "utf8"),
    );
    const sim = new Simulation(
      content,
      GameState.newGame(content, fx.harborId, fx.seed),
    );
    sim.state.coins = fx.setup.coins;
    for (const u of fx.setup.ownedUpgrades) sim.state.ownedUpgrades.add(u);
    walkTo(sim, fx.setup.walkTo.x, fx.setup.walkTo.z);
    expect(sim.state.player.zoneId).toBe(fx.setup.walkTo.expectZone);

    const offers = buildView(sim).baitOffers;
    expect(offers.length).toBe(content.bait.length);
    expect(offers.find((o) => o.id === "bait.brine_paste")?.purchasable).toBe(true);

    for (const step of fx.purchases) {
      const events = checkedStep(sim, [
        { type: "buy_bait", baitId: step.baitId, requestId: step.requestId },
      ]);
      expect(events.some((e) => e.type === "bait_purchased" && !e.replayed)).toBe(true);
      expect(sim.state.player.preferredBaitId).toBe(step.expectPreferred);
      expect(sim.state.player.bag.quantity(step.baitId)).toBeGreaterThan(0);
    }

    expect(content.species.length).toBe(fx.expectFinal.speciesCount);
    expect(content.bait.length).toBe(fx.expectFinal.baitCount);
    expect(sim.state.player.bag.quantity(fx.expectFinal.baitOwned)).toBeGreaterThan(0);
  });

  it("species3750:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-species-37-50.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK species3750:validate");
  }, 60_000);
});
