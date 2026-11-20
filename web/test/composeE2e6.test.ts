import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../src/engine";
import {
  COMPOSE_E2E_6_MARKER,
  COMPOSE_E2E_6_PHASE,
  COMPOSE_E2E_6_SCENARIO_FLOOR,
} from "../src/ship/composeE2e6";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Compose E2E 6 (Finish 6.0 Phase 24)", () => {
  it("locks phase 24 floors", () => {
    expect(COMPOSE_E2E_6_PHASE).toBe(24);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(27);
    expect(COMPOSE_E2E_6_MARKER).toBe("authored-finish-6.0-phase-24");
    expect((storeListing as { composeE2e6Phase?: number }).composeE2e6Phase).toBe(24);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("composeE2eThin");
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(5);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeGreaterThanOrEqual(0);
    const compose = JSON.parse(
      readFileSync(resolve(root, "shared/ship/compose-ui-tests.json"), "utf8"),
    ) as { scenarios: string[] };
    expect(compose.scenarios.length).toBeGreaterThanOrEqual(COMPOSE_E2E_6_SCENARIO_FLOOR);
  });

  it("wires RELEASE_PIN + composee2e6:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { composeE2e6?: string; fixtures?: string[] };
    expect(pin.composeE2e6).toBe("shared/ship/compose-e2e-6.json");
    expect(pin.fixtures).toContain("parity-compose-e2e-6.json");
    const out = execFileSync("npm", ["run", "composee2e6:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK composee2e6:validate");
  });
});
