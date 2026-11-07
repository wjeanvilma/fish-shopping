import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertControlQaInvariants,
  controlDefaultsMatch,
  controlsHelpLine,
  desktopKeysHint,
  HUD_ESSENTIAL_COPY_KEYS,
  isWorldSocketName,
  joystickDiameterDp,
  KEYBOARD_SHORTCUTS,
  looksLikeEssentialWorldText,
  MIN_TOUCH_TARGET_DP,
  tapToMoveHint,
} from "../src/presenters/controlQa";
import { actionMinHeightPx, portraitCssVars } from "../src/ui/portraitLayout";
import { TAP_ARRIVE_MM } from "../src/presenters/tapToMove";

describe("controlQa (Phase 20)", () => {
  it("locks touch targets to design-token 48dp in every orientation", () => {
    expect(MIN_TOUCH_TARGET_DP).toBe(48);
    expect(actionMinHeightPx(true)).toBe(48);
    expect(actionMinHeightPx(false)).toBe(48);
    expect(portraitCssVars(true)["--touch"]).toBe("48px");
    expect(portraitCssVars(false)["--touch"]).toBe("48px");
    expect(assertControlQaInvariants({
      actionMinHeightPx: actionMinHeightPx(true),
      joystickSide: "left",
      joystickScale: 0.75,
      tapArriveMm: TAP_ARRIVE_MM,
    })).toEqual([]);
    expect(joystickDiameterDp(0.75)).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_DP);
  });

  it("verifies joystick L/R/scale and tap-to-move defaults", () => {
    expect(controlDefaultsMatch({
      joystickSide: "left",
      joystickScale: 1,
      tapToMove: false,
    })).toBe(true);
    expect(controlDefaultsMatch({
      joystickSide: "right",
      joystickScale: 1,
      tapToMove: false,
    })).toBe(false);
    expect(controlDefaultsMatch({
      joystickSide: "left",
      joystickScale: 1.25,
      tapToMove: false,
    })).toBe(false);
    expect(controlDefaultsMatch({
      joystickSide: "left",
      joystickScale: 1,
      tapToMove: true,
    })).toBe(false);
  });

  it("exposes keyboard shortcuts and HUD-backed hints", () => {
    expect(KEYBOARD_SHORTCUTS.some((s) => s.action === "Move")).toBe(true);
    expect(KEYBOARD_SHORTCUTS.some((s) => s.action === "Reel")).toBe(true);
    expect(desktopKeysHint({ tapToMove: false })).toContain("WASD");
    expect(desktopKeysHint({ tapToMove: false })).toContain("Reel F");
    expect(desktopKeysHint({ tapToMove: true })).toContain("Tap harbor");
    expect(tapToMoveHint()).toMatch(/tap/i);
    expect(controlsHelpLine()).toContain("Esc");
    expect(HUD_ESSENTIAL_COPY_KEYS.length).toBeGreaterThanOrEqual(4);
  });

  it("keeps essential copy out of world socket / mesh names", () => {
    expect(isWorldSocketName("Zone_pier_end")).toBe(true);
    expect(isWorldSocketName("Footprint_cutter")).toBe(true);
    expect(isWorldSocketName("Water")).toBe(true);
    expect(looksLikeEssentialWorldText("Zone_pier_end")).toBe(false);
    expect(looksLikeEssentialWorldText("Tap the harbor to walk")).toBe(true);
    expect(looksLikeEssentialWorldText("Press_F_to_Reel")).toBe(true);
    expect(looksLikeEssentialWorldText("Machine_cutter_01")).toBe(false);
  });

  it("wires controlQa into App HUD and keeps safe-area CSS", () => {
    const app = readFileSync(resolve(__dirname, "../src/ui/App.tsx"), "utf8");
    expect(app).toContain("desktopKeysHint");
    expect(app).toContain("tapToMoveHint");
    expect(app).toContain("controlsHelpLine");
    const css = readFileSync(resolve(__dirname, "../src/ui/styles.css"), "utf8");
    expect(css).toContain("env(safe-area-inset-top)");
    expect(css).toContain("env(safe-area-inset-bottom)");
    expect(css).toContain("--touch: 48px");
    expect(css).not.toMatch(/min-height:\s*44px/);
  });
});
