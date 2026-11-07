import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HOTFIX_LANE,
  HOTFIX_LANE_PHASE,
  HOTFIX_LANE_SCHEMA,
  formatSemVer,
  hotfixTagFor,
  initialHotfixRolloutPercent,
  isHotfixVersionName,
  isValidHotfixBump,
  parseSemVer,
  validateHotfixPin,
} from "../src/engine/hotfixLane";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Hotfix lane (post-1.0 Phase 29)", () => {
  it("locks 1.0.x versioning and 10→50→100 staged rollout", () => {
    expect(HOTFIX_LANE_PHASE).toBe(29);
    expect(HOTFIX_LANE_SCHEMA).toBe("fish.ship.hotfix_lane.v1");
    expect(HOTFIX_LANE.schemaVersion).toBe(20);
    expect(HOTFIX_LANE.versioning.allowedMajor).toBe(1);
    expect(HOTFIX_LANE.versioning.allowedMinor).toBe(0);
    expect(HOTFIX_LANE.versioning.forbidSchemaBump).toBe(true);
    expect(HOTFIX_LANE.stagedRollout.steps.map((s) => s.percent)).toEqual([10, 50, 100]);
    expect(initialHotfixRolloutPercent()).toBe(10);
    expect(HOTFIX_LANE.ci.job).toBe("android-hotfix");
    expect(HOTFIX_LANE.ci.trigger).toBe("workflow_dispatch");
    expect((storeListing as { hotfixLanePhase?: number }).hotfixLanePhase).toBe(29);
  });

  it("accepts patch bumps and rejects minor/schema breaks", () => {
    expect(parseSemVer("1.0.1")).toEqual({ major: 1, minor: 0, patch: 1 });
    expect(formatSemVer({ major: 1, minor: 0, patch: 2 })).toBe("1.0.2");
    expect(isHotfixVersionName("1.0.1")).toBe(true);
    expect(isHotfixVersionName("1.1.0")).toBe(false);
    expect(isValidHotfixBump("1.0.1", "1.0.2")).toBe(true);
    expect(isValidHotfixBump("1.0.1", "1.0.3")).toBe(false);
    expect(isValidHotfixBump("1.0.1", "2.0.0")).toBe(false);
    expect(hotfixTagFor("1.0.2")).toBe("v1.0.2");
    expect(
      validateHotfixPin({
        versionName: "1.0.1",
        contentVersion: "1.0.1",
        versionCode: 2,
        schemaVersion: 20,
        storeRelease: { versionName: "1.0.0", versionCode: 1 },
      }),
    ).toEqual([]);
    expect(
      validateHotfixPin({
        versionName: "1.0.1",
        contentVersion: "1.0.1",
        versionCode: 1,
        schemaVersion: 20,
        storeRelease: { versionName: "1.0.0", versionCode: 1 },
      }).length,
    ).toBeGreaterThan(0);
    expect(
      validateHotfixPin({
        versionName: "1.0.1",
        contentVersion: "1.0.1",
        versionCode: 2,
        schemaVersion: 21,
        storeRelease: { versionName: "1.0.0", versionCode: 1 },
      }),
    ).toContain("schemaVersion must stay 20");
  });

  it("preflight gates exist", () => {
    for (const gate of HOTFIX_LANE.checklist.slice(0, 1)) {
      expect(gate.length).toBeGreaterThan(0);
    }
    expect(existsSync(resolve(root, "shared/ship/hotfix-lane.json"))).toBe(true);
    expect(existsSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"))).toBe(true);
  });

  it("hotfix:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-hotfix-lane.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK hotfix:validate");
  });
});
