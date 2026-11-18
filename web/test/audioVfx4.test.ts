import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUDIO_PACK_4,
  AUDIO_PACK_4_PHASE,
  NEW_BED_FLOOR_4,
  NEW_STINGER_FLOOR_4,
} from "../src/ship/audioPack4";
import {
  VFX_JUICE_4,
  VFX_JUICE_4_PHASE,
  VFX4_BURST_FLOOR,
  VFX4_ENDGAME_AMBIENT_FLOOR,
  VFX4_SHAKE_FLOOR,
} from "../src/ship/vfxJuice4";
import { MUSIC_PACK4_BED_IDS, musicBedForPanels, musicPack } from "../src/audio/musicBeds";
import { SFX_PACK4_CUES, sfxFromEvent } from "../src/audio/sfxCues";
import {
  ENDGAME_AMBIENT_MODE_IDS,
  endgameAmbientIdForView,
  weatherAmbientProfile,
} from "../src/render/weatherAmbient";
import { SHAKE_AMPLITUDE_M, cappedShakeAmplitudeM } from "../src/render/presenters";

const root = resolve(__dirname, "../..");

describe("audio + VFX pack 4 (Finish 4.0 Phase 23)", () => {
  it("locks catalog floors and frozen ducking", () => {
    expect(AUDIO_PACK_4_PHASE).toBe(23);
    expect(VFX_JUICE_4_PHASE).toBe(23);
    expect(NEW_STINGER_FLOOR_4).toBe(9);
    expect(NEW_BED_FLOOR_4).toBe(2);
    expect(VFX4_BURST_FLOOR).toBe(7);
    expect(VFX4_SHAKE_FLOOR).toBe(2);
    expect(VFX4_ENDGAME_AMBIENT_FLOOR).toBe(3);
    expect(AUDIO_PACK_4.newStingers.length).toBeGreaterThanOrEqual(9);
    expect(AUDIO_PACK_4.newBeds.length).toBeGreaterThanOrEqual(2);
    expect(VFX_JUICE_4.eventBursts.kinds.length).toBeGreaterThanOrEqual(7);
    expect(VFX_JUICE_4.eventShake.kinds.length).toBeGreaterThanOrEqual(2);
    expect(VFX_JUICE_4.ambientEndgame.modes).toEqual([...ENDGAME_AMBIENT_MODE_IDS]);
    expect(musicPack.ducking.sfxDuckFactor).toBe(0.35);
    expect(musicPack.ducking.sfxDuckRecoveryMs).toBe(280);
    const listing = JSON.parse(
      readFileSync(resolve(root, "shared/store/listing.json"), "utf8"),
    ) as { audioPack4Phase?: number; vfxJuice4Phase?: number };
    expect(listing.audioPack4Phase).toBe(23);
    expect(listing.vfxJuice4Phase).toBe(23);
  });

  it("maps Finish 4.0 events, bed priority, and endgame ambient", () => {
    expect(sfxFromEvent({ type: "decor_purchased" })).toBe("decor");
    expect(sfxFromEvent({ type: "iap_cosmetic_granted" })).toBe("cosmetic");
    expect(sfxFromEvent({ type: "endgame_tier_unlocked" })).toBe("endgame_tier");
    expect(sfxFromEvent({ type: "endgame_challenge_completed" })).toBe("endgame_challenge");
    expect(sfxFromEvent({ type: "contract_accepted" })).toBe("contract_accept");
    expect(sfxFromEvent({ type: "bait_purchased" })).toBe("bait");
    expect(sfxFromEvent({ type: "full_harbor_unlock_granted" })).toBe("full_unlock");
    expect(sfxFromEvent({ type: "machine_broke" })).toBe("machine_break");
    expect(sfxFromEvent({ type: "items_spoiled" })).toBe("spoil");
    expect(sfxFromEvent({ type: "decor_purchased", replayed: true })).toBeNull();
    expect(SFX_PACK4_CUES).toHaveLength(9);
    expect(MUSIC_PACK4_BED_IDS).toEqual(["endgame", "ledger"]);
    expect(musicBedForPanels(false, true, true, true, true, true, true)).toBe("festival");
    expect(musicBedForPanels(true, false, true, true, true, true, true)).toBe("storm");
    expect(musicBedForPanels(true, false, false, true, true, true, true)).toBe("rival");
    expect(musicBedForPanels(true, false, false, false, true, true, true)).toBe("night");
    expect(musicBedForPanels(true, false, false, false, false, true, true)).toBe("endgame");
    expect(musicBedForPanels(true, false, false, false, false, false, true)).toBe("ledger");
    expect(musicBedForPanels(true, false, false, false, false, false, false)).toBe("shop");
    expect(endgameAmbientIdForView(false, 0)).toBe("locked");
    expect(endgameAmbientIdForView(true, 0)).toBe("active");
    expect(endgameAmbientIdForView(true, 2)).toBe("crowned");
    const locked = weatherAmbientProfile("weather.clear", false, "high", false, "day", false, "locked");
    const crowned = weatherAmbientProfile("weather.clear", false, "high", false, "day", false, "crowned");
    expect(crowned.skyHex.toLowerCase()).not.toBe(locked.skyHex.toLowerCase());
    expect(SHAKE_AMPLITUDE_M.endgame_tier).toBeLessThanOrEqual(0.12);
    expect(cappedShakeAmplitudeM("endgame_challenge", "high")).toBeLessThanOrEqual(0.12);
    for (const id of AUDIO_PACK_4.newStingers) {
      expect(existsSync(resolve(root, `shared/audio/sfx/${id}.wav`))).toBe(true);
    }
    for (const id of AUDIO_PACK_4.newBeds) {
      expect(existsSync(resolve(root, `shared/audio/music/${id}.wav`))).toBe(true);
    }
  });

  it("audiovfx4:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-audio-vfx-4.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK audiovfx4:validate");
  });
});
