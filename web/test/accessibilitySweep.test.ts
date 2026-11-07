import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  A11Y_SWEEP_PHASE,
  A11Y_SWEEP_SCHEMA,
  accessibilitySweep,
  contrastFailures,
  missingKeyboardActions,
  touchTargetMatchesTokens,
} from "../src/presenters/accessibilitySweep";
import { contrastRatio, meetsContrast } from "../src/presenters/contrast";
import { MIN_TOUCH_TARGET_DP } from "../src/presenters/controlQa";

const root = resolve(__dirname, "../..");

describe("accessibility sweep (post-1.0 Phase 16)", () => {
  it("locks 48dp targets and WCAG AA HUD pairs", () => {
    expect(A11Y_SWEEP_PHASE).toBe(16);
    expect(A11Y_SWEEP_SCHEMA).toBe("fish.a11y.accessibility_sweep.v1");
    expect(MIN_TOUCH_TARGET_DP).toBe(48);
    expect(touchTargetMatchesTokens()).toBe(true);
    expect(contrastFailures()).toEqual([]);
    expect(contrastRatio("#153449", "#FBF7EF")).toBeGreaterThanOrEqual(4.5);
    expect(meetsContrast("#FFFFFF", "#008F95", 3)).toBe(true);
    expect(missingKeyboardActions()).toEqual([]);
  });

  it("ghost buttons use ink and TalkBack hooks ship", () => {
    const css = readFileSync(resolve(root, "web/src/ui/styles.css"), "utf8");
    const ghost = css.match(/\.button\.ghost\s*\{[^}]+\}/)?.[0] ?? "";
    expect(ghost).toContain("--ink");
    expect(ghost).not.toMatch(/color:\s*var\(--action\)/);
    const joystick = readFileSync(
      resolve(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/Joystick.kt"),
      "utf8",
    );
    expect(joystick).toContain(accessibilitySweep.talkBack.android.joystickContentDescription);
    const app = readFileSync(resolve(root, "web/src/ui/App.tsx"), "utf8");
    expect(app).toContain('aria-label="Harbor"');
    expect(app).toContain("Harbor actions");
  });

  it("a11y:validate exits 0", () => {
    const out = execFileSync("npx", ["vite-node", "scripts/validate-a11y-sweep.ts"], {
      cwd: resolve(root, "web"),
      encoding: "utf8",
    });
    expect(out).toContain("OK a11y:validate");
  });
});
