import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  measureSystemsSplit3,
  SYSTEMS_SPLIT_3,
  SYSTEMS_SPLIT_3_MARKER,
  SYSTEMS_SPLIT_3_PHASE,
  SYSTEMS_SPLIT_3_SCHEMA,
} from "../src/ship/systemsSplit3";
import { storeListing } from "../src/store/listing";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");

describe("systemsSplit3", () => {
  it("locks Finish 6.0 Phase 4 catalog mirrors", () => {
    expect(SYSTEMS_SPLIT_3_PHASE).toBe(4);
    expect(SYSTEMS_SPLIT_3_SCHEMA).toBe("fish.ship.systems_split_3.v1");
    expect(SYSTEMS_SPLIT_3_MARKER).toBe("authored-finish-6.0-phase-4");
    expect(SYSTEMS_SPLIT_3.systemsFacadeMaxLines).toBe(2800);
    expect(SYSTEMS_SPLIT_3.extractedFileMin).toBe(12);
    expect(SYSTEMS_SPLIT_3.requiredFiles).toEqual([
      "rivals.ts",
      "economyBank.ts",
      "staffTrees.ts",
      "workers.ts",
    ]);
    expect((storeListing as { systemsSplit3Phase?: number }).systemsSplit3Phase).toBe(4);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("systemsSplit3Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(7);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeGreaterThanOrEqual(0);
  });

  it("measures slim facade + extracted modules + closed gap", () => {
    const measure = measureSystemsSplit3(root);
    expect(measure.facadeSlim).toBe(true);
    expect(measure.facadeLines).toBeLessThanOrEqual(2800);
    expect(measure.extractedEnough).toBe(true);
    expect(measure.missingFiles).toEqual([]);
    expect(measure.missingSymbols).toEqual([]);
    expect(measure.facadeStillDefines).toEqual([]);
    expect(measure.bridgeBound).toBe(true);
    expect(measure.gapClosed).toBe(true);
    expect(measure.kickoffWired).toBe(true);
    expect(measure.circularImports).toEqual([]);
    expect(measure.missingBridgeModules).toEqual([]);
  });

  it("wires RELEASE_PIN + systemssplit3:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { systemsSplit3?: string; fixtures?: string[] };
    expect(pin.systemsSplit3).toBe("shared/ship/systems-split-3.json");
    expect(pin.fixtures).toContain("parity-systems-split-3.json");
    const out = execFileSync("npm", ["run", "systemssplit3:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK systemssplit3:validate");
  });
});
