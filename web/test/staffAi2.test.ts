import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, Stats } from "../src/engine";
import {
  measureStaffAi2,
  STAFF_AI_2_MARKER,
  STAFF_AI_2_PHASE,
} from "../src/ship/staffAi2";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Staff AI depth wave 2 (Finish 4.0 Phase 19)", () => {
  it("locks phase 19 catalog floors", () => {
    expect(STAFF_AI_2_PHASE).toBe(19);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(25);
    expect(STAFF_AI_2_MARKER).toBe("authored-finish-4.0-phase-19");
    expect((storeListing as { staffAi2Phase?: number }).staffAi2Phase).toBe(19);
    expect(Stats.FISHER_TROPHY_CASTS).toBe("stat.fisher_trophy_casts");
    expect(Stats.PORTER_RELAY_PICKUPS).toBe("stat.porter_relay_pickups");
    expect(Stats.CASHIER_QUICK_TILLS).toBe("stat.cashier_quick_tills");
  });

  it("measures wave-2 wiring", () => {
    const m = measureStaffAi2(root);
    expect(m.behaviorCount).toBe(5);
    expect(m.statCount).toBe(3);
    expect(m.reasonCount).toBe(5);
    expect(m.tsMarkersOk).toBe(true);
    expect(m.kotlinMarkersOk).toBe(true);
    expect(m.tsStatsOk).toBe(true);
    expect(m.kotlinStatsOk).toBe(true);
    expect(m.branchesPresent).toBe(true);
    expect(m.decisionReasonsPresent).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.softWorkerAiPath).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("soft-floors wave-1 worker AI to WorkerAi.kt", () => {
    const wave1 = JSON.parse(
      readFileSync(resolve(root, "shared/ship/worker-ai-depth.json"), "utf8"),
    );
    expect(String(wave1.kotlinWorkersPath)).toContain("WorkerAi.kt");
  });

  it("staffai2:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-staff-ai-2.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK staffai2:validate");
  });
});
