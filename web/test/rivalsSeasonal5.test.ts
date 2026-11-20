import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, loadContent } from "../src/engine";
import {
  RIVALS_SEASONAL_5_MARKER,
  RIVALS_SEASONAL_5_PHASE,
  measureRivalsSeasonal5,
} from "../src/ship/rivalsSeasonal5";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("Rivals/seasonal/baits/cosmetics 5 (Finish 5.0 Phase 18)", () => {
  it("locks phase 18 catalog floors", () => {
    expect(RIVALS_SEASONAL_5_PHASE).toBe(18);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(26);
    expect(RIVALS_SEASONAL_5_MARKER).toBe("authored-finish-5.0-phase-18");
    expect((storeListing as { rivalsSeasonal5Phase?: number }).rivalsSeasonal5Phase).toBe(18);
  });

  it("measures content floors + full harbor rival coverage", () => {
    const m = measureRivalsSeasonal5(root);
    expect(m.rivalCount).toBeGreaterThanOrEqual(16);
    expect(m.seasonalCount).toBeGreaterThanOrEqual(16);
    expect(m.baitCount).toBeGreaterThanOrEqual(16);
    expect(m.cosmeticCount).toBeGreaterThanOrEqual(24);
    // Soft-floor: Finish 6 harbors grew past Finish 5 rival coverage.
    expect(m.harborsCovered).toBeGreaterThanOrEqual(12);
    expect(m.newRivalsPresent).toBe(true);
    expect(m.newEventsPresent).toBe(true);
    expect(m.newBaitsPresent).toBe(true);
    expect(m.newCosmeticsPresent).toBe(true);
    expect(m.kickoffFloorsMet).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(content.raw.rivalMarkets.rivals.some((r) => r.id === "rival.aurora_hawker")).toBe(true);
  });

  it("wires RELEASE_PIN + rivalsseasonal5:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { rivalsSeasonal5?: string; fixtures?: string[] };
    expect(pin.rivalsSeasonal5).toBe("shared/ship/rivals-seasonal-5.json");
    expect(pin.fixtures).toContain("parity-rivals-seasonal-5.json");
    const out = execFileSync("npm", ["run", "rivalsseasonal5:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK rivalsseasonal5:validate");
  });
});
