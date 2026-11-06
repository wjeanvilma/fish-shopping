import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BALANCE_SCHEMA,
  GameState,
  STAT_KEYS,
  TELEMETRY_FORBIDDEN_KEYS,
  TELEMETRY_SCHEMA,
  abandonPermille,
  buildBalanceExport,
  buildTelemetry,
  encodeBalanceExport,
  encodeTelemetry,
  loadContent,
  wageRatioPermille,
} from "../src/engine";

const content = loadContent(JSON.parse(readFileSync(resolve(__dirname, "../../shared/content/content-pack.json"), "utf8")));

describe("telemetry", () => {
  it("exports all known stats without forbidden keys", () => {
    const state = GameState.newGame(content, "harbor.sunrise_pier", 11);
    state.bumpStat("stat.fish_caught", 3);
    state.bumpStat("stat.sales", 2);
    state.recordSpeciesCatch("species.silver_sprat", 2);
    state.recordSpeciesCatch("species.copper_mullet", 1);
    const report = buildTelemetry(content, state);
    expect(report.schema).toBe(TELEMETRY_SCHEMA);
    expect(report.schema).toBe("fish.telemetry.v2");
    expect(report.contentVersion).toBe(content.contentVersion);
    expect(report.stats["stat.fish_caught"]).toBe(3);
    expect(report.stats["stat.sales"]).toBe(2);
    expect(Object.keys(report.stats)).toEqual([...STAT_KEYS]);
    expect(report.speciesCatches["species.silver_sprat"]).toBe(2);
    expect(report.rates.speciesCatchSharePermille["species.silver_sprat"]).toBe(666);
    expect(report.rates.speciesCatchSharePermille["species.copper_mullet"]).toBe(333);
    const json = encodeTelemetry(content, state);
    for (const key of TELEMETRY_FORBIDDEN_KEYS) {
      expect(json.includes(`"${key}"`)).toBe(false);
    }
  });

  it("computes abandon and wage ratios in permille", () => {
    const state = GameState.newGame(content, "harbor.sunrise_pier", 11);
    expect(abandonPermille(state)).toBe(0);
    expect(wageRatioPermille(state)).toBe(0);
    state.bumpStat("stat.sales", 8);
    state.bumpStat("stat.lost_customers", 2);
    expect(abandonPermille(state)).toBe(200);
    state.bumpStat("stat.revenue", 100);
    state.bumpStat("stat.wages_paid", 25);
    expect(wageRatioPermille(state)).toBe(250);
  });
});

describe("balanceExport", () => {
  it("surfaces content-pack economy and player knobs", () => {
    const dump = buildBalanceExport(content);
    expect(dump.schema).toBe(BALANCE_SCHEMA);
    expect(dump.schema).toBe("fish.balance.v2");
    expect(dump.contentVersion).toBe(content.contentVersion);
    const formulas = dump.derivedRateFormulas as Record<string, string>;
    expect(formulas.abandonPermille).toContain("lost_customers");
    expect(formulas.wageRatioPermille).toContain("wages_paid");
    expect(formulas.speciesCatchSharePermille).toContain("speciesCatches");
    const player = dump.player as Record<string, number>;
    expect(player.moveSpeedMmPerTick).toBe(content.player.moveSpeedMmPerTick);
    const economy = dump.economy as Record<string, unknown>;
    expect(economy.maintenanceCoinsPerStation).toBe(content.economy.maintenanceCoinsPerStation);
    expect(Array.isArray(dump.species)).toBe(true);
    expect((dump.species as unknown[]).length).toBe(content.raw.species.length);
    expect(Array.isArray(dump.bait)).toBe(true);
    expect((dump.bait as unknown[]).length).toBe(content.raw.bait.length);
    const trophies = dump.trophies as { sets: unknown[] };
    expect(trophies.sets.length).toBe(content.raw.trophies.sets.length);
    const text = encodeBalanceExport(content);
    expect(text).toContain("fish.balance.v2");
    expect(text).toContain("maintenancePeriodTicks");
    expect(text).toContain("derivedRateFormulas");
  });
});
