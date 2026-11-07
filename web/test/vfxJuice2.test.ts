import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EVENT_BURST_FLOOR,
  EVENT_SHAKE_FLOOR,
  VFX_JUICE_2,
  VFX_JUICE_2_PHASE,
  WEATHER_AMBIENT_FLOOR,
} from "../src/ship/vfxJuice2";
import {
  weatherAmbientIdForWeatherId,
  weatherAmbientProfile,
  WEATHER_AMBIENT_PATTERN_IDS,
} from "../src/render/weatherAmbient";
import {
  SHAKE_AMPLITUDE_M,
  MAX_SHAKE_AMPLITUDE_M,
  cappedShakeAmplitudeM,
} from "../src/render/presenters";

const root = resolve(__dirname, "../..");

describe("vfx juice 2 (Finish 2.0 Phase 22)", () => {
  it("locks catalog floors and budget-gate pointers", () => {
    expect(VFX_JUICE_2_PHASE).toBe(22);
    expect(EVENT_BURST_FLOOR).toBe(4);
    expect(EVENT_SHAKE_FLOOR).toBe(2);
    expect(WEATHER_AMBIENT_FLOOR).toBe(5);
    expect(VFX_JUICE_2.eventBursts.kinds.length).toBeGreaterThanOrEqual(4);
    expect(VFX_JUICE_2.eventShake.kinds.length).toBeGreaterThanOrEqual(2);
    expect(VFX_JUICE_2.ambientWeather.patterns.length).toBeGreaterThanOrEqual(5);
    expect(VFX_JUICE_2.eventBursts.sharesBurstPool).toBe(true);
    expect(VFX_JUICE_2.ambientWeather.consumesBurstPool).toBe(false);
    expect(
      (JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
        vfxJuice2Phase?: number;
      }).vfxJuice2Phase,
    ).toBe(22);
    const gate = JSON.parse(readFileSync(resolve(root, "shared/perf/budget-gate.json"), "utf8")) as {
      vfxJuicePhase: number;
      vfxJuice2Phase: number;
      maxShakeAmplitudeM: number;
    };
    expect(gate.vfxJuicePhase).toBe(21);
    expect(gate.vfxJuice2Phase).toBe(22);
    expect(gate.maxShakeAmplitudeM).toBe(0.12);
    expect(MAX_SHAKE_AMPLITUDE_M).toBe(0.12);
  });

  it("maps weather ambient + new shake amplitudes under cap", () => {
    expect(WEATHER_AMBIENT_PATTERN_IDS).toHaveLength(5);
    expect(weatherAmbientIdForWeatherId("weather.rain")).toBe("rain");
    expect(weatherAmbientIdForWeatherId("weather.gale")).toBe("gale");
    expect(weatherAmbientIdForWeatherId("weather.fog")).toBe("fog");
    const rain = weatherAmbientProfile("weather.rain", false, "high", false);
    expect(rain.id).toBe("rain");
    expect(rain.bobScale).toBeGreaterThan(1);
    const calm = weatherAmbientProfile("weather.clear", false, "high", true);
    expect(calm.bobScale).toBe(0);
    expect(SHAKE_AMPLITUDE_M.achievement).toBe(0.06);
    expect(SHAKE_AMPLITUDE_M.festival).toBe(0.05);
    expect(cappedShakeAmplitudeM("achievement", "high")).toBeLessThanOrEqual(0.12);
    expect(cappedShakeAmplitudeM("festival", "low")).toBeLessThanOrEqual(0.12);
  });

  it("vfx2:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-vfx-juice-2.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK vfx2:validate");
  });
});
