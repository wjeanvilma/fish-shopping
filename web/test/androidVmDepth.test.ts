import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../src/engine";
import {
  ANDROID_VM_DEPTH_MARKER,
  ANDROID_VM_DEPTH_PHASE,
  measureAndroidVmDepth,
} from "../src/ship/androidVmDepth";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Android VM depth (Finish 5.0 Phase 4)", () => {
  it("locks phase 4 catalog floors", () => {
    expect(ANDROID_VM_DEPTH_PHASE).toBe(4);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(25);
    expect(ANDROID_VM_DEPTH_MARKER).toBe("authored-finish-5.0-phase-4");
    expect((storeListing as { androidVmDepthPhase?: number }).androidVmDepthPhase).toBe(4);
  });

  it("measures VM fishing intents + HUD bindings", () => {
    const m = measureAndroidVmDepth(root);
    expect(m.viewFieldCount).toBeGreaterThanOrEqual(10);
    expect(m.requiredFilesPresent).toBe(true);
    expect(m.symbolsPresent).toBe(true);
    expect(m.hudBindingsPresent).toBe(true);
    expect(m.loopSnapshotCoversFields).toBe(true);
    expect(m.kickoffWired).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("androidvmdepth:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-android-vm-depth.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK androidvmdepth:validate");
  });
});
