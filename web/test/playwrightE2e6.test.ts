import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION } from "../src/engine";
import { WEB_E2E_ID_LIST } from "../src/e2e/webE2eIds";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  PLAYWRIGHT_E2E_6_MARKER,
  PLAYWRIGHT_E2E_6_PHASE,
  PLAYWRIGHT_E2E_6_SCENARIO_FLOOR,
} from "../src/ship/playwrightE2e6";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("Playwright E2E 6 (Finish 6.0 Phase 23)", () => {
  it("locks phase 23 floors", () => {
    expect(PLAYWRIGHT_E2E_6_PHASE).toBe(23);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(27);
    expect(PLAYWRIGHT_E2E_6_MARKER).toBe("authored-finish-6.0-phase-23");
    expect((storeListing as { playwrightE2e6Phase?: number }).playwrightE2e6Phase).toBe(23);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("e2eDepthThin");
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(6);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeGreaterThanOrEqual(0);
    expect(WEB_E2E_ID_LIST.length).toBeGreaterThanOrEqual(40);
    const webE2e = JSON.parse(
      readFileSync(resolve(root, "shared/ship/web-e2e.json"), "utf8"),
    ) as { scenarios: string[] };
    expect(webE2e.scenarios.length).toBeGreaterThanOrEqual(PLAYWRIGHT_E2E_6_SCENARIO_FLOOR);
  });

  it("wires RELEASE_PIN + playwrighte2e6:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { playwrightE2e6?: string; fixtures?: string[] };
    expect(pin.playwrightE2e6).toBe("shared/ship/playwright-e2e-6.json");
    expect(pin.fixtures).toContain("parity-playwright-e2e-6.json");
    const out = execFileSync("npm", ["run", "playwrighte2e6:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK playwrighte2e6:validate");
  });
});
