import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PARITY_LOCK_FINISH5_SUITE_IDS,
  PARITY_LOCK_SUITE_IDS,
} from "../src/engine/parityLock";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import {
  PARITY5_SUITE_FLOOR,
  PARITY_LOCK_5_MARKER,
  PARITY_LOCK_5_PHASE,
  REQUIRED_FINISH5_SUITE_IDS,
  measureParityLock5,
} from "../src/ship/parityLock5";

const root = resolve(__dirname, "../..");

describe("parity lock 5.0 (Finish 5.0 Phase 29)", () => {
  it("locks Finish 5.0 suite floors and closes parityLock5Missing", () => {
    expect(PARITY_LOCK_5_PHASE).toBe(29);
    expect(PARITY_LOCK_5_MARKER).toBe("authored-finish-5.0-phase-29");
    expect(PARITY_LOCK_SUITE_IDS.length).toBeGreaterThanOrEqual(PARITY5_SUITE_FLOOR);
    expect(PARITY_LOCK_FINISH5_SUITE_IDS).toEqual(REQUIRED_FINISH5_SUITE_IDS);
    const m = measureParityLock5(root);
    expect(m.floorsMet).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("parityLock5Missing");
    expect(FINISH5_OPEN_GAP_FLAGS.length).toBe(0);
    expect(
      (JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
        parityLock5Phase?: number;
      }).parityLock5Phase,
    ).toBe(29);
  });

  it("parity5:validate and prior parity gates pass", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-parity-lock-5.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK parity5:validate");

    const parity4 = execFileSync("npx", ["vite-node", "scripts/validate-parity-lock-4.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(parity4).toContain("OK parity4:validate");

    const parity3 = execFileSync("npx", ["vite-node", "scripts/validate-parity-lock-3.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(parity3).toContain("OK parity3:validate");
  }, 120_000);
});
