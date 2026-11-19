import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { measureSchemaFoundations, SCHEMA_INDEX, validateContract } from "../src/schema/contractValidate";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  measureSchema6,
  SCHEMA_6_MARKER,
  SCHEMA_6_PHASE,
} from "../src/ship/schema6";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Schema foundations (Finish 6.0 Phase 2)", () => {
  it("locks phase 2 catalog + index floors", () => {
    expect(SCHEMA_6_PHASE).toBe(2);
    expect(SCHEMA_6_MARKER).toBe("authored-finish-6.0-phase-2");
    expect(SCHEMA_INDEX.schemas.length).toBeGreaterThanOrEqual(4);
    expect(SCHEMA_INDEX.schemas.map((s) => s.id).sort()).toEqual([
      "billing-contract",
      "content-pack",
      "ops-catalog",
      "ship-catalog",
    ]);
    expect((storeListing as { schema6Phase?: number }).schema6Phase).toBe(2);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("schemaFoundationsIncomplete");
    // Soft-floor: Phase 7 closed harborArt6Incomplete → 19 open flags.
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(7);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeGreaterThanOrEqual(0);
  });

  it("Ajv-validates ship/billing/ops sample catalogs", () => {
    const foundations = measureSchemaFoundations(root);
    expect(foundations.ship.ok).toBe(true);
    expect(foundations.billing.ok).toBe(true);
    expect(foundations.ops.ok).toBe(true);
    expect(foundations.ship.validated).toBeGreaterThanOrEqual(5);
    expect(foundations.billing.validated).toBeGreaterThanOrEqual(5);
    expect(foundations.ops.validated).toBeGreaterThanOrEqual(5);

    const badShip = validateContract("ship", { phase: 1 });
    expect(badShip.ok).toBe(false);

    const measure = measureSchema6(root);
    expect(measure.ajvOk).toBe(true);
    expect(measure.gapClosed).toBe(true);
    expect(measure.kickoffWired).toBe(true);
    expect(measure.missingGates).toEqual([]);
  });

  it("wires RELEASE_PIN + schema6:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { schema6?: string; fixtures?: string[] };
    expect(pin.schema6).toBe("shared/ship/schema-6.json");
    expect(pin.fixtures).toContain("parity-schema-6.json");
    const out = execFileSync("npm", ["run", "schema6:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK schema6:validate");
  });
});
