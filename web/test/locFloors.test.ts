import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LOC_ENFORCE_MODE,
  LOC_FLOORS,
  LOC_FLOORS_PHASE,
  LOC_FLOORS_SCHEMA,
  LOC_PRODUCT_TOTAL_FLOOR,
  LOC_PRODUCT_TOTAL_PLAN_TARGET,
  formatLocScoreboard,
  measureLocScoreboard,
} from "../src/ship/locFloors";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("LOC floors (Finish 2.0 Phase 6 → Phase 30 freeze)", () => {
  it("locks freeze floors + retained plan targets", () => {
    expect(LOC_FLOORS_PHASE).toBe(6);
    expect(LOC_FLOORS_SCHEMA).toBe("fish.ship.loc_floors.v1");
    expect(LOC_FLOORS.plan).toBe("30_finish_2.0");
    expect(LOC_FLOORS.enforceFloors).toBe(true);
    expect(LOC_ENFORCE_MODE).toBe("freeze_anti_regression");
    expect(LOC_FLOORS.enforceAtPhase).toBe(30);
    expect(LOC_PRODUCT_TOTAL_FLOOR).toBe(50_000);
    expect(LOC_PRODUCT_TOTAL_PLAN_TARGET).toBe(80_000);
    expect(LOC_FLOORS.scopes.gameCore.phase30Floor).toBe(16_000);
    expect(LOC_FLOORS.scopes.app.phase30Floor).toBe(10_000);
    expect(LOC_FLOORS.scopes.webSrc.phase30Floor).toBe(24_000);
    expect(LOC_FLOORS.scopes.gameCore.planTarget).toBe(25_000);
    expect(LOC_FLOORS.scopes.app.planTarget).toBe(16_000);
    expect(LOC_FLOORS.scopes.webSrc.planTarget).toBe(38_000);
    expect((storeListing as { locFloorsPhase?: number }).locFloorsPhase).toBe(6);
  });

  it("measures product scopes against freeze floors", () => {
    const board = measureLocScoreboard(root);
    expect(board.gameCore.lines).toBeGreaterThan(10_000);
    expect(board.app.lines).toBeGreaterThan(5_000);
    expect(board.webSrc.lines).toBeGreaterThan(15_000);
    expect(board.productTotal).toBe(
      board.gameCore.lines + board.app.lines + board.webSrc.lines,
    );
    expect(board.productTotal).toBeGreaterThan(LOC_FLOORS.baseline.productTotal * 0.9);
    expect(board.gameCore.met).toBe(true);
    expect(board.app.met).toBe(true);
    expect(board.webSrc.met).toBe(true);
    expect(board.productMet).toBe(true);
    const printed = formatLocScoreboard(board);
    expect(printed).toContain("LOC floors scoreboard");
    expect(printed).toContain("enforceFloors=true");
    expect(printed).toContain("planTargets retained");
  });

  it("loc:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-loc-floors.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK loc:validate");
  }, 60_000);
});
