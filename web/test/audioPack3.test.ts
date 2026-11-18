import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUDIO_PACK_3,
  AUDIO_PACK_3_PHASE,
  NEW_BED_FLOOR_3,
  NEW_STINGER_FLOOR_3,
} from "../src/ship/audioPack3";
import { musicBedForPanels, musicPack } from "../src/audio/musicBeds";
import { SFX_PACK3_CUES, sfxFromEvent } from "../src/audio/sfxCues";

const root = resolve(__dirname, "../..");

describe("audio pack 3 (Finish 3.0 Phase 23)", () => {
  it("locks catalog floors and frozen ducking", () => {
    expect(AUDIO_PACK_3_PHASE).toBe(23);
    expect(NEW_STINGER_FLOOR_3).toBe(8);
    expect(NEW_BED_FLOOR_3).toBe(2);
    expect(AUDIO_PACK_3.newStingers.length).toBeGreaterThanOrEqual(8);
    expect(AUDIO_PACK_3.newBeds.length).toBeGreaterThanOrEqual(2);
    expect(musicPack.ducking.sfxDuckFactor).toBe(0.35);
    expect(musicPack.ducking.sfxDuckRecoveryMs).toBe(280);
    expect(
      (JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
        audioPack3Phase?: number;
      }).audioPack3Phase,
    ).toBe(23);
  });

  it("maps Finish 3.0 events and bed priority", () => {
    expect(sfxFromEvent({ type: "rival_market_opened" })).toBe("rival_open");
    expect(sfxFromEvent({ type: "rival_sale_stolen" })).toBe("rival_steal");
    expect(sfxFromEvent({ type: "rival_beaten" })).toBe("rival_beat");
    expect(sfxFromEvent({ type: "harbor_traveled", replayed: false })).toBe("harbor_travel");
    expect(sfxFromEvent({ type: "harbor_traveled", replayed: true })).toBeNull();
    expect(sfxFromEvent({ type: "worker_hired", replayed: false })).toBe("hire");
    expect(sfxFromEvent({ type: "prestige_unlocked" })).toBe("prestige");
    expect(sfxFromEvent({ type: "loan_taken", replayed: false })).toBe("loan");
    expect(sfxFromEvent({ type: "loan_taken", replayed: true })).toBeNull();
    expect(sfxFromEvent({ type: "trophy_set_completed" })).toBe("trophy_set");
    expect(SFX_PACK3_CUES).toHaveLength(8);
    expect(musicBedForPanels(false, true, true, true, true)).toBe("festival");
    expect(musicBedForPanels(true, false, true, true, true)).toBe("storm");
    expect(musicBedForPanels(true, false, false, true, true)).toBe("rival");
    expect(musicBedForPanels(true, false, false, false, true)).toBe("night");
    for (const id of AUDIO_PACK_3.newStingers) {
      expect(existsSync(resolve(root, `shared/audio/sfx/${id}.wav`))).toBe(true);
    }
    for (const id of AUDIO_PACK_3.newBeds) {
      expect(existsSync(resolve(root, `shared/audio/music/${id}.wav`))).toBe(true);
    }
  });

  it("audiopack3:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-audio-pack-3.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK audiopack3:validate");
  });
});
