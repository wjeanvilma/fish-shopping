import { beforeEach, describe, expect, it } from "vitest";
import { formatLastSavedLabel, loadSettings, saveSettings } from "../src/game/settingsStore";

const memory = new Map<string, string>();

beforeEach(() => {
  memory.clear();
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => { memory.set(k, v); },
    removeItem: (k) => { memory.delete(k); },
    clear: () => memory.clear(),
    key: () => null,
    get length() { return memory.size; },
  };
});

describe("settingsStore Phase 10 a11y fields", () => {
  it("defaults reduced motion off and captions on", () => {
    const s = loadSettings();
    expect(s.reducedMotion).toBe(false);
    expect(s.captionsEnabled).toBe(true);
  });

  it("defaults Phase 17 music/SFX/haptics", () => {
    const s = loadSettings();
    expect(s.musicVolume).toBe(0.7);
    expect(s.sfxVolume).toBe(1);
    expect(s.hapticsEnabled).toBe(true);
  });

  it("defaults Phase 19 HUD/shape/timing assist", () => {
    const s = loadSettings();
    expect(s.hudTextScale).toBe(1);
    expect(s.shapeCues).toBe(false);
    expect(s.timingAssist).toBe(false);
  });

  it("persists reduced motion and captions toggles", () => {
    saveSettings({
      muted: false,
      musicVolume: 0.7,
      sfxVolume: 1,
      hapticsEnabled: true,
      quality: "medium",
      joystickSide: "left",
      joystickScale: 1,
      tapToMove: false,
      cloudSyncEnabled: false,
      showBalanceStrip: false,
      reducedMotion: true,
      captionsEnabled: false,
      hudTextScale: 1,
      shapeCues: false,
      timingAssist: false,
      analyticsConsent: false,
      analyticsConsentDecided: false,
      cloudAccountId: null,
      cloudRefreshToken: null,
      equippedCosmeticId: null,
    });
    const s = loadSettings();
    expect(s.reducedMotion).toBe(true);
    expect(s.captionsEnabled).toBe(false);
  });

  it("persists music/SFX volumes and haptics", () => {
    saveSettings({
      muted: false,
      musicVolume: 0.35,
      sfxVolume: 0,
      hapticsEnabled: false,
      quality: "medium",
      joystickSide: "left",
      joystickScale: 1,
      tapToMove: false,
      cloudSyncEnabled: false,
      showBalanceStrip: false,
      reducedMotion: false,
      captionsEnabled: true,
      hudTextScale: 1.15,
      shapeCues: true,
      timingAssist: true,
      analyticsConsent: false,
      analyticsConsentDecided: false,
      cloudAccountId: null,
      cloudRefreshToken: null,
      equippedCosmeticId: null,
    });
    const s = loadSettings();
    expect(s.musicVolume).toBe(0.35);
    expect(s.sfxVolume).toBe(0);
    expect(s.hapticsEnabled).toBe(false);
    expect(s.hudTextScale).toBe(1.15);
    expect(s.shapeCues).toBe(true);
    expect(s.timingAssist).toBe(true);
  });

  it("persists Phase 22 cloud refresh token for guest recovery", () => {
    saveSettings({
      muted: false,
      musicVolume: 0.7,
      sfxVolume: 1,
      hapticsEnabled: true,
      quality: "medium",
      joystickSide: "left",
      joystickScale: 1,
      tapToMove: false,
      cloudSyncEnabled: true,
      showBalanceStrip: false,
      reducedMotion: false,
      captionsEnabled: true,
      hudTextScale: 1,
      shapeCues: false,
      timingAssist: false,
      analyticsConsent: false,
      analyticsConsentDecided: false,
      cloudAccountId: "uid-guest",
      cloudRefreshToken: "refresh-guest",
      equippedCosmeticId: "banner.iap_sunset_bunting",
    });
    const s = loadSettings();
    expect(s.cloudAccountId).toBe("uid-guest");
    expect(s.cloudRefreshToken).toBe("refresh-guest");
    expect(s.equippedCosmeticId).toBe("banner.iap_sunset_bunting");
  });

  it("defaults and persists Phase 24 equipped cosmetic", () => {
    const s = loadSettings();
    expect(s.equippedCosmeticId).toBeNull();
    saveSettings({ ...s, equippedCosmeticId: "banner.iap_pearl_string" });
    expect(loadSettings().equippedCosmeticId).toBe("banner.iap_pearl_string");
  });

  it("defaults and persists Phase 25 analytics consent", () => {
    const s = loadSettings();
    expect(s.analyticsConsent).toBe(false);
    expect(s.analyticsConsentDecided).toBe(false);
    saveSettings({ ...s, analyticsConsent: true, analyticsConsentDecided: true });
    const again = loadSettings();
    expect(again.analyticsConsent).toBe(true);
    expect(again.analyticsConsentDecided).toBe(true);
  });

  it("formats last-saved labels", () => {
    expect(formatLastSavedLabel(null)).toBe("Not saved this session");
    const now = 1_000_000;
    expect(formatLastSavedLabel(now - 2_000, now)).toBe("Saved just now");
    expect(formatLastSavedLabel(now - 12_000, now)).toBe("Saved 12s ago");
    expect(formatLastSavedLabel(now - 120_000, now)).toBe("Saved 2m ago");
  });
});
