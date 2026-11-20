import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUDIO_PACK_6,
  AUDIO_PACK_6_PHASE,
  NEW_BED_FLOOR_6,
  NEW_STINGER_FLOOR_6,
} from "../src/ship/audioPack6";
import {
  VFX_JUICE_6,
  VFX_JUICE_6_PHASE,
  VFX6_BURST_FLOOR,
  VFX6_NEST_AMBIENT_FLOOR,
  VFX6_SHAKE_FLOOR,
} from "../src/ship/vfxJuice6";
import { MUSIC_PACK6_BED_IDS, musicBedForPanels, musicPack } from "../src/audio/musicBeds";
import { SFX_PACK6_CUES, sfxFromEvent } from "../src/audio/sfxCues";
import {
  NEST_AMBIENT_MODE_IDS,
  nestAmbientIdForView,
  weatherAmbientProfile,
} from "../src/render/weatherAmbient";
import { SHAKE_AMPLITUDE_M, cappedShakeAmplitudeM } from "../src/render/presenters";
import { FINISH6_OPEN_GAP_FLAGS } from "../src/ship/finish6Kickoff";
import { storeListing } from "../src/store/listing";

const root = resolve(__dirname, "../..");

describe("audio + VFX pack 6 (Finish 6.0 Phase 12)", () => {
  it("locks catalog floors and frozen ducking", () => {
    expect(AUDIO_PACK_6_PHASE).toBe(12);
    expect(VFX_JUICE_6_PHASE).toBe(12);
    expect(NEW_STINGER_FLOOR_6).toBe(5);
    expect(NEW_BED_FLOOR_6).toBe(1);
    expect(VFX6_BURST_FLOOR).toBe(5);
    expect(VFX6_SHAKE_FLOOR).toBe(2);
    expect(VFX6_NEST_AMBIENT_FLOOR).toBe(3);
    expect(AUDIO_PACK_6.newStingers.length).toBeGreaterThanOrEqual(5);
    expect(AUDIO_PACK_6.newBeds.length).toBeGreaterThanOrEqual(1);
    expect(VFX_JUICE_6.eventBursts.kinds.length).toBeGreaterThanOrEqual(5);
    expect(VFX_JUICE_6.eventShake.kinds.length).toBeGreaterThanOrEqual(1);
    expect(VFX_JUICE_6.ambientNest.modes).toEqual([...NEST_AMBIENT_MODE_IDS]);
    expect(musicPack.ducking.sfxDuckFactor).toBe(0.35);
    expect(musicPack.ducking.sfxDuckRecoveryMs).toBe(280);
    expect((storeListing as { audioPack6Phase?: number }).audioPack6Phase).toBe(12);
    expect((storeListing as { vfxJuice6Phase?: number }).vfxJuice6Phase).toBe(12);
    expect(FINISH6_OPEN_GAP_FLAGS).not.toContain("audioVfx6Incomplete");
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeLessThanOrEqual(7);
    expect(FINISH6_OPEN_GAP_FLAGS.length).toBeGreaterThanOrEqual(0);
  });

  it("maps Finish 6.0 events, bed priority, and nest ambient", () => {
    expect(sfxFromEvent({ type: "nest_settle_pulse" })).toBe("nest_settle");
    expect(sfxFromEvent({ type: "roast_cycle_ready" })).toBe("roast_ready");
    expect(sfxFromEvent({ type: "ferment_cycle_ready" })).toBe("ferment_ready");
    expect(sfxFromEvent({ type: "school_flash" })).toBe("school_flash");
    expect(sfxFromEvent({ type: "aurora_crest" })).toBe("aurora_crest");
    expect(SFX_PACK6_CUES).toHaveLength(5);
    expect(MUSIC_PACK6_BED_IDS).toEqual(["nest"]);
    expect(musicBedForPanels(false, true, true, true, true, true, true, true, true)).toBe("festival");
    expect(musicBedForPanels(true, false, false, false, false, false, false, true, true)).toBe("pressure");
    expect(musicBedForPanels(true, false, false, false, false, false, false, false, true)).toBe("nest");
    expect(nestAmbientIdForView(0, false)).toBe("idle");
    expect(nestAmbientIdForView(1, false)).toBe("roosting");
    expect(nestAmbientIdForView(3, false)).toBe("settled");
    const idle = weatherAmbientProfile(
      "weather.clear",
      false,
      "high",
      false,
      "day",
      false,
      "locked",
      "calm",
      "idle",
    );
    const settled = weatherAmbientProfile(
      "weather.clear",
      false,
      "high",
      false,
      "day",
      false,
      "locked",
      "calm",
      "settled",
    );
    expect(settled.skyHex.toLowerCase()).not.toBe(idle.skyHex.toLowerCase());
    expect(SHAKE_AMPLITUDE_M.nest_settle).toBeLessThanOrEqual(0.12);
    expect(cappedShakeAmplitudeM("aurora_crest", "high")).toBeLessThanOrEqual(0.12);
    for (const id of AUDIO_PACK_6.newStingers) {
      expect(existsSync(resolve(root, `shared/audio/sfx/${id}.wav`))).toBe(true);
    }
    for (const id of AUDIO_PACK_6.newBeds) {
      expect(existsSync(resolve(root, `shared/audio/music/${id}.wav`))).toBe(true);
    }
    const listing = JSON.parse(
      readFileSync(resolve(root, "shared/store/listing.json"), "utf8"),
    ) as { audioPack6Phase?: number; vfxJuice6Phase?: number };
    expect(listing.audioPack6Phase).toBe(12);
    expect(listing.vfxJuice6Phase).toBe(12);
  });

  it("audiovfx6:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-audio-vfx-6.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK audiovfx6:validate");
  });
});
