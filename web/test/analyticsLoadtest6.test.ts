import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ANALYTICS_EVENT_NAMES } from "../src/engine/analytics";
import { SCHEMA_VERSION } from "../src/engine";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  ANALYTICS_LOADTEST_6_EVENT_FLOOR,
  ANALYTICS_LOADTEST_6_MARKER,
  ANALYTICS_LOADTEST_6_PHASE,
  measureAnalyticsLoadtest6,
} from "../src/ship/analyticsLoadtest6";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Analytics + loadtest banks 6 (Finish 6.0 Phase 26)", () => {
  it("locks phase 26 catalog floors", () => {
    expect(ANALYTICS_LOADTEST_6_PHASE).toBe(26);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(27);
    expect(ANALYTICS_LOADTEST_6_MARKER).toBe("authored-finish-6.0-phase-26");
    expect(ANALYTICS_LOADTEST_6_EVENT_FLOOR).toBe(11);
    expect(ANALYTICS_EVENT_NAMES.length).toBeGreaterThanOrEqual(11);
    expect(ANALYTICS_EVENT_NAMES).toContain("nest_sigil_earned");
    expect(ANALYTICS_EVENT_NAMES).toContain("nest_contract_settled");
    expect(ANALYTICS_EVENT_NAMES).toContain("loadtest_bank_probed");
    expect((storeListing as { analyticsLoadtest6Phase?: number }).analyticsLoadtest6Phase).toBe(26);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("loadtestBanksIncomplete");
    // Soft-floor: Phase 29 closed parityLock6Missing → 0 open flags.
    expect(FINISH6_OPEN_GAP_FLAGS).toHaveLength(0);
  });

  it("measures analytics-loadtest-6 wiring + bank floors", () => {
    const m = measureAnalyticsLoadtest6(root);
    expect(m.eventsEnough).toBe(true);
    expect(m.nestEventsPresent).toBe(true);
    expect(m.soakEnough).toBe(true);
    expect(m.banksFloorsMet).toBe(true);
    expect(m.bankSchemaOk).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("analyticsloadtest6:validate exits 0", () => {
    execFileSync("npm", ["run", "analyticsloadtest6:validate"], {
      cwd: resolve(root, "web"),
      stdio: "pipe",
    });
  });
});
