import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  measureViewModelSplit,
  VIEWMODEL_SPLIT,
  VIEWMODEL_SPLIT_MARKER,
  VIEWMODEL_SPLIT_PHASE,
  VIEWMODEL_SPLIT_SCHEMA,
} from "../src/ship/viewModelSplit";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("ViewModel split (Finish 4.0 Phase 4)", () => {
  it("locks slim GameViewModel + shell/economy/travel/IAP intent modules", () => {
    expect(VIEWMODEL_SPLIT_PHASE).toBe(4);
    expect(VIEWMODEL_SPLIT_SCHEMA).toBe("fish.ship.viewmodel_split.v1");
    expect(VIEWMODEL_SPLIT.plan).toBe("30_finish_4.0");
    expect(VIEWMODEL_SPLIT_MARKER).toBe("authored-finish-4.0-phase-4");
    expect(VIEWMODEL_SPLIT.requiredFiles.length).toBeGreaterThanOrEqual(6);
    expect(VIEWMODEL_SPLIT.requiredFiles).toContain("vm/VmFishingIntents.kt");
    expect((storeListing as { viewModelSplitPhase?: number }).viewModelSplitPhase).toBe(4);
    expect(existsSync(resolve(root, VIEWMODEL_SPLIT.parityFixture))).toBe(true);

    const m = measureViewModelSplit(root);
    expect(m.viewModelSlim).toBe(true);
    expect(m.viewModelLines).toBeLessThanOrEqual(VIEWMODEL_SPLIT.viewModelMaxLines);
    expect(m.viewModelLines).toBeLessThan(1633);
    expect(m.extractedEnough).toBe(true);
    expect(m.extractedFiles).toBeGreaterThanOrEqual(VIEWMODEL_SPLIT.extractedFileMin);
    expect(m.missingFiles).toEqual([]);
    expect(m.missingSymbols).toEqual([]);
    expect(m.viewModelStillDefines).toEqual([]);
    expect(m.gapClosed).toBe(true);
  });

  it("viewmodelsplit:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-viewmodel-split.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK viewmodelsplit:validate");
  }, 60_000);
});
