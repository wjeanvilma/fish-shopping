import { describe, expect, it } from "vitest";
import {
  canSpawnVoices,
  clampVolume,
  effectiveMusicGain,
  effectiveSfxGain,
  MAX_SFX_VOICES,
  voicesForCue,
  VOLUME_STEPS,
} from "../src/audio/audioBus";
import { HAPTIC_CUES, sfxFromEvent } from "../src/audio/sfxCues";

describe("sfxFromEvent", () => {
  it("maps catch, machine, sale, upgrade, rush", () => {
    expect(sfxFromEvent({ type: "fish_caught" })).toBe("catch");
    expect(sfxFromEvent({ type: "batch_completed" })).toBe("machine_done");
    expect(sfxFromEvent({ type: "sale_committed" })).toBe("sale");
    expect(sfxFromEvent({ type: "upgrade_purchased", replayed: false })).toBe("upgrade");
    expect(sfxFromEvent({ type: "upgrade_purchased", replayed: true })).toBeNull();
    expect(sfxFromEvent({ type: "rush_started" })).toBe("rush");
  });

  it("plays abandon only when the customer left unpaid", () => {
    expect(sfxFromEvent({ type: "customer_left", paid: false })).toBe("abandon");
    expect(sfxFromEvent({ type: "customer_left", paid: true })).toBeNull();
  });

  it("ignores unrelated events", () => {
    expect(sfxFromEvent({ type: "items_transferred" })).toBeNull();
    expect(sfxFromEvent({ type: "checkpoint_requested" })).toBeNull();
  });

  it("marks catch and sale for haptics; panel_opened → ui", () => {
    expect(HAPTIC_CUES.has("catch")).toBe(true);
    expect(HAPTIC_CUES.has("sale")).toBe(true);
    expect(HAPTIC_CUES.has("rush")).toBe(false);
    expect(sfxFromEvent({ type: "panel_opened" })).toBe("ui");
  });
});

describe("Phase 17 audio levels + voice cap", () => {
  it("snaps volumes to Off/Low/Med/High steps", () => {
    expect(VOLUME_STEPS).toEqual([0, 0.35, 0.7, 1]);
    expect(clampVolume(0.1)).toBe(0);
    expect(clampVolume(0.4)).toBe(0.35);
    expect(clampVolume(0.65)).toBe(0.7);
    expect(clampVolume(0.95)).toBe(1);
  });

  it("mutes music and sfx independently of haptics", () => {
    expect(effectiveSfxGain(true, 1)).toBe(0);
    expect(effectiveMusicGain(true, 0.7)).toBe(0);
    expect(effectiveSfxGain(false, 0.35)).toBe(0.35);
    expect(effectiveMusicGain(false, 0)).toBe(0);
  });

  it("caps concurrent SFX voices (1 voice per authored clip)", () => {
    expect(voicesForCue("upgrade")).toBe(1);
    expect(voicesForCue("catch")).toBe(1);
    expect(canSpawnVoices(0, 1)).toBe(true);
    expect(canSpawnVoices(MAX_SFX_VOICES - 1, 2)).toBe(false);
    expect(canSpawnVoices(MAX_SFX_VOICES, 1)).toBe(false);
    expect(canSpawnVoices(5, 1, MAX_SFX_VOICES)).toBe(true);
  });
});
