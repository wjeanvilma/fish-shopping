import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, Stats } from "../src/engine";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import {
  measureStaffAi3,
  STAFF_AI_3_MARKER,
  STAFF_AI_3_PHASE,
} from "../src/ship/staffAi3";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Staff AI depth wave 3 (Finish 5.0 Phase 20)", () => {
  it("locks phase 20 catalog floors", () => {
    expect(STAFF_AI_3_PHASE).toBe(20);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(26);
    expect(STAFF_AI_3_MARKER).toBe("authored-finish-5.0-phase-20");
    expect((storeListing as { staffAi3Phase?: number }).staffAi3Phase).toBe(20);
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("staffAi3Incomplete");
    expect(Stats.SUPERVISOR_RUSH_MARSHALS).toBe("stat.supervisor_rush_marshals");
    expect(Stats.OPERATOR_CIRCUIT_LINKS).toBe("stat.operator_circuit_links");
    expect(Stats.SMOKER_QUEUE_FEEDS).toBe("stat.smoker_queue_feeds");
    expect(Stats.SCHEDULE_TASK_BOOSTS).toBe("stat.schedule_task_boosts");
    expect(Stats.WORKER_FAILURE_RECOVERIES).toBe("stat.worker_failure_recoveries");
  });

  it("measures wave-3 wiring", () => {
    const m = measureStaffAi3(root);
    expect(m.behaviorCount).toBe(5);
    expect(m.statCount).toBe(5);
    expect(m.reasonCount).toBe(5);
    expect(m.branchCount).toBeGreaterThanOrEqual(13);
    expect(m.scheduleCount).toBeGreaterThanOrEqual(3);
    expect(m.tsMarkersOk).toBe(true);
    expect(m.kotlinMarkersOk).toBe(true);
    expect(m.tsStatsOk).toBe(true);
    expect(m.kotlinStatsOk).toBe(true);
    expect(m.newBranchesPresent).toBe(true);
    expect(m.newSchedulesPresent).toBe(true);
    expect(m.decisionReasonsPresent).toBe(true);
    expect(m.kickoffClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("wires RELEASE_PIN + staffai3:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { staffAi3?: string; fixtures?: string[] };
    expect(pin.staffAi3).toBe("shared/ship/staff-ai-3.json");
    expect(pin.fixtures).toContain("parity-staff-ai-3.json");
    const out = execFileSync("npm", ["run", "staffai3:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK staffai3:validate");
  });
});
