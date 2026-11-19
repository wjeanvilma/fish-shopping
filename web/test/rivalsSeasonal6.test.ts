import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_VERSION, loadContent } from "../src/engine";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import {
  RIVALS_SEASONAL_6_MARKER,
  RIVALS_SEASONAL_6_PHASE,
  measureRivalsSeasonal6,
} from "../src/ship/rivalsSeasonal6";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("Rivals/seasonal/baits/cosmetics 6 (Finish 6.0 Phase 15)", () => {
  it("locks phase 15 catalog floors", () => {
    expect(RIVALS_SEASONAL_6_PHASE).toBe(15);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(27);
    expect(RIVALS_SEASONAL_6_MARKER).toBe("authored-finish-6.0-phase-15");
    expect((storeListing as { rivalsSeasonal6Phase?: number }).rivalsSeasonal6Phase).toBe(15);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("contentFloorsShort");
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(7);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeGreaterThanOrEqual(0);
  });

  it("measures content floors + full harbor rival coverage", () => {
    const m = measureRivalsSeasonal6(root);
    expect(m.rivalCount).toBeGreaterThanOrEqual(20);
    expect(m.seasonalCount).toBeGreaterThanOrEqual(20);
    expect(m.baitCount).toBeGreaterThanOrEqual(20);
    expect(m.cosmeticCount).toBeGreaterThanOrEqual(30);
    expect(m.harborsCovered).toBe(m.harborTotal);
    expect(m.newRivalsPresent).toBe(true);
    expect(m.newEventsPresent).toBe(true);
    expect(m.newBaitsPresent).toBe(true);
    expect(m.newCosmeticsPresent).toBe(true);
    expect(m.kickoffFloorsMet).toBe(true);
    expect(m.missingGates).toEqual([]);
    expect(content.raw.rivalMarkets.rivals.some((r) => r.id === "rival.saffron_hawker")).toBe(true);
  });

  it("wires RELEASE_PIN + rivalsseasonal6:validate exits 0", () => {
    const pin = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/RELEASE_PIN.json"), "utf8"),
    ) as { rivalsSeasonal6?: string; fixtures?: string[] };
    expect(pin.rivalsSeasonal6).toBe("shared/ship/rivals-seasonal-6.json");
    expect(pin.fixtures).toContain("parity-rivals-seasonal-6.json");
    const out = execFileSync("npm", ["run", "rivalsseasonal6:validate"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK rivalsseasonal6:validate");
  });
});
