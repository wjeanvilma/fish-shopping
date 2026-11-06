import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  harborMetaMaxFraction,
  isPortraitViewport,
  topActionsMaxFraction,
} from "../src/ui/portraitLayout";

describe("portraitLayout", () => {
  it("treats taller viewports as portrait", () => {
    expect(isPortraitViewport(390, 844)).toBe(true);
    expect(isPortraitViewport(844, 390)).toBe(false);
    expect(isPortraitViewport(0, 100)).toBe(false);
  });

  it("uses compact chrome fractions matching the HUD CSS", () => {
    // Portrait allows a slightly higher width fraction of a narrower viewport,
    // with a smaller absolute px cap in CSS (200 vs 360).
    expect(harborMetaMaxFraction(true)).toBe(0.46);
    expect(harborMetaMaxFraction(false)).toBe(0.42);
    expect(topActionsMaxFraction(true)).toBeLessThanOrEqual(topActionsMaxFraction(false));
  });

  it("ships portrait CSS and no landscape-only rotate lock", () => {
    const css = readFileSync(resolve(__dirname, "../src/ui/styles.css"), "utf8");
    expect(css).toContain("@media (orientation: portrait)");
    expect(css).not.toContain(".rotate-hint");
    const app = readFileSync(resolve(__dirname, "../src/ui/App.tsx"), "utf8");
    expect(app).not.toContain("RotateHint");
    expect(app).not.toContain("Rotate your device to landscape");
  });
});
