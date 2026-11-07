import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PERF_BUDGET_GATE_PHASE,
  PERF_BUDGET_GATE_SCHEMA,
  perfBudgetGate,
  presenterCapsMatchRuntime,
  runSyntheticDowngradeSmoke,
  webBudgetsMatchRuntime,
} from "../src/render/perfBudgetGate";

const root = resolve(__dirname, "../..");

describe("perf budget gate (post-1.0 Phase 15)", () => {
  it("locks Phase 26 budgets and 20 Hz sim invariant", () => {
    expect(PERF_BUDGET_GATE_PHASE).toBe(15);
    expect(PERF_BUDGET_GATE_SCHEMA).toBe("fish.perf.budget_gate.v1");
    expect(perfBudgetGate.simHzInvariant).toBe(20);
    expect(perfBudgetGate.budgets.android.frameTargetMs.medium).toBe(33.3);
    expect(perfBudgetGate.budgets.web.frameTargetMs.medium).toBe(16.7);
    expect(perfBudgetGate.presenterCaps.fly.high).toBe(12);
    expect(perfBudgetGate.failCriteria.length).toBeGreaterThanOrEqual(3);
    expect(perfBudgetGate.deviceChecklist.length).toBeGreaterThanOrEqual(3);
    expect(webBudgetsMatchRuntime()).toEqual([]);
    expect(presenterCapsMatchRuntime()).toEqual([]);
  });

  it("synthetic downgrade smoke passes", () => {
    const smoke = runSyntheticDowngradeSmoke();
    expect(smoke.ok).toBe(true);
  });

  it("perf:budget exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-perf-budget.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK perf:budget");
  });
});
