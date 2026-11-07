import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ANDROID_DEVICE_LIFECYCLE_PHASE,
  ANDROID_DEVICE_LIFECYCLE_SCHEMA,
  androidDeviceMatrix,
  deviceClassForWidthDp,
  shouldCheckpointForTrimLevel,
} from "../src/game/androidDeviceLifecycle";

const root = resolve(__dirname, "../..");

describe("Android device lifecycle matrix (post-1.0 Phase 13)", () => {
  it("covers background/resume/rotate/process_death/low_memory on phone+tablet", () => {
    expect(ANDROID_DEVICE_LIFECYCLE_PHASE).toBe(13);
    expect(ANDROID_DEVICE_LIFECYCLE_SCHEMA).toBe("fish.lifecycle.android_device_matrix.v1");
    expect(androidDeviceMatrix.scenarios.map((s) => s.id)).toEqual([
      "background",
      "resume",
      "rotate",
      "process_death",
      "low_memory",
    ]);
    expect(androidDeviceMatrix.deviceClasses.map((c) => c.id)).toEqual([
      "phone",
      "tablet7",
      "tablet10",
    ]);
    expect(deviceClassForWidthDp(411)).toBe("phone");
    expect(deviceClassForWidthDp(700)).toBe("tablet7");
    expect(deviceClassForWidthDp(900)).toBe("tablet10");
    expect(shouldCheckpointForTrimLevel(5)).toBe(false);
    expect(shouldCheckpointForTrimLevel(10)).toBe(true);
  });

  it("aligns restore slots with Phase 28 and host source", () => {
    const phase28 = JSON.parse(
      readFileSync(resolve(root, "shared/lifecycle/browser-lifecycle.json"), "utf8"),
    );
    expect(androidDeviceMatrix.restoreSlots).toEqual(phase28.android.processDeath.restoreFrom);
    const main = readFileSync(
      resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/MainActivity.kt"),
      "utf8",
    );
    expect(main).toContain("onTrimMemory");
    expect(main).toContain("onConfigurationChanged");
  });

  it("lifecycle:android:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-android-lifecycle.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK lifecycle:android:validate");
  });
});
