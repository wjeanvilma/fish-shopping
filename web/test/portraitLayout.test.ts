import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  actionMinHeightPx,
  harborMetaMaxCapPx,
  harborMetaMaxCss,
  harborMetaMaxFraction,
  isPortraitViewport,
  portraitCssVars,
  sheetMaxHeightCss,
  stickHeightFraction,
  stickWidthFraction,
  topActionsMaxCapPx,
  topActionsMaxCss,
  topActionsMaxFraction,
} from "../src/ui/portraitLayout";

describe("portraitLayout", () => {
  it("treats taller viewports as portrait", () => {
    expect(isPortraitViewport(390, 844)).toBe(true);
    expect(isPortraitViewport(844, 390)).toBe(false);
    expect(isPortraitViewport(0, 100)).toBe(false);
  });

  it("uses compact chrome fractions matching Android BoxWithConstraints", () => {
    expect(harborMetaMaxFraction(true)).toBe(0.46);
    expect(harborMetaMaxFraction(false)).toBe(0.42);
    expect(topActionsMaxFraction(true)).toBeLessThanOrEqual(topActionsMaxFraction(false));
    expect(harborMetaMaxCapPx(true)).toBe(200);
    expect(harborMetaMaxCapPx(false)).toBe(360);
    expect(topActionsMaxCapPx(true)).toBe(220);
    expect(topActionsMaxCapPx(false)).toBe(420);
    expect(actionMinHeightPx(true)).toBe(48);
    expect(actionMinHeightPx(false)).toBe(48);
    expect(stickWidthFraction(true)).toBe(0.56);
    expect(stickHeightFraction(true)).toBe(0.36);
    expect(stickWidthFraction(false)).toBe(0.42);
    expect(stickHeightFraction(false)).toBe(0.48);
  });

  it("emits CSS vars for App root wiring", () => {
    expect(harborMetaMaxCss(true)).toBe("min(46vw, 200px)");
    expect(topActionsMaxCss(false)).toBe("min(52vw, 420px)");
    expect(sheetMaxHeightCss(true)).toContain("78vh");
    const vars = portraitCssVars(true);
    expect(vars["--harbor-meta-max"]).toBe(harborMetaMaxCss(true));
    expect(vars["--top-actions-max"]).toBe(topActionsMaxCss(true));
    expect(vars["--touch"]).toBe("48px");
    expect(vars["--sheet-max-height"]).toBe(sheetMaxHeightCss(true));
  });

  it("wires portraitLayout into App and drops rotate-only stance", () => {
    const css = readFileSync(resolve(__dirname, "../src/ui/styles.css"), "utf8");
    expect(css).toContain("@media (orientation: portrait)");
    expect(css).toContain(".is-portrait");
    expect(css).toContain("--harbor-meta-max");
    expect(css).toContain("--top-actions-max");
    expect(css).toContain("--sheet-max-height");
    expect(css).not.toContain(".rotate-hint");
    const app = readFileSync(resolve(__dirname, "../src/ui/App.tsx"), "utf8");
    expect(app).toContain('from "./portraitLayout"');
    expect(app).toContain("isPortraitViewport");
    expect(app).toContain("portraitCssVars");
    expect(app).toContain("is-portrait");
    expect(app).toContain("is-landscape");
    expect(app).not.toContain("RotateHint");
    expect(app).not.toContain("Rotate your device to landscape");
  });
});
