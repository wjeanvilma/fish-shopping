import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUDIO_PACK_5,
  AUDIO_PACK_5_PHASE,
  NEW_BED_FLOOR_5,
  NEW_STINGER_FLOOR_5,
} from "../src/ship/audioPack5";
import {
  VFX_JUICE_5,
  VFX_JUICE_5_PHASE,
  VFX5_BURST_FLOOR,
  VFX5_PRESSURE_AMBIENT_FLOOR,
  VFX5_SHAKE_FLOOR,
} from "../src/ship/vfxJuice5";
import { MUSIC_PACK5_BED_IDS, musicBedForPanels, musicPack } from "../src/audio/musicBeds";
import { SFX_PACK5_CUES, sfxFromEvent } from "../src/audio/sfxCues";
import {
  PRESSURE_AMBIENT_MODE_IDS,
  pressureAmbientIdForView,
  weatherAmbientProfile,
} from "../src/render/weatherAmbient";
import { SHAKE_AMPLITUDE_M, cappedShakeAmplitudeM } from "../src/render/presenters";
import { FINISH5_OPEN_GAP_FLAGS } from "../src/ship/finish5Kickoff";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("audio + VFX pack 5 (Finish 5.0 Phase 12)", () => {
  it("locks catalog floors and frozen ducking", () => {
    expect(AUDIO_PACK_5_PHASE).toBe(12);
    expect(VFX_JUICE_5_PHASE).toBe(12);
    expect(NEW_STINGER_FLOOR_5).toBe(5);
    expect(NEW_BED_FLOOR_5).toBe(1);
    expect(VFX5_BURST_FLOOR).toBe(5);
    expect(VFX5_SHAKE_FLOOR).toBe(2);
    expect(VFX5_PRESSURE_AMBIENT_FLOOR).toBe(3);
    expect(AUDIO_PACK_5.newStingers.length).toBeGreaterThanOrEqual(5);
    expect(AUDIO_PACK_5.newBeds.length).toBeGreaterThanOrEqual(1);
    expect(VFX_JUICE_5.eventBursts.kinds.length).toBeGreaterThanOrEqual(5);
    expect(VFX_JUICE_5.eventShake.kinds.length).toBeGreaterThanOrEqual(2);
    expect(VFX_JUICE_5.ambientPressure.modes).toEqual([...PRESSURE_AMBIENT_MODE_IDS]);
    expect(musicPack.ducking.sfxDuckFactor).toBe(0.35);
    expect(musicPack.ducking.sfxDuckRecoveryMs).toBe(280);
    expect((storeListing as { audioPack5Phase?: number }).audioPack5Phase).toBe(12);
    expect((storeListing as { vfxJuice5Phase?: number }).vfxJuice5Phase).toBe(12);
    expect(FINISH5_OPEN_GAP_FLAGS).not.toContain("audioVfx5Incomplete");
  });

  it("maps Finish 5.0 events, bed priority, and pressure ambient", () => {
    expect(sfxFromEvent({ type: "cast_strike_reel" })).toBe("cast_strike");
    expect(sfxFromEvent({ type: "spoil_pressure_warn" })).toBe("spoil_warn");
    expect(sfxFromEvent({ type: "service_queue_pressure" })).toBe("service_queue");
    expect(sfxFromEvent({ type: "contract_deadline_warn" })).toBe("contract_deadline");
    expect(sfxFromEvent({ type: "quest_near_complete" })).toBe("quest_near");
    expect(SFX_PACK5_CUES).toHaveLength(5);
    expect(MUSIC_PACK5_BED_IDS).toEqual(["pressure"]);
    expect(musicBedForPanels(false, true, true, true, true, true, true, true)).toBe("festival");
    expect(musicBedForPanels(true, false, false, false, false, false, false, true)).toBe("pressure");
    expect(musicBedForPanels(true, false, false, false, false, false, true, true)).toBe("ledger");
    expect(pressureAmbientIdForView(0, 0, null, null)).toBe("calm");
    expect(pressureAmbientIdForView(800, 0, null, null)).toBe("rising");
    expect(pressureAmbientIdForView(1100, 0, null, null)).toBe("critical");
    const calm = weatherAmbientProfile("weather.clear", false, "high", false, "day", false, "locked", "calm");
    const critical = weatherAmbientProfile(
      "weather.clear",
      false,
      "high",
      false,
      "day",
      false,
      "locked",
      "critical",
    );
    expect(critical.skyHex.toLowerCase()).not.toBe(calm.skyHex.toLowerCase());
    expect(SHAKE_AMPLITUDE_M.cast_strike).toBeLessThanOrEqual(0.12);
    expect(cappedShakeAmplitudeM("contract_deadline", "high")).toBeLessThanOrEqual(0.12);
    for (const id of AUDIO_PACK_5.newStingers) {
      expect(existsSync(resolve(root, `shared/audio/sfx/${id}.wav`))).toBe(true);
    }
    for (const id of AUDIO_PACK_5.newBeds) {
      expect(existsSync(resolve(root, `shared/audio/music/${id}.wav`))).toBe(true);
    }
    const listing = JSON.parse(
      readFileSync(resolve(root, "shared/store/listing.json"), "utf8"),
    ) as { audioPack5Phase?: number; vfxJuice5Phase?: number };
    expect(listing.audioPack5Phase).toBe(12);
    expect(listing.vfxJuice5Phase).toBe(12);
  });

  it("audiovfx5:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-audio-vfx-5.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK audiovfx5:validate");
  });
});
