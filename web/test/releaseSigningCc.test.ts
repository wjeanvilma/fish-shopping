import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CHECK_RELEASE_UPLOAD_SIGNING,
  RELEASE_SIGNING_CC,
  RELEASE_SIGNING_CC_PHASE,
  RELEASE_SIGNING_CC_SCHEMA,
} from "../src/ship/releaseSigningCc";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Release signing CC (Finish 2.0 Phase 5)", () => {
  it("locks configuration-cache-safe gate contracts", () => {
    expect(RELEASE_SIGNING_CC_PHASE).toBe(5);
    expect(RELEASE_SIGNING_CC_SCHEMA).toBe("fish.ship.release_signing_cc.v1");
    expect(RELEASE_SIGNING_CC.plan).toBe("30_finish_2.0");
    expect(RELEASE_SIGNING_CC.schemaVersion).toBe(21);
    expect(CHECK_RELEASE_UPLOAD_SIGNING).toBe("checkReleaseUploadSigning");
    expect(RELEASE_SIGNING_CC.configurationCache.guardTasks).toEqual([
      "packageRelease",
      "bundleRelease",
    ]);
    expect((storeListing as { releaseSigningCcPhase?: number }).releaseSigningCcPhase).toBe(5);
    expect(existsSync(resolve(root, "shared/ship/release-signing-cc.json"))).toBe(true);

    const gradle = readFileSync(resolve(root, "app/build.gradle.kts"), "utf8");
    for (const needle of RELEASE_SIGNING_CC.configurationCache.requiredPatterns) {
      expect(gradle).toContain(needle);
    }
    expect(gradle).not.toContain('tasks.findByName(taskName)?.doFirst');
  });

  it("signing:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-release-signing-cc.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK signing:validate");
  }, 60_000);
});
