import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BankSystem, GameState, SCHEMA_VERSION, Simulation, loadContent } from "../src/engine";
import {
  ECONOMY_2_MARKER,
  ECONOMY_2_PHASE,
  measureEconomy2,
} from "../src/ship/economy2";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("Economy/bank/dashboard depth (Finish 4.0 Phase 20)", () => {
  it("locks phase 20 catalog floors", () => {
    expect(ECONOMY_2_PHASE).toBe(20);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(25);
    expect(ECONOMY_2_MARKER).toBe("authored-finish-4.0-phase-20");
    expect((storeListing as { economy2Phase?: number }).economy2Phase).toBe(20);
    expect((content.bank.loanProducts ?? []).length).toBeGreaterThanOrEqual(3);
    expect(content.bank.goalPresets.length).toBeGreaterThanOrEqual(8);
  });

  it("measures economy deepen wiring", () => {
    const m = measureEconomy2(root);
    expect(m.loanProductCount).toBeGreaterThanOrEqual(3);
    expect(m.goalPresetCount).toBeGreaterThanOrEqual(8);
    expect(m.loanProductsPresent).toBe(true);
    expect(m.goalsPresent).toBe(true);
    expect(m.scarcityMatches).toBe(true);
    expect(m.dashboardFieldsPresent).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("takes expansion loan when ledger quest is complete", () => {
    const sim = new Simulation(content, GameState.newGame(content, "harbor.sunrise_pier", 2020));
    sim.state.completedQuests.add("quest.first_ten_sales");
    sim.state.completedQuests.add("quest.loan_ledger");
    const before = sim.state.coins;
    const events = sim.step([
      { type: "take_loan", requestId: "loan-expansion", productId: "loan.expansion" },
    ]);
    expect(events.some((e) => e.type === "loan_taken" && !e.replayed)).toBe(true);
    expect(sim.state.coins).toBe(before + 220);
    expect(sim.state.loanOwed).toBe(Math.trunc((220 * 1280) / 1000));
    expect(BankSystem.hasLoan(sim.state)).toBe(true);
  });

  it("economy2:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-economy-2.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK economy2:validate");
  });
});
