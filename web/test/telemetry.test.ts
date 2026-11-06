import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BALANCE_SCHEMA,
  GameState,
  STAT_KEYS,
  TELEMETRY_FORBIDDEN_KEYS,
  TELEMETRY_SCHEMA,
  buildBalanceExport,
  buildTelemetry,
  encodeBalanceExport,
  encodeTelemetry,
  loadContent,
} from "../src/engine";

const content = loadContent(JSON.parse(readFileSync(resolve(__dirname, "../../shared/content/content-pack.json"), "utf8")));

describe("telemetry", () => {
  it("exports all known stats without forbidden keys", () => {
    const state = GameState.newGame(content, "harbor.sunrise_pier", 11);
    state.bumpStat("stat.fish_caught", 3);
    state.bumpStat("stat.sales", 2);
    const report = buildTelemetry(content, state);
    expect(report.schema).toBe(TELEMETRY_SCHEMA);
    expect(report.contentVersion).toBe(content.contentVersion);
    expect(report.stats["stat.fish_caught"]).toBe(3);
    expect(report.stats["stat.sales"]).toBe(2);
    expect(Object.keys(report.stats)).toEqual([...STAT_KEYS]);
    const json = encodeTelemetry(content, state);
    for (const key of TELEMETRY_FORBIDDEN_KEYS) {
      expect(json.includes(`"${key}"`)).toBe(false);
    }
  });
});

describe("balanceExport", () => {
  it("surfaces content-pack economy and player knobs", () => {
    const dump = buildBalanceExport(content);
    expect(dump.schema).toBe(BALANCE_SCHEMA);
    expect(dump.contentVersion).toBe(content.contentVersion);
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
    expect(text).toContain("fish.balance.v1");
    expect(text).toContain("maintenancePeriodTicks");
  });
});
