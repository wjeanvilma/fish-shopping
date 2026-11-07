import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PARITY_LOCK,
  PARITY_LOCK_FINISH2_PHASE,
  PARITY_LOCK_FINISH2_SUITE_IDS,
  PARITY_LOCK_SUITE_IDS,
} from "../src/engine/parityLock";
import {
  PARITY_FINISH2_SUITE_FLOOR,
  PARITY_LOCK_2_MARKER,
  PARITY_LOCK_2_PHASE,
  PARITY_SUITE_FLOOR,
  REQUIRED_FINISH2_SUITE_IDS,
} from "../src/ship/parityLock2";

const root = resolve(__dirname, "../..");

describe("Parity lock 2.0 (Finish 2.0 Phase 29)", () => {
  it("locks suite floors and finish2 suite ids", () => {
    expect(PARITY_LOCK_2_PHASE).toBe(29);
    expect(PARITY_LOCK_2_MARKER).toBe("authored-finish-2.0-phase-29");
    expect(PARITY_SUITE_FLOOR).toBe(8);
    expect(PARITY_FINISH2_SUITE_FLOOR).toBe(4);
    expect(PARITY_LOCK_FINISH2_PHASE).toBe(29);
    expect(PARITY_LOCK_SUITE_IDS.length).toBeGreaterThanOrEqual(8);
    expect(PARITY_LOCK_FINISH2_SUITE_IDS).toEqual(REQUIRED_FINISH2_SUITE_IDS);
    expect(PARITY_LOCK.gates.achievementsIdempotent).toBe(true);
    expect(PARITY_LOCK.gates.weatherDeterministicFromTick).toBe(true);
    expect(PARITY_LOCK.gates.masteryXpOnCatch).toBe(true);
    expect(PARITY_LOCK.gates.festivalTipsCatalogDriven).toBe(true);
    const listing = JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
      parityLock2Phase?: number;
    };
    expect(listing.parityLock2Phase).toBe(29);
  });

  it("parity2:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-parity-lock-2.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK parity2:validate");
  });

  it("baseline parity:validate still green", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-parity-lock.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK parity:validate");
  });
});
