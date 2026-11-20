import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../src/engine";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  measureOfflineCloud4,
  OFFLINE_CLOUD_4_MARKER,
  OFFLINE_CLOUD_4_PHASE,
} from "../src/ship/offlineCloud4";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Offline/cloud/analytics hardening 4 (Finish 6.0 Phase 18)", () => {
  it("locks phase 18 catalog floors", () => {
    expect(OFFLINE_CLOUD_4_PHASE).toBe(18);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(27);
    expect(OFFLINE_CLOUD_4_MARKER).toBe("authored-finish-6.0-phase-18");
    expect((storeListing as { offlineCloud4Phase?: number }).offlineCloud4Phase).toBe(18);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("offlineCloud4Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(7);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeGreaterThanOrEqual(0);
  });

  it("measures offlinecloud4 wiring", () => {
    const m = measureOfflineCloud4(root);
    expect(m.journalFieldsPresent).toBe(true);
    expect(m.conflictFieldsPresent).toBe(true);
    expect(m.syncDiagnosticsPresent).toBe(true);
    expect(m.analyticsRetryWired).toBe(true);
    expect(m.conflictUxPresent).toBe(true);
    expect(m.kickoffClosed).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("wires RELEASE_PIN + offlinecloud4:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { offlineCloud4?: string; fixtures?: string[] };
    expect(pin.offlineCloud4).toBe("shared/ship/offline-cloud-4.json");
    expect(pin.fixtures).toContain("parity-offline-cloud-4.json");
    const out = execFileSync("npm", ["run", "offlinecloud4:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK offlinecloud4:validate");
  });
});
