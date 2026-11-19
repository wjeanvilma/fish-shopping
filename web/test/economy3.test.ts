import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BankSystem, GameState, SCHEMA_VERSION, Simulation, loadContent } from "../src/engine";
import { BusinessDashboard } from "../src/engine/businessDashboard";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import {
  ECONOMY_3_MARKER,
  ECONOMY_3_PHASE,
  measureEconomy3,
} from "../src/ship/economy3";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("Economy/bank/dashboard depth 3 (Finish 5.0 Phase 21)", () => {
  it("locks phase 21 catalog floors", () => {
    expect(ECONOMY_3_PHASE).toBe(21);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(26);
    expect(ECONOMY_3_MARKER).toBe("authored-finish-5.0-phase-21");
    expect((storeListing as { economy3Phase?: number }).economy3Phase).toBe(21);
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("economy3Incomplete");
    expect((content.bank.loanProducts ?? []).length).toBeGreaterThanOrEqual(5);
    expect(content.bank.goalPresets.length).toBeGreaterThanOrEqual(12);
  });

  it("measures economy3 wiring", () => {
    const m = measureEconomy3(root);
    expect(m.loanProductCount).toBeGreaterThanOrEqual(5);
    expect(m.goalPresetCount).toBeGreaterThanOrEqual(12);
    expect(m.loanProductsPresent).toBe(true);
    expect(m.newLoansPresent).toBe(true);
    expect(m.goalsPresent).toBe(true);
    expect(m.dashboardFieldsPresent).toBe(true);
    expect(m.ledgerUxPresent).toBe(true);
    expect(m.kickoffClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("takes tideglass loan when loan_cleared quest is complete", () => {
    const sim = new Simulation(content, GameState.newGame(content, "harbor.sunrise_pier", 2121));
    sim.state.completedQuests.add("quest.first_ten_sales");
    sim.state.completedQuests.add("quest.loan_cleared");
    const before = sim.state.coins;
    const events = sim.step([
      { type: "take_loan", requestId: "loan-tideglass", productId: "loan.tideglass" },
    ]);
    expect(events.some((e) => e.type === "loan_taken" && !e.replayed)).toBe(true);
    expect(sim.state.coins).toBe(before + 900);
    expect(sim.state.loanOwed).toBe(Math.trunc((900 * 1340) / 1000));
    expect(BankSystem.hasLoan(sim.state)).toBe(true);

    const dash = BusinessDashboard.build(content, sim.state, [], []);
    expect(dash.loanOwed).toBe(sim.state.loanOwed);
    expect(dash.loansTaken).toBeGreaterThanOrEqual(1);
    expect(dash.ledgerLines.some((l) => l.startsWith("loan "))).toBe(true);
  });

  it("wires RELEASE_PIN + economy3:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { economy3?: string; fixtures?: string[] };
    expect(pin.economy3).toBe("shared/ship/economy-bank-3.json");
    expect(pin.fixtures).toContain("parity-economy-bank-3.json");
    const out = execFileSync("npm", ["run", "economy3:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK economy3:validate");
  });
});
