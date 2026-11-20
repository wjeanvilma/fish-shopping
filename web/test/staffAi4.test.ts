import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, Stats } from "../src/engine";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  measureStaffAi4,
  STAFF_AI_4_MARKER,
  STAFF_AI_4_PHASE,
} from "../src/ship/staffAi4";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Staff AI depth wave 4 (Finish 6.0 Phase 16)", () => {
  it("locks phase 16 catalog floors", () => {
    expect(STAFF_AI_4_PHASE).toBe(16);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(27);
    expect(STAFF_AI_4_MARKER).toBe("authored-finish-6.0-phase-16");
    expect((storeListing as { staffAi4Phase?: number }).staffAi4Phase).toBe(16);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("staffAi4Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(7);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeGreaterThanOrEqual(0);
    expect(Stats.ICE_RUNNER_NEST_CHILLS).toBe("stat.ice_runner_nest_chills");
    expect(Stats.GREETER_NEST_HOSTS).toBe("stat.greeter_nest_hosts");
    expect(Stats.PORTER_NEST_HAULS).toBe("stat.porter_nest_hauls");
    expect(Stats.SCHEDULE_TASK_BOOSTS).toBe("stat.schedule_task_boosts");
    expect(Stats.WORKER_FAILURE_RECOVERIES).toBe("stat.worker_failure_recoveries");
  });

  it("measures wave-4 wiring + decision-trace fixtures", () => {
    const m = measureStaffAi4(root);
    expect(m.behaviorCount).toBe(5);
    expect(m.statCount).toBe(5);
    expect(m.reasonCount).toBe(5);
    expect(m.branchCount).toBeGreaterThanOrEqual(16);
    expect(m.scheduleCount).toBeGreaterThanOrEqual(4);
    expect(m.tsMarkersOk).toBe(true);
    expect(m.kotlinMarkersOk).toBe(true);
    expect(m.tsStatsOk).toBe(true);
    expect(m.kotlinStatsOk).toBe(true);
    expect(m.newBranchesPresent).toBe(true);
    expect(m.newSchedulesPresent).toBe(true);
    expect(m.decisionReasonsPresent).toBe(true);
    expect(m.decisionTraceFixtureOk).toBe(true);
    expect(m.kickoffClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("wires RELEASE_PIN + staffai4:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { staffAi4?: string; fixtures?: string[] };
    expect(pin.staffAi4).toBe("shared/ship/staff-ai-4.json");
    expect(pin.fixtures).toContain("parity-staff-ai-4.json");
    expect(pin.fixtures).toContain("decision-traces-staff-ai-4.json");
    const out = execFileSync("npm", ["run", "staffai4:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK staffai4:validate");
  });
});
