import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../src/engine";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  ECONOMY_4_MARKER,
  ECONOMY_4_PHASE,
  measureEconomy4,
} from "../src/ship/economy4";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Economy/bank/dashboard depth 4 (Finish 6.0 Phase 17)", () => {
  it("locks phase 17 catalog floors", () => {
    expect(ECONOMY_4_PHASE).toBe(17);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(27);
    expect(ECONOMY_4_MARKER).toBe("authored-finish-6.0-phase-17");
    expect((storeListing as { economy4Phase?: number }).economy4Phase).toBe(17);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("economy4Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(7);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeGreaterThanOrEqual(0);
  });

  it("measures economy4 wiring", () => {
    const m = measureEconomy4(root);
    expect(m.loanProductCount).toBeGreaterThanOrEqual(7);
    expect(m.goalPresetCount).toBeGreaterThanOrEqual(16);
    expect(m.loanProductsPresent).toBe(true);
    expect(m.newLoansPresent).toBe(true);
    expect(m.goalsPresent).toBe(true);
    expect(m.dashboardFieldsPresent).toBe(true);
    expect(m.nestTreasuryUxPresent).toBe(true);
    expect(m.kickoffClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("wires RELEASE_PIN + economy4:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { economy4?: string; fixtures?: string[] };
    expect(pin.economy4).toBe("shared/ship/economy-bank-4.json");
    expect(pin.fixtures).toContain("parity-economy-bank-4.json");
    const out = execFileSync("npm", ["run", "economy4:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK economy4:validate");
  });
});
