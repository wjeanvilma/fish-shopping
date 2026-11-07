import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CLOSED_TESTING_PHASE,
  CLOSED_TESTING_SCHEMA,
  closedTesting,
} from "../src/store/closedTesting";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("closed testing track (post-1.0 Phase 17)", () => {
  it("locks internal/closed tracks and Play Vitals triage (no Crashlytics SDK)", () => {
    expect(CLOSED_TESTING_PHASE).toBe(17);
    expect(CLOSED_TESTING_SCHEMA).toBe("fish.android.closed_testing.v1");
    expect(closedTesting.tracks.primary).toBe("internal");
    expect(closedTesting.tracks.secondary).toBe("closed");
    expect(closedTesting.crashTriage.provider).toBe("play_console_android_vitals");
    expect(closedTesting.crashTriage.sdk).toBeNull();
    expect(closedTesting.crashTriage.blockerCriteria.length).toBeGreaterThanOrEqual(3);
    expect(closedTesting.signoff.status).toBe("ready_for_upload");
    expect(closedTesting.signoff.productionPromotion).toBe("Phase 18");
    expect(closedTesting.artifacts.ciJob).toBe("android-release");
    expect((storeListing as { closedTestingPhase?: number }).closedTestingPhase).toBe(17);
  });

  it("preflight gates and AAB CI artifacts are present", () => {
    for (const gate of closedTesting.preflightGates) {
      expect(existsSync(resolve(root, gate)), gate).toBe(true);
    }
    expect(closedTesting.signoff.checklist.length).toBeGreaterThanOrEqual(5);
  });

  it("closed-test:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-closed-testing.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK closed-test:validate");
  });
});
