import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DECOR_PLACEMENT, GameState, decodeSnapshot, encodeSnapshot, loadContent, Simulation } from "../src/engine";
import { DecorSystem } from "../src/engine/systems";

const content = loadContent(
  JSON.parse(readFileSync(resolve(__dirname, "../../shared/content/content-pack.json"), "utf8")),
);

describe("Decorate your harbor (cozy art pass 5)", () => {
  it("rejects unknown / unowned decor and accepts an owned item on open quay", () => {
    const s = GameState.newGame(content, "harbor.sunrise_pier", 7);
    const decor = content.decor.items[0]!;
    expect(DecorSystem.placementProblem(content, s, "decor.nope", 0, 0)).not.toBeNull();
    expect(DecorSystem.placementProblem(content, s, decor.id, 0, 0)).toMatch(/buy/i);
    s.ownedDecor.add(decor.id);
    // Find any valid spot on the grid.
    let spot: [number, number] | null = null;
    for (let x = -20000; x <= 20000 && !spot; x += DECOR_PLACEMENT.GRID_MM) {
      for (let z = -20000; z <= 20000 && !spot; z += DECOR_PLACEMENT.GRID_MM) {
        if (DecorSystem.placementProblem(content, s, decor.id, x, z) === null) spot = [x, z];
      }
    }
    expect(spot).not.toBeNull();
    const sim = new Simulation(content, s);
    sim.step([{ type: "place_decor", decorId: decor.id, xMm: spot![0], zMm: spot![1], rotationQuarter: 5 }]);
    const placed = s.decorPlacements.get(s.harborId)?.get(decor.id);
    expect(placed).toEqual({ xMm: spot![0], zMm: spot![1], rotationQuarter: 1 });

    // Round-trips through the snapshot; empty placements are omitted (schema-25 goldens stay identical).
    const back = decodeSnapshot(content, encodeSnapshot(content, s));
    expect(back.decorPlacements.get(s.harborId)?.get(decor.id)).toEqual(placed);
    sim.step([{ type: "store_decor", decorId: decor.id }]);
    expect(s.decorPlacements.get(s.harborId)?.has(decor.id) ?? false).toBe(false);
    expect(encodeSnapshot(content, s)).not.toContain("decorPlacements");
  });
});

describe("decor placement parity fixture", () => {
  it("web verdict counts match shared/fixtures/parity-decor-placement.json", () => {
    const fx = JSON.parse(
      readFileSync(resolve(__dirname, "../../shared/fixtures/parity-decor-placement.json"), "utf8"),
    ) as { harborId: string; seed: number; decorId: string; grid: Record<string, number>; verdictCounts: Record<string, number> };
    const s = GameState.newGame(content, fx.harborId, fx.seed);
    s.ownedDecor.add(fx.decorId);
    const counts: Record<string, number> = {};
    for (let x = fx.grid.minX!; x <= fx.grid.maxX!; x += fx.grid.stepMm!) {
      for (let z = fx.grid.minZ!; z <= fx.grid.maxZ!; z += fx.grid.stepMm!) {
        const v = DecorSystem.placementProblem(content, s, fx.decorId, x, z) ?? "OK";
        counts[v] = (counts[v] ?? 0) + 1;
      }
    }
    expect(counts).toEqual(fx.verdictCounts);
  });
});
