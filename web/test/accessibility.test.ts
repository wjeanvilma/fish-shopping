import { describe, expect, it } from "vitest";
import {
  accessibilityPreset,
  clampHudTextScale,
  HUD_TEXT_SCALES,
  statusShapeFor,
  statusShapeGlyph,
} from "../src/presenters/accessibility";

describe("Phase 19 accessibility", () => {
  it("maps machine status to non-colour shapes", () => {
    expect(statusShapeFor("PROCESSING")).toBe("triangle");
    expect(statusShapeFor("PAUSED")).toBe("square");
    expect(statusShapeFor("NEEDS_REPAIR")).toBe("diamond");
    expect(statusShapeFor("WAITING_FOR_INPUT")).toBe("circle");
    expect(statusShapeGlyph("triangle")).toBe("▶");
    expect(statusShapeGlyph("diamond")).toBe("◆");
  });

  it("snaps HUD text scale to Default/Med/Large", () => {
    expect(HUD_TEXT_SCALES).toEqual([1, 1.15, 1.3]);
    expect(clampHudTextScale(1.1)).toBe(1.15);
    expect(clampHudTextScale(1.4)).toBe(1.3);
  });

  it("Accessibility preset enables the Phase 19 bundle", () => {
    const p = accessibilityPreset();
    expect(p.reducedMotion).toBe(true);
    expect(p.captionsEnabled).toBe(true);
    expect(p.hudTextScale).toBe(1.15);
    expect(p.shapeCues).toBe(true);
    expect(p.timingAssist).toBe(true);
  });
});
