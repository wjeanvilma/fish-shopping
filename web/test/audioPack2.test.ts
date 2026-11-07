import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AUDIO_PACK_2,
  AUDIO_PACK_2_PHASE,
  NEW_BED_FLOOR,
  NEW_STINGER_FLOOR,
} from "../src/ship/audioPack2";
import { musicBedForPanels, musicPack } from "../src/audio/musicBeds";
import { SFX_PACK2_CUES, sfxFromEvent } from "../src/audio/sfxCues";

const root = resolve(__dirname, "../..");

describe("audio pack 2 (Finish 2.0 Phase 21)", () => {
  it("locks catalog floors and frozen ducking", () => {
    expect(AUDIO_PACK_2_PHASE).toBe(21);
    expect(NEW_STINGER_FLOOR).toBe(7);
    expect(NEW_BED_FLOOR).toBe(2);
    expect(AUDIO_PACK_2.newStingers.length).toBeGreaterThanOrEqual(7);
    expect(AUDIO_PACK_2.newBeds.length).toBeGreaterThanOrEqual(2);
    expect(musicPack.ducking.sfxDuckFactor).toBe(0.35);
    expect(musicPack.ducking.sfxDuckRecoveryMs).toBe(280);
    expect(
      (JSON.parse(readFileSync(resolve(root, "shared/store/listing.json"), "utf8")) as {
        audioPack2Phase?: number;
      }).audioPack2Phase,
    ).toBe(21);
  });

  it("maps 2.0 events and bed priority", () => {
    expect(sfxFromEvent({ type: "achievement_unlocked" })).toBe("achievement");
    expect(sfxFromEvent({ type: "seasonal_event_started" })).toBe("festival");
    expect(sfxFromEvent({ type: "contract_completed" })).toBe("contract_done");
    expect(sfxFromEvent({ type: "contract_failed" })).toBe("contract_fail");
    expect(sfxFromEvent({ type: "daily_goal_claimed", replayed: false })).toBe("goal_claim");
    expect(sfxFromEvent({ type: "daily_goal_claimed", replayed: true })).toBeNull();
    expect(sfxFromEvent({ type: "mastery_level_up" })).toBe("mastery_up");
    expect(sfxFromEvent({ type: "quest_completed" })).toBe("quest_done");
    expect(SFX_PACK2_CUES).toHaveLength(7);
    expect(musicBedForPanels(false, true, true)).toBe("festival");
    expect(musicBedForPanels(true, false, true)).toBe("storm");
    for (const id of AUDIO_PACK_2.newStingers) {
      expect(existsSync(resolve(root, `shared/audio/sfx/${id}.wav`))).toBe(true);
    }
    for (const id of AUDIO_PACK_2.newBeds) {
      expect(existsSync(resolve(root, `shared/audio/music/${id}.wav`))).toBe(true);
    }
  });

  it("audiopack2:validate script passes", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-audio-pack-2.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK audiopack2:validate");
  });
});
