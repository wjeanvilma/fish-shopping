import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EVENT_BURST_FLOOR_3,
  EVENT_SHAKE_FLOOR_3,
  TIDE_AMBIENT_FLOOR,
  VFX_JUICE_3,
  VFX_JUICE_3_PHASE,
} from "../src/ship/vfxJuice3";
import {
  SHAKE_AMPLITUDE_M,
  cappedShakeAmplitudeM,
} from "../src/render/presenters";
import {
  TIDE_AMBIENT_PHASE_IDS,
  tideAmbientIdForPhaseId,
  weatherAmbientProfile,
} from "../src/render/weatherAmbient";

const root = resolve(__dirname, "../..");

describe("vfx juice 3 (Finish 3.0 Phase 24)", () => {
  it("locks catalog floors and frozen shake cap", () => {
    expect(VFX_JUICE_3_PHASE).toBe(24);
    expect(EVENT_BURST_FLOOR_3).toBe(6);
    expect(EVENT_SHAKE_FLOOR_3).toBe(2);
    expect(TIDE_AMBIENT_FLOOR).toBe(4);
    expect(VFX_JUICE_3.eventBursts.kinds.length).toBeGreaterThanOrEqual(6);
    expect(VFX_JUICE_3.eventShake.kinds.length).toBeGreaterThanOrEqual(2);
    expect(VFX_JUICE_3.ambientTide.phases).toEqual([...TIDE_AMBIENT_PHASE_IDS]);
    expect(SHAKE_AMPLITUDE_M.rival_beat).toBeLessThanOrEqual(0.12);
    expect(SHAKE_AMPLITUDE_M.prestige).toBeLessThanOrEqual(0.12);
    expect(cappedShakeAmplitudeM("prestige", "high")).toBeLessThanOrEqual(0.12);
    expect(
      (JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
        vfxJuice3Phase?: number;
      }).vfxJuice3Phase,
    ).toBe(24);
  });

  it("maps tide ambient + rival tint", () => {
    expect(tideAmbientIdForPhaseId("night")).toBe("night");
    expect(tideAmbientIdForPhaseId("dusk")).toBe("dusk");
    const day = weatherAmbientProfile("weather.clear", false, "high", false, "day", false);
    const night = weatherAmbientProfile("weather.clear", false, "high", false, "night", false);
    const rival = weatherAmbientProfile("weather.clear", false, "high", false, "day", true);
    expect(night.skyHex.toLowerCase()).not.toBe(day.skyHex.toLowerCase());
    expect(rival.skyHex.toLowerCase()).not.toBe(day.skyHex.toLowerCase());
  });

  it("vfx3:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-vfx-juice-3.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK vfx3:validate");
  });
});
