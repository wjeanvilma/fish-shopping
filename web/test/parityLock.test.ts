import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PARITY_LOCK,
  PARITY_LOCK_PHASE,
  PARITY_LOCK_SCHEMA,
  parityExpectedState,
} from "../src/engine/parityLock";
import { GameState, loadContent } from "../src/engine";

const root = resolve(__dirname, "../..");
const shared = (p: string) => readFileSync(resolve(root, "shared", p), "utf8");
const content = loadContent(JSON.parse(shared("content/content-pack.json")));

describe("Parity lock (post-1.0 Phase 27)", () => {
  it("locks suite catalog for economy/tutorial/entitlements/migrations", () => {
    expect(PARITY_LOCK_PHASE).toBe(27);
    expect(PARITY_LOCK_SCHEMA).toBe("fish.fixtures.parity_lock.v1");
    expect(PARITY_LOCK.contentVersion).toBe("1.0.1");
    expect(PARITY_LOCK.schemaVersion).toBe(20);
    expect(PARITY_LOCK.suites.map((s) => s.id)).toEqual([
      "prng",
      "starter_line",
      "entitlements_unlock",
      "legacy_migrations",
    ]);
    for (const field of [
      "harborId",
      "fullHarborUnlock",
      "unlockedCosmetics",
      "ownedDecor",
      "loanOwed",
      "coinGoal",
      "workers",
      "tutorialIndex",
    ]) {
      expect(PARITY_LOCK.expandedExpectFields).toContain(field);
    }
    expect(PARITY_LOCK.gates.tutorialFinishedInStarterLine).toBe(true);
    expect(PARITY_LOCK.gates.entitlementGrantsIdempotent).toBe(true);
    expect(PARITY_LOCK.gates.midRunSnapshotByteIdentical).toBe(true);
  });

  it("starter-line expect includes expanded parity fields", () => {
    const expectState = JSON.parse(shared("fixtures/starter-line.json")).expect;
    for (const field of PARITY_LOCK.expandedExpectFields) {
      expect(expectState).toHaveProperty(field);
    }
    expect(expectState.fullHarborUnlock).toBe(false);
    expect(expectState.loanOwed).toBe(0);
    expect(expectState.tutorialIndex).toBeGreaterThanOrEqual(content.tutorial.length);
    expect(expectState.workers).toBeGreaterThanOrEqual(1);
  });

  it("parityExpectedState mirrors Kotlin expanded shape on a fresh game", () => {
    const state = GameState.newGame(content, "harbor.sunrise_pier", 27);
    const snap = parityExpectedState(state);
    expect(snap.harborId).toBe("harbor.sunrise_pier");
    expect(snap.fullHarborUnlock).toBe(false);
    expect(snap.unlockedCosmetics).toEqual([]);
    expect(snap.ownedDecor).toEqual([]);
    expect(snap.loanOwed).toBe(0);
    expect(snap.coinGoal).toBe(0);
    expect(snap.workers).toBe(0);
    expect(snap.tutorialIndex).toBe(0);
  });

  it("parity:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-parity-lock.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK parity:validate");
  });
});
