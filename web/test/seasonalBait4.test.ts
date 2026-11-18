import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadContent, SeasonalEventSystem } from "../src/engine";
import {
  SEASONAL_BAIT_4,
  SEASONAL_BAIT_4_MARKER,
  SEASONAL_BAIT_4_PHASE,
  measureSeasonalBait4,
} from "../src/ship/seasonalBait4";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");
const content = loadContent(
  JSON.parse(readFileSync(resolve(root, "shared/content/content-pack.json"), "utf8")),
);

describe("Seasonal/bait/mastery 4 (Finish 4.0 Phase 16)", () => {
  it("locks phase 16 catalog floors", () => {
    expect(SEASONAL_BAIT_4_PHASE).toBe(16);
    expect(SEASONAL_BAIT_4_MARKER).toBe("authored-finish-4.0-phase-16");
    expect(SEASONAL_BAIT_4.newEvents).toHaveLength(4);
    expect(SEASONAL_BAIT_4.newBaits).toHaveLength(4);
    expect(SEASONAL_BAIT_4.newTechniques).toHaveLength(3);
    expect((storeListing as { seasonalBait4Phase?: number }).seasonalBait4Phase).toBe(16);
  });

  it("measures seasonal 12 / baits 12 / mastery depth", () => {
    const m = measureSeasonalBait4(root);
    expect(m.seasonalCount).toBeGreaterThanOrEqual(12);
    expect(m.baitCount).toBeGreaterThanOrEqual(12);
    expect(m.masteryMaxLevel).toBeGreaterThanOrEqual(7);
    expect(m.techniqueCount).toBeGreaterThanOrEqual(6);
    expect(m.coachingTipCount).toBeGreaterThanOrEqual(8);
    expect(m.newEventsPresent).toBe(true);
    expect(m.newBaitsPresent).toBe(true);
    expect(m.newTechniquesPresent).toBe(true);
    expect(m.kickoffFloorsMet).toBe(true);
    expect(m.missingGates).toEqual([]);
  });

  it("activates mist fog festival with guest + bait + technique present", () => {
    const fx = JSON.parse(
      readFileSync(resolve(root, "shared/fixtures/parity-seasonal-bait-4.json"), "utf8"),
    );
    const active = SeasonalEventSystem.active(content, fx.tickInWindow);
    expect(active?.id).toBe(fx.eventId);
    expect(active?.customerSpawnMultPermille).toBe(fx.expect.customerSpawnMultPermille);
    expect(active?.priceMultPermille).toBe(fx.expect.priceMultPermille);
    expect(content.customersById.has(fx.festivalCustomerId)).toBe(true);
    expect(content.contractTemplatesById.has(fx.gatedContractId)).toBe(true);
    expect(content.baitById.has(fx.sampleBaitId)).toBe(true);
    expect(content.techniquesById.has(fx.sampleTechniqueId)).toBe(true);
    expect(content.fishingMastery.maxLevel).toBe(7);
  });

  it("seasonalbait4:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-seasonal-bait-4.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK seasonalbait4:validate");
  }, 90_000);
});
