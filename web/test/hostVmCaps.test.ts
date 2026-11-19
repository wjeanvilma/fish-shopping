import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  HOST_VM_CAPS,
  HOST_VM_CAPS_MARKER,
  HOST_VM_CAPS_PHASE,
  HOST_VM_CAPS_SCHEMA,
  measureHostVmCaps,
} from "../src/ship/hostVmCaps";
import { storeListing } from "../src/store/listing";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

describe("hostVmCaps", () => {
  it("locks Finish 6.0 Phase 5 catalog mirrors", () => {
    expect(HOST_VM_CAPS_PHASE).toBe(5);
    expect(HOST_VM_CAPS_SCHEMA).toBe("fish.ship.host_vm_caps.v1");
    expect(HOST_VM_CAPS_MARKER).toBe("authored-finish-6.0-phase-5");
    expect(HOST_VM_CAPS.viewModelMaxLines).toBe(1200);
    expect(HOST_VM_CAPS.gameHostMaxLines).toBe(1100);
    expect(HOST_VM_CAPS.requiredFiles).toHaveLength(4);
    expect((storeListing as { hostVmCapsPhase?: number }).hostVmCapsPhase).toBe(5);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("hostVmCapsIncomplete");
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(7);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeGreaterThanOrEqual(0);
  });

  it("measures slim facades + extracted modules + closed gap", () => {
    const measure = measureHostVmCaps(root);
    expect(measure.viewModelSlim).toBe(true);
    expect(measure.gameHostSlim).toBe(true);
    expect(measure.extractedEnough).toBe(true);
    expect(measure.missingFiles).toEqual([]);
    expect(measure.missingSymbols).toEqual([]);
    expect(measure.facadeStillDefines).toEqual([]);
    expect(measure.gapClosed).toBe(true);
    expect(measure.kickoffWired).toBe(true);
  });

  it("wires RELEASE_PIN + hostvmcaps:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { hostVmCaps?: string; fixtures?: string[] };
    expect(pin.hostVmCaps).toBe("shared/ship/host-vm-caps.json");
    expect(pin.fixtures).toContain("parity-host-vm-caps.json");
    const out = execFileSync("npm", ["run", "hostvmcaps:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK hostvmcaps:validate");
  });
});
