import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PARITY_LOCK_FINISH3_SUITE_IDS,
  PARITY_LOCK_SUITE_IDS,
} from "../src/engine/parityLock";
import {
  PARITY3_SUITE_FLOOR,
  PARITY_LOCK_3_MARKER,
  PARITY_LOCK_3_PHASE,
  REQUIRED_FINISH3_SUITE_IDS,
} from "../src/ship/parityLock3";

const root = resolve(__dirname, "../..");

describe("parity lock 3.0 (Finish 3.0 Phase 29)", () => {
  it("locks Finish 3.0 suite floors and listing pointers", () => {
    expect(PARITY_LOCK_3_PHASE).toBe(29);
    expect(PARITY_LOCK_3_MARKER).toBe("authored-finish-3.0-phase-29");
    expect(PARITY_LOCK_SUITE_IDS.length).toBeGreaterThanOrEqual(PARITY3_SUITE_FLOOR);
    expect(PARITY_LOCK_FINISH3_SUITE_IDS).toEqual(REQUIRED_FINISH3_SUITE_IDS);
    expect(
      (JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
        parityLock3Phase?: number;
      }).parityLock3Phase,
    ).toBe(29);
  });

  it("parity3:validate and baseline parity gates pass", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-parity-lock-3.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK parity3:validate");

    const parity2 = execFileSync("npx", ["vite-node", "scripts/validate-parity-lock-2.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(parity2).toContain("OK parity2:validate");
  }, 60_000);
});
