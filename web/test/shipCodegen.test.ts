import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FINISH6_KICKOFF_GEN } from "../src/ship/generated/finish6Kickoff.gen";
import { SCHEMA_6_GEN } from "../src/ship/generated/schema6.gen";
import { SHIP_CODEGEN_GEN } from "../src/ship/generated/shipCodegen.gen";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  measureShipCodegen,
  SHIP_CODEGEN_MARKER,
  SHIP_CODEGEN_PHASE,
} from "../src/ship/shipCodegen";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Ship catalog codegen (Finish 6.0 Phase 3)", () => {
  it("locks phase 3 catalog + generated mirrors", () => {
    expect(SHIP_CODEGEN_PHASE).toBe(3);
    expect(SHIP_CODEGEN_MARKER).toBe("authored-finish-6.0-phase-3");
    expect(FINISH6_KICKOFF_GEN.phase).toBe(1);
    expect(SCHEMA_6_GEN.phase).toBe(2);
    expect(SHIP_CODEGEN_GEN.phase).toBe(3);
    expect(SHIP_CODEGEN_GEN.marker).toBe(SHIP_CODEGEN_MARKER);
    expect((storeListing as { shipCodegenPhase?: number }).shipCodegenPhase).toBe(3);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("shipCodegenMissing");
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(7);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeGreaterThanOrEqual(0);
  });

  it("check mode is clean for registered Finish 6 catalogs", () => {
    const measure = measureShipCodegen(root);
    expect(measure.catalogCount).toBeGreaterThanOrEqual(1);
    expect(measure.featureCount).toBeGreaterThanOrEqual(4);
    expect(measure.generatedPresent).toBe(true);
    expect(measure.checkClean).toBe(true);
    expect(measure.gapClosed).toBe(true);
    expect(measure.kickoffWired).toBe(true);
    expect(measure.missingGates).toEqual([]);
  });

  it("wires RELEASE_PIN + shipcodegen:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { shipCodegen?: string; fixtures?: string[] };
    expect(pin.shipCodegen).toBe("shared/ship/ship-codegen.json");
    expect(pin.fixtures).toContain("parity-ship-codegen.json");
    const list = execFileSync("npm", ["run", "ship:codegen", "--", "--list"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(list).toContain("finish6-kickoff");
    const out = execFileSync("npm", ["run", "shipcodegen:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK shipcodegen:validate");
  });
});
