import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PARITY_LOCK_FINISH6_SUITE_IDS,
  PARITY_LOCK_SUITE_IDS,
} from "../src/engine/parityLock";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  PARITY6_SUITE_FLOOR,
  PARITY_LOCK_6_MARKER,
  PARITY_LOCK_6_PHASE,
  REQUIRED_FINISH6_SUITE_IDS,
  measureParityLock6,
} from "../src/ship/parityLock6";

const root = resolve(__dirname, "../..");

describe("parity lock 6.0 (Finish 6.0 Phase 29)", () => {
  it("locks Finish 6.0 suite floors and closes parityLock6Missing", () => {
    expect(PARITY_LOCK_6_PHASE).toBe(29);
    expect(PARITY_LOCK_6_MARKER).toBe("authored-finish-6.0-phase-29");
    expect(PARITY_LOCK_SUITE_IDS.length).toBeGreaterThanOrEqual(PARITY6_SUITE_FLOOR);
    expect(PARITY_LOCK_FINISH6_SUITE_IDS).toEqual(REQUIRED_FINISH6_SUITE_IDS);
    const m = measureParityLock6(root);
    expect(m.floorsMet).toBe(true);
    expect(m.gapClosed).toBe(true);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("parityLock6Missing");
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBe(0);
    expect(
      (JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
        parityLock6Phase?: number;
      }).parityLock6Phase,
    ).toBe(29);
  });

  it("parity6:validate and prior parity gates pass", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-parity-lock-6.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK parity6:validate");

    const parity5 = execFileSync("npx", ["vite-node", "scripts/validate-parity-lock-5.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(parity5).toContain("OK parity5:validate");

    const parity4 = execFileSync("npx", ["vite-node", "scripts/validate-parity-lock-4.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(parity4).toContain("OK parity4:validate");
  }, 120_000);
});
