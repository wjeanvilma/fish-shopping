import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { cloudConflictOffer } from "../src/engine/cloudSync";
import { encodeSnapshot, GameState, loadContent } from "../src/engine";
import { REMOTE_REQUEUE_ON_FLUSH_FAILURE } from "../src/engine/remoteAnalytics";
import {
  OFFLINE_CLOUD_2,
  OFFLINE_CLOUD_2_MARKER,
  OFFLINE_CLOUD_2_PHASE,
  measureOfflineCloud2,
} from "../src/ship/offlineCloud2";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("offline/cloud/analytics hardening (Finish 4.0 Phase 21)", () => {
  it("locks catalog floors", () => {
    expect(OFFLINE_CLOUD_2_PHASE).toBe(21);
    expect(OFFLINE_CLOUD_2_MARKER).toBe("authored-finish-4.0-phase-21");
    expect(content.dailyGoals.objectives.length).toBeGreaterThanOrEqual(OFFLINE_CLOUD_2.dailyObjectiveMin);
    expect(content.dailyGoals.boardSlots).toBeGreaterThanOrEqual(OFFLINE_CLOUD_2.boardSlotsMin);
    for (const id of OFFLINE_CLOUD_2.objectiveIds) {
      expect(content.dailyObjectivesById.has(id)).toBe(true);
    }
    expect(REMOTE_REQUEUE_ON_FLUSH_FAILURE).toBe(true);
    const measure = measureOfflineCloud2(root);
    expect(measure.objectivesPresent).toBe(true);
    expect(measure.journalFieldsPresent).toBe(true);
    expect(measure.conflictFieldsPresent).toBe(true);
    expect(measure.analyticsRetryWired).toBe(true);
  });

  it("conflict offer exposes reasonCode + diffHints", () => {
    const olderState = GameState.newGame(content, "harbor.sunrise_pier", 21);
    olderState.coins = 10;
    const newerState = GameState.newGame(content, "harbor.moon_cove", 22);
    newerState.coins = 40;
    const offer = cloudConflictOffer(
      encodeSnapshot(content, olderState, 1_000),
      encodeSnapshot(content, newerState, 9_000),
    )!;
    expect(offer.reasonCode).toBe("remote_newer");
    expect(offer.diffHints.length).toBeGreaterThan(0);
  });

  it("offlinecloud2:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-offline-cloud-2.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK offlinecloud2:validate");
  });
});
