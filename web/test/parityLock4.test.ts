import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PARITY_LOCK_FINISH4_SUITE_IDS,
  PARITY_LOCK_SUITE_IDS,
} from "../src/engine/parityLock";
import { FINISH4_OPEN_GAP_FLAGS } from "../src/ship/finish4Kickoff";
import {
  PARITY4_SUITE_FLOOR,
  PARITY_LOCK_4_MARKER,
  PARITY_LOCK_4_PHASE,
  REQUIRED_FINISH4_SUITE_IDS,
  measureParityLock4,
} from "../src/ship/parityLock4";

const root = resolve(__dirname, "../..");

describe("parity lock 4.0 (Finish 4.0 Phase 29)", () => {
  it("locks Finish 4.0 suite floors and closes parityLock4Missing", () => {
    expect(PARITY_LOCK_4_PHASE).toBe(29);
    expect(PARITY_LOCK_4_MARKER).toBe("authored-finish-4.0-phase-29");
    expect(PARITY_LOCK_SUITE_IDS.length).toBeGreaterThanOrEqual(PARITY4_SUITE_FLOOR);
    expect(PARITY_LOCK_FINISH4_SUITE_IDS).toEqual(REQUIRED_FINISH4_SUITE_IDS);
    const m = measureParityLock4(root);
    expect(m.floorsMet).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(FINISH4_OPEN_GAP_FLAGS).not.toContain("parityLock4Missing");
    expect(FINISH4_OPEN_GAP_FLAGS.length).toBe(0);
    expect(
      (JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
        parityLock4Phase?: number;
      }).parityLock4Phase,
    ).toBe(29);
  });

  it("parity4:validate and prior parity gates pass", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-parity-lock-4.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK parity4:validate");

    const parity3 = execFileSync("npx", ["vite-node", "scripts/validate-parity-lock-3.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(parity3).toContain("OK parity3:validate");

    const parity2 = execFileSync("npx", ["vite-node", "scripts/validate-parity-lock-2.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(parity2).toContain("OK parity2:validate");
  }, 90_000);
});
